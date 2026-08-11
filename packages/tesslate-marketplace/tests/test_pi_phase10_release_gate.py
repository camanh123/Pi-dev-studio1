"""Phase 10 — Pi Dev Studio release candidate / final release gate.

Fast, deterministic contracts. Does not call Mainnet or require Pi credentials.
Clean-room npm builds remain covered by Phase 9; this gate verifies release
metadata, version consistency, isolation, and highest-value safety contracts.
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
_BUNDLES = Path(__file__).resolve().parents[1] / "app" / "bundles"
_MANIFEST = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-release-manifest.json"
_PHASE10_DOC = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase10-release-candidate.md"
_FLAGS = _REPO_ROOT / "orchestrator" / "feature_flags" / "defaults.yaml"
_PIPELINE = _REPO_ROOT / "orchestrator" / "app" / "services" / "project_setup" / "pipeline.py"
_SYNC_HELPERS = (
    _REPO_ROOT / "orchestrator" / "app" / "services" / "marketplace_sync_helpers.py"
)
_LOAD_SKILL = (
    _REPO_ROOT / "orchestrator" / "app" / "agent" / "tools" / "skill_ops" / "load_skill.py"
)
_PI_INTEGRATION = _REPO_ROOT / "packages" / "pi-integration"
_PAYMENTS_BACKEND = _REPO_ROOT / "bases" / "pi-payments-starter" / "backend" / "main.py"

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

REQUIRED_UNSUPPORTED = (
    "pi-auth-is-oauth2",
    "pi-auth-is-opensail-oauth-provider",
    "pi-payment-is-stripe",
    "pi-payment-supports-refunds",
    "pi-payment-supports-recurring-billing",
    "pi-payment-has-stripe-webhooks",
    "pi-app-studio-public-api",
    "pi-app-studio-deploy-api",
    "pi-app-studio-publish-api",
    "pi-wallet-custody-api",
    "pi-wallet-balance-api",
    "pi-wallet-history-api",
    "pi-token-refresh-protocol",
    "official-python-core-team-sdk",
    "official-npm-sdk-required",
    "a2u-available-on-mainnet",
    "sandbox-flag-switches-portal-network",
    "opensail-preview-equals-pi-browser",
)

OPENSAIL_FORBIDDEN_TOUCH = (
    "orchestrator/app/routers/auth.py",
    "orchestrator/app/routers/billing.py",
    "packages/tesslate-agent",
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


# ---------------------------------------------------------------------------
# Architecture / manifest
# ---------------------------------------------------------------------------


def test_required_pi_surfaces_exist():
    required = [
        _REPO_ROOT / "packages" / "pi-integration",
        _REPO_ROOT / "packages" / "tesslate-marketplace",
        _REPO_ROOT / "bases" / "pi-web-starter",
        _REPO_ROOT / "bases" / "pi-auth-starter",
        _REPO_ROOT / "bases" / "pi-payments-starter",
        _REPO_ROOT / "app" / "src" / "components" / "modals" / "CreateProjectModal.tsx",
        _REPO_ROOT / "app" / "src" / "pages" / "ProjectSetup.tsx",
        _REPO_ROOT / "app" / "src" / "components" / "pi" / "PiSetupChecklist.tsx",
        _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts",
        _FLAGS,
        _SYNC_HELPERS,
        _LOAD_SKILL,
        _REPO_ROOT / "orchestrator" / "app" / "services" / "skill_discovery.py",
    ]
    missing = [str(p) for p in required if not p.exists()]
    assert not missing, f"PHASE 10 BLOCKED — missing surfaces: {missing}"


def test_release_manifest_is_machine_readable_and_complete():
    m = _manifest()
    assert m["release_version"] == "0.1.0-rc.10"
    assert m["phase"] == 10
    assert m["knowledge_corpus"]["package_version"] == "0.1.0"
    assert m["skills"]["version"] == "0.1.0"
    assert m["skills"]["is_builtin"] is False
    assert set(m["skills"]["slugs"]) == set(PI_SKILLS)
    assert {s["slug"] for s in m["starters"]} == set(PI_BASES)
    assert m["feature_flags"]["production_defaults"] == "OFF"
    assert m["feature_flags"]["public"] is True
    assert len(m["known_limitations"]) >= 8
    assert _PHASE10_DOC.is_file()


# ---------------------------------------------------------------------------
# Version consistency + inventory
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("slug,branch", list(PI_BASES.items()))
def test_seed_bundle_orphan_version_consistency(slug: str, branch: str):
    by_slug = {b["slug"]: b for b in _bases()}
    entry = by_slug[slug]
    version = entry.get("version") or DEFAULT_VERSION
    assert version == "0.1.0"
    assert entry["default_branch"] == branch
    assert entry["default_branch"] not in {"main", "master"}
    assert entry["git_repo_url"].endswith("Pi-dev-studio1.git")
    assert entry["slug"] == slug

    bundle = _BUNDLES / "base" / slug / f"{version}.tar.zst"
    assert bundle.is_file(), f"missing bundle {bundle}"

    template = _REPO_ROOT / "bases" / slug
    assert template.is_dir()
    pkg = json.loads((template / "frontend" / "package.json").read_text(encoding="utf-8"))
    assert pkg.get("version") == version

    rev = _git("rev-parse", "--verify", f"origin/{branch}")
    assert re.fullmatch(r"[0-9a-f]{40}", rev)

    # Manifest agrees with seeds.
    m_entry = next(s for s in _manifest()["starters"] if s["slug"] == slug)
    assert m_entry["default_branch"] == branch
    assert m_entry["version"] == version


@pytest.mark.parametrize("slug", PI_SKILLS)
def test_skill_seed_bundle_and_builtin_false(slug: str):
    skill = next(s for s in _skills() if s["slug"] == slug)
    assert skill["is_builtin"] is False
    assert skill["slug"] == slug
    version = skill.get("version") or DEFAULT_VERSION
    assert version == "0.1.0"
    assert (_BUNDLES / "skill" / slug / f"{version}.tar.zst").is_file()


def test_seed_loader_sees_pi_inventory():
    entries = load_seed_entries()
    kinds = {(e.get("kind"), e.get("slug")) for e in entries}
    for slug in PI_BASES:
        assert ("base", slug) in kinds
    for slug in PI_SKILLS:
        assert ("skill", slug) in kinds


# ---------------------------------------------------------------------------
# Feature flags
# ---------------------------------------------------------------------------


def test_feature_flags_default_off_public_snake_case():
    text = _FLAGS.read_text(encoding="utf-8")
    for flag in (
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
    ):
        assert f"{flag}: false" in text
    assert re.search(r"(?m)^pi\.knowledge:", text) is None
    public = text.split("public:")[-1]
    for flag in (
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
    ):
        assert flag in public

    frontend = (_REPO_ROOT / "app/src/lib/piDevStudio.ts").read_text(encoding="utf-8")
    assert "pi_knowledge" in frontend
    assert "useFeatureFlag" in (
        _REPO_ROOT / "app/src/components/modals/CreateProjectModal.tsx"
    ).read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Create-project path / no silent main fallback
# ---------------------------------------------------------------------------


def test_create_project_uses_marketplace_default_branch():
    pipeline = _PIPELINE.read_text(encoding="utf-8")
    helpers = _SYNC_HELPERS.read_text(encoding="utf-8")
    assert "base_repo.default_branch" in pipeline
    assert "resolve_marketplace_base_default_branch" in helpers
    by_slug = {b["slug"]: b for b in _bases()}
    for slug, branch in PI_BASES.items():
        assert by_slug[slug]["default_branch"] == branch


def test_load_skill_matches_slug_and_skills_require_assignment_copy():
    assert "match_skill_catalog_entry" in _LOAD_SKILL.read_text(encoding="utf-8")
    checklist = (
        _REPO_ROOT / "app/src/components/pi/PiSetupChecklist.tsx"
    ).read_text(encoding="utf-8")
    assert "AgentSkillAssignment" in checklist
    assert "does not auto-assign" in checklist.lower() or "not auto-assign" in checklist


# ---------------------------------------------------------------------------
# Provenance + unsupported claims
# ---------------------------------------------------------------------------


def test_provenance_catalog_and_unsupported_claims_intact():
    catalog = json.loads(
        (_PI_INTEGRATION / "src/pi_integration/knowledge/catalog.json").read_text(
            encoding="utf-8"
        )
    )
    claims = json.loads(
        (
            _PI_INTEGRATION / "src/pi_integration/knowledge/unsupported_claims.json"
        ).read_text(encoding="utf-8")
    )
    catalog_ids = {e["id"] for e in catalog["entries"]}
    assert catalog["schema_version"] == 1
    assert len(catalog_ids) == _manifest()["supported_official_source_catalog"]["entry_count"]

    claim_ids = {c["id"] for c in claims["claims"]}
    for required in REQUIRED_UNSUPPORTED:
        assert required in claim_ids

    for skill in _skills():
        sources = skill["skill_body"].split("Official sources", 1)[1]
        cited = set(re.findall(r"`(pi-[a-z0-9-]+)`", sources))
        assert cited & catalog_ids, skill["slug"]
        for entry_id in cited & catalog_ids:
            entry = next(e for e in catalog["entries"] if e["id"] == entry_id)
            assert entry["source_url"].startswith("https://")
            assert entry.get("community") is False


# ---------------------------------------------------------------------------
# Starter security contracts (static)
# ---------------------------------------------------------------------------


def test_web_starter_security_contract():
    root = _REPO_ROOT / "bases" / "pi-web-starter"
    init = (root / "frontend/src/pi/init.ts").read_text(encoding="utf-8")
    index = (root / "frontend/index.html").read_text(encoding="utf-8")
    app = (root / "frontend/src/App.tsx").read_text(encoding="utf-8")
    backend = (root / "backend/main.py").read_text(encoding="utf-8")
    blob = index + init + app + backend
    assert "Pi.init" in init and 'version: "2.0"' in init and "sandbox" in init
    for token in (
        "Pi.authenticate",
        "/v2/me",
        "Pi.createPayment",
        "PI_SERVER_API_KEY",
    ):
        assert token not in blob


def test_auth_starter_security_contract():
    root = _REPO_ROOT / "bases" / "pi-auth-starter"
    auth = (root / "frontend/src/pi/auth.ts").read_text(encoding="utf-8")
    backend = (root / "backend/main.py").read_text(encoding="utf-8")
    assert "authenticate" in auth and "username" in auth
    assert "https://api.minepi.com/v2/me" in backend
    assert "Bearer" in backend
    for token in ("PI_SERVER_API_KEY", "Pi.createPayment", "stripe", "/api/auth/"):
        assert token not in auth + backend


def test_payments_starter_security_and_reconcile_contract():
    root = _REPO_ROOT / "bases" / "pi-payments-starter"
    pay = (root / "frontend/src/pi/payments.ts").read_text(encoding="utf-8")
    backend = _PAYMENTS_BACKEND.read_text(encoding="utf-8")
    assert "createPayment" in pay
    assert "onReadyForServerApproval" in pay
    assert "onReadyForServerCompletion" in pay
    assert "/approve" in backend and "/complete" in backend
    assert "_reconcile_after_platform_error" in backend
    assert "_PROTECTED_LOCAL_STATUSES" in backend
    frontend_blob = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (root / "frontend").rglob("*")
        if p.is_file() and p.suffix in {".ts", ".tsx", ".html", ".env", ".json"}
    )
    assert "PI_SERVER_API_KEY" not in frontend_blob
    assert "VITE_PI_SERVER" not in frontend_blob


# ---------------------------------------------------------------------------
# Secret / credential final gate (scoped Pi surfaces)
# ---------------------------------------------------------------------------


def test_no_real_pi_credentials_in_release_surfaces():
    roots = [
        _REPO_ROOT / "bases" / "pi-web-starter",
        _REPO_ROOT / "bases" / "pi-auth-starter",
        _REPO_ROOT / "bases" / "pi-payments-starter",
        _SEEDS / "skills_pi.json",
        _REPO_ROOT / "app" / "src" / "components" / "pi",
        _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts",
        _MANIFEST,
        _PHASE10_DOC,
    ]
    secretish = re.compile(
        r"PI_SERVER_API_KEY\s*[:=]\s*['\"](?!['\"]|your-|changeme|xxx|test-|placeholder|not-real)[A-Za-z0-9_\-]{16,}"
    )
    vite_secret = re.compile(r"VITE_[A-Z0-9_]*PI[A-Z0-9_]*SERVER[A-Z0-9_]*\s*=")
    for root in roots:
        paths = [root] if root.is_file() else list(root.rglob("*"))
        for path in paths:
            if not path.is_file():
                continue
            if any(part in {"node_modules", "dist", ".git"} for part in path.parts):
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            assert secretish.search(text) is None, path
            if "frontend" in path.parts or path.suffix in {".tsx", ".ts", ".html"}:
                assert "Authorization: Key" not in text or "never" in text.lower()
            assert vite_secret.search(text) is None, path


# ---------------------------------------------------------------------------
# Clean-room release assumptions (no npm; artifact rejection)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("slug,branch", list(PI_BASES.items()))
def test_orphan_branch_tree_has_no_local_audit_artifacts(slug: str, branch: str):
    names = _git("ls-tree", "-r", "--name-only", f"origin/{branch}").splitlines()
    assert names, f"empty orphan branch {branch}"
    joined = "\n".join(names)
    assert "frontend/index.html" in joined
    assert "frontend/src/pi/init.ts" in joined
    for forbidden in (
        "workspace-data-",
        "node_modules/",
        "package-lock.json",
        "frontend/dist/",
        ".DS_Store",
        ".env",
    ):
        # .env.example is allowed; plain .env is not.
        if forbidden == ".env":
            assert not any(
                n.endswith("/.env") or n == ".env" for n in names
            ), f"{branch} contains .env"
            continue
        assert forbidden not in joined, f"{branch} contains {forbidden}"


# ---------------------------------------------------------------------------
# OpenSail isolation
# ---------------------------------------------------------------------------


def test_opensail_isolation_pi_runtime_and_untouched_core_paths():
    forbidden_runtime = (
        "from app.auth",
        "opensail_auth",
        "stripe.checkout",
        "/api/auth/login",
    )
    for slug in PI_BASES:
        root = _REPO_ROOT / "bases" / slug
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".py", ".ts", ".tsx", ".js", ".html"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            for needle in forbidden_runtime:
                assert needle not in text, f"{path} contains {needle}"

    # Core OpenSail surfaces must still exist (not deleted by Pi release).
    for rel in OPENSAIL_FORBIDDEN_TOUCH:
        path = _REPO_ROOT / rel
        # tesslate-agent may be a submodule dir; routers must exist as files.
        if rel.endswith(".py"):
            assert path.is_file(), rel
        else:
            assert path.exists(), rel

    payments = _PAYMENTS_BACKEND.read_text(encoding="utf-8")
    assert "Not OpenSail" in payments or "not OpenSail" in payments.lower()
    assert "Stripe" in payments or "not-opensail-stripe" in payments


# ---------------------------------------------------------------------------
# Documentation + rollback
# ---------------------------------------------------------------------------


def test_phase10_release_doc_labels_and_rollback():
    text = _PHASE10_DOC.read_text(encoding="utf-8")
    for label in ("SUPPORTED", "MANUAL", "UNSUPPORTED", "NOT PLANNED"):
        assert label in text
    assert "Rollback" in text or "rollback" in text
    assert "feature flags OFF" in text or "flags OFF" in text
    assert "AgentSkillAssignment" in text
    assert "Mainnet" in text
    assert "Developer Portal" in text
    assert "PHASE 10" in text


def test_payment_state_safety_module_still_present():
    safety = (
        Path(__file__).resolve().parent / "test_pi_payments_state_safety.py"
    )
    assert safety.is_file()
    text = safety.read_text(encoding="utf-8")
    assert "failed_upsert_does_not_overwrite_approved" in text
    assert "reconcile" in text
