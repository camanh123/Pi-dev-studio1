# tests/agent_bridge

## Purpose
Verify the `app.services.tesslate_agent_adapter` seam imports cleanly from
the `tesslate-agent` submodule. These tests guard the contract between the
orchestrator and the agent package without booting a full agent run.

## Key files
- `test_bridge_import.py` — import smoke test + construction smoke test
- `test_bridge_runs_turn.py` — run_turn / run contract, in-tree TesslateAgent
  invocation, event_sink error propagation, workspace stamping

## Related contexts
- `/orchestrator/app/services/tesslate_agent_adapter.py`
- `/packages/tesslate-agent/src/tesslate_agent/agent/tesslate_agent.py`

## When to load
Touching the adapter surface or the submodule entry point.
