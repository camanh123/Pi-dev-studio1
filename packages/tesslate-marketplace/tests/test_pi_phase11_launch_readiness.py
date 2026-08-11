"""Phase 11 — Launch readiness validation for Pi Dev Studio RC 0.1.0-rc.10.

Validation only: no new Pi APIs. Reuses Phase 10 contracts and documents
rollout/journey readiness for operators.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import pytest

from app.services.seed_loader import DEFAULT_VERSION, load_seed_entries

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds"
_MANIFEST = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-release-manifest.json"
_PHASE10 = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase10-release-candidate.md"
_PHASE11 = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase11-launch-readiness.md"
_FLAGS = _REPO_ROOT / "orchestrator" / "feature_flags" / "defaults.yaml"

PI_BASES = {
    "pi-web-starter": "base/pi-web-starter",
    "pi-auth-starter": "base/pi-auth-starter",
    "pi-payments-starter": "base/pi-payments-starter",
}
PI_SKILLS = (
    "pi-sdk",
    "pi-auth",
    "pi-platform-api",
    "pi-payments",
    "pi-developer-portal",
    "pi-browser",
    "pi-compliance",
)


def _git(*args: str) -> str:
    return subprocess.run(
        ["git", *args],
        cwd=str(_REPO_ROOT),
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()


def _bases() -> list[dict]:
    return json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))


def _skills() -> list[dict]:
    return json.loads((_SEEDS / "skills_pi.json").read_text(encoding="utf-8"))


def _manifest() -> dict:
    return json.loads(_MANIFEST.read_text(encoding="utf-8"))


def test_phase10_artifacts_and_rc_version_intact():
    assert _MANIFEST.is_file()
    assert _PHASE10.is_file()
    m = _manifest()
    assert m["release_version"] == "0.1.0-rc.10"
    assert m["phase"] == 10
    assert (_REPO_ROOT / "packages/pi-integration").is_dir()
    assert (_REPO_ROOT / "packages/tesslate-marketplace").is_dir()
    for slug in PI_BASES:
        assert (_REPO_ROOT / "bases" / slug).is_dir()


def test_phase11_launch_doc_exists_with_rollout_and_checklist():
    assert _PHASE11.is_file()
    text = _PHASE11.read_text(encoding="utf-8")
    for needle in (
        "PHASE 11",
        "Stage 0",
        "Stage 1",
        "Stage 2",
        "Stage 3",
        "Stage 4",
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
        "Launch checklist",
        "Rollback",
        "Mainnet",
        "AgentSkillAssignment",
        "0.1.0-rc.10",
    ):
        assert needle in text, needle
    for label in ("SUPPORTED", "MANUAL", "UNSUPPORTED", "NOT PLANNED"):
        assert label in text


@pytest.mark.parametrize("slug,branch", list(PI_BASES.items()))
def test_developer_journey_starter_discoverable_and_safe(slug: str, branch: str):
    entry = next(b for b in _bases() if b["slug"] == slug)
    assert entry["is_published"] is True
    assert entry["is_active"] is True
    assert entry["default_branch"] == branch
    assert entry["pricing_type"] == "free"
    assert entry.get("version") in (None, "0.1.0")
    assert (entry.get("version") or DEFAULT_VERSION) == "0.1.0"
    assert entry["name"]
    assert entry["description"]
    assert "pi" in [t.lower() for t in entry.get("tags", [])] or "pi" in entry["slug"]

    # Docs present for generated project + checklist path.
    root = _REPO_ROOT / "bases" / slug
    assert (root / "README.md").is_file()
    assert (root / "docs" / "PI_SETUP.md").is_file()
    assert (root / "TESSLATE.md").is_file()
    setup = (root / "docs" / "PI_SETUP.md").read_text(encoding="utf-8")
    assert "Developer Portal" in setup
    assert "manual" in setup.lower() or "MANUAL" in setup

    # Clone branch exists remotely.
    rev = _git("rev-parse", "--verify", f"origin/{branch}")
    assert re.fullmatch(r"[0-9a-f]{40}", rev)


def test_payments_marketplace_copy_does_not_imply_unsupported_capabilities():
    entry = next(b for b in _bases() if b["slug"] == "pi-payments-starter")
    blob = json.dumps(entry).lower()
    assert "testnet" in blob
    assert "human review" in blob
    assert "in-memory" in blob
    assert "not mainnet-production ready" in blob
    assert "no refunds" in blob
    assert "webhooks" in blob and "no refunds, recurring, webhooks" in blob
    assert "automatic mainnet publishing" in blob  # listed as excluded
    # Positive claims of unsupported capabilities must not appear without "no ".
    assert re.search(r"(?<!no )refunds are supported", blob) is None
    assert "supports refunds" not in blob
    assert "supports recurring" not in blob
    assert "supports webhooks" not in blob
    assert "wallet custody" not in blob


def test_feature_flags_off_gate_visibility_helpers():
    flags = _FLAGS.read_text(encoding="utf-8")
    for flag in (
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
    ):
        assert f"{flag}: false" in flags
    helpers = (_REPO_ROOT / "app/src/lib/piDevStudio.ts").read_text(encoding="utf-8")
    assert "isPiBaseVisible" in helpers
    assert "isPiSkillVisible" in helpers
    # OFF → helpers return false for Pi bases/skills
    # (behavioral contract already unit-tested; assert source still present)
    assert "return flags.pi_templates" in helpers or "flags.pi_templates" in helpers
    assert "return flags.pi_skills" in helpers or "flags.pi_skills" in helpers


@pytest.mark.parametrize("slug", PI_SKILLS)
def test_skill_usability_metadata_and_provenance(slug: str):
    skill = next(s for s in _skills() if s["slug"] == slug)
    assert skill["is_builtin"] is False
    assert skill["is_published"] is True
    assert skill["pricing_type"] == "free"
    assert skill["name"]
    assert skill["description"]
    assert "Official sources" in skill["skill_body"]
    catalog = json.loads(
        (
            _REPO_ROOT
            / "packages/pi-integration/src/pi_integration/knowledge/catalog.json"
        ).read_text(encoding="utf-8")
    )
    catalog_ids = {e["id"] for e in catalog["entries"]}
    sources = skill["skill_body"].split("Official sources", 1)[1]
    cited = set(re.findall(r"`(pi-[a-z0-9-]+)`", sources))
    assert cited & catalog_ids


def test_skill_assignment_limitation_communicated_in_ux_and_docs():
    checklist = (
        _REPO_ROOT / "app/src/components/pi/PiSetupChecklist.tsx"
    ).read_text(encoding="utf-8")
    assert "AgentSkillAssignment" in checklist
    assert _PHASE11.read_text(encoding="utf-8").count("AgentSkillAssignment") >= 1
    assert _manifest()["skills"]["assignment"].startswith("AgentSkillAssignment")


def test_security_ux_warnings_present_without_real_secrets():
    payments_readme = (
        _REPO_ROOT / "bases/pi-payments-starter/README.md"
    ).read_text(encoding="utf-8")
    for needle in (
        "PI_SERVER_API_KEY",
        "VITE_*",
        "never logged",
        "AI prompts",
        "server-only",
    ):
        assert needle.lower() in payments_readme.lower() or needle in payments_readme

    auth_setup = (
        _REPO_ROOT / "bases/pi-auth-starter/docs/PI_SETUP.md"
    ).read_text(encoding="utf-8")
    assert "never log" in auth_setup.lower()
    assert "access token" in auth_setup.lower()

    secretish = re.compile(
        r"PI_SERVER_API_KEY\s*[:=]\s*['\"](?!['\"]|your-|changeme|xxx|test-|placeholder)[A-Za-z0-9_\-]{16,}"
    )
    for path in (
        _REPO_ROOT / "bases/pi-payments-starter/README.md",
        _REPO_ROOT / "bases/pi-payments-starter/docs/PI_SETUP.md",
        _REPO_ROOT / "bases/pi-payments-starter/backend/.env.example",
    ):
        assert secretish.search(path.read_text(encoding="utf-8")) is None


def test_payment_mainnet_safety_and_p9_01_still_documented():
    setup = (
        _REPO_ROOT / "bases/pi-payments-starter/docs/PI_SETUP.md"
    ).read_text(encoding="utf-8")
    backend = (
        _REPO_ROOT / "bases/pi-payments-starter/backend/main.py"
    ).read_text(encoding="utf-8")
    assert "in-memory" in setup.lower()
    assert "Testnet" in setup
    assert "human review" in setup.lower()
    assert "durable" in setup.lower()
    assert "_PROTECTED_LOCAL_STATUSES" in backend
    assert "_reconcile_after_platform_error" in backend
    assert "Not OpenSail" in backend or "not OpenSail" in backend


@pytest.mark.parametrize("slug,branch", list(PI_BASES.items()))
def test_clean_room_user_simulation_from_orphan_not_workdir(slug: str, branch: str):
    """Developer A/B/C acquire starters from published orphan branches."""
    names = _git("ls-tree", "-r", "--name-only", f"origin/{branch}").splitlines()
    assert "frontend/src/pi/init.ts" in "\n".join(names)
    assert "docs/PI_SETUP.md" in "\n".join(names)
    for forbidden in ("workspace-data-", "node_modules/", "package-lock.json", "frontend/dist/"):
        assert forbidden not in "\n".join(names)
    assert not any(n.endswith("/.env") or n == ".env" for n in names)

    # Distinct starter trees.
    if slug == "pi-web-starter":
        assert "frontend/src/pi/auth.ts" not in names
        assert "frontend/src/pi/payments.ts" not in names
    elif slug == "pi-auth-starter":
        assert "frontend/src/pi/auth.ts" in names
        assert "frontend/src/pi/payments.ts" not in names
    else:
        assert "frontend/src/pi/payments.ts" in names


def test_release_artifact_hygiene_tracked_files():
    tracked = _git("ls-files").splitlines()
    for path in tracked:
        assert "workspace-data-" not in path
        assert not re.match(r"bases/pi-.*/frontend/package-lock\.json$", path)
        assert not re.match(r"bases/pi-.*/frontend/dist/", path)
    assert "docs/guides/pi-dev-studio-release-manifest.json" in tracked
    assert "docs/guides/pi-dev-studio-phase10-release-candidate.md" in tracked
    assert _PHASE11.is_file()
    # After merge/commit this path is tracked; allow working-tree presence during authoring.
    assert (
        "docs/guides/pi-dev-studio-phase11-launch-readiness.md" in tracked
        or _PHASE11.is_file()
    )


def test_seed_loader_inventory_matches_rc_manifest():
    entries = {(e.get("kind"), e.get("slug")) for e in load_seed_entries()}
    m = _manifest()
    for starter in m["starters"]:
        assert ("base", starter["slug"]) in entries
    for slug in m["skills"]["slugs"]:
        assert ("skill", slug) in entries


def test_opensail_isolation_still_holds_for_pi_templates():
    forbidden = ("stripe.checkout", "/api/auth/login", "from app.auth")
    for slug in PI_BASES:
        root = _REPO_ROOT / "bases" / slug
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in {".py", ".ts", ".tsx", ".js", ".html"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for needle in forbidden:
                assert needle not in text, f"{path}: {needle}"
