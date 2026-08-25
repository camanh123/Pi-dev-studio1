"""Query interface and generation guard for the Pi capability registry.

Intended for later Pi Agent Tools. This module does not call Pi APIs
and does not generate application payment/auth code.
"""

from __future__ import annotations

from app.services.pi_capabilities.catalog import CAPABILITIES
from app.services.pi_capabilities.models import (
    NETWORK_ENVIRONMENTS,
    CapabilityEvaluation,
    CapabilityId,
    CapabilityRecord,
    CapabilityStatus,
    Environment,
    GuardDecision,
    SecretExposure,
    StudioImplementationStatus,
)

_UNKNOWN_REASON = "Unknown capability is not in the Pi capability registry."


def _coerce_capability_id(capability_id: CapabilityId | str) -> str:
    if isinstance(capability_id, CapabilityId):
        return capability_id.value
    return str(capability_id)


def _coerce_environment(value: Environment | str | None) -> Environment | None:
    if value is None:
        return None
    if isinstance(value, Environment):
        return value
    try:
        return Environment(str(value))
    except ValueError as exc:
        raise ValueError(f"Unknown environment: {value!r}") from exc


def split_target(
    environment: Environment | str | None = None,
    network: Environment | str | None = None,
) -> tuple[Environment | None, Environment | None]:
    """Split a combined environment/network argument into runtime + network.

    ``can_generate(capability, "MAINNET")`` treats MAINNET as a network
    target. ``can_generate(capability, "PI_BROWSER")`` treats PI_BROWSER
    as a runtime target.
    """
    runtime: Environment | None = None
    net: Environment | None = None

    env = _coerce_environment(environment)
    if env is not None:
        if env in NETWORK_ENVIRONMENTS:
            net = env
        else:
            runtime = env

    explicit_network = _coerce_environment(network)
    if explicit_network is not None:
        if explicit_network not in NETWORK_ENVIRONMENTS:
            raise ValueError(f"network must be TESTNET or MAINNET, got {explicit_network.value}")
        net = explicit_network

    return runtime, net


class PiCapabilityRegistry:
    """In-process catalog + query + guard. No HTTP surface, no secret values."""

    def __init__(self, records: tuple[CapabilityRecord, ...] | None = None) -> None:
        self._records: tuple[CapabilityRecord, ...] = (
            records if records is not None else CAPABILITIES
        )
        self._by_id: dict[str, CapabilityRecord] = {
            record.id.value: record for record in self._records
        }
        if len(self._by_id) != len(self._records):
            raise ValueError("Duplicate capability ids in Pi capability catalog")

    def get_capability(self, capability_id: CapabilityId | str) -> CapabilityRecord | None:
        return self._by_id.get(_coerce_capability_id(capability_id))

    def list_capabilities(
        self, status: CapabilityStatus | str | None = None
    ) -> list[CapabilityRecord]:
        records = list(self._records)
        if status is None:
            return records
        wanted = status if isinstance(status, CapabilityStatus) else CapabilityStatus(status)
        return [record for record in records if record.status is wanted]

    def to_serializable_catalog(self) -> list[dict]:
        return [record.to_dict() for record in self._records]

    def frontend_secret_exposure_violations(self) -> list[str]:
        """Return catalog invariant failures. Empty means no frontend secret exposure."""
        violations: list[str] = []
        for record in self._records:
            if not record.required_secrets:
                continue
            if not record.backend_required:
                violations.append(
                    f"{record.id.value}: required_secrets set but backend_required is False"
                )
            for secret in record.required_secrets:
                if secret.exposure is not SecretExposure.BACKEND_ONLY:
                    violations.append(
                        f"{record.id.value}: secret {secret.name.value} exposure is "
                        f"{secret.exposure.value}, expected BACKEND_ONLY"
                    )
        return violations

    def evaluate(
        self,
        capability_id: CapabilityId | str,
        environment: Environment | str | None = None,
        network: Environment | str | None = None,
    ) -> CapabilityEvaluation:
        cid = _coerce_capability_id(capability_id)
        record = self.get_capability(cid)
        if record is None:
            return CapabilityEvaluation(
                capability_id=cid,
                decision=GuardDecision.BLOCK,
                status=None,
                directly_available=False,
                blockers=(_UNKNOWN_REASON,),
                studio_status=None,
                reason=_UNKNOWN_REASON,
            )

        runtime, net = split_target(environment, network)
        env_set = set(record.environments)
        blockers: list[str] = []
        warnings: list[str] = list(record.limitations)

        if runtime is not None and runtime not in env_set:
            blockers.append(
                f"{record.id.value} is not available in runtime {runtime.value}. "
                f"Declared environments: {_env_list(record)}."
            )

        if net is not None:
            declared_networks = env_set & NETWORK_ENVIRONMENTS
            if declared_networks and net not in declared_networks:
                blockers.append(
                    f"{record.id.value} is not available on {net.value}. "
                    f"Declared environments: {_env_list(record)}."
                )
                if record.id is CapabilityId.APP_TO_USER_PAYMENT and net is Environment.MAINNET:
                    blockers.append(
                        "Official baseline marks APP_TO_USER_PAYMENT as LIMITED / Testnet-only."
                    )

        if record.status is CapabilityStatus.UNSUPPORTED:
            blockers.append(f"{record.id.value} is UNSUPPORTED on Pi Network.")

        requirements = _requirements_for(record)

        if blockers:
            return CapabilityEvaluation(
                capability_id=record.id.value,
                decision=GuardDecision.BLOCK,
                status=record.status,
                directly_available=False,
                requirements=requirements,
                blockers=tuple(blockers),
                warnings=tuple(warnings),
                studio_status=record.studio_status,
                reason=" ".join(blockers),
                environments=tuple(env.value for env in record.environments),
            )

        if record.status is CapabilityStatus.LIMITED:
            reason = (
                f"{record.id.value} is LIMITED, not fully SUPPORTED. "
                + " ".join(record.limitations)
            ).strip()
            return CapabilityEvaluation(
                capability_id=record.id.value,
                decision=GuardDecision.ALLOW_WITH_WARNING,
                status=record.status,
                directly_available=False,
                requirements=requirements,
                warnings=tuple(warnings),
                studio_status=record.studio_status,
                reason=reason,
                environments=tuple(env.value for env in record.environments),
            )

        reason = f"{record.id.value} is SUPPORTED for the requested target."
        return CapabilityEvaluation(
            capability_id=record.id.value,
            decision=GuardDecision.ALLOW,
            status=record.status,
            directly_available=True,
            requirements=requirements,
            warnings=tuple(warnings),
            studio_status=record.studio_status,
            reason=reason,
            environments=tuple(env.value for env in record.environments),
        )

    def can_generate(
        self,
        capability_id: CapabilityId | str,
        environment: Environment | str | None = None,
        network: Environment | str | None = None,
    ) -> GuardDecision:
        """Guard for later agent tools. LIMITED never returns ALLOW."""
        return self.evaluate(capability_id, environment, network).decision


def _env_list(record: CapabilityRecord) -> str:
    return ", ".join(env.value for env in record.environments)


def _requirements_for(record: CapabilityRecord) -> tuple[str, ...]:
    items: list[str] = []
    seen: set[str] = set()

    def _add(message: str) -> None:
        if message not in seen:
            seen.add(message)
            items.append(message)

    for message in record.generation_requirements:
        _add(message)
    for scope in record.required_scopes:
        _add(f"required scope: {scope.value}")
    if record.consent_required:
        _add("user consent required")
    if record.frontend_required:
        _add("frontend required")
    if record.backend_required:
        _add("backend required")
    if record.blockchain_required:
        _add("blockchain transaction construction/signing/submission required")
    for secret in record.required_secrets:
        _add(f"{secret.name.value} must remain backend-only (never expose to frontend)")
    if record.studio_status is not StudioImplementationStatus.IMPLEMENTED:
        _add(
            "Pi Dev Studio has not implemented a generation tool for this capability yet "
            f"(studio_status={record.studio_status.value})"
        )
    return tuple(items)


_DEFAULT_REGISTRY: PiCapabilityRegistry | None = None


def get_registry() -> PiCapabilityRegistry:
    global _DEFAULT_REGISTRY
    if _DEFAULT_REGISTRY is None:
        _DEFAULT_REGISTRY = PiCapabilityRegistry()
    return _DEFAULT_REGISTRY


def can_generate(
    capability_id: CapabilityId | str,
    environment: Environment | str | None = None,
    network: Environment | str | None = None,
) -> GuardDecision:
    """Module-level guard used by later Pi Agent Tools."""
    return get_registry().can_generate(capability_id, environment, network)


def evaluate(
    capability_id: CapabilityId | str,
    environment: Environment | str | None = None,
    network: Environment | str | None = None,
) -> CapabilityEvaluation:
    return get_registry().evaluate(capability_id, environment, network)
