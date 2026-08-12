# Pi Auth Starter — Setup Guide

Verified workflow guidance only. OpenSail cannot automate Developer Portal
registration, domain verification, publishing, or App Studio APIs.

Provenance: Phase 1 catalog entries `pi-sdk-reference`, `pi-platform-api`,
`pi-api-host-v2`, `pi-developer-portal-workflow`, `pi-browser` / landing docs.

## Pi authentication architecture

```text
Frontend
  → Pi.authenticate(["username"], onIncompletePaymentFound)
  → accessToken
  → Generated application's backend  POST /pi/auth/verify
  → GET https://api.minepi.com/v2/me   Bearer token
  → verified uid / username
  → generated-app local verified-user state
```

This Pi authentication belongs to the **generated application**.
It is **not** OpenSail authentication.

## OpenSail multi-container layout (Testnet E2E)

Keep **Vite DEV** (`npm run dev`) so the `/api` proxy stays available.
Do **not** rely on a static `dist` deploy for Phase 1 — OpenSail does not
path-route `frontend/api/*` → backend.

| Container | Port | Start |
|-----------|------|--------|
| `frontend` | 5173 | `npm run dev -- --host 0.0.0.0` |
| `backend` | 8001 | `uvicorn main:app --host 0.0.0.0 --port 8001` |

```text
Browser → https://{slug}-frontend.{domain}
  → Vite /api proxy (VITE_BACKEND_URL)
  → backend :8001  (/health, /pi/auth/verify)
```

**`VITE_BACKEND_URL` source**

| Runtime | Value |
|---------|--------|
| OpenSail Kubernetes | Sibling inject `VITE_BACKEND_URL=http://dev-backend:8001` |
| Local single-host | Vite default `http://localhost:8001` |
| Docker multi-container | Set `VITE_BACKEND_URL=http://backend:8001` manually if needed |

Public URLs (approximate):

- Frontend (register in Pi Portal): `https://{slug}-frontend.{app_domain}`
- Backend (separate host — do **not** register as Pi app URL): `https://{slug}-backend.{app_domain}`

HTTPS is automatic on EKS when the wildcard TLS secret is configured.
Minikube / localhost Docker are typically HTTP only — unsuitable for real
Pi Browser Portal E2E.

## Developer workflow

1. **Create the project** from Pi Auth Starter in OpenSail.
   - Owner: OpenSail assisted

2. **Start frontend + backend** (Vite DEV + uvicorn). Confirm:
   - `GET https://{slug}-frontend.../api/health` returns backend health
   - Frontend shows `Pi.init completed`

3. **Register the Pi app** in the Developer Portal (manual).
   - Via `develop.pi` / `develop.pinet.com` inside Pi Browser per official guidance.
   - Owner: Developer manual

4. **Configure application URL / development URL** (manual) to the
   **frontend** HTTPS URL only.

5. **Domain ownership validation** as required (manual), e.g. `validation-key.txt`.

6. **Select Testnet** Developer Portal App Network (manual).
   - Separate from `Pi.init({ sandbox })` / `VITE_PI_SDK_SANDBOX`.
   - Do **not** select Mainnet for Phase 1.

7. **Authorize sandbox** when using desktop sandbox development (manual).
   - Project-local `VITE_PI_SDK_SANDBOX=true` (not an official Pi env var).
   - Follow official `sandbox.minepi.com` guidance.
   - For Pi Browser Testnet E2E, revisit sandbox per Pi docs (do not flip
     automatically in this starter).

8. **Test sign-in** in Pi Browser — not only OpenSail preview.

9. **Later — add Pi Payments** with the `pi-payments` skill (Phase 5).
   - Incomplete-payment callback in this starter is a safe placeholder only.
   - Server API Key belongs to Phase 5; this starter has **zero** Key usage.

## Concepts that must not be collapsed

```text
OpenSail runtime / preview
        ≠
Pi SDK sandbox flag
        ≠
Developer Portal App Network (Testnet / Mainnet)
        ≠
Pi payment network (Phase 5)
```

## Security checklist

- Access token: memory-only for verify request; never log, display, or commit.
- Backend `/me` is the trust boundary.
- No Server API Key in this starter.
- No OpenSail secret reuse.
- Production: HTTPS only.
- `uid` is app-scoped; plan for revocation/re-consent.

## Explicit boundaries

| Capability | Status |
|------------|--------|
| Pi.authenticate + /me verify | Implemented (generated app) |
| OpenSail Studio login | Untouched / out of scope |
| Payment recovery | Deferred Phase 5 |
| Server API Key | Deferred Phase 5 |
| Portal / App Studio automation | Not planned / NOT CONFIRMED |
