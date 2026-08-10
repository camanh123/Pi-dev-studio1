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

## Developer workflow

1. **Create the project** from Pi Auth Starter in OpenSail.
   - Owner: OpenSail assisted

2. **Register the Pi app** in the Developer Portal (manual).
   - Via `develop.pi` / `develop.pinet.com` inside Pi Browser per official guidance.
   - Owner: Developer manual

3. **Configure application URL / development URL** (manual).

4. **Domain ownership validation** as required (manual), e.g. `validation-key.txt`.

5. **Select Testnet or Mainnet** Developer Portal App Network (manual).
   - Separate from `Pi.init({ sandbox })` / `VITE_PI_SDK_SANDBOX`.

6. **Authorize sandbox** when using desktop sandbox development (manual).
   - Project-local `VITE_PI_SDK_SANDBOX=true` (not an official Pi env var).
   - Follow official `sandbox.minepi.com` guidance.

7. **Test sign-in** in Pi Browser or documented sandbox — not only OpenSail preview.

8. **Later — add Pi Payments** with the `pi-payments` skill (Phase 5).
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
