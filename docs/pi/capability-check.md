# pi.capability_check

**Purpose**: Pi Network capability truth/guard tool for the autonomous agent.

**Public name**: `pi.capability_check`  
**Registered name**: `pi_capability_check` (OpenAI-style function names cannot contain dots; the orchestrator registry aliases the public name)

## What it answers

Whether generating code for a Pi Network capability is **permitted according to the current verified Phase 2 registry**, for a target environment/network.

It does **not**:

* authenticate users
* transfer Pi
* access wallets
* call Pi APIs
* implement User-to-App or App-to-User payments

Platform support ≠ Pi Dev Studio implementation. A capability can be `SUPPORTED` on Pi Network while `studio_status` is still `NOT_IMPLEMENTED` in Pi Dev Studio. The existence of this guard tool does not change those capability statuses; it is Studio infrastructure, tracked separately in `studio_tools.py`.

## Inputs

| Field | Required | Meaning |
|-------|----------|---------|
| `capability` | yes | Canonical id, e.g. `PI_BROWSER_AUTH` |
| `environment` | no | `PI_BROWSER`, `NORMAL_WEB`, `BACKEND`, `BLOCKCHAIN`, `TESTNET`, `MAINNET` |
| `network` | no | `TESTNET` or `MAINNET` when distinct from runtime |

## Decision

Comes from the Phase 2 guard, never a duplicate table:

| Decision | Meaning |
|----------|---------|
| `ALLOW` | Generation may proceed |
| `ALLOW_WITH_WARNING` | Generation may proceed only with returned limitations attached |
| `BLOCK` | Generation must not proceed |

LIMITED capabilities never return unconditional `ALLOW`.

Examples:

* `PI_BROWSER_AUTH` + `PI_BROWSER` → ALLOW
* `USER_TO_APP_PAYMENT` + `PI_BROWSER` → ALLOW
* `APP_TO_USER_PAYMENT` + `TESTNET` → ALLOW_WITH_WARNING
* `APP_TO_USER_PAYMENT` + `MAINNET` → BLOCK
* unknown capability → BLOCK

## Future generators

Call `enforce_pi_generation` / `require_pi_generation` in `app/services/pi_capabilities/generation_policy.py` **before** writing Pi-specific application code. Phase 3A does not include those generators.
