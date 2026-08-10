"""Validate the Phase 1 Pi knowledge corpus integrity."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from pi_integration.knowledge import (
    KnowledgeEntry,
    load_catalog,
    load_unsupported_claims,
    validate_corpus,
)
from pi_integration.knowledge.schema import (
    ClaimStatus,
    DocClass,
    EntryStatus,
    Environment,
    SourceAuthority,
    Topic,
    UnsupportedClaim,
)


REQUIRED_ENTRY_IDS = {
    "pi-platform-docs-readme",
    "pi-sdk-reference",
    "pi-sdk-js-artifact",
    "pi-platform-api",
    "pi-payments-u2a",
    "pi-payments-advanced",
    "pi-api-host-v2",
    "pi-developer-portal-workflow",
    "pi-students-developer-onboarding",
    "pi-developers-landing",
    "pi-demo-app",
    "pi-app-studio-product",
}

REQUIRED_CLAIM_IDS = {
    "pi-auth-is-oauth2",
    "pi-auth-is-opensail-oauth-provider",
    "pi-payment-is-stripe",
    "pi-payment-has-stripe-webhooks",
    "pi-payment-supports-refunds",
    "pi-payment-supports-recurring-billing",
    "pi-app-studio-public-api",
    "pi-app-studio-deploy-api",
    "pi-app-studio-publish-api",
    "pi-wallet-balance-api",
    "pi-wallet-history-api",
    "pi-wallet-custody-api",
    "pi-token-refresh-protocol",
    "official-python-core-team-sdk",
    "official-npm-sdk-required",
}


def test_validate_corpus_passes() -> None:
    validate_corpus()


def test_catalog_contains_required_entries() -> None:
    ids = {e.id for e in load_catalog()}
    missing = REQUIRED_ENTRY_IDS - ids
    assert not missing, f"missing catalog entries: {sorted(missing)}"


def test_claims_registry_contains_required_ids() -> None:
    ids = {c.id for c in load_unsupported_claims()}
    missing = REQUIRED_CLAIM_IDS - ids
    assert not missing, f"missing claim ids: {sorted(missing)}"


def test_entry_ids_and_urls_unique() -> None:
    entries = load_catalog()
    assert len(entries) == len({e.id for e in entries})
    assert len(entries) == len({str(e.source_url) for e in entries})


def test_claim_ids_unique() -> None:
    claims = load_unsupported_claims()
    assert len(claims) == len({c.id for c in claims})


def test_normative_entries_are_not_community() -> None:
    for entry in load_catalog():
        if entry.doc_class == DocClass.NORMATIVE_API:
            assert entry.community is False


def test_app_studio_is_product_announcement_with_no_api_boundary() -> None:
    entry = next(e for e in load_catalog() if e.id == "pi-app-studio-product")
    assert entry.doc_class == DocClass.PRODUCT_ANNOUNCEMENT
    assert "No public App Studio" in entry.notes or "NO confirmed public App Studio API" in " ".join(
        entry.documented_surfaces
    )


def test_platform_api_allowlists_only_documented_routes() -> None:
    entry = next(e for e in load_catalog() if e.id == "pi-platform-api")
    surfaces = set(entry.documented_surfaces)
    assert "https://api.minepi.com/v2" in surfaces
    assert "GET /me" in surfaces
    assert "POST /payments/{payment_id}/approve" in surfaces
    assert "POST /payments/{payment_id}/complete" in surfaces
    # Must not invent hosts
    assert all(
        not s.startswith("http") or s.startswith("https://api.minepi.com/")
        for s in surfaces
        if s.startswith("http")
    )


def test_sdk_artifact_entry() -> None:
    entry = next(e for e in load_catalog() if e.id == "pi-sdk-js-artifact")
    assert str(entry.source_url) == "https://sdk.minepi.com/pi-sdk.js"
    assert entry.source_authority == SourceAuthority.SDK_MINEPI_COM


def test_a2u_testnet_only_note_present() -> None:
    entry = next(e for e in load_catalog() if e.id == "pi-payments-advanced")
    assert Environment.TESTNET in entry.environments
    assert "Testnet" in entry.notes
    assert "Mainnet A2U" in entry.notes or "Mainnet" in entry.notes


def test_retrieved_at_is_timezone_aware_utc() -> None:
    for entry in load_catalog():
        assert isinstance(entry.retrieved_at, datetime)
        assert entry.retrieved_at.tzinfo is not None


def test_authorities_and_enums_are_closed() -> None:
    for entry in load_catalog():
        assert isinstance(entry.source_authority, SourceAuthority)
        assert isinstance(entry.doc_class, DocClass)
        assert isinstance(entry.status, EntryStatus)
        for topic in entry.topics:
            assert isinstance(topic, Topic)


def test_claims_status_enum() -> None:
    for claim in load_unsupported_claims():
        assert isinstance(claim.status, ClaimStatus)


def test_reject_normative_community_entry() -> None:
    with pytest.raises(ValidationError):
        KnowledgeEntry(
            id="bad-community-normative",
            source_url="https://example.com/doc",
            source_authority=SourceAuthority.MINEPI_COM,
            document_title="Bad",
            topics=[Topic.SDK],
            doc_class=DocClass.NORMATIVE_API,
            retrieved_at=datetime.now(timezone.utc),
            status=EntryStatus.CURRENT,
            community=True,
        )


def test_reject_all_with_other_environments() -> None:
    with pytest.raises(ValidationError):
        KnowledgeEntry(
            id="bad-envs",
            source_url="https://example.com/doc",
            source_authority=SourceAuthority.MINEPI_COM,
            document_title="Bad",
            topics=[Topic.SDK],
            doc_class=DocClass.WORKFLOW_GUIDANCE,
            retrieved_at=datetime.now(timezone.utc),
            status=EntryStatus.CURRENT,
            environments=[Environment.ALL, Environment.TESTNET],
        )


def test_unsupported_claim_model() -> None:
    claim = UnsupportedClaim(
        id="example-claim",
        claim="Example",
        status=ClaimStatus.UNKNOWN,
        reason="Not verified.",
    )
    assert claim.id == "example-claim"
