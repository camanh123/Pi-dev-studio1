"""Pi Auth Starter backend.

Generated-application identity verification only.

Flow:
  frontend Pi.authenticate(["username"], ...)
    → accessToken
    → POST /pi/auth/verify  (this app)
    → GET https://api.minepi.com/v2/me  Authorization: Bearer <token>
    → verified uid/username
    → generated-app local verified-user state

This is NOT OpenSail authentication.
Zero payment server credentials. Zero payment routes. Zero wallet APIs.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logger = logging.getLogger("pi-auth-starter")

app = FastAPI(
    title="Pi Auth Starter",
    description=(
        "Generated-app Pi identity verification via official GET /v2/me. "
        "Not OpenSail auth. No payments."
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

# Project-local configuration — NOT an official Pi Platform environment variable.
# Default is the Phase 1 allowlisted Platform API base.
PI_API_BASE = os.environ.get("PI_API_BASE", "https://api.minepi.com/v2").rstrip("/")


class PiAuthVerifyRequest(BaseModel):
    accessToken: str = Field(..., min_length=1)


class VerifiedUserResponse(BaseModel):
    uid: str
    username: str | None = None
    verified: bool = True


@app.get("/")
async def root():
    return {
        "message": "Pi Auth Starter backend",
        "scope": "pi-auth-verify-and-health",
        "identity": "generated-app-local",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/pi/auth/verify", response_model=VerifiedUserResponse)
async def verify_pi_access_token(payload: PiAuthVerifyRequest):
    """Verify a Pi user access token against the official Platform API.

    Trust boundary: this generated-app backend (not the frontend auth.user object).
    Never returns the access token. Never logs the token.
    """
    token = payload.accessToken.strip()
    if not token:
        raise HTTPException(status_code=400, detail="accessToken is required")

    me_url = f"{PI_API_BASE}/me"
    if not me_url.startswith("https://api.minepi.com/"):
        # Hard allowlist — do not call invented hosts even if misconfigured.
        raise HTTPException(
            status_code=500,
            detail="PI_API_BASE is misconfigured; only https://api.minepi.com/v2 is supported",
        )

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

    data: dict[str, Any]
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

    # Return only documented identity fields needed by this starter.
    return VerifiedUserResponse(uid=uid, username=username, verified=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
