"""Phase 14 — Beta activation & soak validation gate.

Proves beta Stage 3 ON / payments OFF while production/defaults remain Stage 0.
Does not call Mainnet. Does not claim live beta cluster soak.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import yaml

from app.services.pi_ops_health import (
    BETA_STAGE3_FLAGS,
    PI_BASES,
    PI_FLAGS,
    PI_SKILLS,
    load_stage3_activation_overlay,
    resolve_flags_for_env,
    run_pi_ops_health,
    simulate_beta_rollback_to_stage0,
    validate_beta_stage3_activation,
    validate_production_remains_stage0,
    validate_stage3_activation_overlay,
)

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds"
_FLAGS = _REPO_ROOT / "orchestrator" / "feature_flags"
_BETA = _FLAGS / "beta.yaml"
_OVERLAY = _FLAGS / "overlays" / "pi-stage3-activation.yaml"
_PHASE14 = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase14-beta-activation.md"
_MANIFEST = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-release-manifest.json"
_PAYMENTS = _REPO_ROOT / "bases" / "pi-payments-starter" / "backend" / "main.py"
_AUTH = _REPO_ROOT / "bases" / "pi-auth-starter" / "backend" / "main.py"
_WEB = _REPO_ROOT / "bases" / "pi-web-starter"
_HELPERS = _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts"


def test_phase14_surfaces_and_release_metadata():
    assert _MANIFEST.is_file()
    assert json.loads(_MANIFEST.read_text(encoding="utf-8"))["release_version"] == "0.1.0-rc.10"
    assert _PHASE14.is_file()
    assert _BETA.is_file()
    assert _OVERLAY.is_file()


def test_beta_overlay_exists_and_matches_stage3_contract():
    beta = yaml.safe_load(_BETA.read_text(encoding="utf-8")) or {}
    for flag, expected in BETA_STAGE3_FLAGS.items():
        assert beta.get(flag) is expected, flag
    overlay = load_stage3_activation_overlay()
    assert overlay == BETA_STAGE3_FLAGS
    assert validate_stage3_activation_overlay().ok is True


def test_beta_activates_knowledge_skills_templates_keeps_payments_off():
    resolved = {flag: resolve_flags_for_env("beta")[flag] for flag in PI_FLAGS}
    assert resolved == BETA_STAGE3_FLAGS
    assert validate_beta_stage3_activation().ok is True
    assert resolved["pi_payments_template"] is False


def test_production_and_defaults_remain_stage0():
    for env in ("production", "docker", "minikube", "desktop"):
        resolved = resolve_flags_for_env(env)
        for flag in PI_FLAGS:
            assert resolved[flag] is False, f"{env}:{flag}"
    defaults = yaml.safe_load((_FLAGS / "defaults.yaml").read_text(encoding="utf-8"))
    for flag in PI_FLAGS:
        assert defaults[flag] is False
    prod = yaml.safe_load((_FLAGS / "production.yaml").read_text(encoding="utf-8")) or {}
    for flag in PI_FLAGS:
        assert prod.get(flag) is not True
    assert validate_production_remains_stage0().ok is True


def test_rollback_simulation_returns_stage0():
    before = {flag: resolve_flags_for_env("beta")[flag] for flag in PI_FLAGS}
    assert before["pi_knowledge"] is True
    rolled = simulate_beta_rollback_to_stage0()
    assert rolled == {flag: False for flag in PI_FLAGS}
    # Live files: production untouched; defaults untouched
    assert resolve_flags_for_env("production")["pi_knowledge"] is False


def test_ops_health_green_for_beta_and_production_resolution():
    prod_report = run_pi_ops_health(env="production")
    assert prod_report.ok, prod_report.to_dict()
    assert all(prod_report.resolved_flags[f] is False for f in PI_FLAGS)
    beta_report = run_pi_ops_health(env="beta")
    assert beta_report.ok, beta_report.to_dict()
    assert beta_report.resolved_flags == BETA_STAGE3_FLAGS
    names = {c.name for c in beta_report.checks}
    assert "beta_stage3_activation" in names
    assert "production_stage0" in names


def test_provenance_and_agent_skill_assignment_mandatory():
    catalog = json.loads(
        (
            _REPO_ROOT
            / "packages/pi-integration/src/pi_integration/knowledge/catalog.json"
        ).read_text(encoding="utf-8")
    )
    assert len(catalog["entries"]) == 12
    catalog_ids = {e["id"] for e in catalog["entries"]}
    skills = json.loads((_SEEDS / "skills_pi.json").read_text(encoding="utf-8"))
    for skill in skills:
        if skill["slug"] not in PI_SKILLS:
            continue
        assert skill["is_builtin"] is False
        sources = skill["skill_body"].split("Official sources", 1)[1]
        cited = set(re.findall(r"`(pi-[a-z0-9-]+)`", sources))
        assert cited & catalog_ids
    checklist = (
        _REPO_ROOT / "app/src/components/pi/PiSetupChecklist.tsx"
    ).read_text(encoding="utf-8")
    assert "AgentSkillAssignment" in checklist
    helpers = _HELPERS.read_text(encoding="utf-8")
    assert "isPiSkillVisible" in helpers
    assert "isPiBaseVisible" in helpers


def test_starter_contracts_and_no_frontend_server_api_key():
    web_init = (_WEB / "frontend/src/pi/init.ts").read_text(encoding="utf-8")
    web_app = (_WEB / "frontend/src/App.tsx").read_text(encoding="utf-8")
    assert 'version: "2.0"' in web_init
    assert "Pi.authenticate" not in web_app
    assert "PI_SERVER_API_KEY" not in web_init
    auth = _AUTH.read_text(encoding="utf-8")
    assert "Bearer" in auth and "/me" in auth
    assert "PI_SERVER_API_KEY" not in auth
    assert "/api/auth/" not in auth
    assert "token redacted" in auth
    pay = _PAYMENTS.read_text(encoding="utf-8")
    assert "_PROTECTED_LOCAL_STATUSES" in pay
    assert "_reconcile_after_platform_error" in pay
    frontend = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (_REPO_ROOT / "bases/pi-payments-starter/frontend").rglob("*")
        if p.is_file() and p.suffix in {".ts", ".tsx", ".html"}
    )
    assert "PI_SERVER_API_KEY" not in frontend


def test_opensail_auth_and_stripe_isolation_and_no_secret_logging():
    for slug in PI_BASES:
        root = _REPO_ROOT / "bases" / slug
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in {".py", ".ts", ".tsx", ".js", ".html"}:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            assert "stripe.checkout" not in text
            assert "/api/auth/login" not in text
    assert re.search(r"logger\.[a-z]+\(.*accessToken", _AUTH.read_text(encoding="utf-8")) is None
    assert re.search(r"logger\.[a-z]+\(.*PI_SERVER_API_KEY", _PAYMENTS.read_text(encoding="utf-8")) is None


def test_phase14_doc_records_soak_and_limitations():
    text = _PHASE14.read_text(encoding="utf-8")
    for needle in (
        "PHASE 14",
        "LIVE BETA SOAK — NOT EXECUTED",
        "LIVE BETA ROLLBACK — NOT EXECUTED",
        "pi_payments_template = OFF",
        "beta.yaml",
        "Stage 0",
        "READY FOR OPERATOR APPROVAL",
        "0.1.0-rc.10",
        "AgentSkillAssignment",
        "production.yaml",
    ):
        assert needle in text, needle


def test_release_hygiene_no_workspace_artifacts():
    tracked = subprocess.run(
        ["git", "ls-files"],
        cwd=str(_REPO_ROOT),
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    for path in tracked:
        assert "workspace-data-" not in path
