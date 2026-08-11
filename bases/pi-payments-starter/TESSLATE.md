# TESSLATE.md — Pi Payments Starter

> Context for AI agents working on this generated Pi application.

## Framework

- Frontend: Vite + React + TypeScript
- Backend: FastAPI (`/health`, `/pi/auth/verify`, `/pi/payments/*`)
- Ports: 5173 / 8001

## Pi integration status

| Area | Status |
|------|--------|
| SDK CDN + `Pi.init` 2.0 | Included |
| `Pi.authenticate(["username","payments"])` | Included |
| Backend `/v2/me` Bearer verify | Included |
| `Pi.createPayment` U2A | Included |
| approve / complete / cancel / get | Included |
| Incomplete payment helper | Included |
| A2U / refunds / webhooks / wallet APIs | **Out of scope** |
| OpenSail auth / Stripe | **Must not modify** |

## Secret handling

- `PI_SERVER_API_KEY` is a generated-project secret name (not official Pi env).
- Backend only. Never read it into frontend code, prompts, or logs.
- Do not create privileged AI tools that approve payments with the key.

## Skills

`pi-payments` (primary), `pi-auth`, `pi-sdk`, `pi-platform-api`,
`pi-browser`, `pi-developer-portal`, `pi-compliance`.

## Hard rules

- Only `https://sdk.minepi.com/pi-sdk.js` and `https://api.minepi.com/v2`.
- No fake payment success without Platform API confirmation.
- Testnet-first; Mainnet needs human review.
- Cancel ≠ refund. No recurring. No webhooks. No A2U in this starter.
