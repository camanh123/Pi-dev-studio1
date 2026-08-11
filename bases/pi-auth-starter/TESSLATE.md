# TESSLATE.md — Pi Auth Starter

> Context for AI agents working on this generated Pi application.

## Framework

- **Frontend**: Vite + React + TypeScript
- **Backend**: FastAPI (`/health`, `/pi/auth/verify`)
- **Ports**: 5173 (frontend), 8001 (backend)

## Pi integration status

| Area | Status |
|------|--------|
| Official SDK CDN | Included |
| `Pi.init` version `2.0` | Included |
| `Pi.authenticate(["username"], …)` | Included |
| Backend `GET /v2/me` Bearer verify | Included |
| Generated-app local verified-user state | Included (minimal) |
| Server API Key / payments | **Deferred — Phase 5** |
| OpenSail Studio auth | **Must not modify** |

## Identity boundary

```text
Generated-app Pi auth  ≠  OpenSail JWT/OAuth
```

Never wire Pi tokens into OpenSail `/api/auth/*`.

## Skills to load

1. `pi-auth` (primary)
2. `pi-sdk`
3. `pi-platform-api`
4. `pi-browser`
5. `pi-compliance`
6. `pi-developer-portal`

For payments later: `pi-payments` (Phase 5) — do not invent payment recovery here.

## Hard rules

- Official CDN only; do not require npm SDK wrappers.
- Only documented `/me` for identity verification.
- Never log or display access tokens.
- Never add Server API Key routes in this starter.
- Never invent OAuth2 / refresh-token / wallet APIs.
- `uid` is app-scoped and can change after revocation.
- Developer Portal Testnet/Mainnet selection is manual; SDK sandbox ≠ Portal network.
