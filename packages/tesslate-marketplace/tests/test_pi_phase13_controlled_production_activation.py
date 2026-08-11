"""Phase 13 — Controlled production activation gate.

Validates Stage 1–3 activation package readiness while keeping production
resolved flags OFF and Stage 4 payments OFF. Does not call Mainnet.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import pytest
import yaml

from app.services.pi_ops_health import (
    PI_BASES,
    PI_FLAGS,
    PI_SKILLS,
    load_stage3_activation_overlay,
    resolve_flags_for_env,
    run_pi_ops_health,
    simulate_env_with_stage3_overlay,
    validate_stage3_activation_overlay,
)

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds"
_FLAGS = _REPO_ROOT / "orchestrator" / "feature_flags"
_OVERLAY = _FLAGS / "overlays" / "pi-stage3-activation.yaml"
_PHASE13 = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase13-controlled-production-activation.md"
_MANIFEST = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-release-manifest.json"
_PAYMENTS = _REPO_ROOT / "bases" / "pi-payments-starter" / "backend" / "main.py"
_AUTH = _REPO_ROOT / "bases" / "pi-auth-starter" / "backend" / "main.py"
_WEB = _REPO_ROOT / "bases" / "pi-web-starter"
_HELPERS = _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts"


def test_phase13_surfaces_and_release_metadata():
    assert _MANIFEST.is_file()
    assert json.loads(_MANIFEST.read_text(encoding="utf-8"))["release_version"] == "0.1.0-rc.10"
    assert _PHASE13.is_file()
    assert _OVERLAY.is_file()
    assert (_FLAGS / "overlays" / "README.md").is_file()


def test_production_baseline_remains_stage0():
    """Production resolved flags must stay OFF until an operator merges the overlay."""
    resolved = resolve_flags_for_env("production")
    for flag in PI_FLAGS:
        assert resolved[flag] is False, flag
    defaults = yaml.safe_load((_FLAGS / "defaults.yaml").read_text(encoding="utf-8"))
    for flag in PI_FLAGS:
        assert defaults[flag] is False


def test_stage3_overlay_enables_123_keeps_payments_off():
    overlay = load_stage3_activation_overlay()
    assert overlay == {
        "pi_knowledge": True,
        "pi_skills": True,
        "pi_templates": True,
        "pi_payments_template": False,
    }
    assert validate_stage3_activation_overlay().ok is True
    simulated = simulate_env_with_stage3_overlay("production")
    assert simulated["pi_knowledge"] is True
    assert simulated["pi_skills"] is True
    assert simulated["pi_templates"] is True
    assert simulated["pi_payments_template"] is False


def test_rollback_simulation_restores_safe_state():
    simulated = simulate_env_with_stage3_overlay("production")
    assert any(simulated.values())
    rolled = resolve_flags_for_env("production")
    assert all(v is False for v in (rolled[f] for f in PI_FLAGS))
    # Removing overlay keys == production.yaml unchanged baseline.
    assert (_REPO_ROOT / "orchestrator/app/routers/auth.py").is_file()
    assert (_REPO_ROOT / "orchestrator/app/routers/billing.py").is_file()


def test_ops_health_includes_overlay_and_resolved_flags():
    report = run_pi_ops_health(env="production", include_stage3_overlay_check=True)
    assert report.ok, report.to_dict()
    assert report.resolved_env == "production"
    assert all(report.resolved_flags[f] is False for f in PI_FLAGS)
    names = {c.name for c in report.checks}
    assert "stage3_activation_overlay" in names


def test_provenance_and_skill_assignment_boundaries():
    catalog = json.loads(
        (
            _REPO_ROOT
            / "packages/pi-integration/src/pi_integration/knowledge/catalog.json"
        ).read_text(encoding="utf-8")
    )
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


def test_starter_contracts_for_stage3_visibility():
    # Web
    web_init = (_WEB / "frontend/src/pi/init.ts").read_text(encoding="utf-8")
    web_app = (_WEB / "frontend/src/App.tsx").read_text(encoding="utf-8")
    assert 'version: "2.0"' in web_init
    assert "Pi.authenticate" not in web_app
    assert "PI_SERVER_API_KEY" not in web_init
    # Auth
    auth = _AUTH.read_text(encoding="utf-8")
    assert "Bearer" in auth and "/me" in auth
    assert "PI_SERVER_API_KEY" not in auth
    assert "/api/auth/" not in auth
    assert "token redacted" in auth
    # Payments present but Stage 4 OFF — still safe contracts
    pay = _PAYMENTS.read_text(encoding="utf-8")
    assert "_PROTECTED_LOCAL_STATUSES" in pay
    assert "_reconcile_after_platform_error" in pay
    frontend = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (_REPO_ROOT / "bases/pi-payments-starter/frontend").rglob("*")
        if p.is_file() and p.suffix in {".ts", ".tsx", ".html"}
    )
    assert "PI_SERVER_API_KEY" not in frontend
    bases = {b["slug"]: b for b in json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))}
    for slug, branch in PI_BASES.items():
        assert bases[slug]["default_branch"] == branch


def test_payments_flag_must_remain_off_in_production_and_overlay():
    assert resolve_flags_for_env("production")["pi_payments_template"] is False
    assert load_stage3_activation_overlay()["pi_payments_template"] is False
    # production.yaml must not enable payments
    prod = yaml.safe_load((_FLAGS / "production.yaml").read_text(encoding="utf-8")) or {}
    assert prod.get("pi_payments_template") is not True


def test_opensail_isolation_and_no_secret_logging():
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


def test_phase13_doc_records_activation_and_limitations():
    text = _PHASE13.read_text(encoding="utf-8")
    for needle in (
        "PHASE 13",
        "Production baseline",
        "Stage 1",
        "Stage 2",
        "Stage 3",
        "Stage 4",
        "pi_payments_template = OFF",
        "overlays/pi-stage3-activation.yaml",
        "Rollback",
        "PASS WITH KNOWN LIMITATIONS",
        "0.1.0-rc.10",
        "AgentSkillAssignment",
        "no aws/kubectl",
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
