# Pi Web Starter

A minimal self-hosted web application starter with the official Pi JavaScript SDK
loaded from the documented Pi CDN and initialized for Pi Browser / sandbox
development. Authentication and payments are intentionally excluded.

## What this starter is

A **Pi-compatible web app shell** for OpenSail / Pi Dev Studio:

- Vite + React frontend
- Minimal FastAPI backend (health only)
- Official Pi frontend SDK via CDN
- Documented `Pi.init({ version: "2.0", sandbox })`

It is **not** automatically registered, published, or approved on the Pi Network.

## What is included

- Official Pi SDK CDN: `https://sdk.minepi.com/pi-sdk.js`
- `Pi.init` with documented version `"2.0"`
- Sandbox-aware development via project-local config
- Self-hosted frontend + backend structure
- Developer Portal setup guidance (`docs/PI_SETUP.md`)
- OpenSail `.tesslate/config.json` for project containers

## What is NOT included

- Pi authentication (`Pi.authenticate`) — Phase 4
- Backend `GET /v2/me` verification — Phase 4
- Pi payments (`Pi.createPayment`, approve/complete) — Phase 5
- Server API Key handling — Phase 5
- App Studio automation
- Automatic Developer Portal registration / publishing
- Wallet / passphrase / custody logic
- npm `pi-sdk-js` (not the required official install path)

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

| Context | Use for |
|---------|---------|
| **OpenSail preview** | Layout, routing, ordinary web UI. Not guaranteed Pi Wallet / auth fidelity. |
| **Pi sandbox** | Desktop development per official Pi sandbox workflow (`sandbox.minepi.com`). |
| **Pi Browser** | Production ecosystem runtime for Pi apps. |

`Pi.init({ sandbox: true })` does **not** change the Developer Portal App Network.

## Project-local sandbox config

Frontend reads:

```text
VITE_PI_SDK_SANDBOX=true|false
```

`VITE_PI_SDK_SANDBOX` (and the conceptual name `PI_SDK_SANDBOX`) is an
**OpenSail / generated-app configuration value**. It is **not** an official
Pi Platform environment variable.

Default in `.tesslate/config.json` is `true` for sandbox-friendly development.

## Related Phase 2 skills

Primary:

- `pi-sdk`

Setup / testing:

- `pi-developer-portal`
- `pi-browser`

Later:

- `pi-auth` (Phase 4)
- `pi-payments` (Phase 5)
- `pi-compliance`

## Quick structure

```text
/
├── frontend/
│   ├── index.html              # loads official Pi CDN SDK
│   └── src/pi/init.ts          # Pi.init({ version: "2.0", sandbox })
├── backend/
│   └── main.py                 # /health only
├── docs/PI_SETUP.md
├── README.md
└── .tesslate/config.json
```

## Next steps

1. Read `docs/PI_SETUP.md` for the manual Developer Portal checklist.
2. Test SDK init in the documented sandbox / Pi Browser environments.
3. Add authentication later with the `pi-auth` skill (Phase 4).
4. Add payments later with the `pi-payments` skill (Phase 5).
