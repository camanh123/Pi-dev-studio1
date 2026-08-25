"""Phase 2 Pi capability registry tests.

Covers platform-fact encoding, query/filter, generation guard outcomes,
secret exposure invariants, and serialization stability. Does not call
Pi Network APIs and does not generate application integrations.
"""

from __future__ import annotations

import json

import pytest

from app.services.pi_capabilities import (
    PI_USER_ME_URL,
    CapabilityId,
    CapabilityStatus,
    Environment,
    GuardDecision,
    PiCapabilityRegistry,
    PiScope,
    PlatformApiCategory,
    SecretExposure,
    SecretName,
    StudioImplementationStatus,
    can_generate,
    evaluate,
    get_registry,
)
from app.services.pi_capabilities.catalog import CANONICAL_CAPABILITY_IDS, CAPABILITIES
from app.services.pi_capabilities.models import CapabilityRecord
from app.services.pi_capabilities.registry import split_target

pytestmark = pytest.mark.unit

REQUIRED_IDS = (
    CapabilityId.PI_BROWSER_AUTH,
    CapabilityId.PI_SIGN_IN,
    CapabilityId.USER_TO_APP_PAYMENT,
    CapabilityId.APP_TO_USER_PAYMENT,
    CapabilityId.USER_VERIFICATION,
    CapabilityId.WALLET_ADDRESS,
    CapabilityId.PLATFORM_API,
    CapabilityId.PI_TESTNET,
    CapabilityId.PI_MAINNET,
    CapabilityId.BLOCKCHAIN_TRANSACTION,
    CapabilityId.SERVER_SIDE_PAYMENT_APPROVAL,
    CapabilityId.SERVER_SIDE_PAYMENT_COMPLETION,
    CapabilityId.INCOMPLETE_PAYMENT_RECOVERY,
    CapabilityId.APP_REGISTRATION,
    CapabilityId.PI_BROWSER_RUNTIME,
)


@pytest.fixture
def registry() -> PiCapabilityRegistry:
    return PiCapabilityRegistry()


def test_catalog_defines_all_canonical_ids(registry: PiCapabilityRegistry) -> None:
    assert CANONICAL_CAPABILITY_IDS == REQUIRED_IDS
    assert [record.id for record in registry.list_capabilities()] == list(REQUIRED_IDS)
    for capability_id in REQUIRED_IDS:
        assert registry.get_capability(capability_id) is not None
        assert registry.get_capability(capability_id.value) is not None


def test_auth_supported_in_pi_browser(registry: PiCapabilityRegistry) -> None:
    record = registry.get_capability(CapabilityId.PI_BROWSER_AUTH)
    assert record is not None
    assert record.status is CapabilityStatus.SUPPORTED
    assert Environment.PI_BROWSER in record.environments
    assert record.frontend_api == "Pi.authenticate(scopes, onIncompletePaymentFound)"
    assert record.backend_api == f"GET {PI_USER_ME_URL}"
    assert set(record.available_scopes) == {
        PiScope.USERNAME,
        PiScope.PAYMENTS,
        PiScope.WALLET_ADDRESS,
    }

    evaluation = registry.evaluate(CapabilityId.PI_BROWSER_AUTH, Environment.PI_BROWSER)
    assert evaluation.decision is GuardDecision.ALLOW
    assert evaluation.directly_available is True
    assert can_generate(CapabilityId.PI_BROWSER_AUTH, "PI_BROWSER") is GuardDecision.ALLOW


def test_pi_sign_in_supported_for_normal_web(registry: PiCapabilityRegistry) -> None:
    record = registry.get_capability(CapabilityId.PI_SIGN_IN)
    assert record is not None
    assert record.status is CapabilityStatus.SUPPORTED
    assert Environment.NORMAL_WEB in record.environments
    assert Environment.PI_BROWSER not in record.environments
    assert record.frontend_api == "Pi.signIn(...)"

    evaluation = registry.evaluate(CapabilityId.PI_SIGN_IN, Environment.NORMAL_WEB)
    assert evaluation.decision is GuardDecision.ALLOW
    assert evaluation.directly_available is True

    browser_eval = registry.evaluate(CapabilityId.PI_SIGN_IN, Environment.PI_BROWSER)
    assert browser_eval.decision is GuardDecision.BLOCK
    assert browser_eval.directly_available is False


def test_wallet_address_scope_requirement(registry: PiCapabilityRegistry) -> None:
    record = registry.get_capability(CapabilityId.WALLET_ADDRESS)
    assert record is not None
    assert record.status is CapabilityStatus.SUPPORTED
    assert record.consent_required is True
    assert record.required_scopes == (PiScope.WALLET_ADDRESS,)

    evaluation = registry.evaluate(CapabilityId.WALLET_ADDRESS, Environment.PI_BROWSER)
    assert evaluation.decision is GuardDecision.ALLOW
    assert "wallet_address" in " ".join(evaluation.requirements)
    assert any("consent" in item.lower() for item in evaluation.requirements)


def test_u2a_supported_with_backend_requirements(registry: PiCapabilityRegistry) -> None:
    record = registry.get_capability(CapabilityId.USER_TO_APP_PAYMENT)
    assert record is not None
    assert record.status is CapabilityStatus.SUPPORTED
    assert record.frontend_required is True
    assert record.backend_required is True
    assert record.frontend_api == "Pi.createPayment(...)"
    assert PiScope.PAYMENTS in record.required_scopes
    assert any(secret.name is SecretName.PI_API_KEY for secret in record.required_secrets)

    evaluation = registry.evaluate(CapabilityId.USER_TO_APP_PAYMENT, Environment.PI_BROWSER)
    assert evaluation.decision is GuardDecision.ALLOW
    assert evaluation.directly_available is True
    joined = " ".join(evaluation.requirements).lower()
    assert "payments" in joined
    assert "approval" in joined
    assert "completion" in joined
    assert "backend" in joined


def test_a2u_testnet_limited(registry: PiCapabilityRegistry) -> None:
    record = registry.get_capability(CapabilityId.APP_TO_USER_PAYMENT)
    assert record is not None
    assert record.status is CapabilityStatus.LIMITED
    assert Environment.TESTNET in record.environments
    assert Environment.MAINNET not in record.environments
    assert record.blockchain_required is True
    assert record.backend_required is True

    evaluation = registry.evaluate(CapabilityId.APP_TO_USER_PAYMENT, Environment.TESTNET)
    assert evaluation.decision is GuardDecision.ALLOW_WITH_WARNING
    assert evaluation.directly_available is False
    assert evaluation.status is CapabilityStatus.LIMITED
    assert "Testnet" in evaluation.reason or "testnet" in evaluation.reason.lower()


def test_a2u_mainnet_blocked(registry: PiCapabilityRegistry) -> None:
    evaluation = registry.evaluate(CapabilityId.APP_TO_USER_PAYMENT, Environment.MAINNET)
    assert evaluation.decision is GuardDecision.BLOCK
    assert evaluation.directly_available is False
    assert any("Testnet-only" in blocker for blocker in evaluation.blockers)
    assert can_generate("APP_TO_USER_PAYMENT", "MAINNET") is GuardDecision.BLOCK


def test_api_key_and_private_seed_marked_backend_secret(
    registry: PiCapabilityRegistry,
) -> None:
    a2u = registry.get_capability(CapabilityId.APP_TO_USER_PAYMENT)
    assert a2u is not None
    secret_names = {secret.name for secret in a2u.required_secrets}
    assert SecretName.PI_API_KEY in secret_names
    assert SecretName.APP_WALLET_PRIVATE_SEED in secret_names
    assert all(secret.exposure is SecretExposure.BACKEND_ONLY for secret in a2u.required_secrets)

    platform = registry.get_capability(CapabilityId.PLATFORM_API)
    assert platform is not None
    assert any(secret.name is SecretName.PI_API_KEY for secret in platform.required_secrets)

    chain = registry.get_capability(CapabilityId.BLOCKCHAIN_TRANSACTION)
    assert chain is not None
    assert any(
        secret.name is SecretName.APP_WALLET_PRIVATE_SEED for secret in chain.required_secrets
    )


def test_me_user_verification(registry: PiCapabilityRegistry) -> None:
    record = registry.get_capability(CapabilityId.USER_VERIFICATION)
    assert record is not None
    assert record.status is CapabilityStatus.SUPPORTED
    assert record.backend_required is True
    assert record.frontend_required is False
    assert record.backend_api == f"GET {PI_USER_ME_URL}"
    assert PI_USER_ME_URL in record.official_reference
    assert PlatformApiCategory.USER_ME in record.platform_api_categories

    evaluation = registry.evaluate(CapabilityId.USER_VERIFICATION, Environment.BACKEND)
    assert evaluation.decision is GuardDecision.ALLOW
    assert PI_USER_ME_URL in " ".join(evaluation.requirements)

    frontend_eval = registry.evaluate(CapabilityId.USER_VERIFICATION, Environment.PI_BROWSER)
    assert frontend_eval.decision is GuardDecision.BLOCK


def test_incomplete_payment_recovery_requirement(
    registry: PiCapabilityRegistry,
) -> None:
    record = registry.get_capability(CapabilityId.INCOMPLETE_PAYMENT_RECOVERY)
    assert record is not None
    assert record.status is CapabilityStatus.SUPPORTED
    assert record.frontend_required is True
    assert record.backend_required is True
    assert "onIncompletePaymentFound" in (record.frontend_api or "")

    evaluation = registry.evaluate(CapabilityId.INCOMPLETE_PAYMENT_RECOVERY, Environment.PI_BROWSER)
    assert evaluation.decision is GuardDecision.ALLOW
    joined = " ".join(evaluation.requirements)
    assert "onIncompletePaymentFound" in joined
    assert "approval" in joined.lower()
    assert "completion" in joined.lower()


def test_unknown_capability_blocked(registry: PiCapabilityRegistry) -> None:
    evaluation = registry.evaluate("UNKNOWN_CAPABILITY", Environment.PI_BROWSER)
    assert evaluation.decision is GuardDecision.BLOCK
    assert evaluation.directly_available is False
    assert evaluation.status is None
    assert can_generate("UNKNOWN_CAPABILITY") is GuardDecision.BLOCK


def test_no_frontend_secret_exposure(registry: PiCapabilityRegistry) -> None:
    assert registry.frontend_secret_exposure_violations() == []
    serialized = json.dumps(registry.to_serializable_catalog())
    assert "seed-" not in serialized.lower()
    assert "sk_live" not in serialized
    assert "secret_value" not in serialized
    for record in registry.list_capabilities():
        for secret in record.required_secrets:
            assert secret.exposure is SecretExposure.BACKEND_ONLY
            payload = secret.to_dict()
            assert set(payload) == {"name", "exposure"}
            assert payload["exposure"] == SecretExposure.BACKEND_ONLY.value


def test_registry_serialization_query_stability(registry: PiCapabilityRegistry) -> None:
    first = registry.to_serializable_catalog()
    second = registry.to_serializable_catalog()
    assert first == second
    roundtrip = json.loads(json.dumps(first, sort_keys=True))
    assert json.loads(json.dumps(second, sort_keys=True)) == roundtrip
    assert [row["id"] for row in first] == [cid.value for cid in REQUIRED_IDS]

    by_status = {
        status.value: [row.id.value for row in registry.list_capabilities(status)]
        for status in CapabilityStatus
    }
    assert by_status[CapabilityStatus.SUPPORTED.value] == [
        row.id.value for row in CAPABILITIES if row.status is CapabilityStatus.SUPPORTED
    ]
    assert by_status[CapabilityStatus.LIMITED.value] == [CapabilityId.APP_TO_USER_PAYMENT.value]
    assert by_status[CapabilityStatus.UNSUPPORTED.value] == []

    default = get_registry()
    assert default.list_capabilities()[0].id is CapabilityId.PI_BROWSER_AUTH
    assert (
        evaluate("USER_TO_APP_PAYMENT", "PI_BROWSER").to_dict()["decision"]
        == GuardDecision.ALLOW.value
    )


def test_limited_never_returns_allow(registry: PiCapabilityRegistry) -> None:
    for environment in Environment:
        decision = registry.can_generate(CapabilityId.APP_TO_USER_PAYMENT, environment)
        assert decision is not GuardDecision.ALLOW


def test_filter_by_status(registry: PiCapabilityRegistry) -> None:
    limited = registry.list_capabilities(status="LIMITED")
    assert [record.id for record in limited] == [CapabilityId.APP_TO_USER_PAYMENT]
    supported = registry.list_capabilities(CapabilityStatus.SUPPORTED)
    assert all(record.status is CapabilityStatus.SUPPORTED for record in supported)
    assert len(supported) == len(REQUIRED_IDS) - 1


def test_platform_api_categories_do_not_invent_urls(
    registry: PiCapabilityRegistry,
) -> None:
    record = registry.get_capability(CapabilityId.PLATFORM_API)
    assert record is not None
    assert tuple(record.platform_api_categories) == (
        PlatformApiCategory.USER_ME,
        PlatformApiCategory.PAYMENT_CREATION,
        PlatformApiCategory.PAYMENT_LOOKUP,
        PlatformApiCategory.PAYMENT_APPROVAL,
        PlatformApiCategory.PAYMENT_COMPLETION,
    )
    catalog_json = json.dumps(registry.to_serializable_catalog())
    assert "https://api.minepi.com/v2/payments" not in catalog_json
    assert catalog_json.count("https://api.minepi.com/v2/me") >= 1


def test_studio_status_not_implemented_for_all(registry: PiCapabilityRegistry) -> None:
    for record in registry.list_capabilities():
        assert record.studio_status is StudioImplementationStatus.NOT_IMPLEMENTED
        evaluation = registry.evaluate(record.id)
        if evaluation.decision is not GuardDecision.BLOCK:
            assert any("studio_status=" in item for item in evaluation.requirements)


def test_app_network_is_configuration_not_runtime_toggle(
    registry: PiCapabilityRegistry,
) -> None:
    registration = registry.get_capability(CapabilityId.APP_REGISTRATION)
    assert registration is not None
    assert registration.status is CapabilityStatus.SUPPORTED
    joined = " ".join(registration.limitations).lower()
    assert "not a freely switchable runtime toggle" in joined
    assert registry.can_generate(CapabilityId.APP_REGISTRATION, "TESTNET") is GuardDecision.ALLOW
    assert registry.can_generate(CapabilityId.APP_REGISTRATION, "MAINNET") is GuardDecision.ALLOW
    assert registry.can_generate(CapabilityId.APP_REGISTRATION, "PI_BROWSER") is GuardDecision.BLOCK


def test_split_target_treats_networks_as_network() -> None:
    runtime, network = split_target("MAINNET")
    assert runtime is None
    assert network is Environment.MAINNET
    runtime, network = split_target("PI_BROWSER", network="TESTNET")
    assert runtime is Environment.PI_BROWSER
    assert network is Environment.TESTNET


def test_u2a_mainnet_allowed_a2u_mainnet_blocked(
    registry: PiCapabilityRegistry,
) -> None:
    assert registry.can_generate(CapabilityId.USER_TO_APP_PAYMENT, "MAINNET") is GuardDecision.ALLOW
    assert registry.can_generate(CapabilityId.APP_TO_USER_PAYMENT, "MAINNET") is GuardDecision.BLOCK


def test_capability_record_to_dict_has_required_fields() -> None:
    record = CAPABILITIES[0]
    payload = record.to_dict()
    for key in (
        "id",
        "status",
        "environments",
        "frontend_required",
        "backend_required",
        "blockchain_required",
        "required_scopes",
        "required_secrets",
        "security_notes",
        "limitations",
        "official_reference",
        "last_verified",
    ):
        assert key in payload
    assert isinstance(record, CapabilityRecord)
