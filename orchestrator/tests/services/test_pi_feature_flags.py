"""Phase 6 — Pi feature flags registered in the existing YAML flag system."""

from __future__ import annotations

from pathlib import Path

import yaml

from app.services.feature_flags import load_feature_flags

_FLAGS_DIR = Path(__file__).resolve().parents[2] / "feature_flags"

PI_FLAGS = (
    "pi_knowledge",
    "pi_skills",
    "pi_templates",
    "pi_payments_template",
)

# Phase 0.5 proposals → repository snake_case mapping (documented).
PHASE_05_MAPPING = {
    "pi.knowledge": "pi_knowledge",
    "pi.skills": "pi_skills",
    "pi.templates": "pi_templates",
    "pi.payments_template": "pi_payments_template",
}


def _defaults_raw() -> dict:
    return yaml.safe_load((_FLAGS_DIR / "defaults.yaml").read_text(encoding="utf-8"))


def test_pi_flags_registered_in_defaults():
    raw = _defaults_raw()
    for flag in PI_FLAGS:
        assert flag in raw, f"missing Pi flag {flag} in defaults.yaml"
        assert raw[flag] is False, f"{flag} must default OFF"


def test_pi_flags_are_public():
    raw = _defaults_raw()
    public = set(raw.get("public") or [])
    for flag in PI_FLAGS:
        assert flag in public, f"{flag} must be listed under public:"


def test_pi_flags_load_via_existing_service():
    ff = load_feature_flags("docker")
    for flag in PI_FLAGS:
        assert ff.enabled(flag) is False
        assert flag in ff.public_flags
        assert ff.public_flags[flag] is False


def test_phase_05_mapping_uses_snake_case_only():
    """Repository convention is snake_case — dotted Phase 0.5 names are not keys."""
    raw = _defaults_raw()
    for dotted, snake in PHASE_05_MAPPING.items():
        assert dotted not in raw
        assert snake in raw


def test_no_second_feature_flag_system_for_pi():
    """Pi flags live only in orchestrator/feature_flags YAML (not config_features)."""
    config_features = (
        Path(__file__).resolve().parents[2] / "app" / "config_features.py"
    ).read_text(encoding="utf-8")
    for flag in PI_FLAGS:
        assert flag not in config_features
