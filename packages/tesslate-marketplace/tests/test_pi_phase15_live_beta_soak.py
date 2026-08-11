"""Phase 15 — Live beta soak & rollback validation gate.

Encodes repository contracts for Stage 3 beta soak readiness.
Does NOT claim LIVE SOAK — EXECUTED when live beta access is absent.
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
    detect_live_beta_access,
    resolve_flags_for_env,
    run_phase15_soak_package,
    run_pi_ops_health,
    simulate_beta_rollback_to_stage0,
)

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds"
_FLAGS = _REPO_ROOT / "orchestrator" / "feature_flags"
_PHASE14 = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase14-beta-activation.md"
_PHASE15 = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase15-live-beta-soak.md"
_MANIFEST = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-release-manifest.json"
_HELPERS = _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts"
_AUTH = _REPO_ROOT / "bases" / "pi-auth-starter" / "backend" / "main.py"
_PAYMENTS = _REPO_ROOT / "bases" / "pi-payments-starter" / "backend" / "main.py"


def test_phase15_surfaces_and_release_metadata():
    assert _MANIFEST.is_file()
    assert json.loads(_MANIFEST.read_text(encoding="utf-8"))["release_version"] == "0.1.0-rc.10"
    assert _PHASE14.is_file()
    assert _PHASE15.is_file()
    assert (_REPO_ROOT / "scripts/pi-live-beta-soak-validate.sh").is_file()


def test_beta_stage3_before_soak_and_payments_off():
    resolved = {flag: resolve_flags_for_env("beta")[flag] for flag in PI_FLAGS}
    assert resolved == BETA_STAGE3_FLAGS
    assert resolved["pi_payments_template"] is False


def test_production_remains_stage0_during_phase15():
    resolved = {flag: resolve_flags_for_env("production")[flag] for flag in PI_FLAGS}
    assert all(v is False for v in resolved.values())
    defaults = yaml.safe_load((_FLAGS / "defaults.yaml").read_text(encoding="utf-8"))
    for flag in PI_FLAGS:
        assert defaults[flag] is False


def test_payment_template_visibility_negative_boundary_in_helpers():
    """pi_templates ON + pi_payments_template OFF must not expose payments starter."""
    helpers = _HELPERS.read_text(encoding="utf-8")
    assert "PI_PAYMENTS_STARTER_SLUG" in helpers
    assert "return flags.pi_payments_template" in helpers
    assert "getEnabledPiFeaturedSlugs" in helpers
    # Seed may exist; flag must stay OFF
    bases = {b["slug"] for b in json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))}
    assert "pi-payments-starter" in bases
    assert resolve_flags_for_env("beta")["pi_payments_template"] is False


def test_skills_not_auto_assigned_and_seven_discoverable():
    skills = json.loads((_SEEDS / "skills_pi.json").read_text(encoding="utf-8"))
    by_slug = {s["slug"]: s for s in skills}
    for slug in PI_SKILLS:
        assert by_slug[slug]["is_builtin"] is False
    checklist = (
        _REPO_ROOT / "app/src/components/pi/PiSetupChecklist.tsx"
    ).read_text(encoding="utf-8")
    assert "AgentSkillAssignment" in checklist


def test_create_project_orphan_branch_contract_static():
    bases = {b["slug"]: b for b in json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))}
    for slug, branch in PI_BASES.items():
        assert bases[slug]["default_branch"] == branch
        assert bases[slug]["default_branch"] not in {"main", "master"}
    pipeline = (
        _REPO_ROOT / "orchestrator/app/services/project_setup/pipeline.py"
    ).read_text(encoding="utf-8")
    assert "base_repo.default_branch" in pipeline


def test_auth_and_secret_hygiene_static():
    auth = _AUTH.read_text(encoding="utf-8")
    assert "token redacted" in auth
    assert "/api/auth/" not in auth
    assert re.search(r"logger\.[a-z]+\(.*accessToken", auth) is None
    pay = _PAYMENTS.read_text(encoding="utf-8")
    assert "_PROTECTED_LOCAL_STATUSES" in pay
    assert "_reconcile_after_platform_error" in pay
    assert re.search(r"logger\.[a-z]+\(.*PI_SERVER_API_KEY", pay) is None
    frontend = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (_REPO_ROOT / "bases/pi-payments-starter/frontend").rglob("*")
        if p.is_file() and p.suffix in {".ts", ".tsx", ".html"}
    )
    assert "PI_SERVER_API_KEY" not in frontend


def test_rollback_simulation_to_stage0_and_beta_file_untouched():
    before = yaml.safe_load((_FLAGS / "beta.yaml").read_text(encoding="utf-8"))
    assert before["pi_knowledge"] is True
    rolled = simulate_beta_rollback_to_stage0()
    assert rolled == {flag: False for flag in PI_FLAGS}
    after = yaml.safe_load((_FLAGS / "beta.yaml").read_text(encoding="utf-8"))
    assert after == before  # simulation must not mutate beta.yaml


def test_phase15_soak_package_labels_live_vs_simulated():
    access = detect_live_beta_access()
    package = run_phase15_soak_package()
    assert package["simulated_soak_ok"] is True
    assert package["payments_remain_off"] is True
    assert package["production_remains_stage0"] is True
    assert package["simulated_soak_label"] == "SIMULATED SOAK — PASS"
    if access["live_beta_access"]:
        assert "AVAILABLE" in package["soak_label"]
    else:
        assert package["soak_label"] == "LIVE SOAK — NOT EXECUTED"
        assert package["rollback_label"] == "LIVE BETA ROLLBACK — NOT EXECUTED"
        assert package["verdict_hint"] == (
            "PHASE 15 — VALIDATION READY / LIVE SOAK NOT EXECUTED"
        )
        assert access["tools_present"]["aws"] is False
        assert access["tools_present"]["kubectl"] is False


def test_ops_health_still_green():
    assert run_pi_ops_health(env="beta").ok is True
    assert run_pi_ops_health(env="production").ok is True


def test_phase15_doc_records_live_not_executed_and_stop():
    text = _PHASE15.read_text(encoding="utf-8")
    for needle in (
        "PHASE 15",
        "LIVE SOAK — NOT EXECUTED",
        "SIMULATED SOAK — PASS",
        "LIVE BETA ROLLBACK — NOT EXECUTED",
        "VALIDATION READY / LIVE SOAK NOT EXECUTED",
        "pi_payments_template = OFF",
        "NOT EXECUTED — NO LIVE BETA ACCESS",
        "Do not start Phase 16",
        "0.1.0-rc.10",
        "AgentSkillAssignment",
        "production remains Stage 0",
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
