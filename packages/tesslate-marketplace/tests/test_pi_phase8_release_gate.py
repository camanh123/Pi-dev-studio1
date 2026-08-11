"""Phase 8 — seed inventory / release-gate contract checks."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from app.services.seed_loader import load_seed_entries

_SEEDS = Path(__file__).resolve().parents[1] / "app" / "seeds"
_SUMMARY = _SEEDS / "_summary.json"
_FLAGS = (
    Path(__file__).resolve().parents[3]
    / "orchestrator"
    / "feature_flags"
    / "defaults.yaml"
)

PI_BASES = ("pi-web-starter", "pi-auth-starter", "pi-payments-starter")
PI_SKILLS = (
    "pi-sdk",
    "pi-auth",
    "pi-platform-api",
    "pi-payments",
    "pi-developer-portal",
    "pi-browser",
    "pi-compliance",
)


def test_summary_matches_seed_loader_counts():
    summary = json.loads(_SUMMARY.read_text(encoding="utf-8"))
    counts = Counter(e.get("kind") for e in load_seed_entries())
    for kind, expected in summary.items():
        assert counts.get(kind, 0) == expected, f"{kind}: summary={expected} actual={counts.get(kind)}"


def test_pi_bases_and_skills_present_in_seed_loader():
    entries = load_seed_entries()
    slugs = {(e.get("kind"), e.get("slug")) for e in entries}
    for slug in PI_BASES:
        assert ("base", slug) in slugs
    for slug in PI_SKILLS:
        assert ("skill", slug) in slugs


def test_pi_feature_flags_default_off_and_public():
    text = _FLAGS.read_text(encoding="utf-8")
    for flag in (
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
    ):
        assert f"{flag}: false" in text
    public = text.split("public:")[-1]
    for flag in (
        "pi_knowledge",
        "pi_skills",
        "pi_templates",
        "pi_payments_template",
    ):
        assert flag in public
