"""Pure helpers for MarketplaceBase federation sync.

Kept import-light so Phase 7 contract tests can run without booting the
full orchestrator dependency graph.
"""

from __future__ import annotations

from typing import Any


def extract_version_manifest(item: dict[str, Any]) -> dict[str, Any] | None:
    """Pull the latest version manifest out of a hub item detail envelope."""
    versions = item.get("versions")
    if isinstance(versions, list) and versions:
        first = versions[0]
        if isinstance(first, dict):
            manifest = first.get("manifest")
            if isinstance(manifest, dict):
                return manifest
    manifest = item.get("manifest")
    if isinstance(manifest, dict):
        return manifest
    extra = item.get("extra_metadata")
    if isinstance(extra, dict):
        return extra
    return None


def resolve_marketplace_base_default_branch(item: dict[str, Any]) -> str:
    """Resolve the git clone branch for a federated MarketplaceBase item.

    Seeded Pi starters store ``default_branch`` in the version/bundle
    manifest (e.g. ``base/pi-web-starter``). Top-level values win when
    present; otherwise fall back to ``main``.
    """
    default_branch = item.get("default_branch")
    if not isinstance(default_branch, str) or not default_branch.strip():
        manifest = extract_version_manifest(item)
        if isinstance(manifest, dict):
            candidate = manifest.get("default_branch")
            default_branch = candidate if isinstance(candidate, str) else None
        else:
            default_branch = None
    if not isinstance(default_branch, str) or not default_branch.strip():
        return "main"
    return default_branch.strip()


def match_skill_catalog_entry(
    skill_name: str,
    available_skills: list[Any],
) -> Any | None:
    """Match ``load_skill`` input against display name or marketplace slug."""
    needle = skill_name.lower()
    for skill in available_skills:
        name = getattr(skill, "name", None)
        if isinstance(name, str) and name.lower() == needle:
            return skill
        slug = getattr(skill, "slug", None)
        if isinstance(slug, str) and slug.lower() == needle:
            return skill
    return None
