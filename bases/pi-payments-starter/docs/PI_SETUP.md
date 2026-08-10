# Pi Payments Starter — Setup Guide

Verified workflow only. OpenSail cannot automate Developer Portal registration,
domain verification, publishing, App Studio, or Mainnet approval.

Provenance: Phase 1 catalog `pi-sdk-reference`, `pi-platform-api`,
`pi-api-host-v2`, `pi-payments-u2a`, `pi-payments-advanced`, portal/browser docs.

## Payment architecture

```text
Pi.createPayment
  → onReadyForServerApproval
  → POST /v2/payments/{id}/approve     Key <server key>
  → Pi user signing
  → onReadyForServerCompletion
  → POST /v2/payments/{id}/complete    { "txid": "..." }
  → verified payment state
```

Pi payments in this starter belong to the **generated application**.
They are **not** OpenSail Stripe / Team credits billing.

## Developer workflow

1. Create project from Pi Payments Starter (OpenSail assisted).
2. Register the Pi app in Developer Portal (manual).
3. Configure app URL / development URL (manual).
4. Domain validation as required (manual), e.g. `validation-key.txt`.
5. Select **Testnet** App Network for development (manual).
6. Obtain Server API Key from portal workflow (manual).
7. Store key as generated-app **server-only** secret `PI_SERVER_API_KEY`
   (project-local name — not an official Pi env var). Never put in frontend.
8. Authorize sandbox when using desktop sandbox development (manual).
9. Test auth + U2A payments in Pi Browser / Testnet.
10. Mainnet only after deliberate portal switch + human review.

## Auth vs payment credentials

| Use | Header |
|-----|--------|
| `/v2/me` user verify | `Authorization: Bearer <user accessToken>` |
| payment approve/complete/cancel/get | `Authorization: Key <Server API Key>` |

Do not mix these schemes.

## Concepts that must not be collapsed

```text
OpenSail deployment/preview
  ≠ Pi SDK sandbox flag
  ≠ Developer Portal App Network
  ≠ Payment DTO network
```

## Out of scope

- Refunds (cancel ≠ refund)
- Recurring / subscriptions
- Webhooks
- A2U (documented elsewhere; not implemented here)
- Wallet APIs / passphrase / custody
- App Studio automation
- OpenSail billing replacement

## Production hardening notes

- Prefer durable payment-state storage before Mainnet (this starter uses
  in-memory records for demo idempotency only).
- Never mark payments successful on non-200 `/complete`.
- Incomplete payments must be reconciled via Platform API — never assumed paid.
