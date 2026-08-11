"""Pydantic schema for the Phase 1 Pi knowledge corpus."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator


class SourceAuthority(str, Enum):
    """Allowed official source authorities for catalog entries."""

    PI_PLATFORM_DOCS = "pi-platform-docs"
    MINEPI_COM = "minepi.com"
    SDK_MINEPI_COM = "sdk.minepi.com"
    API_MINEPI_COM = "api.minepi.com"


class Topic(str, Enum):
    SDK = "sdk"
    AUTH = "auth"
    PAYMENTS = "payments"
    PLATFORM_API = "platform-api"
    PORTAL = "portal"
    BROWSER = "browser"
    COMPLIANCE = "compliance"


class DocClass(str, Enum):
    NORMATIVE_API = "normative-api"
    WORKFLOW_GUIDANCE = "workflow-guidance"
    PRODUCT_ANNOUNCEMENT = "product-announcement"


class EntryStatus(str, Enum):
    CURRENT = "current"
    NEEDS_REVIEW = "needs-review"
    SUPERSEDED = "superseded"


class Environment(str, Enum):
    SANDBOX = "sandbox"
    TESTNET = "testnet"
    MAINNET = "mainnet"
    ALL = "all"


class ClaimStatus(str, Enum):
    """Status for claims that skills must not assume."""

    UNSUPPORTED = "unsupported"
    UNKNOWN = "unknown"
    NOT_CONFIRMED = "not-confirmed"


class KnowledgeEntry(BaseModel):
    """One provenance-backed Pi knowledge source entry.

    Normative API claims used by later skills must resolve to an entry
    in this catalog via ``id`` → ``source_url`` → official source.
    """

    id: str = Field(..., min_length=1, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    source_url: HttpUrl
    source_authority: SourceAuthority
    document_title: str = Field(..., min_length=1)
    topics: list[Topic] = Field(..., min_length=1)
    doc_class: DocClass
    retrieved_at: datetime
    status: EntryStatus
    sdk_api_version: str | None = None
    environments: list[Environment] = Field(default_factory=lambda: [Environment.ALL])
    community: bool = False
    notes: str = ""
    # Documented API paths or SDK symbols explicitly attested by this source.
    # Empty for workflow / product entries. Never invent undocumented routes.
    documented_surfaces: list[str] = Field(default_factory=list)

    @field_validator("topics")
    @classmethod
    def _unique_topics(cls, value: list[Topic]) -> list[Topic]:
        if len(value) != len(set(value)):
            raise ValueError("topics must be unique within an entry")
        return value

    @field_validator("environments")
    @classmethod
    def _unique_environments(cls, value: list[Environment]) -> list[Environment]:
        if not value:
            raise ValueError("environments must be non-empty")
        if len(value) != len(set(value)):
            raise ValueError("environments must be unique within an entry")
        if Environment.ALL in value and len(value) > 1:
            raise ValueError("'all' cannot be combined with other environments")
        return value

    def model_post_init(self, __context) -> None:  # type: ignore[override]
        if self.doc_class == DocClass.NORMATIVE_API and self.community:
            raise ValueError(
                f"normative-api entry '{self.id}' must have community=false"
            )


class UnsupportedClaim(BaseModel):
    """A claim future Pi skills must not assume without official confirmation."""

    id: str = Field(..., min_length=1, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    claim: str = Field(..., min_length=1)
    status: ClaimStatus
    reason: str = Field(..., min_length=1)


class KnowledgeCatalogFile(BaseModel):
    """Root shape of catalog.json."""

    schema_version: Literal[1] = 1
    description: str
    entries: list[KnowledgeEntry]


class UnsupportedClaimsFile(BaseModel):
    """Root shape of unsupported_claims.json."""

    schema_version: Literal[1] = 1
    description: str
    claims: list[UnsupportedClaim]
