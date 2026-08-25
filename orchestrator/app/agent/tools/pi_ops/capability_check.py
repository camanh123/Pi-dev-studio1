"""Pi capability-check agent tool (Phase 3A).

Public semantic name: ``pi.capability_check``
LLM/registry name: ``pi_capability_check`` (dots are invalid in OpenAI-style
function names; the orchestrator registry aliases the public name).
"""

from __future__ import annotations

import logging
from typing import Any

from app.services.pi_capabilities.check_result import build_capability_check_result
from app.services.pi_capabilities.models import Environment

from ..output_formatter import error_output, success_output
from ..registry import Tool, ToolCategory

logger = logging.getLogger(__name__)

PUBLIC_TOOL_NAME = "pi.capability_check"
REGISTRY_TOOL_NAME = "pi_capability_check"

_ENVIRONMENT_VALUES = [item.value for item in Environment]
_NETWORK_VALUES = [Environment.TESTNET.value, Environment.MAINNET.value]


async def pi_capability_check_executor(
    params: dict[str, Any], context: dict[str, Any]
) -> dict[str, Any]:
    """Query the Phase 2 registry. Read-only; never calls Pi Network APIs."""
    del context  # unused; signature matches Tool executors
    capability = params.get("capability")
    if not capability or not str(capability).strip():
        return error_output(
            message="'capability' is required",
            suggestion="Pass a Pi capability id such as PI_BROWSER_AUTH or USER_TO_APP_PAYMENT",
        )

    payload = build_capability_check_result(
        str(capability),
        environment=params.get("environment"),
        network=params.get("network"),
    )
    decision = payload["decision"]
    message = (
        f"{PUBLIC_TOOL_NAME}: {payload['capability']} → {decision} "
        f"(platform_status={payload['platform_status']}, "
        f"studio_status={payload['studio_status']})"
    )
    return success_output(message=message, details=payload, **payload)


def register_pi_capability_check_tool(registry) -> None:
    """Register the read-only capability guard and its public alias."""
    registry.register(
        Tool(
            name=REGISTRY_TOOL_NAME,
            description=(
                f"{PUBLIC_TOOL_NAME}: Consult the Pi Network capability truth layer "
                "before generating Pi-specific application code. Returns ALLOW, "
                "ALLOW_WITH_WARNING, or BLOCK from the verified registry. "
                "This tool does not authenticate users, transfer Pi, access wallets, "
                "or call Pi APIs. Platform support is not the same as Pi Dev Studio "
                "implementation status."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "capability": {
                        "type": "string",
                        "description": (
                            "Canonical capability id, e.g. PI_BROWSER_AUTH, "
                            "USER_TO_APP_PAYMENT, APP_TO_USER_PAYMENT"
                        ),
                    },
                    "environment": {
                        "type": "string",
                        "description": (
                            "Runtime or network target. TESTNET/MAINNET may be passed "
                            "here or as network."
                        ),
                        "enum": _ENVIRONMENT_VALUES,
                    },
                    "network": {
                        "type": "string",
                        "description": "Optional network constraint (TESTNET or MAINNET).",
                        "enum": _NETWORK_VALUES,
                    },
                },
                "required": ["capability"],
            },
            executor=pi_capability_check_executor,
            category=ToolCategory.PROJECT,
            examples=[
                f'{{"tool_name":"{PUBLIC_TOOL_NAME}","parameters":{{"capability":"PI_BROWSER_AUTH","environment":"PI_BROWSER"}}}}',
                f'{{"tool_name":"{PUBLIC_TOOL_NAME}","parameters":{{"capability":"APP_TO_USER_PAYMENT","network":"MAINNET"}}}}',
            ],
            system_prompt=(
                f"Call {PUBLIC_TOOL_NAME} (registered as {REGISTRY_TOOL_NAME}) before "
                "attempting any Pi-specific implementation. BLOCK means do not generate. "
                "ALLOW_WITH_WARNING means you may generate only while preserving the "
                "returned limitations. studio_status NOT_IMPLEMENTED means Pi Dev Studio "
                "has no generator for that capability yet."
            ),
            # JSON-in / JSON-out registry query — checkpointable.
            state_serializable=True,
            # Read-only in-process lookup; no sockets, PTYs, or Pi API calls.
            holds_external_state=False,
        )
    )
    registry.register_alias(PUBLIC_TOOL_NAME, REGISTRY_TOOL_NAME)
    logger.info("Registered %s (alias %s)", REGISTRY_TOOL_NAME, PUBLIC_TOOL_NAME)
