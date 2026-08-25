"""Pi capability registry — Phase 2 truth layer for Pi Dev Studio.

Consult this package *before* generating Pi-specific application code.
It records verified Pi Network platform facts, not Studio tool coverage.

Public query surface for later Pi Agent Tools:

* ``get_registry().get_capability(id)``
* ``get_registry().list_capabilities(status=...)``
* ``evaluate(id, environment)`` / ``can_generate(id, environment)``
"""

from app.services.pi_capabilities.generation_policy import (
    GenerationGate,
    PiGenerationBlockedError,
    enforce_pi_generation,
    require_pi_generation,
)
from app.services.pi_capabilities.models import (
    PHASE2_BASELINE_DATE,
    PI_USER_ME_URL,
    CapabilityEvaluation,
    CapabilityId,
    CapabilityRecord,
    CapabilityStatus,
    Environment,
    GuardDecision,
    PiScope,
    PlatformApiCategory,
    SecretExposure,
    SecretName,
    SecretRef,
    StudioImplementationStatus,
)
from app.services.pi_capabilities.registry import (
    PiCapabilityRegistry,
    can_generate,
    evaluate,
    get_registry,
)
from app.services.pi_capabilities.studio_tools import (
    STUDIO_PI_TOOLS,
    StudioToolAvailability,
    StudioToolRecord,
)

__all__ = [
    "PHASE2_BASELINE_DATE",
    "PI_USER_ME_URL",
    "CapabilityEvaluation",
    "CapabilityId",
    "CapabilityRecord",
    "CapabilityStatus",
    "Environment",
    "GuardDecision",
    "PiCapabilityRegistry",
    "PiScope",
    "PlatformApiCategory",
    "SecretExposure",
    "SecretName",
    "SecretRef",
    "StudioImplementationStatus",
    "can_generate",
    "evaluate",
    "enforce_pi_generation",
    "get_registry",
    "require_pi_generation",
    "GenerationGate",
    "PiGenerationBlockedError",
    "STUDIO_PI_TOOLS",
    "StudioToolAvailability",
    "StudioToolRecord",
]
