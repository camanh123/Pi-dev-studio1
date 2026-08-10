# TESSLATE.md — Pi Web Starter

> Context for AI agents working on this generated Pi application.

## Framework

- **Frontend**: Vite + React + TypeScript
- **Backend**: FastAPI (health only)
- **Ports**: 5173 (frontend), 8001 (backend)

## Pi integration status

| Area | Status |
|------|--------|
| Official SDK CDN | Included (`https://sdk.minepi.com/pi-sdk.js`) |
| `Pi.init` version `2.0` | Included (`frontend/src/pi/init.ts`) |
| Sandbox config | Project-local `VITE_PI_SDK_SANDBOX` (not official Pi env) |
| `Pi.authenticate` / `/v2/me` | **Deferred — Phase 4** |
| `Pi.createPayment` / Server API Key | **Deferred — Phase 5** |

## Skills to load

When changing Pi-related code, prefer:

1. `pi-sdk` (primary for this starter)
2. `pi-developer-portal` (manual portal checklist)
3. `pi-browser` (preview vs sandbox vs Pi Browser)
4. `pi-compliance` (no passphrases / custody)

Do **not** implement auth or payments unless the user explicitly starts that work;
then load `pi-auth` / `pi-payments` and keep OpenSail Studio auth/Stripe untouched.

## Hard rules

- Do not replace the CDN SDK with an npm wrapper as the required install path.
- Do not invent Pi APIs, OAuth2 flows, webhooks, refunds, or wallet APIs.
- Do not put Server API Keys in the frontend.
- Do not claim OpenSail preview equals Pi Browser.
- Do not treat `Pi.init({ sandbox })` as Developer Portal Testnet/Mainnet.
