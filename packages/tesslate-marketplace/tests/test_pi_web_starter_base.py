"""Phase 3 — Pi Web Starter MarketplaceBase registration and template safety."""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.services.seed_loader import SEED_FILES, load_seed_entries

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS_DIR = Path(__file__).resolve().parents[1] / "app" / "seeds"
_BASES_PATH = _SEEDS_DIR / "bases.json"
_SUMMARY_PATH = _SEEDS_DIR / "_summary.json"
_TEMPLATE_ROOT = _REPO_ROOT / "bases" / "pi-web-starter"
_CLAIMS_PATH = (
    _REPO_ROOT
    / "packages"
    / "pi-integration"
    / "src"
    / "pi_integration"
    / "knowledge"
    / "unsupported_claims.json"
)

SLUG = "pi-web-starter"

FORBIDDEN_IMPLEMENTATION = [
    "Pi.authenticate",
    "Pi.createPayment",
    "/v2/me",
    "Server API Key",
    "api.minepi.com",
    "Authorization: Key",
    "Authorization: Bearer",
    "onReadyForServerApproval",
    "onReadyForServerCompletion",
    "wallet_address",
    "accessToken",
    "txid",
]

# Documentation may mention deferred features; implementation files must not.
IMPLEMENTATION_GLOBS = [
    "frontend/src/**/*",
    "frontend/index.html",
    "backend/**/*",
    ".tesslate/**/*",
]


def _bases() -> list[dict]:
    return json.loads(_BASES_PATH.read_text(encoding="utf-8"))


def _entry() -> dict:
    return next(b for b in _bases() if b["slug"] == SLUG)


def _read_template_text() -> str:
    chunks: list[str] = []
    for path in _TEMPLATE_ROOT.rglob("*"):
        if not path.is_file():
            continue
        if "node_modules" in path.parts or path.suffix in {".png", ".jpg", ".svg", ".ico"}:
            continue
        try:
            chunks.append(path.read_text(encoding="utf-8"))
        except UnicodeDecodeError:
            continue
    return "\n".join(chunks)


def test_bases_json_is_registered_seed_file() -> None:
    assert "bases.json" in SEED_FILES


def test_pi_web_starter_registered_and_discoverable() -> None:
    entries = load_seed_entries()
    base_slugs = {e["slug"] for e in entries if e.get("kind") == "base"}
    assert SLUG in base_slugs

    entry = _entry()
    assert entry["kind"] == "base"
    assert entry["is_active"] is True
    assert entry["is_published"] is True
    assert entry["pricing_type"] == "free"
    assert entry["name"] == "Pi Web Starter"
    assert "intentionally excluded" in entry["description"].lower() or "intentionally excluded" in entry["description"]
    assert entry["git_repo_url"]
    assert entry["default_branch"] == "base/pi-web-starter"
    assert "pi-sdk" in entry["long_description"]


def test_pi_web_starter_slug_unique() -> None:
    slugs = [b["slug"] for b in _bases()]
    assert slugs.count(SLUG) == 1
    all_base_slugs = [e["slug"] for e in load_seed_entries() if e.get("kind") == "base"]
    assert all_base_slugs.count(SLUG) == 1


def test_summary_base_count_matches_seed_files() -> None:
    summary = json.loads(_SUMMARY_PATH.read_text(encoding="utf-8"))
    base_count = sum(1 for e in load_seed_entries() if e.get("kind") == "base")
    assert summary["base"] == base_count


def test_template_tree_exists() -> None:
    required = [
        "frontend/index.html",
        "frontend/src/pi/init.ts",
        "frontend/src/main.tsx",
        "frontend/src/App.tsx",
        "backend/main.py",
        "backend/requirements.txt",
        "docs/PI_SETUP.md",
        "README.md",
        ".tesslate/config.json",
        "TESSLATE.md",
    ]
    for rel in required:
        assert (_TEMPLATE_ROOT / rel).is_file(), f"missing {rel}"


def test_official_cdn_and_pi_init() -> None:
    index_html = (_TEMPLATE_ROOT / "frontend/index.html").read_text(encoding="utf-8")
    init_ts = (_TEMPLATE_ROOT / "frontend/src/pi/init.ts").read_text(encoding="utf-8")
    assert "https://sdk.minepi.com/pi-sdk.js" in index_html
    assert 'version: "2.0"' in init_ts
    assert "Pi.init" in init_ts or "window.Pi.init" in init_ts
    assert "NOT an official Pi Platform environment variable" in init_ts or "not an official" in init_ts.lower()


def test_no_auth_or_payment_implementation() -> None:
    # Strict scan of runtime integration surfaces only (not README deferrals).
    paths = [
        _TEMPLATE_ROOT / "frontend/index.html",
        _TEMPLATE_ROOT / "frontend/src/pi/init.ts",
        _TEMPLATE_ROOT / "frontend/src/main.tsx",
        _TEMPLATE_ROOT / "backend/main.py",
        _TEMPLATE_ROOT / ".tesslate/config.json",
    ]
    impl_text = "\n".join(p.read_text(encoding="utf-8") for p in paths)

    for token in FORBIDDEN_IMPLEMENTATION:
        assert token not in impl_text, f"forbidden implementation token present: {token}"

    # App UI must not call auth/payment SDK methods either.
    app_tsx = (_TEMPLATE_ROOT / "frontend/src/App.tsx").read_text(encoding="utf-8")
    assert "Pi.authenticate" not in app_tsx
    assert "Pi.createPayment" not in app_tsx
    assert "/v2/me" not in app_tsx


def test_documentation_boundaries() -> None:
    readme = (_TEMPLATE_ROOT / "README.md").read_text(encoding="utf-8")
    setup = (_TEMPLATE_ROOT / "docs/PI_SETUP.md").read_text(encoding="utf-8")
    combined = readme + "\n" + setup

    assert "Pi Browser" in combined
    assert "sandbox" in combined.lower()
    assert "Developer Portal" in combined
    assert "OpenSail cannot automate" in setup or "cannot automate" in setup
    assert "Phase 4" in combined
    assert "Phase 5" in combined
    assert "Pi.authenticate" in combined  # deferred mention OK in docs
    assert "OpenSail preview" in combined
    assert "App Network" in combined or "Testnet" in combined


def test_no_invented_hosts_or_oauth2_claims() -> None:
    text = _read_template_text()
    for host in ("oauth.minepi.com", "api.pi.network", "payments.minepi.com"):
        assert host not in text
    assert not re.search(r"Pi authentication is (an )?OAuth2", text, re.I)
    assert "PI_NETWORK=mainnet" not in text
    assert "PI_NETWORK=testnet" not in text


def test_unsupported_claim_ids_still_loadable() -> None:
    claims = json.loads(_CLAIMS_PATH.read_text(encoding="utf-8"))
    ids = {c["id"] for c in claims["claims"]}
    for required in (
        "official-npm-sdk-required",
        "opensail-preview-equals-pi-browser",
        "sandbox-flag-switches-portal-network",
        "pi-auth-is-oauth2",
        "pi-app-studio-public-api",
    ):
        assert required in ids
