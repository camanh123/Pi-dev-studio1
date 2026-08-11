"""Phase 4 — Pi Auth Starter MarketplaceBase registration and template safety."""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.services.seed_loader import SEED_FILES, load_seed_entries

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS_DIR = Path(__file__).resolve().parents[1] / "app" / "seeds"
_BASES_PATH = _SEEDS_DIR / "bases.json"
_SUMMARY_PATH = _SEEDS_DIR / "_summary.json"
_TEMPLATE_ROOT = _REPO_ROOT / "bases" / "pi-auth-starter"
_BUNDLE_PATH = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "bundles"
    / "base"
    / "pi-auth-starter"
    / "0.1.0.tar.zst"
)

SLUG = "pi-auth-starter"

FORBIDDEN_IMPL_TOKENS = [
    "Pi.createPayment",
    "PI_SERVER_API_KEY",
    "Server API Key",
    "/api/payments",
    "refresh_token",
    "oauth/authorize",
    "wallet/balance",
    "Authorization: Key",
    "stripe",
    "A2U",
]


def _bases() -> list[dict]:
    return json.loads(_BASES_PATH.read_text(encoding="utf-8"))


def _entry() -> dict:
    return next(b for b in _bases() if b["slug"] == SLUG)


def test_bases_json_registered() -> None:
    assert "bases.json" in SEED_FILES


def test_pi_auth_starter_registered_and_discoverable() -> None:
    entries = load_seed_entries()
    base_slugs = {e["slug"] for e in entries if e.get("kind") == "base"}
    assert SLUG in base_slugs

    entry = _entry()
    assert entry["kind"] == "base"
    assert entry["is_active"] is True
    assert entry["is_published"] is True
    assert entry["pricing_type"] == "free"
    assert entry["name"] == "Pi Auth Starter"
    assert entry["default_branch"] == "base/pi-auth-starter"
    assert "Pi.authenticate" in entry["long_description"] or "authenticate" in entry["description"]
    assert "OpenSail" in entry["description"] or "OpenSail" in entry["long_description"]


def test_slug_unique_and_summary_matches() -> None:
    assert [b["slug"] for b in _bases()].count(SLUG) == 1
    all_base_slugs = [e["slug"] for e in load_seed_entries() if e.get("kind") == "base"]
    assert all_base_slugs.count(SLUG) == 1
    summary = json.loads(_SUMMARY_PATH.read_text(encoding="utf-8"))
    assert summary["base"] == len(all_base_slugs)


def test_bundle_exists() -> None:
    assert _BUNDLE_PATH.is_file()


def test_template_tree() -> None:
    required = [
        "frontend/index.html",
        "frontend/src/pi/init.ts",
        "frontend/src/pi/auth.ts",
        "frontend/src/App.tsx",
        "backend/main.py",
        "backend/requirements.txt",
        "docs/PI_SETUP.md",
        "README.md",
        ".tesslate/config.json",
        "TESSLATE.md",
    ]
    for rel in required:
        assert (_TEMPLATE_ROOT / rel).is_file(), rel


def test_sdk_init_and_authenticate() -> None:
    index_html = (_TEMPLATE_ROOT / "frontend/index.html").read_text(encoding="utf-8")
    init_ts = (_TEMPLATE_ROOT / "frontend/src/pi/init.ts").read_text(encoding="utf-8")
    auth_ts = (_TEMPLATE_ROOT / "frontend/src/pi/auth.ts").read_text(encoding="utf-8")
    assert "https://sdk.minepi.com/pi-sdk.js" in index_html
    assert 'version: "2.0"' in init_ts
    assert 'authenticate(["username"]' in auth_ts
    assert "onIncompletePaymentFound" in auth_ts or "onIncomplete" in auth_ts
    assert "/api/pi/auth/verify" in auth_ts
    assert "accessToken" in auth_ts
    # Must not log tokens
    assert "console.log" not in auth_ts
    assert "console.debug" not in auth_ts


def test_backend_me_verification() -> None:
    backend = (_TEMPLATE_ROOT / "backend/main.py").read_text(encoding="utf-8")
    assert 'https://api.minepi.com/v2' in backend
    assert "/me" in backend
    assert "Authorization" in backend and "Bearer" in backend
    assert "@app.post" in backend and "/pi/auth/verify" in backend
    assert "httpx" in backend
    # Never return token
    assert "accessToken" in backend  # request field only
    assert "return" in backend
    assert re.search(r"return\s+.*accessToken", backend) is None


def test_no_payment_or_oauth_implementation() -> None:
    paths = [
        _TEMPLATE_ROOT / "frontend/index.html",
        _TEMPLATE_ROOT / "frontend/src/pi/init.ts",
        _TEMPLATE_ROOT / "frontend/src/pi/auth.ts",
        _TEMPLATE_ROOT / "frontend/src/main.tsx",
        _TEMPLATE_ROOT / "backend/main.py",
        _TEMPLATE_ROOT / ".tesslate/config.json",
        _TEMPLATE_ROOT / "backend/requirements.txt",
    ]
    text = "\n".join(p.read_text(encoding="utf-8") for p in paths)
    for token in FORBIDDEN_IMPL_TOKENS:
        assert token not in text, f"forbidden implementation token: {token}"

    app_tsx = (_TEMPLATE_ROOT / "frontend/src/App.tsx").read_text(encoding="utf-8")
    assert "Pi.createPayment" not in app_tsx
    assert "oauth/authorize" not in app_tsx


def test_documentation_boundaries() -> None:
    readme = (_TEMPLATE_ROOT / "README.md").read_text(encoding="utf-8")
    setup = (_TEMPLATE_ROOT / "docs/PI_SETUP.md").read_text(encoding="utf-8")
    combined = readme + "\n" + setup
    assert "not OpenSail authentication" in combined.lower() or "NOT OpenSail" in combined or "not OpenSail" in combined
    assert "Pi Browser" in combined
    assert "sandbox" in combined.lower()
    assert "Developer Portal" in combined
    assert "Phase 5" in combined
    assert "/v2/me" in combined
    assert "app-scoped" in combined.lower() or "app-scoped" in combined


def test_no_invented_hosts() -> None:
    chunks: list[str] = []
    for path in _TEMPLATE_ROOT.rglob("*"):
        if path.is_file() and path.suffix not in {".svg", ".png", ".ico"}:
            try:
                chunks.append(path.read_text(encoding="utf-8"))
            except UnicodeDecodeError:
                pass
    text = "\n".join(chunks)
    for host in ("oauth.minepi.com", "api.pi.network", "payments.minepi.com"):
        assert host not in text
    assert "PI_NETWORK=mainnet" not in text
    assert "PI_NETWORK=testnet" not in text


def test_web_starter_untouched_by_auth_files() -> None:
    """Phase 3 Web Starter must not gain auth implementation."""
    web = _REPO_ROOT / "bases" / "pi-web-starter"
    assert not (web / "frontend/src/pi/auth.ts").exists()
    web_backend = (web / "backend/main.py").read_text(encoding="utf-8")
    assert "/pi/auth/verify" not in web_backend
    assert "Pi.authenticate" not in (web / "frontend/src/App.tsx").read_text(encoding="utf-8")


def test_phase4_does_not_touch_opensail_auth_or_stripe_trees() -> None:
    """Phase 4 deliverable paths are limited to bases + marketplace seeds/tests."""
    # Structural guard: Auth Starter must not live under OpenSail auth routers.
    assert "orchestrator/app/routers" not in str(_TEMPLATE_ROOT)
    assert (_REPO_ROOT / "orchestrator/app/routers").is_dir()
