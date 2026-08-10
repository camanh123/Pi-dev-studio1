"""Phase 6 — Pi marketplace discoverability + UX safety invariants."""

from __future__ import annotations

import json
import re
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS_DIR = Path(__file__).resolve().parents[1] / "app" / "seeds"
_BASES_PATH = _SEEDS_DIR / "bases.json"
_SKILLS_PATH = _SEEDS_DIR / "skills_pi.json"
_FLAGS_DEFAULTS = _REPO_ROOT / "orchestrator" / "feature_flags" / "defaults.yaml"
_PI_FRONTEND = _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts"
_PI_CHECKLIST = _REPO_ROOT / "app" / "src" / "components" / "pi" / "PiSetupChecklist.tsx"
_CREATE_MODAL = _REPO_ROOT / "app" / "src" / "components" / "modals" / "CreateProjectModal.tsx"

PI_BASE_SLUGS = ("pi-web-starter", "pi-auth-starter", "pi-payments-starter")
PI_SKILL_SLUGS = (
    "pi-sdk",
    "pi-auth",
    "pi-platform-api",
    "pi-payments",
    "pi-developer-portal",
    "pi-browser",
    "pi-compliance",
)


def _bases() -> list[dict]:
    return json.loads(_BASES_PATH.read_text(encoding="utf-8"))


def _skills() -> list[dict]:
    return json.loads(_SKILLS_PATH.read_text(encoding="utf-8"))


def test_pi_bases_remain_in_marketplace_seed():
    by_slug = {b["slug"]: b for b in _bases()}
    for slug in PI_BASE_SLUGS:
        assert slug in by_slug
        entry = by_slug[slug]
        assert entry.get("kind") == "base"
        assert entry.get("is_published") is True
        assert entry.get("is_active") is True
        assert "pi" in (entry.get("tags") or [])


def test_pi_skills_remain_seeded():
    slugs = {s["slug"] for s in _skills()}
    assert set(PI_SKILL_SLUGS).issubset(slugs)


def test_pi_feature_flags_registered_in_yaml_system():
    text = _FLAGS_DEFAULTS.read_text(encoding="utf-8")
    for flag in (
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
    ):
        assert f"{flag}:" in text
        assert flag in text.split("public:")[-1]


def test_frontend_gates_use_existing_feature_flag_hook():
    modal = _CREATE_MODAL.read_text(encoding="utf-8")
    assert "useFeatureFlag" in modal
    assert "PI_FEATURE_FLAGS" in modal
    assert "getEnabledPiFeaturedSlugs" in modal
    # Must not invent a second flag mechanism
    assert "localStorage.getItem('feature" not in modal
    assert "TSL_FEATURE_PI" not in modal


def test_ux_safety_copy_present():
    helper = _PI_FRONTEND.read_text(encoding="utf-8")
    checklist = _PI_CHECKLIST.read_text(encoding="utf-8")
    combined = helper + "\n" + checklist

    assert "OpenSail account" in combined or "OpenSail account ≠" in combined
    assert "Pi Pioneer identity" in combined
    assert "Stripe" in combined
    assert "sandbox" in combined.lower()
    assert "Mainnet" in combined
    assert "Server API Key" in combined
    assert "App Studio" in combined

    # Must not imply Pi is OpenSail login
    assert "Sign in to OpenSail with Pi" not in combined
    assert "Use Pi as OpenSail login" not in combined

    # Must not claim sandbox equals network
    assert not re.search(r"sandbox\s*=\s*Testnet", combined, re.I)
    assert not re.search(r"sandbox\s*=\s*Mainnet", combined, re.I)


def test_no_server_api_key_in_frontend_pi_ux():
    """Phase 6 UX must not embed or prompt for Server API Key values."""
    for path in (_PI_FRONTEND, _PI_CHECKLIST):
        text = path.read_text(encoding="utf-8")
        assert "PI_SERVER_API_KEY=" not in text
        assert "Authorization: Key" not in text
        assert "accessToken" not in text


def test_payments_starter_seed_labels_safety():
    entry = next(b for b in _bases() if b["slug"] == "pi-payments-starter")
    desc = (entry.get("description") or "") + "\n" + (entry.get("long_description") or "")
    assert "Testnet-first" in desc or "Testnet" in desc
    assert "Server API Key" in desc
    assert "Stripe" in desc
    tags = entry.get("tags") or []
    assert "payments" in tags
    assert "sandbox" in tags
