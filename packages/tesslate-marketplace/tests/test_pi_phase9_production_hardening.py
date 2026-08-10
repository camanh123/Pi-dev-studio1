"""Phase 9 — Production hardening & real developer workflow gates.

Behavioral checks (seed → branch → clean-room clone → contracts → safety).
Does not invent Pi APIs or call Mainnet.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds"
_PI_INTEGRATION = _REPO_ROOT / "packages" / "pi-integration"
_FLAGS = _REPO_ROOT / "orchestrator" / "feature_flags" / "defaults.yaml"
_PIPELINE = _REPO_ROOT / "orchestrator" / "app" / "services" / "project_setup" / "pipeline.py"
_SYNC_HELPERS = (
    _REPO_ROOT / "orchestrator" / "app" / "services" / "marketplace_sync_helpers.py"
)
_CHECKLIST = _REPO_ROOT / "app" / "src" / "components" / "pi" / "PiSetupChecklist.tsx"
_PI_HELPERS = _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts"

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

EXPECTED_FILES = {
    "pi-web-starter": [
        "frontend/index.html",
        "frontend/src/pi/init.ts",
        "frontend/src/App.tsx",
        "backend/main.py",
        "docs/PI_SETUP.md",
        "TESSLATE.md",
        ".tesslate/config.json",
    ],
    "pi-auth-starter": [
        "frontend/index.html",
        "frontend/src/pi/init.ts",
        "frontend/src/pi/auth.ts",
        "backend/main.py",
        "docs/PI_SETUP.md",
        "TESSLATE.md",
        ".tesslate/config.json",
    ],
    "pi-payments-starter": [
        "frontend/index.html",
        "frontend/src/pi/init.ts",
        "frontend/src/pi/auth.ts",
        "frontend/src/pi/payments.ts",
        "backend/main.py",
        "docs/PI_SETUP.md",
        "TESSLATE.md",
        ".tesslate/config.json",
    ],
}


def _bases() -> list[dict]:
    return json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))


def _skills() -> list[dict]:
    return json.loads((_SEEDS / "skills_pi.json").read_text(encoding="utf-8"))


def _git(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=str(cwd or _REPO_ROOT),
        check=True,
        capture_output=True,
        text=True,
    )


def _archive_orphan_branch(branch: str, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        ["git", "archive", "--format=tar", f"origin/{branch}"],
        cwd=str(_REPO_ROOT),
        check=True,
        capture_output=True,
    )
    with tempfile.NamedTemporaryFile(suffix=".tar", delete=False) as tmp:
        tmp.write(proc.stdout)
        tar_path = Path(tmp.name)
    try:
        with tarfile.open(tar_path, "r") as tf:
            tf.extractall(dest)
    finally:
        tar_path.unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# 1–2 Clean-room reproducibility
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("slug,branch", list(PI_BASES.items()))
def test_seed_default_branch_points_at_orphan(slug: str, branch: str):
    by_slug = {b["slug"]: b for b in _bases()}
    assert by_slug[slug]["default_branch"] == branch
    rev = _git("rev-parse", "--verify", f"origin/{branch}").stdout.strip()
    assert re.fullmatch(r"[0-9a-f]{40}", rev)


@pytest.mark.parametrize("slug,branch", list(PI_BASES.items()))
def test_clean_room_archive_has_expected_files_without_local_artifacts(
    slug: str, branch: str, tmp_path: Path
):
    dest = tmp_path / slug
    _archive_orphan_branch(branch, dest)

    for rel in EXPECTED_FILES[slug]:
        assert (dest / rel).is_file(), f"{slug}: missing {rel} in clean-room archive"

    # Must not depend on local audit / workspace artifacts.
    forbidden_names = (
        "workspace-data-",
        "node_modules",
        "package-lock.json",
        ".pytest_cache",
    )
    for path in dest.rglob("*"):
        name = path.name
        for needle in forbidden_names:
            assert needle not in name, f"{slug}: unexpected artifact {path}"
        if path.is_file() and path.suffix == ".log":
            pytest.fail(f"{slug}: unexpected log {path}")

    # Starter identity must not collapse across branches.
    readme = (dest / "README.md").read_text(encoding="utf-8").lower()
    if slug == "pi-web-starter":
        assert "web" in readme and "authenticate" not in (dest / "frontend/src/App.tsx").read_text(
            encoding="utf-8"
        )
    elif slug == "pi-auth-starter":
        assert "auth" in readme and (dest / "frontend/src/pi/auth.ts").is_file()
    else:
        assert "payment" in readme and (dest / "frontend/src/pi/payments.ts").is_file()


@pytest.mark.parametrize("slug,branch", list(PI_BASES.items()))
def test_clean_room_frontend_build(slug: str, branch: str, tmp_path: Path):
    if shutil.which("npm") is None:
        pytest.skip("npm not available")
    dest = tmp_path / slug
    _archive_orphan_branch(branch, dest)
    frontend = dest / "frontend"
    assert frontend.is_dir()
    # Ensure build does not see host workspace node_modules / dist.
    assert not (frontend / "node_modules").exists()
    assert not (frontend / "dist").exists()
    install = subprocess.run(
        ["npm", "install", "--no-fund", "--no-audit"],
        cwd=str(frontend),
        capture_output=True,
        text=True,
        env={**os.environ, "CI": "1"},
    )
    assert install.returncode == 0, install.stdout + install.stderr
    build = subprocess.run(
        ["npm", "run", "build"],
        cwd=str(frontend),
        capture_output=True,
        text=True,
        env={**os.environ, "CI": "1"},
    )
    assert build.returncode == 0, build.stdout + build.stderr
    assert (frontend / "dist").is_dir()
    dist_text = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (frontend / "dist").rglob("*")
        if p.is_file() and p.suffix in {".js", ".html", ".css"}
    )
    assert "PI_SERVER_API_KEY" not in dist_text
    assert "Authorization: Key" not in dist_text


# ---------------------------------------------------------------------------
# 3–5 Starter contracts
# ---------------------------------------------------------------------------


def test_web_starter_minimal_contract():
    root = _REPO_ROOT / "bases" / "pi-web-starter"
    index = (root / "frontend/index.html").read_text(encoding="utf-8")
    init = (root / "frontend/src/pi/init.ts").read_text(encoding="utf-8")
    app = (root / "frontend/src/App.tsx").read_text(encoding="utf-8")
    backend = (root / "backend/main.py").read_text(encoding="utf-8")
    assert "https://sdk.minepi.com/pi-sdk.js" in index
    assert "Pi.init" in init
    assert 'version: "2.0"' in init
    assert "sandbox" in init
    for token in (
        "Pi.authenticate",
        "/v2/me",
        "Pi.createPayment",
        "/v2/payments",
        "PI_SERVER_API_KEY",
        "Authorization: Key",
    ):
        assert token not in index + init + app + backend, token


def test_auth_starter_me_bearer_contract():
    root = _REPO_ROOT / "bases" / "pi-auth-starter"
    auth = (root / "frontend/src/pi/auth.ts").read_text(encoding="utf-8")
    backend = (root / "backend/main.py").read_text(encoding="utf-8")
    assert 'authenticate(["username"]' in auth or "authenticate(['username']" in auth
    assert "https://api.minepi.com/v2/me" in backend
    assert "Bearer" in backend
    assert "Authorization" in backend
    # Token hygiene — do not log access tokens
    assert not re.search(r"logger\.[a-z]+\(.*accessToken", backend)
    # Response model must not echo accessToken back to the frontend
    verified_model = backend.split("class VerifiedUserResponse")[1].split("@app.")[0]
    assert "accessToken" not in verified_model
    assert "uid" in verified_model
    # No payments / OpenSail auth / Stripe / Server Key in this starter
    for token in (
        "Pi.createPayment",
        "PI_SERVER_API_KEY",
        "stripe",
        "/api/auth/",
        'f"Key ',
        "Key {key}",
        "/payments/",
    ):
        assert token not in auth + backend, token


def test_payments_starter_u2a_flow_contract():
    root = _REPO_ROOT / "bases" / "pi-payments-starter"
    pay = (root / "frontend/src/pi/payments.ts").read_text(encoding="utf-8")
    backend = (root / "backend/main.py").read_text(encoding="utf-8")
    assert "createPayment" in pay
    assert "onReadyForServerApproval" in pay
    assert "onReadyForServerCompletion" in pay
    assert "/approve" in backend and "/complete" in backend
    assert 'Authorization": f"Key' in backend or "Key {key}" in backend
    assert "Bearer" in backend  # /me only
    assert "_reconcile_after_platform_error" in backend
    assert "_PROTECTED_LOCAL_STATUSES" in backend
    # Frontend must never see server key
    frontend_blob = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (root / "frontend").rglob("*")
        if p.is_file() and p.suffix in {".ts", ".tsx", ".html", ".env", ".json"}
    )
    assert "PI_SERVER_API_KEY" not in frontend_blob
    assert "VITE_PI_SERVER" not in frontend_blob


def test_starters_are_distinct():
    trees = {}
    for slug in PI_BASES:
        root = _REPO_ROOT / "bases" / slug
        trees[slug] = {
            "has_auth_ts": (root / "frontend/src/pi/auth.ts").is_file(),
            "has_payments_ts": (root / "frontend/src/pi/payments.ts").is_file(),
            "backend": (root / "backend/main.py").read_text(encoding="utf-8"),
        }
    assert trees["pi-web-starter"]["has_auth_ts"] is False
    assert trees["pi-web-starter"]["has_payments_ts"] is False
    assert trees["pi-auth-starter"]["has_auth_ts"] is True
    assert trees["pi-auth-starter"]["has_payments_ts"] is False
    assert trees["pi-payments-starter"]["has_payments_ts"] is True
    assert "createPayment" not in trees["pi-auth-starter"]["backend"]
    assert "/payments/" in trees["pi-payments-starter"]["backend"]


# ---------------------------------------------------------------------------
# 7 Skill assignment / discovery (architecture, not agent rewrite)
# ---------------------------------------------------------------------------


def test_pi_skills_not_builtin_require_assignment():
    for skill in _skills():
        assert skill["is_builtin"] is False, skill["slug"]
        assert skill["slug"] in PI_SKILLS


def test_checklist_and_helpers_document_skill_assignment():
    checklist = _CHECKLIST.read_text(encoding="utf-8")
    helpers = _PI_HELPERS.read_text(encoding="utf-8")
    assert "AgentSkillAssignment" in checklist
    assert "pi-skill-assignment-guidance" in checklist
    assert "PI_RECOMMENDED_SKILLS_BY_BASE" in helpers
    assert "getRecommendedPiSkillsForBase" in helpers
    assert "attach-pi-skills" in helpers


def test_tesslate_md_skill_guidance_matches_starters():
    web = (_REPO_ROOT / "bases/pi-web-starter/TESSLATE.md").read_text(encoding="utf-8")
    auth = (_REPO_ROOT / "bases/pi-auth-starter/TESSLATE.md").read_text(encoding="utf-8")
    pay = (_REPO_ROOT / "bases/pi-payments-starter/TESSLATE.md").read_text(encoding="utf-8")
    assert "pi-sdk" in web
    assert "pi-auth" in auth and "pi-platform-api" in auth
    assert "pi-payments" in pay and "pi-platform-api" in pay


# ---------------------------------------------------------------------------
# 8 Provenance
# ---------------------------------------------------------------------------


def test_pi_skill_bodies_cite_phase1_catalog_ids():
    catalog = json.loads(
        (_PI_INTEGRATION / "src/pi_integration/knowledge/catalog.json").read_text(
            encoding="utf-8"
        )
    )
    catalog_ids = {e["id"] for e in catalog["entries"]}
    for skill in _skills():
        body = skill["skill_body"]
        assert "Official sources" in body, skill["slug"]
        # Prefer IDs listed under Official sources (normative), not related skill slugs.
        sources_section = body.split("Official sources", 1)[1]
        cited = set(re.findall(r"`(pi-[a-z0-9-]+)`", sources_section))
        assert cited & catalog_ids, f"{skill['slug']} cites no catalog ids; found {cited}"


def test_unsupported_claims_registry_covers_agent_safety_prompts():
    claims = json.loads(
        (
            _PI_INTEGRATION / "src/pi_integration/knowledge/unsupported_claims.json"
        ).read_text(encoding="utf-8")
    )
    ids = {c["id"] for c in claims["claims"]}
    for required in (
        "sandbox-flag-switches-portal-network",
        "opensail-preview-equals-pi-browser",
        "pi-app-studio-deploy-api",
        "a2u-available-on-mainnet",
        "pi-payment-is-stripe",
        "pi-auth-is-opensail-oauth-provider",
    ):
        assert required in ids


# ---------------------------------------------------------------------------
# 9 AI agent safety (skill-body / corpus contracts — no tesslate-agent changes)
# ---------------------------------------------------------------------------


def _skill_body(slug: str) -> str:
    return next(s["skill_body"] for s in _skills() if s["slug"] == slug)


def test_agent_safety_add_pi_login():
    auth = _skill_body("pi-auth")
    assert "Pi.authenticate" in auth
    assert "/v2/me" in auth or "/me" in auth
    assert "accessToken" in auth
    assert "NOT OpenSail" in auth or "not OpenSail" in auth
    for forbidden in ("Google OAuth", "/api/auth/login", "OAuth2 redirect"):
        assert forbidden not in auth


def test_agent_safety_add_pi_payment():
    payments = _skill_body("pi-payments")
    platform = _skill_body("pi-platform-api")
    combined = payments + "\n" + platform
    assert "createPayment" in combined or "U2A" in combined
    assert "approve" in combined and "complete" in combined
    assert "Key" in combined
    # Boundary language may mention Stripe only to forbid replacement.
    assert "do not replace" in payments.lower() or "not" in payments.lower()
    for forbidden in (
        "import stripe",
        "stripe.checkout",
        "VITE_PI_SERVER_API_KEY",
        "refund API implementation",
        "wallet custody tool",
    ):
        assert forbidden not in combined.lower()
    assert "A2U is currently available only on the Testnet" in platform or "Testnet" in payments


def test_agent_safety_mainnet_and_auto_register():
    portal = _skill_body("pi-developer-portal")
    browser = _skill_body("pi-browser")
    combined = portal + "\n" + browser
    assert "Developer Portal" in combined
    assert "Mainnet" in combined
    assert "manual" in combined.lower() or "MANUAL" in combined
    assert "sandbox" in combined.lower()
    # Must not invent portal automation API
    for invented in (
        "POST /portal/apps",
        "auto-register",
        "registerPiApp(",
        "switchNetwork(",
    ):
        assert invented not in combined


# ---------------------------------------------------------------------------
# 10 Secret / credential gate (scoped)
# ---------------------------------------------------------------------------


def test_no_real_server_api_key_committed_in_pi_surfaces():
    roots = [
        _REPO_ROOT / "bases" / "pi-web-starter",
        _REPO_ROOT / "bases" / "pi-auth-starter",
        _REPO_ROOT / "bases" / "pi-payments-starter",
        _SEEDS / "skills_pi.json",
        _REPO_ROOT / "app" / "src" / "components" / "pi",
        _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts",
    ]
    # Real-looking key patterns (not placeholders / empty assignments)
    secretish = re.compile(
        r"PI_SERVER_API_KEY\s*[:=]\s*['\"](?!['\"]|your-|changeme|xxx|test-|placeholder)[A-Za-z0-9_\-]{16,}"
    )
    for root in roots:
        paths = [root] if root.is_file() else list(root.rglob("*"))
        for path in paths:
            if not path.is_file():
                continue
            if any(part in {"node_modules", "dist", ".git"} for part in path.parts):
                continue
            if path.suffix.lower() not in {
                ".py",
                ".ts",
                ".tsx",
                ".js",
                ".html",
                ".md",
                ".json",
                ".env",
                ".example",
                "",
            } and path.name not in {".env.example"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            assert secretish.search(text) is None, f"possible committed secret in {path}"


def test_payments_frontend_vite_env_has_no_server_key():
    env_example = _REPO_ROOT / "bases/pi-payments-starter/frontend/.env.example"
    if env_example.is_file():
        text = env_example.read_text(encoding="utf-8")
        assert "PI_SERVER_API_KEY" not in text
        assert "VITE_PI_SERVER" not in text


# ---------------------------------------------------------------------------
# 11 Release hygiene
# ---------------------------------------------------------------------------


def test_release_hygiene_gitignore_covers_local_audit_artifacts():
    gi = (_REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
    assert "workspace-data-*/" in gi or "workspace-data-" in gi
    assert "bases/pi-*/frontend/package-lock.json" in gi
    assert "bases/pi-*/frontend/dist/" in gi


def test_git_does_not_track_workspace_data_or_starter_lockfiles():
    tracked = _git("ls-files").stdout.splitlines()
    for path in tracked:
        assert "workspace-data-" not in path
        assert not re.match(r"bases/pi-.*/frontend/package-lock\.json$", path)
        assert not re.match(r"bases/pi-.*/frontend/dist/", path)


# ---------------------------------------------------------------------------
# 12 Feature flags
# ---------------------------------------------------------------------------


def test_feature_flags_snake_case_default_off_public():
    text = _FLAGS.read_text(encoding="utf-8")
    for flag in (
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
    ):
        assert f"{flag}: false" in text
        assert f"pi.{flag.split('_', 1)[-1]}" not in text or flag in text
    # Old dotted proposal names must not be the registered YAML keys.
    assert re.search(r"(?m)^pi\.knowledge:", text) is None
    assert re.search(r"(?m)^pi\.skills:", text) is None
    public = text.split("public:")[-1]
    for flag in (
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
    ):
        assert flag in public


# ---------------------------------------------------------------------------
# 13 Create-project E2E (architecture path)
# ---------------------------------------------------------------------------


def test_create_project_pipeline_uses_base_default_branch_not_main_fallback():
    pipeline = _PIPELINE.read_text(encoding="utf-8")
    helpers = _SYNC_HELPERS.read_text(encoding="utf-8")
    assert "base_repo.default_branch" in pipeline
    assert "resolve_marketplace_base_default_branch" in helpers
    # Seeds must keep orphan branches (regression: silent main fallback).
    by_slug = {b["slug"]: b for b in _bases()}
    for slug, branch in PI_BASES.items():
        assert by_slug[slug]["default_branch"] == branch
        assert by_slug[slug]["default_branch"] != "main"


def test_checklist_clears_setup_slug_on_save_skip_path_present():
    setup = (_REPO_ROOT / "app/src/pages/ProjectSetup.tsx").read_text(encoding="utf-8")
    assert "clearPiSetupBaseSlug" in setup


# ---------------------------------------------------------------------------
# 14 Documentation
# ---------------------------------------------------------------------------


def test_phase9_docs_boundaries_present():
    phase8 = (_REPO_ROOT / "docs/guides/pi-dev-studio-phase8-release.md").read_text(
        encoding="utf-8"
    )
    phase9 = _REPO_ROOT / "docs/guides/pi-dev-studio-phase9-production-hardening.md"
    assert phase9.is_file(), "Phase 9 report doc must exist"
    text = phase9.read_text(encoding="utf-8") + "\n" + phase8
    for needle in (
        "Developer Portal",
        "manual",
        "App Studio",
        "wallet",
        "refund",
        "webhook",
        "AgentSkillAssignment",
        "Testnet",
        "Mainnet",
    ):
        assert needle.lower() in text.lower(), needle
