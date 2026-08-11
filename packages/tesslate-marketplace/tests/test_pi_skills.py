"""Phase 2 — Official Pi AI skill seeds.

Validates that the seven Pi skills ship in ``skills_pi.json`` with:
  * discoverable slugs/metadata
  * non-empty skill bodies
  * Phase 1 catalog provenance IDs
  * no contradiction of unsupported-claim guardrails
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.services.seed_loader import SEED_FILES, load_seed_entries

_REPO_ROOT = Path(__file__).resolve().parents[3]
_SEEDS_DIR = Path(__file__).resolve().parents[1] / "app" / "seeds"
_PI_SKILLS_PATH = _SEEDS_DIR / "skills_pi.json"
_CATALOG_PATH = (
    _REPO_ROOT
    / "packages"
    / "pi-integration"
    / "src"
    / "pi_integration"
    / "knowledge"
    / "catalog.json"
)
_CLAIMS_PATH = _CATALOG_PATH.parent / "unsupported_claims.json"

REQUIRED_PI_SKILL_SLUGS = {
    "pi-sdk",
    "pi-auth",
    "pi-platform-api",
    "pi-payments",
    "pi-developer-portal",
    "pi-browser",
    "pi-compliance",
}

# Each skill must cite at least these catalog entry IDs in its body.
REQUIRED_PROVENANCE: dict[str, set[str]] = {
    "pi-sdk": {
        "pi-platform-docs-readme",
        "pi-sdk-reference",
        "pi-sdk-js-artifact",
    },
    "pi-auth": {
        "pi-sdk-reference",
        "pi-platform-api",
        "pi-api-host-v2",
    },
    "pi-platform-api": {
        "pi-platform-api",
        "pi-api-host-v2",
    },
    "pi-payments": {
        "pi-payments-u2a",
        "pi-payments-advanced",
        "pi-platform-api",
    },
    "pi-developer-portal": {
        "pi-developer-portal-workflow",
        "pi-app-studio-product",
    },
    "pi-browser": {
        "pi-sdk-reference",
        "pi-developers-landing",
    },
    "pi-compliance": {
        "pi-developer-portal-workflow",
        "pi-sdk-reference",
    },
}

# Phrases that would contradict the unsupported-claim registry.
FORBIDDEN_BODY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    (
        "pi-auth-is-oauth2",
        re.compile(r"\bPi authentication is (an )?OAuth2\b", re.I),
    ),
    (
        "pi-payment-is-stripe",
        re.compile(r"\bPi payments? (are|is) (equivalent to |the same as )?Stripe\b", re.I),
    ),
    (
        "official-npm-sdk-required",
        re.compile(r"\bnpm (package )?(pi-sdk-js )?is (the )?required official\b", re.I),
    ),
    (
        "a2u-available-on-mainnet",
        re.compile(
            r"\bA2U\b.{0,40}\b(?:is\s+)?(?:available|supported)\s+on\s+Mainnet\b",
            re.I,
        ),
    ),
    (
        "opensail-preview-equals-pi-browser",
        re.compile(
            r"\bOpenSail preview\b.{0,40}\b(?:is|=)\s+(?:equivalent|equal)\s+to\b.{0,40}\bPi Browser\b",
            re.I,
        ),
    ),
    (
        "invented-portal-api",
        re.compile(
            r"(?:call|use|implement|invoke)\s+POST\s+/portal/(register|publish)\b",
            re.I,
        ),
    ),
    (
        "invented-app-studio-api",
        re.compile(
            r"(?:call|use|implement|invoke)\s+POST\s+/app-studio/\w+",
            re.I,
        ),
    ),
]


def _load_pi_skills() -> list[dict]:
    assert _PI_SKILLS_PATH.is_file(), f"missing {_PI_SKILLS_PATH}"
    data = json.loads(_PI_SKILLS_PATH.read_text(encoding="utf-8"))
    assert isinstance(data, list)
    return data


def _catalog_ids() -> set[str]:
    catalog = json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
    return {e["id"] for e in catalog["entries"]}


def _claim_ids() -> set[str]:
    claims = json.loads(_CLAIMS_PATH.read_text(encoding="utf-8"))
    return {c["id"] for c in claims["claims"]}


def test_skills_pi_registered_in_seed_files() -> None:
    assert "skills_pi.json" in SEED_FILES


def test_pi_skills_are_discoverable_via_load_seed_entries() -> None:
    entries = load_seed_entries()
    skill_slugs = {e["slug"] for e in entries if e.get("kind") == "skill"}
    missing = REQUIRED_PI_SKILL_SLUGS - skill_slugs
    assert not missing, f"Pi skills not discoverable in seed loader: {sorted(missing)}"


def test_all_seven_pi_skills_exist_with_valid_metadata() -> None:
    skills = _load_pi_skills()
    by_slug = {s["slug"]: s for s in skills}
    assert set(by_slug) == REQUIRED_PI_SKILL_SLUGS

    for slug, entry in by_slug.items():
        assert entry["kind"] == "skill"
        assert entry["item_type"] == "skill"
        assert entry["is_active"] is True
        assert entry["is_published"] is True
        assert entry.get("is_builtin") is False
        assert entry["pricing_type"] == "free"
        assert entry["category"] == "pi"
        assert isinstance(entry["name"], str) and entry["name"].strip()
        assert isinstance(entry["description"], str) and entry["description"].strip()
        body = entry.get("skill_body") or ""
        assert isinstance(body, str) and len(body.strip()) > 200, f"{slug} body too short"


def test_pi_skill_slugs_unique_across_all_seed_files() -> None:
    entries = load_seed_entries()
    skill_slugs = [e["slug"] for e in entries if e.get("kind") == "skill"]
    dupes = sorted({s for s in skill_slugs if skill_slugs.count(s) > 1})
    assert not dupes, f"duplicate skill slugs across seeds: {dupes}"


def test_provenance_catalog_ids_are_valid_and_required() -> None:
    catalog_ids = _catalog_ids()
    claim_ids = _claim_ids()
    skills = {s["slug"]: s for s in _load_pi_skills()}
    allowed_non_catalog = REQUIRED_PI_SKILL_SLUGS | claim_ids

    for slug, required in REQUIRED_PROVENANCE.items():
        body = skills[slug]["skill_body"]
        missing = {cid for cid in required if cid not in body}
        assert not missing, f"{slug} missing provenance IDs: {sorted(missing)}"

        mentioned = set(re.findall(r"`(pi-[a-z0-9-]+)`", body))
        unknown = {
            m
            for m in mentioned
            if m not in catalog_ids and m not in allowed_non_catalog
        }
        assert not unknown, f"{slug} references unknown catalog/claim IDs: {sorted(unknown)}"


def test_skill_bodies_do_not_contradict_unsupported_claims() -> None:
    for entry in _load_pi_skills():
        body = entry["skill_body"]
        for claim_id, pattern in FORBIDDEN_BODY_PATTERNS:
            assert pattern.search(body) is None, (
                f"{entry['slug']} body appears to assert forbidden claim {claim_id}"
            )


def test_platform_api_skill_does_not_invent_hosts() -> None:
    body = next(s for s in _load_pi_skills() if s["slug"] == "pi-platform-api")["skill_body"]
    assert "https://api.minepi.com/v2" in body
    for host in ("api.pi.network", "payments.minepi.com", "oauth.minepi.com"):
        assert host not in body


def test_auth_skill_rejects_opensail_oauth_equivalence() -> None:
    body = next(s for s in _load_pi_skills() if s["slug"] == "pi-auth")["skill_body"]
    assert "NOT OpenSail authentication" in body
    assert "OAuth2" in body
    assert "/v2/me" in body


def test_payments_skill_keeps_stripe_boundary() -> None:
    body = next(s for s in _load_pi_skills() if s["slug"] == "pi-payments")["skill_body"]
    assert "separate from OpenSail platform billing" in body
    assert "Testnet" in body
    assert "Server API Key" in body


def test_developer_portal_skill_forbids_automation_apis() -> None:
    body = next(s for s in _load_pi_skills() if s["slug"] == "pi-developer-portal")[
        "skill_body"
    ]
    assert "OpenSail cannot automate Developer Portal registration" in body
    assert "validation-key.txt" in body


def test_app_studio_boundary_present() -> None:
    bodies = "\n".join(s["skill_body"] for s in _load_pi_skills())
    assert "pi-app-studio-product" in bodies
