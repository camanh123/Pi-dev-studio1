"""Pi capability registry types.

This module is the Phase 2 *capability truth layer* for Pi Dev Studio.
It encodes verified Pi Network platform facts (SUPPORTED / LIMITED /
UNSUPPORTED) separately from whether Pi Dev Studio has implemented a
tool or integration yet (``StudioImplementationStatus``).

Do not store secret values here — only secret *names* and exposure.
Do not invent Pi REST paths beyond the verified ``GET /v2/me`` URL.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

PHASE2_BASELINE_DATE = "2026-08-25"
PI_USER_ME_URL = "https://api.minepi.com/v2/me"


class CapabilityStatus(StrEnum):
    """Verified Pi Network platform support, not Studio implementation status."""

    SUPPORTED = "SUPPORTED"
    LIMITED = "LIMITED"
    UNSUPPORTED = "UNSUPPORTED"


class StudioImplementationStatus(StrEnum):
    """Whether Pi Dev Studio has a tool/integration for this capability.

    A capability can be SUPPORTED on Pi Network while Studio is still
    ``NOT_IMPLEMENTED``. Never infer the latter from the former.
    """

    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"
    PARTIAL = "PARTIAL"
    IMPLEMENTED = "IMPLEMENTED"


class Environment(StrEnum):
    """Runtime and network environments a capability may require or target."""

    PI_BROWSER = "PI_BROWSER"
    NORMAL_WEB = "NORMAL_WEB"
    BACKEND = "BACKEND"
    BLOCKCHAIN = "BLOCKCHAIN"
    TESTNET = "TESTNET"
    MAINNET = "MAINNET"


NETWORK_ENVIRONMENTS: frozenset[Environment] = frozenset({Environment.TESTNET, Environment.MAINNET})
RUNTIME_ENVIRONMENTS: frozenset[Environment] = frozenset(
    {
        Environment.PI_BROWSER,
        Environment.NORMAL_WEB,
        Environment.BACKEND,
        Environment.BLOCKCHAIN,
    }
)


class CapabilityId(StrEnum):
    """Canonical capability identifiers consulted before generating Pi code."""

    PI_BROWSER_AUTH = "PI_BROWSER_AUTH"
    PI_SIGN_IN = "PI_SIGN_IN"
    USER_TO_APP_PAYMENT = "USER_TO_APP_PAYMENT"
    APP_TO_USER_PAYMENT = "APP_TO_USER_PAYMENT"
    USER_VERIFICATION = "USER_VERIFICATION"
    WALLET_ADDRESS = "WALLET_ADDRESS"
    PLATFORM_API = "PLATFORM_API"
    PI_TESTNET = "PI_TESTNET"
    PI_MAINNET = "PI_MAINNET"
    BLOCKCHAIN_TRANSACTION = "BLOCKCHAIN_TRANSACTION"
    SERVER_SIDE_PAYMENT_APPROVAL = "SERVER_SIDE_PAYMENT_APPROVAL"
    SERVER_SIDE_PAYMENT_COMPLETION = "SERVER_SIDE_PAYMENT_COMPLETION"
    INCOMPLETE_PAYMENT_RECOVERY = "INCOMPLETE_PAYMENT_RECOVERY"
    APP_REGISTRATION = "APP_REGISTRATION"
    PI_BROWSER_RUNTIME = "PI_BROWSER_RUNTIME"


class PiScope(StrEnum):
    """Known Pi JavaScript SDK scopes from the Phase 2 baseline."""

    USERNAME = "username"
    PAYMENTS = "payments"
    WALLET_ADDRESS = "wallet_address"


class SecretName(StrEnum):
    """Developer secret *names* only. Never persist or serialize values."""

    PI_API_KEY = "PI_API_KEY"
    APP_WALLET_PRIVATE_SEED = "APP_WALLET_PRIVATE_SEED"


class SecretExposure(StrEnum):
    BACKEND_ONLY = "BACKEND_ONLY"


class GuardDecision(StrEnum):
    """Outcome of ``can_generate``. LIMITED never maps to ALLOW."""

    ALLOW = "ALLOW"
    ALLOW_WITH_WARNING = "ALLOW_WITH_WARNING"
    BLOCK = "BLOCK"


class PlatformApiCategory(StrEnum):
    """Known Platform API categories. Categories, not invented REST paths."""

    USER_ME = "GET /me"
    PAYMENT_CREATION = "payment creation"
    PAYMENT_LOOKUP = "payment lookup"
    PAYMENT_APPROVAL = "payment approval"
    PAYMENT_COMPLETION = "payment completion"


@dataclass(frozen=True)
class SecretRef:
    """A named secret that generated code must keep off the frontend."""

    name: SecretName
    exposure: SecretExposure = SecretExposure.BACKEND_ONLY

    def to_dict(self) -> dict[str, str]:
        return {"name": self.name.value, "exposure": self.exposure.value}


@dataclass(frozen=True)
class CapabilityRecord:
    """One canonical Pi capability and its verified constraints."""

    id: CapabilityId
    status: CapabilityStatus
    environments: tuple[Environment, ...]
    frontend_required: bool
    backend_required: bool
    blockchain_required: bool
    required_scopes: tuple[PiScope, ...] = ()
    available_scopes: tuple[PiScope, ...] = ()
    required_secrets: tuple[SecretRef, ...] = ()
    security_notes: tuple[str, ...] = ()
    limitations: tuple[str, ...] = ()
    official_reference: str = ""
    last_verified: str = PHASE2_BASELINE_DATE
    studio_status: StudioImplementationStatus = StudioImplementationStatus.NOT_IMPLEMENTED
    frontend_api: str | None = None
    backend_api: str | None = None
    platform_api_categories: tuple[PlatformApiCategory, ...] = ()
    consent_required: bool = False
    generation_requirements: tuple[str, ...] = ()
    related_capability_ids: tuple[CapabilityId, ...] = ()
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Stable, machine-readable serialization (no secret values)."""
        return {
            "id": self.id.value,
            "status": self.status.value,
            "environments": [env.value for env in self.environments],
            "frontend_required": self.frontend_required,
            "backend_required": self.backend_required,
            "blockchain_required": self.blockchain_required,
            "required_scopes": [scope.value for scope in self.required_scopes],
            "available_scopes": [scope.value for scope in self.available_scopes],
            "required_secrets": [secret.to_dict() for secret in self.required_secrets],
            "security_notes": list(self.security_notes),
            "limitations": list(self.limitations),
            "official_reference": self.official_reference,
            "last_verified": self.last_verified,
            "studio_status": self.studio_status.value,
            "frontend_api": self.frontend_api,
            "backend_api": self.backend_api,
            "platform_api_categories": [
                category.value for category in self.platform_api_categories
            ],
            "consent_required": self.consent_required,
            "generation_requirements": list(self.generation_requirements),
            "related_capability_ids": [cid.value for cid in self.related_capability_ids],
        }


@dataclass(frozen=True)
class CapabilityEvaluation:
    """Query result for one capability × target environment/network."""

    capability_id: str
    decision: GuardDecision
    status: CapabilityStatus | None
    directly_available: bool
    requirements: tuple[str, ...] = ()
    blockers: tuple[str, ...] = ()
    warnings: tuple[str, ...] = ()
    studio_status: StudioImplementationStatus | None = None
    reason: str = ""
    environments: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "capability_id": self.capability_id,
            "decision": self.decision.value,
            "status": self.status.value if self.status is not None else None,
            "directly_available": self.directly_available,
            "requirements": list(self.requirements),
            "blockers": list(self.blockers),
            "warnings": list(self.warnings),
            "studio_status": (self.studio_status.value if self.studio_status is not None else None),
            "reason": self.reason,
            "environments": list(self.environments),
        }
