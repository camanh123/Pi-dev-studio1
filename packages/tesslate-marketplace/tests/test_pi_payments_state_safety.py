"""Phase 9 — Pi Payments Starter local payment-state safety.

Validates that Platform non-2xx responses cannot downgrade a prior
approved/completed local record (duplicate callback / race).
"""

from __future__ import annotations

import asyncio
import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BACKEND = _REPO_ROOT / "bases" / "pi-payments-starter" / "backend" / "main.py"


def _load_payments_module():
    spec = importlib.util.spec_from_file_location("pi_payments_starter_main", _BACKEND)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def payments_mod(monkeypatch):
    mod = _load_payments_module()
    monkeypatch.setattr(mod, "PI_SERVER_API_KEY", "test-key-not-real")
    monkeypatch.setattr(mod, "PI_API_BASE", "https://api.minepi.com/v2")
    with mod._payment_lock:
        mod._payment_records.clear()
    return mod


def test_failed_upsert_does_not_overwrite_approved(payments_mod):
    payments_mod._upsert_payment_record("pay_1", status="approved")
    result = payments_mod._upsert_payment_record(
        "pay_1", status="failed", note="approve:400"
    )
    assert result["status"] == "approved"
    assert payments_mod._payment_records["pay_1"]["status"] == "approved"


def test_failed_upsert_does_not_overwrite_completed(payments_mod):
    payments_mod._upsert_payment_record("pay_2", status="completed", txid="tx1")
    result = payments_mod._upsert_payment_record(
        "pay_2", status="failed", note="complete:400"
    )
    assert result["status"] == "completed"
    assert result.get("txid") == "tx1"


def test_completed_is_not_downgraded_to_approved(payments_mod):
    payments_mod._upsert_payment_record("pay_3", status="completed", txid="tx9")
    result = payments_mod._upsert_payment_record("pay_3", status="approved")
    assert result["status"] == "completed"


def test_reconcile_maps_platform_approved_after_duplicate_approve(payments_mod, monkeypatch):
    payments_mod._upsert_payment_record("pay_dup", status="approved")

    async def fake_platform_request(method, path, *, json_body=None):
        assert method == "GET"
        assert path == "/payments/pay_dup"
        return SimpleNamespace(
            status_code=200,
            json=lambda: {"identifier": "pay_dup", "status": "approved"},
        )

    monkeypatch.setattr(payments_mod, "_platform_request", fake_platform_request)
    record = asyncio.run(
        payments_mod._reconcile_after_platform_error(
            "pay_dup", attempted="approve", status_code=400
        )
    )
    assert record["status"] == "approved"


def test_approve_race_reconciles_instead_of_failing(payments_mod, monkeypatch):
    """Simulate: local already approved; duplicate Platform approve returns 400;
    GET confirms approved → idempotent success, not local failed."""
    payments_mod._upsert_payment_record("pay_race", status="approved")
    calls: list[tuple[str, str]] = []

    async def fake_platform_request(method, path, *, json_body=None):
        calls.append((method, path))
        if method == "POST" and path.endswith("/approve"):
            return SimpleNamespace(status_code=400, text="already approved")
        if method == "GET":
            return SimpleNamespace(
                status_code=200,
                json=lambda: {"identifier": "pay_race", "status": "approved"},
            )
        raise AssertionError(f"unexpected {method} {path}")

    monkeypatch.setattr(payments_mod, "_platform_request", fake_platform_request)

    async def run():
        return await payments_mod.approve_payment("pay_race")

    # First call hits early idempotent return before Platform.
    first = asyncio.run(run())
    assert first["status"] == "approved"
    assert first.get("idempotent") is True

    # Clear early-return path by using a pending-looking id that is only
    # protected after reconcile: wipe status to pending-equivalent by
    # removing record mid-race simulation of concurrent path.
    with payments_mod._payment_lock:
        payments_mod._payment_records.pop("pay_race", None)
    # Seed approved via concurrent winner after lock release:
    original_request = payments_mod._platform_request

    async def racing_request(method, path, *, json_body=None):
        if method == "POST" and path.endswith("/approve"):
            # Concurrent winner already marked approved locally.
            payments_mod._upsert_payment_record("pay_race", status="approved")
            return SimpleNamespace(status_code=400, text="already approved")
        return await original_request(method, path, json_body=json_body)

    monkeypatch.setattr(payments_mod, "_platform_request", racing_request)
    result = asyncio.run(payments_mod.approve_payment("pay_race"))
    assert result["status"] == "approved"
    assert payments_mod._payment_records["pay_race"]["status"] == "approved"
    assert result.get("reconciled") is True or result.get("idempotent") is True


def test_complete_non_2xx_does_not_mark_success_without_platform(payments_mod, monkeypatch):
    async def fake_platform_request(method, path, *, json_body=None):
        if method == "POST":
            return SimpleNamespace(status_code=502, text="upstream")
        return SimpleNamespace(
            status_code=200,
            json=lambda: {"identifier": "pay_x", "status": "pending"},
        )

    monkeypatch.setattr(payments_mod, "_platform_request", fake_platform_request)

    with pytest.raises(payments_mod.HTTPException) as exc:
        asyncio.run(
            payments_mod.complete_payment(
                "pay_x", payments_mod.CompletePaymentRequest(txid="tx-abc")
            )
        )
    assert exc.value.status_code == 502
    assert payments_mod._payment_records["pay_x"]["status"] == "failed"


def test_complete_reconciles_when_platform_already_completed(payments_mod, monkeypatch):
    async def fake_platform_request(method, path, *, json_body=None):
        if method == "POST":
            return SimpleNamespace(status_code=400, text="already completed")
        return SimpleNamespace(
            status_code=200,
            json=lambda: {
                "identifier": "pay_done",
                "status": "completed",
                "transaction": {"txid": "tx-real"},
            },
        )

    monkeypatch.setattr(payments_mod, "_platform_request", fake_platform_request)
    result = asyncio.run(
        payments_mod.complete_payment(
            "pay_done", payments_mod.CompletePaymentRequest(txid="tx-real")
        )
    )
    assert result["status"] == "completed"
    assert result.get("reconciled") is True
    assert payments_mod._payment_records["pay_done"]["status"] == "completed"
