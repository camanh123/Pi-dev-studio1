"""End-to-end run_turn / run contract against in-tree tesslate-agent."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import pytest

from app.services.tesslate_agent_adapter import (
    AgentAdapterContext,
    TesslateAgentAdapter,
)


@pytest.mark.asyncio
async def test_run_is_alias_for_run_turn() -> None:
    """Chat/in-process callers use ``.run(message, context_dict)``."""
    captured: list[dict[str, Any]] = []

    class _CapturingAgent:
        system_prompt = "test"
        tools = None
        max_iterations = 0

        async def run(
            self, user_request: str, context: dict[str, Any]
        ) -> AsyncIterator[dict[str, Any]]:
            captured.append({"request": user_request, "context": dict(context)})
            yield {
                "type": "complete",
                "data": {
                    "success": True,
                    "iterations": 1,
                    "final_response": "ok",
                    "tool_calls_made": 0,
                    "completion_reason": "task_complete",
                },
            }

    wrapper = object.__new__(TesslateAgentAdapter)
    wrapper._inner = _CapturingAgent()  # type: ignore[attr-defined]

    last: dict[str, Any] = {}
    async for event in wrapper.run("hello", {"project_id": "p1", "user_id": "u1"}):
        last = event
    assert last["type"] == "complete"
    assert captured[0]["request"] == "hello"
    assert captured[0]["context"]["project_id"] == "p1"


@pytest.mark.asyncio
async def test_adapter_invokes_in_tree_tesslate_agent() -> None:
    """Constructing the adapter loads tesslate_agent.TesslateAgent from the
    in-tree package and run_turn yields a complete event against a stub model.
    """
    from tesslate_agent.agent.tesslate_agent import TesslateAgent
    from tesslate_agent.agent.tools.registry import ToolRegistry

    class _StubModel:
        model_name = "stub/model"

        async def chat_with_tools(self, messages, tools=None, tool_choice="auto", **kw):
            return {
                "content": "done from in-tree agent",
                "tool_calls": [],
                "usage": {},
                "finish_reason": "stop",
            }

    adapter = TesslateAgentAdapter(
        system_prompt="test",
        tools=ToolRegistry(),
        model=_StubModel(),
    )
    assert isinstance(adapter.inner, TesslateAgent)
    adapter.max_iterations = 2
    assert adapter.inner.max_iterations == 2

    last: dict[str, Any] = {}
    async for event in adapter.run_turn(
        "say hi",
        AgentAdapterContext(
            project_id="proj",
            user_id="user",
            extra={"workspace_root": "/tmp/ws", "contain_fs_to_workspace": True},
        ),
    ):
        last = event
    assert last.get("type") == "complete"
    assert last.get("data", {}).get("final_response")


@pytest.mark.asyncio
async def test_event_sink_errors_propagate() -> None:
    class _Agent:
        async def run(self, user_request: str, context: dict[str, Any]) -> AsyncIterator[dict]:
            yield {"type": "agent_step", "data": {"iteration": 1}}
            yield {
                "type": "complete",
                "data": {
                    "success": True,
                    "iterations": 1,
                    "final_response": "",
                    "tool_calls_made": 0,
                    "completion_reason": "stop",
                },
            }

    wrapper = object.__new__(TesslateAgentAdapter)
    wrapper._inner = _Agent()  # type: ignore[attr-defined]

    async def _boom(_event: dict) -> None:
        raise RuntimeError("persist failed")

    with pytest.raises(RuntimeError, match="persist failed"):
        async for _ in wrapper.run_turn(
            "x",
            AgentAdapterContext(project_id="p", user_id="u"),
            event_sink=_boom,
        ):
            pass


@pytest.mark.asyncio
async def test_run_turn_stamps_workspace_onto_inner_context(tmp_path) -> None:
    seen: list[dict[str, Any]] = []

    class _Agent:
        async def run(self, user_request: str, context: dict[str, Any]) -> AsyncIterator[dict]:
            seen.append(dict(context))
            yield {
                "type": "complete",
                "data": {
                    "success": True,
                    "iterations": 1,
                    "final_response": "",
                    "tool_calls_made": 0,
                    "completion_reason": "stop",
                },
            }

    wrapper = object.__new__(TesslateAgentAdapter)
    wrapper._inner = _Agent()  # type: ignore[attr-defined]
    async for _ in wrapper.run_turn(
        "x",
        AgentAdapterContext(
            project_id="p",
            user_id="u",
            extra={
                "workspace_root": str(tmp_path),
                "contain_fs_to_workspace": True,
            },
        ),
    ):
        pass
    assert seen[0]["workspace_root"] == str(tmp_path)
    assert seen[0]["cwd"] == str(tmp_path)
    assert seen[0]["contain_fs_to_workspace"] is True
