# Pi Capability Registry

This registry is the **capability truth layer** for Pi Dev Studio.

It exists so agents and later Pi Agent Tools can check what Pi Network currently supports **before** generating Pi-specific application code. It prevents the studio from hallucinating integrations that Pi Network does not support, or from treating limited Testnet-only flows as production-ready.

Pi Dev Studio Phase 2 implements the registry only. It does **not** implement Pi application payment or auth integrations.

## Two layers (do not collapse them)

| Layer | Meaning | Phase 2 source |
|-------|---------|----------------|
| **Verified platform fact** | What Pi Network documents as SUPPORTED, LIMITED, or UNSUPPORTED, including environments, scopes, and backend/blockchain requirements | `CapabilityRecord.status` and constraint fields |
| **Pi Dev Studio implementation status** | Whether this studio has a generator/tool/SDK wrapper for that capability | `CapabilityRecord.studio_status` |

A feature being supported by Pi Network does **not** automatically mean Pi Dev Studio has implemented a tool for it. In this baseline every capability is `studio_status=NOT_IMPLEMENTED`.

The Phase 3A agent tool `pi.capability_check` is Studio **infrastructure**. It does not change those capability `studio_status` values. See [capability-check.md](capability-check.md).

## Canonical capabilities

| ID | Platform status | Notes |
|----|-----------------|-------|
| `PI_BROWSER_AUTH` | SUPPORTED | `Pi.authenticate(scopes, onIncompletePaymentFound)` in Pi Browser. Backend verifies with `GET https://api.minepi.com/v2/me`. |
| `PI_SIGN_IN` | SUPPORTED | `Pi.signIn(...)` OAuth-style on **normal web**. Not the same runtime as Pi Browser auth. |
| `USER_TO_APP_PAYMENT` | SUPPORTED | `Pi.createPayment(...)`. Requires server-side approval **and** completion. |
| `APP_TO_USER_PAYMENT` | LIMITED | Official docs currently describe A2U as **Testnet-only**. Not Mainnet production-ready in this baseline. |
| `USER_VERIFICATION` | SUPPORTED | Backend `GET https://api.minepi.com/v2/me` with the user Bearer access token. |
| `WALLET_ADDRESS` | SUPPORTED | Supported **with consent**. Requires `wallet_address` scope. |
| `PLATFORM_API` | SUPPORTED | Known categories: GET `/me`, payment creation, lookup, approval, completion. Server API keys never go to the frontend. |
| `PI_TESTNET` | SUPPORTED | Network selected at app registration, not a runtime toggle. |
| `PI_MAINNET` | SUPPORTED | Network selected at app registration, not a runtime toggle. |
| `BLOCKCHAIN_TRANSACTION` | SUPPORTED | Stellar-SDK-compatible mechanics. Backend signing. Testnet and Mainnet are separate. |
| `SERVER_SIDE_PAYMENT_APPROVAL` | SUPPORTED | Backend Platform API. |
| `SERVER_SIDE_PAYMENT_COMPLETION` | SUPPORTED | Backend Platform API. |
| `INCOMPLETE_PAYMENT_RECOVERY` | SUPPORTED | `onIncompletePaymentFound` plus backend approval/completion. |
| `APP_REGISTRATION` | SUPPORTED | Pi Developer Portal. App picks Testnet or Mainnet as configuration. |
| `PI_BROWSER_RUNTIME` | SUPPORTED | Required runtime for `Pi.authenticate` and `Pi.createPayment`. |

No capability in this baseline is catalogued as UNSUPPORTED. Unknown capability IDs are still **blocked** by the guard.

## Environments

`PI_BROWSER`, `NORMAL_WEB`, `BACKEND`, `BLOCKCHAIN`, `TESTNET`, `MAINNET`.

`TESTNET` / `MAINNET` are network targets. The others are runtime targets. `can_generate(id, "MAINNET")` treats the argument as a network.

## Guard outcomes

| Decision | Meaning |
|----------|---------|
| `ALLOW` | Directly available (SUPPORTED and constraints match). |
| `ALLOW_WITH_WARNING` | Can generate only with explicit limitations (LIMITED, constraints match). |
| `BLOCK` | Do not generate. Unknown IDs, UNSUPPORTED, or environment/network mismatch. |

LIMITED is never silently treated as SUPPORTED.

Examples:

* `PI_BROWSER_AUTH` + `PI_BROWSER` → ALLOW
* `USER_TO_APP_PAYMENT` + `PI_BROWSER` → ALLOW (payments scope + backend approval/completion)
* `APP_TO_USER_PAYMENT` + `TESTNET` → ALLOW_WITH_WARNING
* `APP_TO_USER_PAYMENT` + `MAINNET` → BLOCK (LIMITED / Testnet-only)
* `UNKNOWN_CAPABILITY` → BLOCK

## Security constraints encoded

* Secret **names** only: `PI_API_KEY`, `APP_WALLET_PRIVATE_SEED`. No secret values.
* All listed secrets are `BACKEND_ONLY`.
* User verification uses the **user** access token, not the developer server API key.
* Platform API keys must not be placed in frontend code.
* A2U signing keys stay on the backend.

## What this baseline does not invent

Payment Platform API **categories** are modeled (creation, lookup, approval, completion). The only fully specified URL is:

`GET https://api.minepi.com/v2/me`

Do not invent additional REST paths until they are added as verified facts.

## Code location

`orchestrator/app/services/pi_capabilities/`

Query API for later Pi Agent Tools:

* `get_capability(id)`
* `list_capabilities(status=...)`
* `evaluate(id, environment, network=...)`
* `can_generate(id, environment, network=...)`
