"""Adapter between the orchestrator and the ``tesslate-agent`` package.

Responsibilities:
    1. Re-export the package's ``TesslateAgent`` + ``AbstractAgent`` with
       stable local names (``TesslateAgentAdapter.inner`` preserves the raw
       instance for callers that need direct access).
    2. ``run_turn()`` drives a single request/response cycle against the
       in-tree runner, yielding every event. Callers pass an optional
       ``event_sink`` to handle per-event side-effects (e.g. ``AgentStep``
       persistence) without coupling tesslate-agent to orchestrator internals.
    3. ``run()`` is the chat/in-process compatible alias: it accepts the
       historical ``(message, context_dict)`` signature and yields the
       same event stream.
    4. ``AgentAdapterContext`` is the neutral invocation envelope shared by
       routers and the worker.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from tesslate_agent.agent.base import AbstractAgent
from tesslate_agent.agent.tesslate_agent import TesslateAgent

from .agent_runtime import stamp_workspace_context

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AgentAdapterContext:
    """Minimal invocation context the orchestrator hands to the adapter."""

    project_id: str
    user_id: str
    goal_ancestry: list[str] | None = None
    extra: dict[str, Any] | None = None


class TesslateAgentAdapter:
    """Thin wrapper around ``TesslateAgent`` for orchestrator-side use.

    Construction mirrors ``TesslateAgent.__init__``. Orchestrator call sites
    depend on this local class so trajectory persistence, workspace
    stamping, and iteration bounds can change here without touching every
    router.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self._inner: AbstractAgent = TesslateAgent(*args, **kwargs)

    @property
    def inner(self) -> AbstractAgent:
        return self._inner

    @property
    def tools(self) -> Any:
        return self._inner.tools

    @property
    def max_iterations(self) -> int:
        return int(getattr(self._inner, "max_iterations", 0) or 0)

    @max_iterations.setter
    def max_iterations(self, value: int | None) -> None:
        # tesslate-agent treats 0 as unlimited.
        capped = int(value) if value else 0
        if hasattr(self._inner, "max_iterations"):
            self._inner.max_iterations = capped if capped > 0 else 0

    @property
    def minimal_prompts(self) -> bool:
        return bool(getattr(self._inner, "minimal_prompts", False))

    @minimal_prompts.setter
    def minimal_prompts(self, value: bool) -> None:
        if hasattr(self._inner, "minimal_prompts"):
            self._inner.minimal_prompts = bool(value)

    async def run(
        self,
        user_request: str,
        context: AgentAdapterContext | dict[str, Any],
        event_sink: EventSink | None = None,
        **_kwargs: Any,
    ) -> AsyncIterator[dict[str, Any]]:
        """Chat/in-process compatible entrypoint.

        Historical callers invoke ``agent.run(message, context_dict)``.
        The worker uses ``run_turn`` with ``AgentAdapterContext``. Both
        paths share the same event stream and workspace stamping.
        """
        adapter_ctx = (
            context if isinstance(context, AgentAdapterContext) else _context_from_mapping(context)
        )
        async for event in self.run_turn(user_request, adapter_ctx, event_sink=event_sink):
            yield event

    async def run_turn(
        self,
        user_request: str,
        adapter_context: AgentAdapterContext,
        *,
        event_sink: EventSink | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Drive a single agent turn, yielding every event.

        Yields each event emitted by the in-tree runner so callers can
        interleave cancellation checks, pubsub publishing, or other
        per-event work. If ``event_sink`` is provided it is awaited on
        each event before yielding — this is how the orchestrator persists
        trajectory events as ``AgentStep`` rows without coupling
        tesslate-agent to that plumbing.

        ``event_sink`` errors propagate. Swallowing them hid persistence
        failures and left the run looking successful.
        """
        ctx = _build_submodule_context(adapter_context)
        async for event in _iter_events(self._inner, user_request, ctx):
            if event_sink is not None:
                await event_sink(event)
            yield event


def _context_from_mapping(context: dict[str, Any]) -> AgentAdapterContext:
    extra = dict(context)
    return AgentAdapterContext(
        project_id=str(extra.get("project_id") or ""),
        user_id=str(extra.get("user_id") or ""),
        extra=extra,
    )


def _build_submodule_context(adapter_context: AgentAdapterContext) -> dict[str, Any]:
    """Build the dict tesslate-agent.TesslateAgent.run() expects."""
    ctx: dict[str, Any] = {
        "project_id": adapter_context.project_id,
        "user_id": adapter_context.user_id,
    }
    if adapter_context.goal_ancestry:
        ctx["goal_ancestry"] = adapter_context.goal_ancestry
    if adapter_context.extra:
        ctx.update(adapter_context.extra)

    workspace_root = ctx.get("workspace_root") or ctx.get("cwd")
    contain = bool(ctx.get("contain_fs_to_workspace"))
    if workspace_root:
        stamp_workspace_context(
            ctx,
            workspace_root=str(workspace_root),
            contain=contain,
        )
    return ctx


async def _iter_events(
    agent: AbstractAgent, user_request: str, context: dict[str, Any]
) -> AsyncIterator[dict[str, Any]]:
    """Normalise ``agent.run()`` into a plain async-iterator of event dicts.

    ``TesslateAgent.run`` returns an async generator; some older code paths
    return a coroutine that awaits to an async generator. Tolerate both.
    """
    result = agent.run(user_request, context)
    if hasattr(result, "__aiter__"):
        async for event in result:
            yield event
        return
    awaited = await result  # type: ignore[misc]
    async for event in awaited:
        yield event


# ---------------------------------------------------------------------------
# Event sink type
# ---------------------------------------------------------------------------

EventSink = Any  # async callable taking a single event dict


__all__ = [
    "AgentAdapterContext",
    "TesslateAgentAdapter",
]
