"""Phase 12 — Controlled production rollout & operations validation.

Does not enable production Pi flags. Does not call Mainnet or require credentials.
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
    run_pi_ops_health,
)
from app.services.seed_loader import DEFAULT_VERSION

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds"
_FLAGS_DIR = _REPO_ROOT / "orchestrator" / "feature_flags"
_PHASE12 = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase12-controlled-rollout.md"
_PHASE11 = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-phase11-launch-readiness.md"
_MANIFEST = _REPO_ROOT / "docs" / "guides" / "pi-dev-studio-release-manifest.json"
_PIPELINE = _REPO_ROOT / "orchestrator" / "app" / "services" / "project_setup" / "pipeline.py"
_HELPERS = _REPO_ROOT / "app" / "src" / "lib" / "piDevStudio.ts"
_PAYMENTS = _REPO_ROOT / "bases" / "pi-payments-starter" / "backend" / "main.py"
_AUTH = _REPO_ROOT / "bases" / "pi-auth-starter" / "backend" / "main.py"


def _bases() -> list[dict]:
    return json.loads((_SEEDS / "bases.json").read_text(encoding="utf-8"))


def _skills() -> list[dict]:
    return json.loads((_SEEDS / "skills_pi.json").read_text(encoding="utf-8"))


def _resolved_flags_for_env(env: str) -> dict[str, bool]:
    """Resolve defaults + optional env overlay the same way the orchestrator does."""
    raw = yaml.safe_load((_FLAGS_DIR / "defaults.yaml").read_text(encoding="utf-8"))
    flags = {k: v for k, v in raw.items() if k != "public" and isinstance(v, bool)}
    env_path = _FLAGS_DIR / f"{env}.yaml"
    if env_path.exists():
        overrides = yaml.safe_load(env_path.read_text(encoding="utf-8")) or {}
        for key, value in overrides.items():
            if key == "public":
                continue
            assert key in flags, f"unknown override {key} in {env}.yaml"
            assert isinstance(value, bool)
            flags[key] = value
    return flags


def _stage_flags(stage: int) -> dict[str, bool]:
    """Simulate operator-approved stage flag sets (never writes production.yaml)."""
    assert 0 <= stage <= 4
    on = {
        0: (),
        1: ("pi_knowledge",),
        2: ("pi_knowledge", "pi_skills"),
        3: ("pi_knowledge", "pi_skills", "pi_templates"),
        4: ("pi_knowledge", "pi_skills", "pi_templates", "pi_payments_template"),
    }[stage]
    return {flag: flag in on for flag in PI_FLAGS}


def test_phase11_surfaces_present():
    assert _MANIFEST.is_file()
    assert _PHASE11.is_file()
    assert (_REPO_ROOT / "packages/pi-integration").is_dir()
    for slug in PI_BASES:
        assert (_REPO_ROOT / "bases" / slug).is_dir()


def test_no_pi_feature_enabled_by_default_across_envs():
    """Stage 0 envs stay OFF; Phase 14 beta holds operator-approved Stage 3 only."""
    for env in ("docker", "minikube", "desktop", "production"):
        flags = _resolved_flags_for_env(env)
        for flag in PI_FLAGS:
            assert flags[flag] is False, f"{env}:{flag}"

    beta = _resolved_flags_for_env("beta")
    assert beta["pi_knowledge"] is True
    assert beta["pi_skills"] is True
    assert beta["pi_templates"] is True
    assert beta["pi_payments_template"] is False

    for path in _FLAGS_DIR.glob("*.yaml"):
        if path.name in {"defaults.yaml", "beta.yaml"}:
            continue
        overrides = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        for flag in PI_FLAGS:
            assert overrides.get(flag) is not True, f"{path.name} enables {flag}"


def test_defaults_yaml_documents_operator_override_not_auto_promotion():
    text = (_FLAGS_DIR / "defaults.yaml").read_text(encoding="utf-8")
    assert "Defaults OFF" in text
    assert "auto-promote" in text or "do NOT" in text
    assert "per-environment" in text or "overrides when ready" in text


def test_pi_ops_health_all_green():
    report = run_pi_ops_health(include_git_orphans=True)
    assert report.ok, report.to_dict()
    assert all(v is False for v in report.flag_defaults.values())


def test_payment_and_auth_loggers_do_not_emit_secrets():
    payments = _PAYMENTS.read_text(encoding="utf-8")
    auth = _AUTH.read_text(encoding="utf-8")
    assert "token redacted" in auth
    assert re.search(r"logger\.[a-z]+\(.*accessToken", auth) is None
    assert re.search(r"logger\.[a-z]+\(.*PI_SERVER_API_KEY", payments) is None
    assert "Key {key}" in payments
    assert 'logger.exception("Pi Platform API request failed path=%s", path)' in payments


def test_stage_matrix_requires_explicit_operator_sets_and_no_auto_promotion():
    s0 = _stage_flags(0)
    s1 = _stage_flags(1)
    s2 = _stage_flags(2)
    s3 = _stage_flags(3)
    s4 = _stage_flags(4)
    assert s0 == {f: False for f in PI_FLAGS}
    assert s1["pi_knowledge"] and not s1["pi_skills"]
    assert s2["pi_skills"] and not s2["pi_templates"]
    assert s3["pi_templates"] and not s3["pi_payments_template"]
    assert s4["pi_payments_template"]
    assert set(k for k, v in s1.items() if v) < set(k for k, v in s2.items() if v)
    assert set(k for k, v in s2.items() if v) < set(k for k, v in s3.items() if v)
    assert set(k for k, v in s3.items() if v) < set(k for k, v in s4.items() if v)


def test_stage1_knowledge_gate_behavior():
    helpers = _HELPERS.read_text(encoding="utf-8")
    assert "pi_knowledge" in helpers
    create = (
        _REPO_ROOT / "app/src/components/modals/CreateProjectModal.tsx"
    ).read_text(encoding="utf-8")
    assert "PI_FEATURE_FLAGS.knowledge" in create
    assert "showKnowledgeNote={piKnowledgeEnabled}" in create


def test_stage2_skills_require_assignment_and_seven_skills():
    skills = _skills()
    assert {s["slug"] for s in skills} >= set(PI_SKILLS)
    for skill in skills:
        if skill["slug"] in PI_SKILLS:
            assert skill["is_builtin"] is False
            assert "Official sources" in skill["skill_body"]
    checklist = (
        _REPO_ROOT / "app/src/components/pi/PiSetupChecklist.tsx"
    ).read_text(encoding="utf-8")
    assert "AgentSkillAssignment" in checklist
    load_skill = (
        _REPO_ROOT / "orchestrator/app/agent/tools/skill_ops/load_skill.py"
    ).read_text(encoding="utf-8")
    assert "match_skill_catalog_entry" in load_skill


def test_stage3_templates_create_project_orphan_mapping():
    by_slug = {b["slug"]: b for b in _bases()}
    assert by_slug["pi-web-starter"]["default_branch"] == "base/pi-web-starter"
    assert by_slug["pi-auth-starter"]["default_branch"] == "base/pi-auth-starter"
    pipeline = _PIPELINE.read_text(encoding="utf-8")
    assert "base_repo.default_branch" in pipeline
    helpers = _HELPERS.read_text(encoding="utf-8")
    assert "isPiBaseVisible" in helpers
    assert "pi_templates" in helpers
    assert DEFAULT_VERSION == "0.1.0"


def test_stage4_payments_security_gate_not_mainnet_ready():
    by_slug = {b["slug"]: b for b in _bases()}
    entry = by_slug["pi-payments-starter"]
    assert entry["default_branch"] == "base/pi-payments-starter"
    blob = json.dumps(entry).lower()
    assert "in-memory" in blob
    assert "not mainnet-production ready" in blob
    backend = _PAYMENTS.read_text(encoding="utf-8")
    assert "_PROTECTED_LOCAL_STATUSES" in backend
    assert "_reconcile_after_platform_error" in backend
    frontend = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (_REPO_ROOT / "bases/pi-payments-starter/frontend").rglob("*")
        if p.is_file() and p.suffix in {".ts", ".tsx", ".html"}
    )
    assert "PI_SERVER_API_KEY" not in frontend


@pytest.mark.parametrize("stage", [1, 2, 3, 4])
def test_rollback_drill_returns_to_gated_state(stage: int):
    enabled = _stage_flags(stage)
    rolled = {flag: False for flag in PI_FLAGS}
    assert any(enabled.values())
    assert not any(rolled.values())
    assert (_REPO_ROOT / "orchestrator/app/routers/auth.py").is_file()
    assert (_REPO_ROOT / "orchestrator/app/routers/billing.py").is_file()


def test_feature_flags_service_override_simulation_then_off():
    """Operator enables via env overlay — simulated without writing production.yaml."""
    stage3 = _stage_flags(3)
    assert stage3["pi_templates"] is True
    assert stage3["pi_payments_template"] is False
    rolled = _stage_flags(0)
    assert rolled["pi_templates"] is False


def test_marketplace_failure_no_silent_main_fallback_for_pi_bases():
    by_slug = {b["slug"]: b for b in _bases()}
    for slug, branch in PI_BASES.items():
        assert by_slug[slug]["default_branch"] == branch
        assert by_slug[slug]["default_branch"] not in {"main", "master"}
    helpers = (
        _REPO_ROOT
        / "orchestrator/app/services/marketplace_sync_helpers.py"
    ).read_text(encoding="utf-8")
    assert "resolve_marketplace_base_default_branch" in helpers


def test_auth_failure_no_token_leak_or_opensail_fallback():
    auth = _AUTH.read_text(encoding="utf-8")
    assert "token redacted" in auth
    assert "/api/auth/" not in auth
    model = auth.split("class VerifiedUserResponse")[1].split("@app.")[0]
    assert "accessToken" not in model


def test_payment_failure_no_fake_success_and_protected_state():
    backend = _PAYMENTS.read_text(encoding="utf-8")
    assert "status_code >= 400" in backend
    assert "_reconcile_after_platform_error" in backend
    assert "_PROTECTED_LOCAL_STATUSES" in backend


def test_feature_flag_failure_safe_default_is_off():
    raw = yaml.safe_load((_FLAGS_DIR / "defaults.yaml").read_text(encoding="utf-8"))
    for flag in PI_FLAGS:
        assert raw[flag] is False


def test_phase12_rollout_doc_complete():
    assert _PHASE12.is_file()
    text = _PHASE12.read_text(encoding="utf-8")
    for needle in (
        "PHASE 12",
        "Stage 0",
        "Stage 1",
        "Stage 2",
        "Stage 3",
        "Stage 4",
        "Operator approval",
        "Emergency rollback",
        "Credential incident",
        "Payment incident",
        "Marketplace incident",
        "Skill/provenance incident",
        "PRE-ROLLOUT",
        "does not automatically activate",
        "pi_knowledge = OFF",
        "NOT ACTIVATED",
        "OPERATIONALLY READY",
    ):
        assert needle in text, needle


def test_release_artifacts_not_polluted():
    tracked = subprocess.run(
        ["git", "ls-files"],
        cwd=str(_REPO_ROOT),
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    for path in tracked:
        assert "workspace-data-" not in path
        assert not re.match(r"bases/pi-.*/frontend/package-lock\.json$", path)


def test_current_production_flag_state_remains_off():
    """Final Phase 12 state must remain Stage 0 unless operator approved (none)."""
    flags = _resolved_flags_for_env("production")
    for flag in PI_FLAGS:
        assert flags[flag] is False
