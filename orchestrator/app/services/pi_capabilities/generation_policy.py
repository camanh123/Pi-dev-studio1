"""Generation gate for future Pi-specific implementation tools.

Phase 3A does not generate Pi auth or payment code. Later generators
must call ``enforce_pi_generation`` (or ``require_pi_generation``)
before writing Pi-specific application code.

Decision semantics:

* ``ALLOW`` → generation may proceed
* ``ALLOW_WITH_WARNING`` → generation may proceed only with the
  structured warnings/limitations attached
* ``BLOCK`` → generation must not proceed
"""

from __future__ import annotations

from dataclasses import dataclass

from app.services.pi_capabilities.check_result import build_capability_check_result
from app.services.pi_capabilities.models import CapabilityEvaluation, GuardDecision
from app.services.pi_capabilities.registry import evaluate


class PiGenerationBlockedError(Exception):
    """Raised when a Pi generator must not proceed (BLOCK)."""

    def __init__(self, gate: GenerationGate) -> None:
        self.gate = gate
        super().__init__(gate.reason)


@dataclass(frozen=True)
class GenerationGate:
    """Outcome of the pre-generation policy check."""

    proceed: bool
    decision: GuardDecision
    warnings: tuple[str, ...]
    blockers: tuple[str, ...]
    limitations: tuple[str, ...]
    reason: str
    check: dict
    evaluation: CapabilityEvaluation

    @property
    def requires_warning(self) -> bool:
        return self.decision is GuardDecision.ALLOW_WITH_WARNING


def enforce_pi_generation(
    capability: str,
    environment: str | None = None,
    network: str | None = None,
) -> GenerationGate:
    """Evaluate a capability and return whether generation may proceed.

    LIMITED capabilities never become unconditional ALLOW.
    """
    check = build_capability_check_result(capability, environment, network)
    try:
        evaluation = evaluate(capability, environment, network)
    except ValueError:
        evaluation = evaluate("UNKNOWN_CAPABILITY")
        # Preserve the more specific BLOCK payload from check_result
        # (invalid environment/network) rather than the unknown-id reason.
    warnings = tuple(check["warnings"])
    limitations = tuple(check["limitations"])
    blockers = tuple(check["blockers"])
    decision = GuardDecision(check["decision"])

    if decision is GuardDecision.BLOCK:
        return GenerationGate(
            proceed=False,
            decision=decision,
            warnings=warnings,
            blockers=blockers,
            limitations=limitations,
            reason=blockers[0] if blockers else "Pi capability generation is blocked.",
            check=check,
            evaluation=evaluation,
        )

    if decision is GuardDecision.ALLOW_WITH_WARNING:
        return GenerationGate(
            proceed=True,
            decision=decision,
            warnings=warnings or limitations,
            blockers=blockers,
            limitations=limitations,
            reason=evaluation.reason,
            check=check,
            evaluation=evaluation,
        )

    return GenerationGate(
        proceed=True,
        decision=decision,
        warnings=warnings,
        blockers=blockers,
        limitations=limitations,
        reason=evaluation.reason,
        check=check,
        evaluation=evaluation,
    )


def require_pi_generation(
    capability: str,
    environment: str | None = None,
    network: str | None = None,
) -> GenerationGate:
    """Like ``enforce_pi_generation`` but raises on BLOCK."""
    gate = enforce_pi_generation(capability, environment, network)
    if not gate.proceed:
        raise PiGenerationBlockedError(gate)
    return gate
