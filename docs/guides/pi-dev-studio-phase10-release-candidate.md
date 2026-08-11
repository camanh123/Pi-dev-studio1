# Phase 10 — Pi Dev Studio Release Candidate & Final Release Gate

Release candidate packaging and final release gate for the cumulative Phase 1–9 Pi Dev Studio MVP.

Machine-readable companion: [`pi-dev-studio-release-manifest.json`](./pi-dev-studio-release-manifest.json).

## PHASE 10 — FINAL RELEASE GATE

```text
Repository: https://github.com/camanh123/Pi-dev-studio1.git
Commit/branch: f69726540fa2ebc261799b1aa9201b4d55c0f5d9 (cursor/pi-release-candidate-a868)
Release version: 0.1.0-rc.10

Architecture: PASS
Regression: PASS
Clean-room: PASS
Secrets: PASS
Starters: PASS
Skills: PASS
Provenance: PASS
Feature flags: PASS
Create-project E2E: PASS
Payment safety: PASS
OpenSail isolation: PASS
Documentation: PASS
Rollback: PASS

Overall verdict:
PHASE 10 — RELEASE CANDIDATE PASS WITH KNOWN LIMITATIONS
```

### Test results (this RC)

```text
Phase 10 release gate + payment safety: 34 passed
Marketplace Pi suite (test_pi_*.py): 125 passed
pi-integration knowledge: 16 passed
Frontend Pi UX: 15 passed
Phase 9 regression baseline: green before packaging changes
```

---

## What Pi Dev Studio supports

### SUPPORTED (OpenSail-assisted, flags ON)

- Create a project from Pi MarketplaceBases:
  - `pi-web-starter` → orphan `base/pi-web-starter`
  - `pi-auth-starter` → orphan `base/pi-auth-starter`
  - `pi-payments-starter` → orphan `base/pi-payments-starter`
- Official CDN SDK install + `Pi.init({ version: "2.0", sandbox })`
- Generated-app Pi authentication via `Pi.authenticate` + backend `GET /v2/me` (Bearer)
- Generated-app U2A payments (Testnet-first) via approve/complete with server-only Key auth
- Phase 1 knowledge corpus + seven Pi skills (after `AgentSkillAssignment`)
- Pi Setup Checklist (environment concepts kept separate)
- Feature-flag gated discovery (`pi_knowledge`, `pi_skills`, `pi_templates`, `pi_payments_template`)

### MANUAL

- Developer Portal app registration
- Application / development URL configuration
- Domain validation when required by the Portal
- Sandbox authorization / testing in Pi Browser
- Testnet verification against your Portal app
- Mainnet transition + human production review
- Purchasing/installing Pi skills onto a project agent

### UNSUPPORTED

- App Studio create/deploy/publish APIs
- Automatic Developer Portal registration or domain validation
- Automatic Mainnet / network switching APIs
- Pi → OpenSail authentication (Studio IdP)
- Pi → Stripe / Team credits replacement
- Wallet custody / balance / history APIs
- Refunds, recurring billing, webhooks
- Undocumented Pi endpoints
- A2U payment implementation in starters
- Treating OpenSail preview as Pi Browser
- Treating SDK sandbox as Testnet/Mainnet

### NOT PLANNED (this RC)

- Expanding Pi API surface beyond Phase 1 catalog
- Durable Mainnet payment ledger inside OpenSail platform DB
- Privileged agent tools that approve payments with Server API Key
- Making Pi skills `is_builtin: true` by default

---

## How to enable feature flags

Registered YAML keys in `orchestrator/feature_flags/defaults.yaml` (production defaults **OFF**, **public**):

```text
pi_knowledge
pi_skills
pi_templates
pi_payments_template
```

Enable per environment via the existing feature-flag overlay mechanism. Do **not** use dotted aliases (`pi.knowledge`, …) as registered keys.

Frontend reads public flags through `GET /api/feature-flags` → `useFeatureFlag()`.

---

## How to create each Pi starter

1. Enable `pi_templates` (and `pi_payments_template` for payments).
2. Open Create Project → select the Pi starter MarketplaceBase.
3. Complete Project Setup; review `PiSetupChecklist`.
4. Attach recommended Pi skills (Marketplace → purchase → install on agent).
5. Configure generated-app secrets locally (payments: server-only `PI_SERVER_API_KEY` project secret name — **not** an official Pi env var).
6. Complete MANUAL Developer Portal steps before sandbox/Testnet/Mainnet claims.

Create-project must clone the seeded orphan branch (`base/pi-*-starter`), never silently fall back to `main` when the base specifies an orphan branch.

---

## How Pi authentication works

```text
Pi.authenticate(["username"], ...)
  → accessToken (frontend, ephemeral)
  → generated-app backend POST /pi/auth/verify
  → GET https://api.minepi.com/v2/me  Authorization: Bearer <accessToken>
  → uid/username stored as generated-app local identity
```

OpenSail account ≠ Pi Pioneer identity. Do not wire Pi into `/api/auth/*`.

---

## How Pi payments work

```text
Pi.createPayment(...)
  → onReadyForServerApproval → backend → POST /v2/payments/{id}/approve (Key)
  → onReadyForServerCompletion → backend → POST /v2/payments/{id}/complete (Key)
```

Rules:

- Server API Key: server-only
- Frontend callbacks alone never mark success
- Platform non-2xx reconcile via GET; `failed` cannot downgrade `approved`/`completed`
- Local payment map is in-memory (demo limitation)

---

## Rollback procedure

### Rollback trigger

- Unexpected production exposure of Pi templates/skills
- Suspected credential leakage in a Pi surface
- Create-project cloning the wrong branch
- Payment-state or isolation regression

### Safest default rollback

```text
Set Pi feature flags OFF:
  pi_knowledge
  pi_skills
  pi_templates
  pi_payments_template
```

This hides Pi discovery/create UX without deleting provenance, seeds, or historical docs.

### Rollback steps

1. Set the four Pi flags to `false` in the active environment flag overlay / defaults.
2. Confirm `GET /api/feature-flags` returns them `false`.
3. Confirm Create Project / Marketplace no longer feature Pi starters/skills.
4. Do **not** delete `packages/pi-integration`, skill seeds, or orphan branches.
5. Do **not** modify OpenSail `/api/auth/*`, Stripe, or Team credits as part of Pi rollback.

Optional deeper rollback (only if a bad seed was synced):

1. Re-sync marketplace from a known-good commit that predates the bad seed change.
2. Leave orphan `base/pi-*` branches intact for auditability unless a security incident requires force-republish.

### Verification

- Public flags all `false`
- Non-Pi project create/start/chat still works
- No Pi starter selected by default
- Existing non-Pi MarketplaceBases unchanged

### Restore procedure

1. Re-enable flags intentionally (templates before payments if staged).
2. Re-run Phase 10 release gate tests.
3. Spot-check create-project for each starter → correct orphan branch.
4. Confirm checklist + skill assignment guidance still present.

---

## Release inventory (deterministic)

| Component | Location |
|-----------|----------|
| Knowledge | `packages/pi-integration` v0.1.0 (catalog schema_version 1) |
| Skills | `skills_pi.json` + `bundles/skill/pi-*/0.1.0.tar.zst` |
| Bases | `bases.json` + `bundles/base/pi-*/0.1.0.tar.zst` |
| Templates | `bases/pi-{web,auth,payments}-starter` |
| Orphan branches | `base/pi-web-starter`, `base/pi-auth-starter`, `base/pi-payments-starter` |
| Feature flags | `orchestrator/feature_flags/defaults.yaml` |
| UX | `CreateProjectModal`, `ProjectSetup`, `PiSetupChecklist`, `piDevStudio` |
| Sync / load | `marketplace_sync_helpers`, `skill_discovery`, `load_skill` |
| Publish scripts | `scripts/publish-pi-*-starter-base.sh` |
| Tests | Phase 6–10 Pi test modules + payment state safety |
| Docs | Phase 6–10 guides + this RC doc + release manifest |

---

## Release gate command

Fast gate (no Mainnet, no real credentials):

```bash
python3 -m pytest \
  packages/tesslate-marketplace/tests/test_pi_phase10_release_gate.py \
  packages/tesslate-marketplace/tests/test_pi_payments_state_safety.py \
  -q
```

Full Pi matrix (includes Phase 9 clean-room builds):

```bash
python3 -m pytest packages/tesslate-marketplace/tests/test_pi_*.py -q
PYTHONPATH=packages/pi-integration/src python3 -m pytest packages/pi-integration/tests/ -q
cd app && npm test -- --run src/lib/piDevStudio.test.ts src/components/pi/PiSetupChecklist.test.tsx
```

---

## Defects found in Phase 10

None that are release blockers. Phase 9 contracts remain green; Phase 10 adds packaging/metadata gates only.

| ID | Severity | Observed | Root cause | Fix | Regression |
|----|----------|----------|------------|-----|------------|
| — | — | No new P0/P1 defects | — | Release manifest + gate tests + RC docs | `test_pi_phase10_release_gate.py` |

---

## Remaining limitations

Same as Phase 9 known limitations (see manifest `known_limitations`). Non-blocking for RC with flags default OFF.

---

## Intentionally untouched

```text
tesslate-agent
agent runner / Redis / worker queue
OpenSail /api/auth/*
Stripe / Team credits
orchestration / Docker / K8s
Phase 1 provenance authority
new Pi APIs / App Studio / OAuth2 / wallet / refunds / recurring / webhooks / A2U
```

Do **not** automatically start Phase 11.
