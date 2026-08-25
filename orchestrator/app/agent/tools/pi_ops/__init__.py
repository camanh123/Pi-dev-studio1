"""Pi-specific agent tools.

Phase 3A registers the read-only capability guard. Authentication and
payment generators are intentionally absent.
"""

from .capability_check import (
    PUBLIC_TOOL_NAME,
    REGISTRY_TOOL_NAME,
    pi_capability_check_executor,
    register_pi_capability_check_tool,
)


def register_all_pi_tools(registry) -> None:
    """Register Pi Dev Studio tools (1 tool in Phase 3A)."""
    register_pi_capability_check_tool(registry)


__all__ = [
    "PUBLIC_TOOL_NAME",
    "REGISTRY_TOOL_NAME",
    "pi_capability_check_executor",
    "register_all_pi_tools",
    "register_pi_capability_check_tool",
]
