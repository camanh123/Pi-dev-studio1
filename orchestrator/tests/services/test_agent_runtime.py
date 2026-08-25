"""Phase 1 agent runtime contract tests.

Covers the internal runtime states, workspace containment, snapshot /
restore, trajectory persistence, iteration/timeout resolution, and
loop-guard behaviour without booting Redis or Postgres.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.services.agent_runtime import (
    LOCAL_SNAPSHOT_PREFIX,
    AgentRuntimeResult,
    AgentRuntimeState,
    WorkspaceContainmentError,
    completion_reason_to_state,
    create_workspace_snapshot,
    evaluate_runtime_guards,
    persist_trajectory_metadata,
    resolve_contained_path,
    resolve_max_iterations,
    resolve_timeout_seconds,
    restore_workspace_snapshot,
    runtime_state_to_task_status,
    stamp_workspace_context,
    trajectory_relpath,
)
from app.services.agent_task import AgentTaskPayload
from app.services.task_manager import TaskStatus

pytestmark = pytest.mark.unit


# ---------------------------------------------------------------------------
# State mapping / lifecycle
# ---------------------------------------------------------------------------


def test_runtime_states_cover_phase1_contract() -> None:
    assert {s.value for s in AgentRuntimeState} == {
        "queued",
        "starting",
        "running",
        "waiting",
        "completed",
        "failed",
        "cancelled",
        "timed_out",
    }
    assert TaskStatus.STARTING.value == "starting"
    assert TaskStatus.WAITING.value == "waiting"
    assert TaskStatus.TIMED_OUT.value == "timed_out"


@pytest.mark.parametrize(
    ("reason", "state"),
    [
        ("task_complete", AgentRuntimeState.COMPLETED),
        ("max_iterations", AgentRuntimeState.COMPLETED),
        ("cancelled", AgentRuntimeState.CANCELLED),
        ("timed_out", AgentRuntimeState.TIMED_OUT),
        ("error", AgentRuntimeState.FAILED),
        (None, AgentRuntimeState.COMPLETED),
    ],
)
def test_completion_reason_to_state(reason: str | None, state: AgentRuntimeState) -> None:
    assert completion_reason_to_state(reason) is state
    assert runtime_state_to_task_status(state).value == state.value


def test_successful_task_lifecycle_mapping() -> None:
    """QUEUED → STARTING → RUNNING → COMPLETED."""
    assert TaskStatus.QUEUED in TaskStatus.in_flight()
    assert TaskStatus.STARTING in TaskStatus.in_flight()
    assert TaskStatus.RUNNING in TaskStatus.in_flight()
    assert TaskStatus.COMPLETED in TaskStatus.terminal()
    assert TaskStatus.COMPLETED not in TaskStatus.in_flight()


def test_failed_task_lifecycle_mapping() -> None:
    state = completion_reason_to_state("error")
    assert state is AgentRuntimeState.FAILED
    assert runtime_state_to_task_status(state) is TaskStatus.FAILED
    assert TaskStatus.FAILED in TaskStatus.terminal()


def test_cancellation_guard_wins_over_timeout() -> None:
    reason = evaluate_runtime_guards(cancelled=True, elapsed_seconds=999, timeout_seconds=1)
    assert reason == "cancelled"
    assert completion_reason_to_state(reason) is AgentRuntimeState.CANCELLED


def test_timeout_guard_fires() -> None:
    reason = evaluate_runtime_guards(cancelled=False, elapsed_seconds=10.0, timeout_seconds=5)
    assert reason == "timed_out"
    assert completion_reason_to_state(reason) is AgentRuntimeState.TIMED_OUT


def test_iteration_limit_is_a_bounded_complete() -> None:
    """tesslate-agent emits completion_reason=max_iterations; that is not a crash."""
    assert completion_reason_to_state("max_iterations") is AgentRuntimeState.COMPLETED


# ---------------------------------------------------------------------------
# Bounds plumbing
# ---------------------------------------------------------------------------


def test_resolve_max_iterations_prefers_payload_over_contract() -> None:
    payload = AgentTaskPayload(
        task_id="t",
        user_id="u",
        chat_id="c",
        message="hi",
        max_iterations=3,
        contract={"max_iterations": 99},
    )
    assert resolve_max_iterations(payload) == 3


def test_resolve_max_iterations_falls_back_to_contract() -> None:
    payload = AgentTaskPayload(
        task_id="t",
        user_id="u",
        chat_id="c",
        message="hi",
        contract={"max_iterations": 7},
    )
    assert resolve_max_iterations(payload) == 7


def test_resolve_max_iterations_none_means_unlimited() -> None:
    payload = AgentTaskPayload(task_id="t", user_id="u", chat_id="c", message="hi")
    assert resolve_max_iterations(payload) is None


def test_resolve_timeout_seconds_payload_then_default() -> None:
    payload = AgentTaskPayload(
        task_id="t", user_id="u", chat_id="c", message="hi", timeout_seconds=12
    )
    assert resolve_timeout_seconds(payload, default_seconds=600) == 12
    bare = AgentTaskPayload(task_id="t", user_id="u", chat_id="c", message="hi")
    assert resolve_timeout_seconds(bare, default_seconds=600) == 600


def test_payload_runtime_fields_round_trip_and_legacy_defaults() -> None:
    payload = AgentTaskPayload(
        task_id="t1",
        user_id="u1",
        chat_id="c1",
        message="hi",
        max_iterations=4,
        timeout_seconds=30,
        workspace_root="/tmp/ws",
    )
    restored = AgentTaskPayload.from_dict(payload.to_dict())
    assert restored.max_iterations == 4
    assert restored.timeout_seconds == 30
    assert restored.workspace_root == "/tmp/ws"

    legacy = AgentTaskPayload.from_dict(
        {"task_id": "t", "user_id": "u", "chat_id": "c", "message": "hi"}
    )
    assert legacy.max_iterations is None
    assert legacy.timeout_seconds is None
    assert legacy.workspace_root is None


# ---------------------------------------------------------------------------
# Workspace containment
# ---------------------------------------------------------------------------


def test_workspace_containment_accepts_relative_and_in_root_absolute(
    tmp_path: Path,
) -> None:
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app.py").write_text("x\n")
    inside = resolve_contained_path(tmp_path, "src/app.py")
    assert inside == (tmp_path / "src" / "app.py").resolve()
    same = resolve_contained_path(tmp_path, tmp_path / "src" / "app.py")
    assert same == inside


def test_workspace_containment_rejects_escape(tmp_path: Path) -> None:
    (tmp_path / "ws").mkdir()
    with pytest.raises(WorkspaceContainmentError):
        resolve_contained_path(tmp_path / "ws", "../secret")
    with pytest.raises(WorkspaceContainmentError):
        resolve_contained_path(tmp_path / "ws", "/etc/passwd")


def test_stamp_workspace_context_sets_containment_flag(tmp_path: Path) -> None:
    ctx: dict = {}
    stamp_workspace_context(ctx, workspace_root=str(tmp_path), contain=True)
    assert ctx["workspace_root"] == str(tmp_path)
    assert ctx["cwd"] == str(tmp_path)
    assert ctx["contain_fs_to_workspace"] is True


def test_bash_resolve_cwd_contains_local_workspace(tmp_path: Path) -> None:
    from app.agent.tools.shell_ops.bash import _resolve_cwd
    from app.services.agent_runtime import WorkspaceContainmentError

    ctx = {
        "workspace_root": str(tmp_path),
        "cwd": str(tmp_path),
        "contain_fs_to_workspace": True,
    }
    nested = tmp_path / "src"
    nested.mkdir()
    assert _resolve_cwd(ctx, "src") == str(nested.resolve())
    with pytest.raises(WorkspaceContainmentError):
        _resolve_cwd(ctx, "/etc")
    with pytest.raises(WorkspaceContainmentError):
        _resolve_cwd(ctx, "../outside")


def test_bash_resolve_cwd_leaves_container_paths_alone() -> None:
    """Docker/K8s shells do not set contain_fs_to_workspace; /app stays /app."""
    from app.agent.tools.shell_ops.bash import _resolve_cwd

    ctx = {"cwd": "/app"}
    assert _resolve_cwd(ctx, None) == "/app"
    assert _resolve_cwd(ctx, "src") == "/app/src"


# ---------------------------------------------------------------------------
# Snapshot / restore
# ---------------------------------------------------------------------------


def test_snapshot_create_and_restore(tmp_path: Path) -> None:
    (tmp_path / "README.md").write_text("initial\n")
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.py").write_text("print(1)\n")

    snap = create_workspace_snapshot(tmp_path, "task-abc")
    assert snap.ref.startswith(LOCAL_SNAPSHOT_PREFIX)
    assert snap.file_count >= 2
    assert "README.md" in snap.files

    (tmp_path / "README.md").write_text("mutated\n")
    (tmp_path / "src" / "new.py").write_text("oops\n")

    assert restore_workspace_snapshot(tmp_path, snap.ref) is True
    assert (tmp_path / "README.md").read_text() == "initial\n"
    assert (tmp_path / "src" / "main.py").read_text() == "print(1)\n"
    assert not (tmp_path / "src" / "new.py").exists()


def test_snapshot_skips_nested_snapshot_dir(tmp_path: Path) -> None:
    (tmp_path / "file.txt").write_text("a\n")
    first = create_workspace_snapshot(tmp_path, "one")
    second = create_workspace_snapshot(tmp_path, "two")
    # The second snapshot must not copy the first snapshot tree into itself.
    nested = tmp_path / ".tesslate" / "runtime" / "snapshots" / "two" / "tree" / ".tesslate"
    if nested.exists():
        assert "snapshots" not in {p.name for p in nested.rglob("*") if p.is_dir()}
    assert first.snapshot_id == "one"
    assert second.snapshot_id == "two"


# ---------------------------------------------------------------------------
# Trajectory
# ---------------------------------------------------------------------------


def test_trajectory_persists_without_secrets(tmp_path: Path) -> None:
    result = AgentRuntimeResult(
        execution_id="exec-1",
        state=AgentRuntimeState.COMPLETED,
        workspace_id="proj-1",
        user_task="use sk-secret-1234567890 please",
        final_response="here is sk-secret-1234567890",
        error="token=sk-secret-1234567890",
        iterations=2,
        tool_calls_made=1,
        completion_reason="task_complete",
    )
    rel = persist_trajectory_metadata(tmp_path, result)
    assert rel == trajectory_relpath("exec-1")
    body = (tmp_path / rel).read_text()
    assert "sk-secret" not in body
    assert "exec-1" in body
    assert '"state": "completed"' in body
    assert result.trajectory_path == rel
    meta = result.to_metadata()
    assert "runtime" not in meta  # this IS the runtime dict
    assert meta["state"] == "completed"


def test_simulated_worker_loop_timeout_and_cancel() -> None:
    """Stand-in for the worker event loop: guards fire between events."""
    events = [
        {"type": "agent_step", "data": {"iteration": 1}},
        {"type": "agent_step", "data": {"iteration": 2}},
        {"type": "complete", "data": {"completion_reason": "task_complete"}},
    ]
    # Timeout after the first step.
    completion = None
    for i, event in enumerate(events):
        reason = evaluate_runtime_guards(
            cancelled=False, elapsed_seconds=float(i + 1), timeout_seconds=1
        )
        if event["type"] != "complete" and reason == "timed_out":
            completion = "timed_out"
            break
        if event["type"] == "complete":
            completion = event["data"]["completion_reason"]
    assert completion == "timed_out"

    completion = None
    for event in events:
        reason = evaluate_runtime_guards(cancelled=True, elapsed_seconds=0.1, timeout_seconds=30)
        if reason == "cancelled":
            completion = "cancelled"
            break
        if event["type"] == "complete":
            completion = event["data"]["completion_reason"]
    assert completion == "cancelled"
