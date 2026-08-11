"""Phase 7 — pure helper tests for MarketplaceBase branch + skill matching.

Import-light: does not boot FastAPI / SQLAlchemy models.
"""

from __future__ import annotations

from types import SimpleNamespace

from app.services.marketplace_sync_helpers import (
    match_skill_catalog_entry,
    resolve_marketplace_base_default_branch,
)


def test_resolve_default_branch_from_version_manifest():
    item = {
        "git_repo_url": "https://github.com/camanh123/Pi-dev-studio1.git",
        "versions": [
            {
                "version": "0.1.0",
                "manifest": {"default_branch": "base/pi-web-starter"},
            }
        ],
    }
    assert resolve_marketplace_base_default_branch(item) == "base/pi-web-starter"


def test_resolve_default_branch_top_level_wins():
    item = {
        "default_branch": "base/pi-auth-starter",
        "versions": [{"manifest": {"default_branch": "ignored"}}],
    }
    assert resolve_marketplace_base_default_branch(item) == "base/pi-auth-starter"


def test_resolve_default_branch_falls_back_to_main():
    assert resolve_marketplace_base_default_branch({"name": "x"}) == "main"


def test_resolve_all_pi_seed_manifest_shapes():
    for branch in (
        "base/pi-web-starter",
        "base/pi-auth-starter",
        "base/pi-payments-starter",
    ):
        item = {"versions": [{"manifest": {"default_branch": branch}}]}
        assert resolve_marketplace_base_default_branch(item) == branch


def test_match_skill_by_slug():
    skills = [
        SimpleNamespace(name="Pi Frontend SDK", slug="pi-sdk"),
        SimpleNamespace(name="Pi Authentication", slug="pi-auth"),
    ]
    matched = match_skill_catalog_entry("pi-sdk", skills)
    assert matched is not None
    assert matched.slug == "pi-sdk"


def test_match_skill_by_display_name():
    skills = [SimpleNamespace(name="Pi Payments (U2A)", slug="pi-payments")]
    matched = match_skill_catalog_entry("Pi Payments (U2A)", skills)
    assert matched is not None
    assert matched.slug == "pi-payments"


def test_match_skill_unknown_returns_none():
    skills = [SimpleNamespace(name="Pi Frontend SDK", slug="pi-sdk")]
    assert match_skill_catalog_entry("pi-auth", skills) is None
