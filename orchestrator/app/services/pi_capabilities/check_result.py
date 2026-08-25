"""Structured capability-check payload shared by the agent tool.

Queries the Phase 2 registry. Does not duplicate catalog data and never
embeds secret values.
"""

from __future__ import annotations

from typing import Any

from app.services.pi_capabilities.models import GuardDecision
from app.services.pi_capabilities.registry import get_registry

_EMPTY_STRINGS: tuple[str, ...] = ()


def build_capability_check_result(
    capability: str,
    environment: str | None = None,
    network: str | None = None,
) -> dict[str, Any]:
    """Return the agent-facing capability-check payload.

    ``decision`` is always a Phase 2 ``GuardDecision`` value. Unknown
    capabilities and invalid environment/network names are BLOCK.
    """
    cap_id = str(capability or "").strip()
    env = _blank_to_none(environment)
    net = _blank_to_none(network)
    registry = get_registry()
    record = registry.get_capability(cap_id) if cap_id else None

    try:
        evaluation = registry.evaluate(cap_id or "UNKNOWN_CAPABILITY", env, net)
    except ValueError as exc:
        return _payload(
            capability=cap_id,
            known=record is not None,
            platform_status=record.status.value if record is not None else None,
            studio_status=record.studio_status.value if record is not None else None,
            decision=GuardDecision.BLOCK.value,
            environments=[item.value for item in record.environments] if record else [],
            required_scopes=[scope.value for scope in record.required_scopes] if record else [],
            backend_required=bool(record.backend_required) if record else False,
            blockchain_required=bool(record.blockchain_required) if record else False,
            required_secret_names=(
                [secret.name.value for secret in record.required_secrets] if record else []
            ),
            blockers=(str(exc),),
            warnings=_EMPTY_STRINGS,
            limitations=record.limitations if record else _EMPTY_STRINGS,
        )

    return _payload(
        capability=evaluation.capability_id,
        known=record is not None,
        platform_status=evaluation.status.value if evaluation.status is not None else None,
        studio_status=(
            evaluation.studio_status.value if evaluation.studio_status is not None else None
        ),
        decision=evaluation.decision.value,
        environments=list(evaluation.environments)
        if evaluation.environments
        else ([item.value for item in record.environments] if record else []),
        required_scopes=[scope.value for scope in record.required_scopes] if record else [],
        backend_required=bool(record.backend_required) if record else False,
        blockchain_required=bool(record.blockchain_required) if record else False,
        required_secret_names=(
            [secret.name.value for secret in record.required_secrets] if record else []
        ),
        blockers=evaluation.blockers,
        warnings=evaluation.warnings,
        limitations=record.limitations if record else _EMPTY_STRINGS,
    )


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = str(value).strip()
    return stripped or None


def _payload(
    *,
    capability: str,
    known: bool,
    platform_status: str | None,
    studio_status: str | None,
    decision: str,
    environments: list[str],
    required_scopes: list[str],
    backend_required: bool,
    blockchain_required: bool,
    required_secret_names: list[str],
    blockers: tuple[str, ...] | list[str],
    warnings: tuple[str, ...] | list[str],
    limitations: tuple[str, ...] | list[str],
) -> dict[str, Any]:
    return {
        "capability": capability,
        "known": known,
        "platform_status": platform_status,
        "studio_status": studio_status,
        "decision": decision,
        "environments": list(environments),
        "required_scopes": list(required_scopes),
        "backend_required": backend_required,
        "blockchain_required": blockchain_required,
        "required_secret_names": list(required_secret_names),
        "blockers": list(blockers),
        "warnings": list(warnings),
        "limitations": list(limitations),
    }
