"""Phase 3A Pi capability guard tool tests.

Covers agent-visible registration, Phase 2 registry reuse, guard
decisions, secret-name-only payloads, generation policy, and adapter
exposure. Does not call Pi Network APIs.
"""

from __future__ import annotations

import json

import pytest

from app.agent.tools.pi_ops import (
    PUBLIC_TOOL_NAME,
    REGISTRY_TOOL_NAME,
    pi_capability_check_executor,
)
from app.agent.tools.registry import ToolCategory, get_tool_registry
from app.services.pi_capabilities import (
    STUDIO_PI_TOOLS,
    StudioImplementationStatus,
    StudioToolAvailability,
    enforce_pi_generation,
    require_pi_generation,
)
from app.services.pi_capabilities import (
    get_registry as get_pi_registry,
)
from app.services.pi_capabilities.generation_policy import PiGenerationBlockedError
from app.services.pi_capabilities.models import GuardDecision

pytestmark = pytest.mark.unit

_EXISTING_NON_PI_TOOLS = (
    "read_file",
    "write_file",
    "bash_exec",
    "load_skill",
    "get_project_info",
)


def _details(result: dict) -> dict:
    assert result["success"] is True
    return result["details"]


@pytest.mark.asyncio
async def test_tool_is_registered_and_agent_visible() -> None:
    registry = get_tool_registry()
    tool = registry.get(REGISTRY_TOOL_NAME)
    assert tool is not None
    assert tool.name == REGISTRY_TOOL_NAME
    assert registry.get(PUBLIC_TOOL_NAME) is tool
    assert PUBLIC_TOOL_NAME in registry.visible_tool_names()
    assert REGISTRY_TOOL_NAME in registry.visible_tool_names()
    assert PUBLIC_TOOL_NAME in tool.description
    assert tool.category is ToolCategory.PROJECT
    assert tool.state_serializable is True
    assert tool.holds_external_state is False
    assert REGISTRY_TOOL_NAME not in registry.DANGEROUS_TOOLS
    assert PUBLIC_TOOL_NAME not in registry.DANGEROUS_TOOLS


@pytest.mark.asyncio
async def test_pi_browser_auth_in_pi_browser_allows() -> None:
    result = await pi_capability_check_executor(
        {"capability": "PI_BROWSER_AUTH", "environment": "PI_BROWSER"},
        {},
    )
    payload = _details(result)
    assert payload["decision"] == GuardDecision.ALLOW.value
    assert payload["known"] is True
    assert payload["platform_status"] == "SUPPORTED"


@pytest.mark.asyncio
async def test_u2a_in_pi_browser_allows_with_backend_requirements() -> None:
    result = await get_tool_registry().execute(
        PUBLIC_TOOL_NAME,
        {"capability": "USER_TO_APP_PAYMENT", "environment": "PI_BROWSER"},
        {},
    )
    assert result["success"] is True
    payload = result["result"]["details"]
    assert payload["decision"] == GuardDecision.ALLOW.value
    assert payload["backend_required"] is True
    assert "payments" in payload["required_scopes"]
    assert "PI_API_KEY" in payload["required_secret_names"]


@pytest.mark.asyncio
async def test_a2u_testnet_allow_with_warning() -> None:
    payload = _details(
        await pi_capability_check_executor(
            {"capability": "APP_TO_USER_PAYMENT", "network": "TESTNET"},
            {},
        )
    )
    assert payload["decision"] == GuardDecision.ALLOW_WITH_WARNING.value
    assert payload["platform_status"] == "LIMITED"
    assert payload["decision"] != GuardDecision.ALLOW.value


@pytest.mark.asyncio
async def test_a2u_mainnet_blocked() -> None:
    payload = _details(
        await pi_capability_check_executor(
            {"capability": "APP_TO_USER_PAYMENT", "environment": "MAINNET"},
            {},
        )
    )
    assert payload["decision"] == GuardDecision.BLOCK.value
    assert payload["known"] is True
    assert any("Testnet-only" in blocker for blocker in payload["blockers"])


@pytest.mark.asyncio
async def test_unknown_capability_blocked() -> None:
    payload = _details(await pi_capability_check_executor({"capability": "UNKNOWN_CAPABILITY"}, {}))
    assert payload["known"] is False
    assert payload["decision"] == GuardDecision.BLOCK.value
    assert payload["platform_status"] is None


@pytest.mark.asyncio
async def test_required_scopes_returned() -> None:
    payload = _details(
        await pi_capability_check_executor(
            {"capability": "WALLET_ADDRESS", "environment": "PI_BROWSER"},
            {},
        )
    )
    assert payload["required_scopes"] == ["wallet_address"]


@pytest.mark.asyncio
async def test_backend_requirements_returned() -> None:
    payload = _details(
        await pi_capability_check_executor(
            {"capability": "USER_VERIFICATION", "environment": "BACKEND"},
            {},
        )
    )
    assert payload["backend_required"] is True
    assert payload["blockchain_required"] is False


@pytest.mark.asyncio
async def test_secret_names_may_be_returned_but_never_values() -> None:
    payload = _details(
        await pi_capability_check_executor(
            {"capability": "APP_TO_USER_PAYMENT", "network": "TESTNET"},
            {},
        )
    )
    assert "PI_API_KEY" in payload["required_secret_names"]
    assert "APP_WALLET_PRIVATE_SEED" in payload["required_secret_names"]
    serialized = json.dumps(payload)
    assert "seed-" not in serialized.lower()
    assert "sk_live" not in serialized
    assert "secret_value" not in serialized
    assert "private_seed_value" not in serialized
    for key in payload:
        assert "value" not in key or key.endswith("required")


@pytest.mark.asyncio
async def test_limited_cannot_become_unconditional_allow() -> None:
    registry = get_tool_registry()
    for target in ("TESTNET", "MAINNET", "BACKEND", "PI_BROWSER", "BLOCKCHAIN"):
        result = await registry.execute(
            REGISTRY_TOOL_NAME,
            {"capability": "APP_TO_USER_PAYMENT", "environment": target},
            {},
        )
        decision = result["result"]["details"]["decision"]
        assert decision != GuardDecision.ALLOW.value


def test_generation_policy_refuses_block() -> None:
    gate = enforce_pi_generation("APP_TO_USER_PAYMENT", "MAINNET")
    assert gate.proceed is False
    assert gate.decision is GuardDecision.BLOCK
    with pytest.raises(PiGenerationBlockedError):
        require_pi_generation("APP_TO_USER_PAYMENT", network="MAINNET")


def test_generation_policy_propagates_warnings() -> None:
    gate = enforce_pi_generation("APP_TO_USER_PAYMENT", "TESTNET")
    assert gate.proceed is True
    assert gate.decision is GuardDecision.ALLOW_WITH_WARNING
    assert gate.requires_warning is True
    assert gate.warnings
    allowed = require_pi_generation("PI_BROWSER_AUTH", "PI_BROWSER")
    assert allowed.proceed is True
    assert allowed.decision is GuardDecision.ALLOW


def test_adapter_receives_the_tool() -> None:
    from tesslate_agent.agent.tesslate_agent import TesslateAgent

    from app.services.tesslate_agent_adapter import TesslateAgentAdapter
    from app.worker import _build_submodule_registry

    sub = _build_submodule_registry(get_tool_registry())
    assert sub is not None
    assert sub.get(REGISTRY_TOOL_NAME) is not None
    adapter = TesslateAgentAdapter(system_prompt="test", tools=sub, model=None)
    assert isinstance(adapter.inner, TesslateAgent)
    names = [tool.name for tool in adapter.tools.all_tools()]
    assert REGISTRY_TOOL_NAME in names
    assert adapter.tools.get(REGISTRY_TOOL_NAME).executor is pi_capability_check_executor


def test_existing_non_pi_tools_remain_registered() -> None:
    registry = get_tool_registry()
    for name in _EXISTING_NON_PI_TOOLS:
        assert registry.get(name) is not None, f"{name} missing after Pi tool registration"
    names = {tool.name for tool in registry.list_tools()}
    assert REGISTRY_TOOL_NAME in names
    assert len(names) > len(_EXISTING_NON_PI_TOOLS)


def test_capability_studio_status_unchanged_by_guard_tool() -> None:
    for record in get_pi_registry().list_capabilities():
        assert record.studio_status is StudioImplementationStatus.NOT_IMPLEMENTED
    assert STUDIO_PI_TOOLS[0].public_name == PUBLIC_TOOL_NAME
    assert STUDIO_PI_TOOLS[0].availability is StudioToolAvailability.AVAILABLE


@pytest.mark.asyncio
async def test_missing_capability_returns_error_output() -> None:
    result = await pi_capability_check_executor({}, {})
    assert result["success"] is False
    assert "capability" in result["message"].lower()
