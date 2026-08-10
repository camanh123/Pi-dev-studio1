# Pi Web Starter — Setup Guide

Verified workflow guidance only. OpenSail cannot automate Developer Portal
registration, domain verification, publishing, or App Studio APIs.

Provenance for these steps lives in the Phase 1 knowledge catalog
(`pi-developer-portal-workflow`, `pi-students-developer-onboarding`,
`pi-developers-landing`, `pi-sdk-reference`, `pi-sdk-js-artifact`).

## Developer workflow

1. **Create the project** from the Pi Web Starter MarketplaceBase in OpenSail.
   - Owner: OpenSail assisted

2. **Register the Pi app** in the Developer Portal (manual).
   - Access Developer Portal via `develop.pi` / `develop.pinet.com` inside Pi Browser
     as documented by official Pi developer guidance.
   - Owner: Developer manual
   - Do not invent portal HTTP APIs.

3. **Configure application URL / development URL** in the portal (manual).
   - Owner: Developer manual

4. **Configure domain ownership validation** as required (manual).
   - Host `validation-key.txt` (or equivalent portal requirement) on your domain.
   - Owner: Developer manual

5. **Select Testnet or Mainnet** as the Developer Portal App Network (manual).
   - This is separate from `Pi.init({ sandbox })`.
   - Owner: Developer manual

6. **Use the sandbox workflow for desktop development**.
   - Project-local `VITE_PI_SDK_SANDBOX=true` (not an official Pi env var).
   - Follow official sandbox / `sandbox.minepi.com` guidance.
   - Owner: Developer + OpenSail config

7. **Test the frontend in the appropriate Pi environment**.
   - OpenSail preview ≠ Pi Browser production.
   - Owner: Developer manual

8. **Later — add Pi Auth** using the `pi-auth` skill (Phase 4).
   - `Pi.authenticate` + backend `GET https://api.minepi.com/v2/me`
   - Not OpenSail Studio login / OAuth2.

9. **Later — add Pi Payments** using the `pi-payments` skill (Phase 5).
   - U2A lifecycle; Server API Key stays server-side.
   - Not OpenSail Stripe billing.

## Explicit boundaries

| Capability | Status |
|------------|--------|
| App registration | Manual Developer Portal |
| Domain validation | Manual |
| Server API Key | Not used in Web Starter; Phase 5 |
| Publishing / Mainnet approval | Manual; not automated |
| App Studio create/deploy/publish API | NOT CONFIRMED — do not invent |

## Concepts that must not be collapsed

```text
OpenSail runtime / preview
        ≠
Pi SDK sandbox flag (VITE_PI_SDK_SANDBOX / Pi.init.sandbox)
        ≠
Developer Portal App Network (Testnet / Mainnet)
```

There is no invented portal-network environment switch in this starter, because
that would incorrectly imply changing the registered Pi app network from OpenSail.
