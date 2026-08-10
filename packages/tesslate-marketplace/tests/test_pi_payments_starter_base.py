"""Phase 5 — Pi Payments Starter MarketplaceBase registration and safety."""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.services.seed_loader import SEED_FILES, load_seed_entries

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS_DIR = Path(__file__).resolve().parents[1] / "app" / "seeds"
_BASES_PATH = _SEEDS_DIR / "bases.json"
_SUMMARY_PATH = _SEEDS_DIR / "_summary.json"
_TEMPLATE_ROOT = _REPO_ROOT / "bases" / "pi-payments-starter"
_BUNDLE_PATH = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "bundles"
    / "base"
    / "pi-payments-starter"
    / "0.1.0.tar.zst"
)

SLUG = "pi-payments-starter"

FORBIDDEN_IMPL = [
    "refund",
    "recurring",
    "subscription",
    "webhook",
    "wallet/balance",
    "wallet/history",
    "passphrase",
    "oauth/authorize",
    "refresh_token",
    "A2U",
    "POST /payments\"",  # A2U create route as implementation target
]


def _entry() -> dict:
    bases = json.loads(_BASES_PATH.read_text(encoding="utf-8"))
    return next(b for b in bases if b["slug"] == SLUG)


def _read(*rels: str) -> str:
    return "\n".join(
        (_TEMPLATE_ROOT / rel).read_text(encoding="utf-8") for rel in rels
    )


def test_seed_registered_and_discoverable() -> None:
    assert "bases.json" in SEED_FILES
    slugs = {e["slug"] for e in load_seed_entries() if e.get("kind") == "base"}
    assert SLUG in slugs
    entry = _entry()
    assert entry["kind"] == "base"
    assert entry["is_active"] is True
    assert entry["is_published"] is True
    assert entry["default_branch"] == "base/pi-payments-starter"
    assert "U2A" in entry["description"] or "U2A" in entry["long_description"]
    assert "Stripe" in entry["description"] or "Stripe" in entry["long_description"]


def test_slug_unique_and_summary() -> None:
    bases = json.loads(_BASES_PATH.read_text(encoding="utf-8"))
    assert [b["slug"] for b in bases].count(SLUG) == 1
    all_base = [e["slug"] for e in load_seed_entries() if e.get("kind") == "base"]
    assert all_base.count(SLUG) == 1
    summary = json.loads(_SUMMARY_PATH.read_text(encoding="utf-8"))
    assert summary["base"] == len(all_base)


def test_bundle_exists() -> None:
    assert _BUNDLE_PATH.is_file()


def test_template_tree() -> None:
    for rel in [
        "frontend/index.html",
        "frontend/src/pi/init.ts",
        "frontend/src/pi/auth.ts",
        "frontend/src/pi/payments.ts",
        "backend/main.py",
        "backend/.env.example",
        "docs/PI_SETUP.md",
        "README.md",
        ".tesslate/config.json",
        "TESSLATE.md",
    ]:
        assert (_TEMPLATE_ROOT / rel).is_file(), rel


def test_sdk_auth_and_payment_surfaces() -> None:
    index_html = _read("frontend/index.html")
    init_ts = _read("frontend/src/pi/init.ts")
    auth_ts = _read("frontend/src/pi/auth.ts")
    pay_ts = _read("frontend/src/pi/payments.ts")
    backend = _read("backend/main.py")

    assert "https://sdk.minepi.com/pi-sdk.js" in index_html
    assert 'version: "2.0"' in init_ts
    assert 'authenticate(["username", "payments"]' in auth_ts
    assert "/api/pi/auth/verify" in auth_ts
    assert "Pi.createPayment" in pay_ts or "createPayment" in pay_ts
    assert "onReadyForServerApproval" in pay_ts
    assert "onReadyForServerCompletion" in pay_ts
    assert "onCancel" in pay_ts
    assert "onError" in pay_ts
    assert "/approve" in backend
    assert "/complete" in backend
    assert "/cancel" in backend
    assert '"txid"' in backend or "txid" in backend
    assert "Authorization" in backend and "Key" in backend
    assert "Bearer" in backend
    assert "https://api.minepi.com/v2" in backend


def test_server_key_backend_only() -> None:
    frontend_files = [
        "frontend/index.html",
        "frontend/src/pi/init.ts",
        "frontend/src/pi/auth.ts",
        "frontend/src/pi/payments.ts",
        "frontend/src/App.tsx",
        "frontend/src/main.tsx",
        "frontend/.env.example",
    ]
    frontend_text = _read(*frontend_files)
    assert "PI_SERVER_API_KEY" not in frontend_text
    assert "Authorization: Key" not in frontend_text

    backend = _read("backend/main.py")
    env_example = _read("backend/.env.example")
    assert "PI_SERVER_API_KEY" in backend
    assert "PI_SERVER_API_KEY=" in env_example
    # example must not contain a real-looking secret value
    for line in env_example.splitlines():
        if line.startswith("PI_SERVER_API_KEY="):
            assert line.strip() == "PI_SERVER_API_KEY="
    assert "logger" in backend
    # ensure we don't log the key variable value via f-string of the secret
    assert "logger" in backend and "PI_SERVER_API_KEY" in backend
    assert re.search(r"logger\.[a-z]+\(.*PI_SERVER_API_KEY", backend) is None

    config = json.loads((_TEMPLATE_ROOT / ".tesslate/config.json").read_text())
    assert "PI_SERVER_API_KEY" not in config["apps"]["frontend"].get("env", {})
    assert "PI_SERVER_API_KEY" in config["apps"]["backend"].get("env", {})
    assert config["apps"]["backend"]["env"]["PI_SERVER_API_KEY"] == ""


def test_no_forbidden_payment_features() -> None:
    impl = _read(
        "frontend/src/pi/payments.ts",
        "frontend/src/pi/auth.ts",
        "frontend/src/pi/init.ts",
        "frontend/src/main.tsx",
        "backend/main.py",
        ".tesslate/config.json",
    ).lower()
    for token in (
        "refund",
        "recurring",
        "subscription",
        "webhook",
        "wallet/balance",
        "wallet/history",
        "passphrase",
        "oauth/authorize",
        "refresh_token",
    ):
        assert token not in impl, token
    # A2U create route must not be implemented (docs may mention out-of-scope).
    backend = _read("backend/main.py")
    assert "async def create_a2u" not in backend
    assert 'json_body={"uid"' not in backend
    # No Platform POST /payments (A2U create) — only /payments/{id}/...
    assert not re.search(r'_platform_request\(\s*"POST",\s*"/payments"', backend)


def test_docs_boundaries() -> None:
    docs = _read("README.md", "docs/PI_SETUP.md")
    assert "NOT OpenSail" in docs or "not OpenSail" in docs
    assert "Testnet" in docs
    assert "Mainnet" in docs
    assert "PI_SERVER_API_KEY" in docs
    assert "not an official" in docs.lower() or "NOT an official" in docs
    assert "refund" in docs.lower()
    assert "webhook" in docs.lower()
    assert "A2U" in docs
    assert "sandbox" in docs.lower()
    assert "Developer Portal" in docs


def test_prior_starters_untouched() -> None:
    web = _REPO_ROOT / "bases" / "pi-web-starter"
    auth = _REPO_ROOT / "bases" / "pi-auth-starter"
    assert not (web / "frontend/src/pi/payments.ts").exists()
    assert not (auth / "frontend/src/pi/payments.ts").exists()
    auth_backend = (auth / "backend/main.py").read_text(encoding="utf-8")
    assert "/pi/payments/" not in auth_backend
    assert "PI_SERVER_API_KEY" not in auth_backend


def test_no_invented_hosts() -> None:
    chunks: list[str] = []
    for path in _TEMPLATE_ROOT.rglob("*"):
        if path.is_file() and path.suffix not in {".svg", ".png"}:
            try:
                chunks.append(path.read_text(encoding="utf-8"))
            except UnicodeDecodeError:
                pass
    text = "\n".join(chunks)
    for host in ("oauth.minepi.com", "api.pi.network", "payments.minepi.com", "webhook.minepi.com"):
        assert host not in text


def test_phase5_template_not_under_opensail_auth_tree() -> None:
    assert "orchestrator/app/routers" not in str(_TEMPLATE_ROOT)
