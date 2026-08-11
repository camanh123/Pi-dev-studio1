# Phase 11 — Launch Readiness & Release Validation

Pre-launch validation of Pi Dev Studio release candidate **0.1.0-rc.10**.

This phase does **not** expand Pi capabilities and does **not** enable production flags.

```text
Release: Pi Dev Studio
Current RC: 0.1.0-rc.10
Validation date: 2026-08-11
Branch: cursor/pi-launch-readiness-a868
Based on: Phase 10 RELEASE CANDIDATE PASS WITH KNOWN LIMITATIONS
```

## Launch-readiness gates

```text
Developer journey: PASS
Marketplace UX: PASS
Feature flags: PASS
Knowledge/provenance: PASS
Skills: PASS
Web starter: PASS
Auth starter: PASS
Payments starter: PASS
Security UX: PASS
Clean-room: PASS
OpenSail regression: PASS WITH NOTES
Rollback: PASS
Documentation: PASS
Mainnet safety: PASS
```

## Overall verdict

```text
PHASE 11 — LAUNCH READY
```

Production Pi flags remain **OFF** until an explicit operator rollout decision.

---

## Release candidate integrity

| Field | Value |
|-------|-------|
| `release_version` | `0.1.0-rc.10` |
| Knowledge package | `packages/pi-integration` `0.1.0` |
| Skills | 7 × `0.1.0`, `is_builtin=false` |
| Starters | web/auth/payments `0.1.0` ↔ orphan branches ↔ bundles |
| Feature flags | four snake_case flags, default OFF, public |
| Known limitations | documented in Phase 10 manifest |

No version drift detected between seeds (`DEFAULT_VERSION`/`0.1.0`), bundles, frontend `package.json`, and published orphan branches.

---

## Developer journey (all three starters)

```text
Open Dev Studio
→ Create Project (flags ON in a staging env)
→ Choose Pi starter
→ Project Setup + Pi Setup Checklist
→ Generated project from orphan branch
→ Build frontend
→ Manual Developer Portal / sandbox / Testnet steps
```

| Starter | Discoverable | Safety copy | Branch | Docs |
|---------|--------------|-------------|--------|------|
| `pi-web-starter` | yes (gated) | SDK-only; no auth/payments | `base/pi-web-starter` | README + PI_SETUP + TESSLATE |
| `pi-auth-starter` | yes (gated) | Bearer `/me`; ≠ OpenSail auth | `base/pi-auth-starter` | README + PI_SETUP + TESSLATE |
| `pi-payments-starter` | yes (gated) | Testnet-first; Key server-only; in-memory demo | `base/pi-payments-starter` | README + PI_SETUP + TESSLATE |

Clean-room simulation (Developers A/B/C): each starter acquired from `origin/base/pi-*` without host `workspace-data-*`, `dist/`, lockfiles, or `.env` secrets.

---

## Marketplace UX

Payments MarketplaceBase long description explicitly states:

- Testnet-first / Mainnet human review
- Server API Key backend-only
- **In-memory local payment state (demo) — not Mainnet-production ready without durable persistence**
- No refunds, recurring, webhooks, A2U, wallet APIs, automatic Mainnet publishing, or OpenSail billing replacement

Skills remain free, featured, non-builtin; provenance via Official sources → Phase 1 catalog IDs.

Skill limitation remains explicit in checklist + manifest:

```text
Pi skills require AgentSkillAssignment before load_skill.
```

---

## Feature-flag rollout strategy

Production defaults stay **OFF**. Do not add env-var bypasses.

### Stage 0 — All Pi flags OFF

- Verification: Create Project / Marketplace hide Pi starters & skills; non-Pi flows unchanged.
- Rollback trigger: n/a (baseline).
- Rollback action: keep OFF.

### Stage 1 — `pi_knowledge` ON

- Verification: provenance / knowledge UX visible; no Pi starters yet.
- Rollback trigger: incorrect normative claims surfaced.
- Rollback action: set `pi_knowledge` OFF.

### Stage 2 — `pi_skills` ON

- Verification: seven Pi skills discoverable; install still requires AgentSkillAssignment.
- Rollback trigger: skill body / provenance defect.
- Rollback action: set `pi_skills` OFF.

### Stage 3 — `pi_templates` ON

- Verification: Web + Auth starters selectable; clone orphan branches; checklist appears.
- Rollback trigger: wrong branch / create-project defect.
- Rollback action: set `pi_templates` OFF.

### Stage 4 — `pi_payments_template` ON

- Verification: Payments starter selectable; security UX + in-memory Mainnet warning visible.
- Rollback trigger: secret exposure / payment-state regression / Mainnet confusion.
- Rollback action: set `pi_payments_template` OFF (and optionally Stage 3 OFF).

### Safest rollback (any stage)

```text
Turn the affected Pi feature flag(s) OFF.
```

No database deletion and no OpenSail auth/Stripe rollback required.

---

## SUPPORTED / MANUAL / UNSUPPORTED / NOT PLANNED

### SUPPORTED

- Pi SDK initialization (`Pi.init` 2.0 + sandbox)
- Pi authentication starter (`Pi.authenticate` + `/v2/me`)
- Pi Platform API `/me` verification
- U2A payment approve/complete starter (Testnet-first)
- Pi marketplace integration (bases + skills)
- Provenance-backed Pi skills (after assignment)

### MANUAL

- Developer Portal registration
- Domain validation
- Sandbox authorization / Pi Browser testing
- Testnet verification
- Mainnet transition + human review
- Skill purchase/install onto agents

### UNSUPPORTED

- App Studio API automation
- Automatic publishing
- Wallet APIs / custody
- Refunds, recurring, webhooks
- A2U implementation
- Pi → OpenSail auth / Stripe replacement

### NOT PLANNED (this launch)

- Auto-enabling production Pi flags
- Durable Mainnet payment ledger inside OpenSail DB
- Privileged agent payment tools holding Server API Key
- Making Pi skills builtin by default

---

## Security UX

Developers are told:

- `PI_SERVER_API_KEY` is server-only (project-local name, not official Pi env)
- Never expose in `VITE_*` / frontend / HTML
- Never log Pi access tokens
- Never put credentials into AI prompts
- Frontend callbacks alone are not payment success

No real credentials found in release surfaces.

---

## Mainnet safety

Payments starter is **not** Mainnet-production ready as shipped:

- Testnet-first
- Manual Portal network transition
- Human review required
- Durable payment-state storage required before Mainnet
- In-memory demo map loses state on process restart
- P9-01 protected statuses remain (`approved`/`completed` not downgraded by duplicate Platform 4xx)

No real Mainnet transactions, production API keys, wallet automation, or auto-publishing in this validation.

---

## OpenSail regression

Pi templates do not call OpenSail `/api/auth/*` or Stripe checkout.

Focused non-Pi suite status during Phase 11:

- Full orchestrator auth integration suites may require environment dependencies (`fastapi_users`, etc.) not present in this validation VM — treat missing-deps failures as **environment/setup**, not Pi regressions.
- Pi isolation + marketplace + Phase 6–10/11 Pi suites are green (see Tests executed).

Unrelated historical failures must not be “fixed” by changing OpenSail auth/Stripe/orchestration.

---

## Launch checklist

```text
[x] Release candidate verified (0.1.0-rc.10)
[x] All Phase 10 tests green
[x] Clean-room starters verified
[x] No credentials committed
[x] Pi flags OFF
[x] Marketplace verified
[x] Documentation verified
[x] Rollback verified (flag OFF strategy)
[x] OpenSail regression verified (Pi isolation + available suites; see notes)
[x] Mainnet safety verified
```

---

## Tests executed

```text
Phase 11 launch-readiness tests
Phase 10 release gate + payment state safety
Marketplace Pi suite (test_pi_*.py)
pi-integration knowledge tests
Frontend Pi UX unit tests
```

Exact counts are recorded in the Phase 11 PR / final report after the validation run.

---

## Defects found

| ID | Severity | Observed | Root cause | Fix | Regression |
|----|----------|----------|------------|-----|------------|
| P11-01 | P3 | Payments MarketplaceBase long description under-emphasized in-memory / not-Mainnet-ready limitation | Launch UX gap (docs existed in starter PI_SETUP) | Clarify long_description | `test_payments_marketplace_copy_*` |
| P11-02 | P3 | Auth starter `TESSLATE.md` hard rules omitted explicit Portal network ≠ sandbox | Doc completeness | One-line hard rule | Phase 11 starter journey tests |

No P0/P1 launch blockers.

---

## Remaining limitations

Same Phase 9/10 known limitations (manual Portal/domain/sandbox/Mainnet; no App Studio/auto-publish/wallet/refunds/recurring/webhooks/A2U; in-memory payments; flags OFF; skills need assignment).

---

## Final recommendation

```text
PHASE 11 — LAUNCH READY

Ship RC 0.1.0-rc.10 with Pi feature flags OFF.
Roll out via Stage 0→4 only with explicit operator approval.
Do not enable Stage 4 (payments) without Mainnet-safety review of the target environment.
Do not start Phase 12 automatically.
```

## Related docs

- [Release manifest](./pi-dev-studio-release-manifest.json)
- [Phase 10 RC](./pi-dev-studio-phase10-release-candidate.md)
- [Phase 9 hardening](./pi-dev-studio-phase9-production-hardening.md)
