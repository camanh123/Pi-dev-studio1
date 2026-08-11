"""Phase 7 — load_skill slug matching is covered by marketplace_sync_helpers tests.

This module remains as a pointer so agent-tool test discovery keeps a
Phase 7 slug-resolution signal next to other load_skill tests.
"""

from __future__ import annotations

from types import SimpleNamespace

from app.services.marketplace_sync_helpers import match_skill_catalog_entry


def test_pi_skill_slug_resolution_contract():
    catalog = [
        SimpleNamespace(name="Pi Frontend SDK", slug="pi-sdk"),
        SimpleNamespace(name="Pi Authentication", slug="pi-auth"),
        SimpleNamespace(name="Pi Platform API", slug="pi-platform-api"),
        SimpleNamespace(name="Pi Payments (U2A)", slug="pi-payments"),
        SimpleNamespace(name="Pi Developer Portal Checklist", slug="pi-developer-portal"),
        SimpleNamespace(name="Pi Browser and Runtime Contexts", slug="pi-browser"),
        SimpleNamespace(name="Pi Compliance Guidance", slug="pi-compliance"),
    ]
    for slug in (
        "pi-sdk",
        "pi-auth",
        "pi-platform-api",
        "pi-payments",
        "pi-developer-portal",
        "pi-browser",
        "pi-compliance",
    ):
        assert match_skill_catalog_entry(slug, catalog) is not None
