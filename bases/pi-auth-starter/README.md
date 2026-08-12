# Pi Auth Starter

A Pi-compatible web application starter with official Pi SDK initialization
**and generated-app Pi authentication**.

Extends Pi Web Starter with:

1. `Pi.authenticate(["username"], onIncompletePaymentFound)`
2. Access token sent only to this application's backend
3. Backend verification via official `GET https://api.minepi.com/v2/me`
4. App-local verified-user state (not an OpenSail session)

## Critical identity boundary

```text
This Pi authentication belongs to the generated application.
It is not OpenSail authentication.
```

Do not wire this flow into OpenSail `/api/auth/*`, Google/GitHub OAuth, or
OpenSail JWT cookies.

## Pi authentication architecture

```text
Pi Browser / sandbox
    ↓
Pi.authenticate(["username"], onIncompletePaymentFound)
    ↓
accessToken (memory only — never logged / shown)
    ↓
Generated application's backend  POST /pi/auth/verify
    ↓
GET https://api.minepi.com/v2/me
Authorization: Bearer <user access token>
    ↓
verified Pi UserDTO fields (uid, username)
    ↓
generated-app local verified-user state
```

The backend is the trust boundary. Frontend `auth.user` is never treated as final.

## What is included

- Official Pi SDK CDN: `https://sdk.minepi.com/pi-sdk.js`
- `Pi.init({ version: "2.0", sandbox })`
- Pi sign-in UI + `username` scope authentication
- Safe incomplete-payment placeholder (no payment recovery)
- Backend `/pi/auth/verify` → official `/v2/me`
- App-local verified-user state (uid / username)
- Developer Portal + Pi Browser / sandbox docs

## What is NOT included

- OpenSail Studio login / OAuth2 / JWT changes
- Server API Key
- Pi payments (`Pi.createPayment`, approve/complete)
- Wallet APIs / passphrase handling
- Token refresh protocol
- App Studio / Developer Portal automation
- Persistent hardened production session store (app responsibility)

## Runtime model

```text
OpenSail preview
        ≠
Pi SDK sandbox flag
        ≠
Developer Portal App Network (Testnet/Mainnet)
        ≠
Pi Browser production
```

| Context | Auth fidelity |
|---------|----------------|
| OpenSail preview | UI/routing only — not full Pi auth |
| Desktop sandbox | Documented sandbox / `sandbox.minepi.com` |
| Pi Browser | Production ecosystem runtime |

`Pi.init({ sandbox: true })` does **not** switch Developer Portal Testnet/Mainnet.

## Project-local configuration

These are **OpenSail/generated-project** values — not official Pi env vars:

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_PI_SDK_SANDBOX` | frontend | Maps to `Pi.init({ sandbox })` |
| `VITE_BACKEND_URL` | frontend (dev proxy) | Vite `/api` → backend; K8s sibling inject `http://dev-backend:8001`; local default `http://localhost:8001` |
| `PI_API_BASE` | backend | Default `https://api.minepi.com/v2` (allowlisted) |

Auth-only: **no** `PI_SERVER_API_KEY`.

Production authentication must use HTTPS.

## OpenSail Testnet E2E (auth only)

1. Create project from this base; keep Vite **dev** start (preserves `/api` proxy).
2. Start containers; hit `GET /api/health` on the **frontend** public URL.
3. Register the **frontend** HTTPS URL in Pi Developer Portal (App Network = **Testnet**).
4. Sign in with Pi in **Pi Browser** — real `/v2/me` verify; no payments / Mainnet.

See `docs/PI_SETUP.md`.

## Identity notes

- `uid` is **app-scoped** and can change after the user revokes app permissions.
- Do not treat Pi uid as a globally permanent cross-app identity.
- Do not build a global OpenSail Pi identity database from this starter.

## Related Phase 2 skills

- `pi-auth` (primary)
- `pi-sdk`
- `pi-platform-api`
- `pi-browser`
- `pi-developer-portal`
- `pi-compliance`

Payments remain Phase 5 (`pi-payments`).

## Quick structure

```text
/
├── frontend/
│   ├── index.html
│   └── src/pi/
│       ├── init.ts
│       └── auth.ts
├── backend/main.py          # /health + /pi/auth/verify
├── docs/PI_SETUP.md
├── README.md
└── .tesslate/config.json
```
