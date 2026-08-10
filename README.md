# Pi Payments Starter

A Pi-compatible generated application starter with:

1. Official Pi SDK init
2. Generated-app Pi authentication (`/v2/me`)
3. Documented User-To-App (U2A) payments

```text
This is a Pi-compatible generated application starter.

Pi authentication and payments belong to this generated application.

They are NOT OpenSail authentication or OpenSail billing.
```

## Payment architecture (U2A)

```text
Pi.createPayment({ amount, memo, metadata }, callbacks)
      ↓
onReadyForServerApproval(paymentId)
      ↓
generated backend
      ↓
POST /v2/payments/{id}/approve   Authorization: Key <server key>
      ↓
Pi Wallet / platform user signing
      ↓
onReadyForServerCompletion(paymentId, txid)
      ↓
generated backend
      ↓
POST /v2/payments/{id}/complete  { "txid": "..." }
      ↓
verified payment state (Platform API success required)
```

Client callbacks alone are **not** final settlement proof.

## Auth architecture

```text
Pi.authenticate(["username", "payments"], onIncompletePaymentFound)
  → accessToken
  → POST /pi/auth/verify
  → GET https://api.minepi.com/v2/me  Bearer <token>
  → generated-app local verified-user state
```

Bearer (user) and Key (server payments) auth must never be mixed.

## Server secret

`PI_SERVER_API_KEY` is a **generated-project secret name**.
It is **not** an official Pi environment-variable name.

Rules:

- backend / server-only
- never in frontend / `VITE_*`
- never returned from APIs
- never logged
- never committed with a real value
- never passed into AI prompts

Configure it via your deployment secret mechanism. See `backend/.env.example`.

## What is included

- Official CDN SDK + `Pi.init({ version: "2.0", sandbox })`
- Pi auth + `/me` verification
- `Pi.createPayment` U2A demo
- Documented approve / complete / cancel / get payment routes
- Incomplete-payment recovery helper (no fake success)
- In-memory local payment records for demo idempotency
- Testnet-first + Mainnet human-review docs

## What is NOT included

- OpenSail Stripe / Team credits / billing replacement
- Refunds, recurring/subscription billing
- Stripe-style webhooks
- A2U payouts
- Wallet balance/history/custody APIs
- Passphrase handling
- OAuth2 Pi IdP
- App Studio / Developer Portal automation
- Durable production DB (document that Mainnet apps need durable payment state)

## Runtime concepts (do not collapse)

```text
OpenSail preview / deployment
        ≠
Pi SDK sandbox flag
        ≠
Developer Portal App Network (Testnet/Mainnet)
        ≠
Payment DTO network
```

`Pi.init({ sandbox: true })` does **not** switch portal Testnet/Mainnet.

## Testnet-first / Mainnet gate

1. Develop and test on Developer Portal **Testnet** deliberately.
2. Prefer Pi Browser (or documented sandbox) for Wallet UI.
3. Mainnet requires explicit portal configuration + human review.
4. Do not silently point demos at Mainnet production payments.

## Related skills

`pi-payments`, `pi-auth`, `pi-sdk`, `pi-platform-api`, `pi-browser`,
`pi-developer-portal`, `pi-compliance`.
