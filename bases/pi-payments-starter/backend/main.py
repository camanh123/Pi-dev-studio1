"""Pi Payments Starter backend.

Generated-application identity + U2A payment server operations.

Auth:
  POST /pi/auth/verify → GET https://api.minepi.com/v2/me  Bearer <user token>

Payments (U2A only — not OpenSail/Stripe billing):
  POST /pi/payments/{payment_id}/approve   → Platform /approve   Key <server key>
  POST /pi/payments/{payment_id}/complete  → Platform /complete  Key <server key>
  POST /pi/payments/{payment_id}/cancel    → Platform /cancel    Key <server key>
  GET  /pi/payments/{payment_id}           → Platform GET payment
  POST /pi/payments/incomplete             → conservative recovery helper

PI_SERVER_API_KEY is a generated-project secret name — NOT an official Pi env var.
Never return or log the key. Never expose it to the frontend.
"""

from __future__ import annotations

import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logger = logging.getLogger("pi-payments-starter")

app = FastAPI(
    title="Pi Payments Starter",
    description=(
        "Generated-app Pi auth (/me) and U2A payment approve/complete. "
        "Not OpenSail auth or Stripe billing."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Project-local configuration — NOT official Pi Platform environment variables.
PI_API_BASE = os.environ.get("PI_API_BASE", "https://api.minepi.com/v2").rstrip("/")
# Generated-project secret name. Never commit a real value.
PI_SERVER_API_KEY = os.environ.get("PI_SERVER_API_KEY", "").strip()

PaymentLocalStatus = Literal[
    "created",
    "approved",
    "completed",
    "cancelled",
    "failed",
    "incomplete_handled",
]

_payment_lock = threading.Lock()
_payment_records: dict[str, dict[str, Any]] = {}


class PiAuthVerifyRequest(BaseModel):
    accessToken: str = Field(..., min_length=1)


class VerifiedUserResponse(BaseModel):
    uid: str
    username: str | None = None
    verified: bool = True


class CompletePaymentRequest(BaseModel):
    txid: str = Field(..., min_length=1)


class IncompletePaymentRequest(BaseModel):
    paymentId: str = Field(..., min_length=1)
    txid: str | None = None


def _assert_allowlisted_api_base() -> str:
    if not PI_API_BASE.startswith("https://api.minepi.com/"):
        raise HTTPException(
            status_code=500,
            detail="PI_API_BASE is misconfigured; only https://api.minepi.com/v2 is supported",
        )
    return PI_API_BASE


def _require_server_key() -> str:
    if not PI_SERVER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "PI_SERVER_API_KEY is not configured on the generated-app backend. "
                "Set it as a server-only project secret (not a frontend env var)."
            ),
        )
    return PI_SERVER_API_KEY


def _upsert_payment_record(
    payment_id: str,
    *,
    status: PaymentLocalStatus,
    txid: str | None = None,
    note: str | None = None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    with _payment_lock:
        existing = _payment_records.get(payment_id, {})
        # Idempotent completion: do not downgrade a completed record.
        if existing.get("status") == "completed" and status != "completed":
            return existing
        record = {
            **existing,
            "payment_id": payment_id,
            "status": status,
            "txid": txid if txid is not None else existing.get("txid"),
            "note": note if note is not None else existing.get("note"),
            "updated_at": now,
            "created_at": existing.get("created_at", now),
        }
        _payment_records[payment_id] = record
        return record


async def _platform_request(
    method: str,
    path: str,
    *,
    json_body: dict[str, Any] | None = None,
) -> httpx.Response:
    base = _assert_allowlisted_api_base()
    key = _require_server_key()
    url = f"{base}{path}"
    headers = {"Authorization": f"Key {key}"}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            return await client.request(method, url, headers=headers, json=json_body)
    except httpx.HTTPError:
        # Never log the key or payment secrets.
        logger.exception("Pi Platform API request failed path=%s", path)
        raise HTTPException(
            status_code=502,
            detail="Failed to reach Pi Platform API",
        ) from None


@app.get("/")
async def root():
    return {
        "message": "Pi Payments Starter backend",
        "scope": "pi-auth-and-u2a-payments",
        "identity": "generated-app-local",
        "billing": "not-opensail-stripe",
        "server_key_configured": bool(PI_SERVER_API_KEY),
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "server_key_configured": bool(PI_SERVER_API_KEY),
    }


@app.post("/pi/auth/verify", response_model=VerifiedUserResponse)
async def verify_pi_access_token(payload: PiAuthVerifyRequest):
    """Verify Pi user access token via official GET /me (Bearer)."""
    token = payload.accessToken.strip()
    if not token:
        raise HTTPException(status_code=400, detail="accessToken is required")

    base = _assert_allowlisted_api_base()
    me_url = f"{base}/me"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                me_url,
                headers={"Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError:
        logger.exception("Pi Platform /me request failed (token redacted)")
        raise HTTPException(
            status_code=502,
            detail="Failed to reach Pi Platform API for identity verification",
        ) from None

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Pi access token rejected by /me")
    if response.status_code >= 400:
        logger.warning("Pi /me returned status=%s (token redacted)", response.status_code)
        raise HTTPException(
            status_code=502,
            detail=f"Pi Platform /me returned status {response.status_code}",
        )

    try:
        data = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Pi Platform /me returned invalid JSON")

    uid = data.get("uid")
    if not isinstance(uid, str) or not uid:
        raise HTTPException(status_code=502, detail="Pi Platform /me response missing uid")

    username = data.get("username")
    if username is not None and not isinstance(username, str):
        username = None

    return VerifiedUserResponse(uid=uid, username=username, verified=True)


@app.post("/pi/payments/{payment_id}/approve")
async def approve_payment(payment_id: str):
    """Approve a U2A payment via official Platform API (Key auth)."""
    with _payment_lock:
        existing = _payment_records.get(payment_id)
        if existing and existing.get("status") in {"approved", "completed"}:
            return {
                "payment_id": payment_id,
                "status": existing["status"],
                "idempotent": True,
            }

    response = await _platform_request(
        "POST",
        f"/payments/{payment_id}/approve",
    )
    if response.status_code >= 400:
        _upsert_payment_record(payment_id, status="failed", note=f"approve:{response.status_code}")
        raise HTTPException(
            status_code=502,
            detail=f"Pi Platform approve returned status {response.status_code}",
        )

    record = _upsert_payment_record(payment_id, status="approved")
    return {"payment_id": payment_id, "status": record["status"], "idempotent": False}


@app.post("/pi/payments/{payment_id}/complete")
async def complete_payment(payment_id: str, payload: CompletePaymentRequest):
    """Complete a U2A payment with documented {txid} body (Key auth).

    Do not treat client callbacks alone as success — only successful /complete.
    """
    txid = payload.txid.strip()
    if not txid:
        raise HTTPException(status_code=400, detail="txid is required")

    with _payment_lock:
        existing = _payment_records.get(payment_id)
        if existing and existing.get("status") == "completed":
            return {
                "payment_id": payment_id,
                "status": "completed",
                "txid": existing.get("txid"),
                "idempotent": True,
            }

    response = await _platform_request(
        "POST",
        f"/payments/{payment_id}/complete",
        json_body={"txid": txid},
    )
    if response.status_code >= 400:
        # Official U2A guidance: do not mark complete on non-success responses.
        _upsert_payment_record(
            payment_id,
            status="failed",
            txid=txid,
            note=f"complete:{response.status_code}",
        )
        raise HTTPException(
            status_code=502,
            detail=f"Pi Platform complete returned status {response.status_code}",
        )

    record = _upsert_payment_record(payment_id, status="completed", txid=txid)
    return {
        "payment_id": payment_id,
        "status": record["status"],
        "txid": record.get("txid"),
        "idempotent": False,
    }


@app.post("/pi/payments/{payment_id}/cancel")
async def cancel_payment(payment_id: str):
    """Cancel via documented Platform API. Cancel is not a money-return flow."""
    response = await _platform_request(
        "POST",
        f"/payments/{payment_id}/cancel",
    )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Pi Platform cancel returned status {response.status_code}",
        )
    record = _upsert_payment_record(payment_id, status="cancelled")
    return {"payment_id": payment_id, "status": record["status"]}


@app.get("/pi/payments/{payment_id}")
async def get_payment(payment_id: str):
    """Fetch payment from official Platform API + local starter record."""
    response = await _platform_request("GET", f"/payments/{payment_id}")
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Pi Platform get payment returned status {response.status_code}",
        )
    try:
        platform = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Pi Platform payment JSON invalid")

    with _payment_lock:
        local = _payment_records.get(payment_id)

    return {
        "payment_id": payment_id,
        "platform": platform,
        "local": local,
    }


@app.post("/pi/payments/incomplete")
async def handle_incomplete_payment(payload: IncompletePaymentRequest):
    """Conservative incomplete-payment helper.

    If a txid is present, attempt documented /complete.
    Otherwise attempt documented /approve so the user may continue.
    Never invent reversal flows or declare success without Platform API confirmation.
    """
    payment_id = payload.paymentId.strip()
    txid = payload.txid.strip() if payload.txid else None

    if txid:
        response = await _platform_request(
            "POST",
            f"/payments/{payment_id}/complete",
            json_body={"txid": txid},
        )
        if response.status_code >= 400:
            _upsert_payment_record(
                payment_id,
                status="failed",
                txid=txid,
                note=f"incomplete-complete:{response.status_code}",
            )
            raise HTTPException(
                status_code=502,
                detail=f"Incomplete recovery complete returned {response.status_code}",
            )
        record = _upsert_payment_record(
            payment_id,
            status="completed",
            txid=txid,
            note="incomplete-recovery-complete",
        )
        return {
            "payment_id": payment_id,
            "status": record["status"],
            "detail": "Incomplete payment completed via Platform API /complete.",
        }

    response = await _platform_request(
        "POST",
        f"/payments/{payment_id}/approve",
    )
    if response.status_code >= 400:
        _upsert_payment_record(
            payment_id,
            status="failed",
            note=f"incomplete-approve:{response.status_code}",
        )
        raise HTTPException(
            status_code=502,
            detail=f"Incomplete recovery approve returned {response.status_code}",
        )
    record = _upsert_payment_record(
        payment_id,
        status="incomplete_handled",
        note="incomplete-recovery-approve",
    )
    return {
        "payment_id": payment_id,
        "status": record["status"],
        "detail": (
            "Incomplete payment approved via Platform API. "
            "Confirm settlement before fulfilling goods/services."
        ),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
