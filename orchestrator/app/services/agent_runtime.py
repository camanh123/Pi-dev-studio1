"""Minimal agent runtime contract for Pi Dev Studio Phase 1.

This module is the stable internal contract between:

* the orchestrator worker / chat in-process fallback
* workspace/project lifecycle
* in-tree ``packages/tesslate-agent`` (via ``tesslate_agent_adapter``)
* task status, cancellation, timeout, trajectory metadata
* workspace snapshot/restore

It deliberately reuses existing orchestrator primitives (``TaskStatus``,
``AgentTaskPayload``, ``CheckpointManager``, ``AgentStep`` rows) rather
than introducing a second execution framework.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

RUNTIME_DIR = Path(".tesslate") / "runtime"
SNAPSHOT_DIRNAME = "snapshots"
TRAJECTORY_DIRNAME = "trajectories"
LOCAL_SNAPSHOT_PREFIX = "local:"

# Directories that must never be copied into a local snapshot (cycle / noise).
_SNAPSHOT_SKIP_DIR_NAMES = frozenset(
    {".git", "node_modules", "__pycache__", ".venv", "venv", ".tox"}
)


class AgentRuntimeState(StrEnum):
    """Canonical execution states for one agent task.

    These map onto ``TaskStatus`` (see ``runtime_state_to_task_status``).
    Existing Redis/API values ``queued`` / ``running`` / ``completed`` /
    ``failed`` / ``cancelled`` are preserved. ``starting``, ``waiting``,
    and ``timed_out`` are additive.
    """

    QUEUED = "queued"
    STARTING = "starting"
    RUNNING = "running"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


IN_FLIGHT_STATES: frozenset[AgentRuntimeState] = frozenset(
    {
        AgentRuntimeState.QUEUED,
        AgentRuntimeState.STARTING,
        AgentRuntimeState.RUNNING,
        AgentRuntimeState.WAITING,
    }
)

TERMINAL_STATES: frozenset[AgentRuntimeState] = frozenset(
    {
        AgentRuntimeState.COMPLETED,
        AgentRuntimeState.FAILED,
        AgentRuntimeState.CANCELLED,
        AgentRuntimeState.TIMED_OUT,
    }
)


# Completion reasons emitted by tesslate-agent / the worker loop.
_REASON_TO_STATE: dict[str, AgentRuntimeState] = {
    "task_complete": AgentRuntimeState.COMPLETED,
    "stop": AgentRuntimeState.COMPLETED,
    "completed": AgentRuntimeState.COMPLETED,
    "success": AgentRuntimeState.COMPLETED,
    "max_iterations": AgentRuntimeState.COMPLETED,
    "cancelled": AgentRuntimeState.CANCELLED,
    "superseded": AgentRuntimeState.CANCELLED,
    "timed_out": AgentRuntimeState.TIMED_OUT,
    "timeout": AgentRuntimeState.TIMED_OUT,
    "error": AgentRuntimeState.FAILED,
    "failed": AgentRuntimeState.FAILED,
    "tool_error": AgentRuntimeState.FAILED,
}


@dataclass
class AgentRuntimeBounds:
    """Bounded-execution configuration for one run."""

    max_iterations: int | None = None
    timeout_seconds: int | None = None

    @property
    def iterations_capped(self) -> bool:
        return bool(self.max_iterations and self.max_iterations > 0)

    @property
    def timeout_capped(self) -> bool:
        return bool(self.timeout_seconds and self.timeout_seconds > 0)


@dataclass
class AgentRuntimeResult:
    """Structured final result persisted on message metadata / Redis."""

    execution_id: str
    state: AgentRuntimeState
    workspace_id: str | None = None
    workspace_root: str | None = None
    user_task: str | None = None
    model: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    bounds: AgentRuntimeBounds = field(default_factory=AgentRuntimeBounds)
    iterations: int = 0
    tool_calls_made: int = 0
    event_count: int = 0
    completion_reason: str | None = None
    final_response: str | None = None
    error: str | None = None
    error_type: str | None = None
    trajectory_path: str | None = None
    checkpoint_hash: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def to_metadata(self) -> dict[str, Any]:
        """JSON-safe dict stored under ``message_metadata['runtime']``."""
        payload = asdict(self)
        payload["state"] = self.state.value
        # Never persist the raw user task at full length — it can contain
        # pasted secrets. Keep a short prefix for debugging.
        if self.user_task and len(self.user_task) > 200:
            payload["user_task"] = self.user_task[:200]
        return payload


def completion_reason_to_state(reason: str | None) -> AgentRuntimeState:
    """Map a tesslate-agent / worker completion_reason onto a runtime state."""
    if not reason:
        return AgentRuntimeState.COMPLETED
    key = str(reason).strip().lower()
    if key in _REASON_TO_STATE:
        return _REASON_TO_STATE[key]
    if "timeout" in key or "timed_out" in key:
        return AgentRuntimeState.TIMED_OUT
    if "cancel" in key:
        return AgentRuntimeState.CANCELLED
    if "error" in key or "fail" in key:
        return AgentRuntimeState.FAILED
    return AgentRuntimeState.COMPLETED


def runtime_state_to_task_status(state: AgentRuntimeState):
    """Map runtime state onto ``TaskStatus`` (imported lazily to avoid cycles)."""
    from .task_manager import TaskStatus

    mapping = {
        AgentRuntimeState.QUEUED: TaskStatus.QUEUED,
        AgentRuntimeState.STARTING: TaskStatus.STARTING,
        AgentRuntimeState.RUNNING: TaskStatus.RUNNING,
        AgentRuntimeState.WAITING: TaskStatus.WAITING,
        AgentRuntimeState.COMPLETED: TaskStatus.COMPLETED,
        AgentRuntimeState.FAILED: TaskStatus.FAILED,
        AgentRuntimeState.CANCELLED: TaskStatus.CANCELLED,
        AgentRuntimeState.TIMED_OUT: TaskStatus.TIMED_OUT,
    }
    return mapping[state]


def evaluate_runtime_guards(
    *,
    cancelled: bool,
    elapsed_seconds: float,
    timeout_seconds: int | None,
) -> str | None:
    """Return a completion_reason if the agent loop must stop, else None.

    Cancellation wins over timeout so a user abort during a timed-out
    drain is recorded as cancelled.
    """
    if cancelled:
        return "cancelled"
    if timeout_seconds and timeout_seconds > 0 and elapsed_seconds >= timeout_seconds:
        return "timed_out"
    return None


def resolve_max_iterations(payload: Any, extra_contract: dict | None = None) -> int | None:
    """Positive iteration cap from payload or automation contract.

    ``None`` means unlimited (existing tesslate-agent default of 0).
    Payload field wins over contract so chat ``max_iterations`` is
    honoured even when an automation contract is also present.
    """
    candidates: list[Any] = []
    payload_value = getattr(payload, "max_iterations", None)
    if payload_value is not None:
        candidates.append(payload_value)
    contract = extra_contract if extra_contract is not None else getattr(payload, "contract", None)
    if isinstance(contract, dict) and contract.get("max_iterations") is not None:
        candidates.append(contract.get("max_iterations"))
    for raw in candidates:
        try:
            value = int(raw)
        except (TypeError, ValueError):
            continue
        if value > 0:
            return value
    return None


def resolve_timeout_seconds(
    payload: Any,
    default_seconds: int | None = None,
    extra_contract: dict | None = None,
) -> int | None:
    """Positive wall-clock timeout in seconds.

    Order: payload.timeout_seconds, contract.timeout_seconds, default.
    """
    candidates: list[Any] = []
    payload_value = getattr(payload, "timeout_seconds", None)
    if payload_value is not None:
        candidates.append(payload_value)
    contract = extra_contract if extra_contract is not None else getattr(payload, "contract", None)
    if isinstance(contract, dict) and contract.get("timeout_seconds") is not None:
        candidates.append(contract.get("timeout_seconds"))
    if default_seconds is not None:
        candidates.append(default_seconds)
    for raw in candidates:
        try:
            value = int(raw)
        except (TypeError, ValueError):
            continue
        if value > 0:
            return value
    return None


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


# ---------------------------------------------------------------------------
# Workspace containment
# ---------------------------------------------------------------------------


class WorkspaceContainmentError(PermissionError):
    """Raised when a path would escape the assigned workspace root."""


def normalize_workspace_root(workspace_root: str | os.PathLike[str] | Path) -> Path:
    """Return an absolute, resolved workspace root."""
    root = Path(workspace_root).expanduser()
    if not root.is_absolute():
        return (Path.cwd() / root).resolve()
    return root.resolve()


def assert_path_in_workspace(
    workspace_root: str | os.PathLike[str] | Path,
    target: str | os.PathLike[str] | Path,
) -> Path:
    """Resolve ``target`` and raise if it escapes ``workspace_root``.

    Symlinks are collapsed via ``Path.resolve()`` before the containment
    check, matching ``LocalOrchestrator._safe_resolve``.
    """
    root = normalize_workspace_root(workspace_root)
    candidate = Path(target)
    if not candidate.is_absolute():
        candidate = root / candidate
    resolved = candidate.resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise WorkspaceContainmentError(f"path '{target}' escapes workspace root {root}") from exc
    return resolved


def resolve_contained_path(
    workspace_root: str | os.PathLike[str] | Path,
    rel_or_abs: str | os.PathLike[str] | Path | None,
) -> Path:
    """Resolve a user-supplied path strictly inside ``workspace_root``.

    Absolute paths that point outside the workspace are refused (not
    silently joined) so a tool cannot ``cd /etc``. Absolute paths that
    already live inside the workspace are accepted.
    """
    root = normalize_workspace_root(workspace_root)
    if rel_or_abs is None or str(rel_or_abs) in ("", ".", "./"):
        return root
    return assert_path_in_workspace(root, rel_or_abs)


def stamp_workspace_context(
    context: dict[str, Any],
    *,
    workspace_root: str | None,
    contain: bool,
) -> None:
    """Attach workspace fields used by tools and the adapter.

    When ``contain`` is True (desktop / local runtime), ``cwd`` is set to
    the host workspace and tools must refuse paths that escape it.
    Docker/K8s file tools already contain via the orchestrator, so we
    record ``workspace_root`` for trajectory/snapshot metadata without
    rewriting in-container ``cwd`` (typically ``/app``).
    """
    if not workspace_root:
        return
    context["workspace_root"] = workspace_root
    if contain:
        context["cwd"] = workspace_root
        context["contain_fs_to_workspace"] = True


def should_contain_host_fs(*, deployment_mode: str | None, runtime: str | None) -> bool:
    mode = (deployment_mode or "").lower()
    rt = (runtime or "").lower()
    return mode in {"desktop", "local"} or rt in {"local", "desktop"}


# ---------------------------------------------------------------------------
# Trajectory persistence
# ---------------------------------------------------------------------------


def trajectory_relpath(execution_id: str, session_id: str | None = None) -> str:
    """Relative path (posix) for a run's trajectory metadata file.

    Prefer the execution/task id so the path is stable even when the
    tesslate-agent session_id is missing. Session id is kept as a
    secondary filename hint inside the JSON body, not the path.
    """
    safe_id = _safe_file_token(execution_id)
    return f".tesslate/runtime/trajectories/{safe_id}.json"


def persist_trajectory_metadata(
    workspace_root: str | os.PathLike[str] | Path | None,
    result: AgentRuntimeResult,
) -> str | None:
    """Write a secret-free trajectory index next to the workspace.

    Returns the relative trajectory path on success, or ``None`` when
    the workspace is not a writable host directory (k8s-only, missing).
    AgentStep rows remain the canonical per-iteration log; this file is
    the durable pointer the runtime contract requires.
    """
    rel = trajectory_relpath(result.execution_id, result.extra.get("session_id"))
    result.trajectory_path = rel
    if not workspace_root:
        return rel
    try:
        root = normalize_workspace_root(workspace_root)
        dest = root / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        body = {
            "execution_id": result.execution_id,
            "workspace_id": result.workspace_id,
            "state": result.state.value,
            "started_at": result.started_at,
            "ended_at": result.ended_at,
            "model": result.model,
            "iterations": result.iterations,
            "tool_calls_made": result.tool_calls_made,
            "event_count": result.event_count,
            "completion_reason": result.completion_reason,
            "checkpoint_hash": result.checkpoint_hash,
            "error_type": result.error_type,
            "bounds": {
                "max_iterations": result.bounds.max_iterations,
                "timeout_seconds": result.bounds.timeout_seconds,
            },
        }
        # Intentionally omit final_response / user_task / error text so
        # secrets pasted into chat never land on disk in this index.
        dest.write_text(json.dumps(body, indent=2, sort_keys=True), encoding="utf-8")
        return rel
    except OSError:
        logger.warning(
            "Failed to persist trajectory metadata for %s",
            result.execution_id,
            exc_info=True,
        )
        return rel


def _safe_file_token(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in str(value))
    return cleaned[:80] or "run"


# ---------------------------------------------------------------------------
# Local workspace snapshot / restore (fallback when CheckpointManager is None)
# ---------------------------------------------------------------------------


@dataclass
class WorkspaceSnapshot:
    snapshot_id: str
    ref: str
    workspace_root: str
    created_at: str
    file_count: int
    files: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _skip_snapshot_dir(rel: Path) -> bool:
    parts = rel.parts
    if any(part in _SNAPSHOT_SKIP_DIR_NAMES for part in parts):
        return True
    return (
        len(parts) >= 3
        and parts[0] == ".tesslate"
        and parts[1] == "runtime"
        and parts[2] == SNAPSHOT_DIRNAME
    )


def create_workspace_snapshot(
    workspace_root: str | os.PathLike[str] | Path,
    snapshot_id: str,
) -> WorkspaceSnapshot:
    """Copy the workspace tree to ``.tesslate/runtime/snapshots/{id}/tree``.

    Used when ``CheckpointManager.create_checkpoint()`` returns None
    (no git, no volume fork). Restore overlays the copy back and removes
    files created after the snapshot.
    """
    root = normalize_workspace_root(workspace_root)
    if not root.is_dir():
        raise FileNotFoundError(f"workspace root does not exist: {root}")

    snap_id = _safe_file_token(snapshot_id)
    dest_root = root / RUNTIME_DIR / SNAPSHOT_DIRNAME / snap_id
    tree = dest_root / "tree"
    if dest_root.exists():
        shutil.rmtree(dest_root)
    tree.mkdir(parents=True)

    files: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = Path(dirpath).resolve().relative_to(root)
        # Mutate dirnames in place so os.walk does not descend into skips.
        kept: list[str] = []
        for name in dirnames:
            child = rel_dir / name if rel_dir.parts else Path(name)
            if _skip_snapshot_dir(child):
                continue
            kept.append(name)
        dirnames[:] = kept
        if _skip_snapshot_dir(rel_dir) and rel_dir.parts:
            continue
        for name in filenames:
            rel = rel_dir / name if rel_dir.parts else Path(name)
            if _skip_snapshot_dir(rel):
                continue
            src = root / rel
            if not src.is_file():
                continue
            dst = tree / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            files.append(rel.as_posix())

    created_at = utc_now_iso()
    snap = WorkspaceSnapshot(
        snapshot_id=snap_id,
        ref=f"{LOCAL_SNAPSHOT_PREFIX}{snap_id}",
        workspace_root=str(root),
        created_at=created_at,
        file_count=len(files),
        files=sorted(files),
    )
    (dest_root / "metadata.json").write_text(
        json.dumps(snap.to_dict(), indent=2),
        encoding="utf-8",
    )
    return snap


def restore_workspace_snapshot(
    workspace_root: str | os.PathLike[str] | Path,
    snapshot_ref: str,
) -> bool:
    """Restore a ``local:`` snapshot created by ``create_workspace_snapshot``.

    Overlay-copies snapshot files back, then deletes tracked files that
    were created after the snapshot (except skipped directories).
    """
    root = normalize_workspace_root(workspace_root)
    snap_id = (
        snapshot_ref[len(LOCAL_SNAPSHOT_PREFIX) :]
        if snapshot_ref.startswith(LOCAL_SNAPSHOT_PREFIX)
        else snapshot_ref
    )
    snap_id = _safe_file_token(snap_id)
    dest_root = root / RUNTIME_DIR / SNAPSHOT_DIRNAME / snap_id
    tree = dest_root / "tree"
    meta_path = dest_root / "metadata.json"
    if not tree.is_dir() or not meta_path.is_file():
        logger.warning("local snapshot %s not found under %s", snap_id, root)
        return False

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    wanted = set(meta.get("files") or [])

    for dirpath, _dirnames, filenames in os.walk(tree):
        rel_dir = Path(dirpath).resolve().relative_to(tree)
        for name in filenames:
            rel = rel_dir / name if rel_dir.parts else Path(name)
            src = tree / rel
            dst = root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    # Remove files that appeared after the snapshot (not in skip dirs).
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = Path(dirpath).resolve().relative_to(root)
        kept: list[str] = []
        for name in dirnames:
            child = rel_dir / name if rel_dir.parts else Path(name)
            if _skip_snapshot_dir(child):
                continue
            kept.append(name)
        dirnames[:] = kept
        if _skip_snapshot_dir(rel_dir) and rel_dir.parts:
            continue
        for name in filenames:
            rel = rel_dir / name if rel_dir.parts else Path(name)
            posix = rel.as_posix()
            if posix in wanted:
                continue
            if _skip_snapshot_dir(rel):
                continue
            target = root / rel
            if target.is_file():
                try:
                    target.unlink()
                except OSError:
                    logger.debug("failed to remove post-snapshot file %s", target)

    logger.info("Restored local snapshot %s into %s (%d files)", snap_id, root, len(wanted))
    return True


def load_workspace_snapshot_metadata(
    workspace_root: str | os.PathLike[str] | Path,
    snapshot_ref: str,
) -> dict[str, Any] | None:
    root = normalize_workspace_root(workspace_root)
    snap_id = (
        snapshot_ref[len(LOCAL_SNAPSHOT_PREFIX) :]
        if snapshot_ref.startswith(LOCAL_SNAPSHOT_PREFIX)
        else snapshot_ref
    )
    meta_path = root / RUNTIME_DIR / SNAPSHOT_DIRNAME / _safe_file_token(snap_id) / "metadata.json"
    if not meta_path.is_file():
        return None
    return json.loads(meta_path.read_text(encoding="utf-8"))
