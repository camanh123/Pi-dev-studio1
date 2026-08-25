# Pi Capability Registry - Agent Context

**Purpose**: Canonical Pi Network capability truth layer for Pi Dev Studio. Consult this before generating Pi-specific application code.

**Load this context when**: Implementing or reviewing Pi Agent Tools, deciding whether a Pi feature can be generated, or updating verified Pi platform facts.

## What This Is

The registry in `orchestrator/app/services/pi_capabilities/` records **verified Pi Network platform facts** (SUPPORTED / LIMITED / UNSUPPORTED) plus runtime/environment requirements.

It is **not**:

* a Pi payment integration
* a JavaScript SDK wrapper
* a Studio tool catalog that implies generators exist

A capability being SUPPORTED on Pi Network does **not** mean Pi Dev Studio has implemented a tool for it. Every Phase 2 record has `studio_status=NOT_IMPLEMENTED`.

## Key Files

- `orchestrator/app/services/pi_capabilities/models.py` — enums and records
- `orchestrator/app/services/pi_capabilities/catalog.py` — canonical capability list
- `orchestrator/app/services/pi_capabilities/registry.py` — query + `can_generate` guard
- `orchestrator/tests/services/test_pi_capability_registry.py` — Phase 2 tests
- `docs/pi/capability-registry.md` — human-readable truth-layer documentation

## Guard

```python
from app.services.pi_capabilities import can_generate, evaluate, GuardDecision

can_generate("PI_BROWSER_AUTH", "PI_BROWSER")           # ALLOW
can_generate("USER_TO_APP_PAYMENT", "PI_BROWSER")       # ALLOW
can_generate("APP_TO_USER_PAYMENT", "TESTNET")          # ALLOW_WITH_WARNING
can_generate("APP_TO_USER_PAYMENT", "MAINNET")          # BLOCK
can_generate("UNKNOWN_CAPABILITY")                      # BLOCK
```

LIMITED never maps to ALLOW.

## Related Contexts

- `docs/pi/capability-registry.md` — platform fact vs Studio implementation
- `docs/orchestrator/agent/CLAUDE.md` — agent runtime (do not redesign in later Pi phases)
- `docs/orchestrator/services/CLAUDE.md` — services layer
