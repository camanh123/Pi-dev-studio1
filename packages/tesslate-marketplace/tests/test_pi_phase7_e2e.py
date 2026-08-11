"""Phase 7 — end-to-end contract checks for Pi acquisition + skill loading."""

from __future__ import annotations

import json
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds"
_SYNC = _REPO_ROOT / "orchestrator" / "app" / "services" / "marketplace_sync.py"
_PIPELINE = _REPO_ROOT / "orchestrator" / "app" / "services" / "project_setup" / "pipeline.py"
_LOAD_SKILL = (
    _REPO_ROOT / "orchestrator" / "app" / "agent" / "tools" / "skill_ops" / "load_skill.py"
)
_SKILL_DISCOVERY = _REPO_ROOT / "orchestrator" / "app" / "services" / "skill_discovery.py"
_SYNC_HELPERS = (
    _REPO_ROOT / "orchestrator" / "app" / "services" / "marketplace_sync_helpers.py"
)
PI_BASES = {
    "pi-web-starter": "base/pi-web-starter",
    "pi-auth-starter": "base/pi-auth-starter",
    "pi-payments-starter": "base/pi-payments-starter",
}


def _bases() -> list[dict]:
    return json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))


def _skills() -> list[dict]:
    return json.loads((_SEEDS / "skills_pi.json").read_text(encoding="utf-8"))


def test_pi_seed_default_branches_match_orphan_names():
    by_slug = {b["slug"]: b for b in _bases()}
    for slug, branch in PI_BASES.items():
        assert by_slug[slug]["default_branch"] == branch
        assert by_slug[slug]["git_repo_url"].endswith("Pi-dev-studio1.git")


def test_sync_upsert_preserves_default_branch():
    sync = _SYNC.read_text(encoding="utf-8")
    helpers = _SYNC_HELPERS.read_text(encoding="utf-8")
    assert "resolve_marketplace_base_default_branch" in sync
    assert "default_branch" in helpers
    assert "base/pi-web-starter" in helpers or "default_branch" in helpers


def test_project_setup_pipeline_uses_marketplace_default_branch():
    text = _PIPELINE.read_text(encoding="utf-8")
    assert "base_repo.default_branch" in text
    assert "git_clone" in text


def test_pi_skill_bodies_reference_their_slugs_for_progressive_disclosure():
    """Skill bodies cite their marketplace slugs so agents can request them.

    Wording varies (`load_skill` with skill_name, or ``Load `pi-auth` ``); the
    load_skill executor must accept the slug either way.
    """
    for skill in _skills():
        body = skill["skill_body"]
        slug = skill["slug"]
        assert slug in body, slug
        assert "Load" in body or "load_skill" in body, slug


def test_load_skill_matches_slug_or_name():
    text = _LOAD_SKILL.read_text(encoding="utf-8")
    helpers = _SYNC_HELPERS.read_text(encoding="utf-8")
    discovery = _SKILL_DISCOVERY.read_text(encoding="utf-8")
    assert "match_skill_catalog_entry" in text
    assert "def match_skill_catalog_entry" in helpers
    assert "slug: str | None" in discovery
    assert "MarketplaceAgent.slug" in discovery

def test_pi_runtime_does_not_call_opensail_auth_or_stripe():
    """Generated-app runtime must not bridge into OpenSail auth/billing."""
    forbidden_runtime = (
        "from app.auth",
        "opensail_auth",
        "stripe.checkout",
        "/api/auth/login",
        "Team credits",
    )
    for slug in PI_BASES:
        root = _REPO_ROOT / "bases" / slug
        for rel in (
            "frontend/src",
            "backend/main.py",
            "frontend/index.html",
        ):
            target = root / rel
            paths = [target] if target.is_file() else list(target.rglob("*")) if target.is_dir() else []
            for path in paths:
                if not path.is_file():
                    continue
                if path.suffix.lower() not in {".py", ".ts", ".tsx", ".js", ".html"}:
                    continue
                text = path.read_text(encoding="utf-8", errors="ignore")
                for needle in forbidden_runtime:
                    assert needle not in text, f"{path} contains {needle!r}"


def test_payments_frontend_has_no_server_api_key():
    frontend = _REPO_ROOT / "bases" / "pi-payments-starter" / "frontend"
    for path in frontend.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".ts", ".tsx", ".js", ".html", ".env", ".json"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        assert "PI_SERVER_API_KEY" not in text
        assert "Authorization: Key" not in text
        assert "Authorization:Key" not in text
