# Phase 12 — Controlled Production Rollout & Operations

Operational validation for Pi Dev Studio **RC 0.1.0-rc.10**.

This phase does **not** expand Pi APIs and does **not** auto-enable production flags.

```text
Release: Pi Dev Studio
Current version: 0.1.0-rc.10
Current stage: Stage 0 (all Pi flags OFF)
Branch: cursor/pi-controlled-rollout-a868
Operator approval: none (no production promotion)
```

## PHASE 12 — CONTROLLED PRODUCTION ROLLOUT

```text
Release: 0.1.0-rc.10
Branch: cursor/pi-controlled-rollout-a868
Commit: (set on PR HEAD)

Stage 0: PASS
Stage 1: PASS (validated; NOT ACTIVATED in production)
Stage 2: PASS (validated; NOT ACTIVATED in production)
Stage 3: PASS (validated; NOT ACTIVATED in production)
Stage 4: NOT ACTIVATED (security gate validated; requires separate operator approval)

Observability: PASS
Rollback drill: PASS
Security: PASS
Regression: PASS (Marketplace Pi 170; pi-integration 16; Frontend Pi UX 15; Phase 12 gate green)
Documentation: PASS

OpenSail note: full orchestrator pytest requires fastapi_users in this VM (environment/setup — not a Pi regression). Auth/billing routers present.

Current production flag state:
pi_knowledge = OFF
pi_skills = OFF
pi_templates = OFF
pi_payments_template = OFF

Final verdict:
PHASE 12 — OPERATIONALLY READY
```

---

## Operator approval mechanism (existing architecture)

Pi flags use the existing YAML feature-flag system:

```text
orchestrator/feature_flags/defaults.yaml     # schema + safe defaults (OFF)
orchestrator/feature_flags/{env}.yaml        # optional operator overrides
GET /api/feature-flags                       # public flag exposure to frontend
useFeatureFlag()                             # frontend gate
```

**An operator explicitly enables each stage** by editing the target environment
overlay (for example `production.yaml` / `beta.yaml`) and redeploying / restarting
so `load_feature_flags(deployment_env)` picks up the override.

The system must **not**:

- auto-enable flags
- auto-promote stages
- auto-publish Pi projects
- auto-transition Mainnet
- auto-authorize payments

```text
Stage 1 does not automatically activate Stage 2.
Stage 2 does not automatically activate Stage 3.
Stage 3 does not automatically activate Stage 4.
```

Each promotion requires human/operator approval.

---

## Stage 0

**Entry:** Fresh RC / emergency baseline.  
**Verification:** `defaults.yaml` + all `{env}.yaml` keep Pi flags false; `scripts/pi-ops-healthcheck.sh` green.  
**Success:** Pi UX gated; OpenSail unchanged.  
**Rollback trigger:** n/a.  
**Rollback action:** keep OFF.  
**Exit:** Operator decides to enter Stage 1.

```text
pi_knowledge = OFF
pi_skills = OFF
pi_templates = OFF
pi_payments_template = OFF
```

---

## Stage 1 — Knowledge

**Entry:** Operator approval + Stage 0 healthy.  
**Enable:** `pi_knowledge: true` in env overlay only.  
**Verification:** Knowledge / provenance note appears where gated; unsupported claims remain constrained; no undocumented API presented as fact.  
**Success:** Provenance UX visible; community sources not normative.  
**Rollback trigger:** Incorrect normative claim / provenance defect.  
**Rollback action:** set `pi_knowledge: false` (or remove override).  
**Exit:** Operator approval for Stage 2.

---

## Stage 2 — Skills

**Entry:** Stage 1 stable.  
**Enable:** keep Stage 1 + `pi_skills: true`.  
**Verification:** seven skills discoverable; metadata/provenance OK; `AgentSkillAssignment` still required; `load_skill` slug/name resolution intact.  
**Success:** Skills usable only after assignment.  
**Rollback trigger:** skill/provenance incident.  
**Rollback action:** set `pi_skills` OFF (optionally Stage 1 OFF).  
**Exit:** Operator approval for Stage 3.

---

## Stage 3 — Templates

**Entry:** Stage 2 stable.  
**Enable:** keep Stage 2 + `pi_templates: true`.  
**Verification:** `pi-web-starter` / `pi-auth-starter` create-project path uses orphan branches; checklist appears; clean-room smoke OK.  
**Success:**

```text
pi-web-starter → base/pi-web-starter
pi-auth-starter → base/pi-auth-starter
```

No silent `main` fallback when orphan is specified.  
**Rollback trigger:** wrong branch / create-project defect.  
**Rollback action:** set `pi_templates` OFF.  
**Exit:** Separate security review before Stage 4.

---

## Stage 4 — Payments (separate security gate)

**Entry:** Explicit security review + operator approval. **NOT equivalent to Mainnet production readiness.**  
**Enable:** keep Stage 3 + `pi_payments_template: true`.  
**Security gate:**

- Testnet-first
- Server API Key server-only
- No frontend / `VITE_*` key
- No real credentials in repo
- No fake payment success
- Approve/complete reconciliation (P9-01)
- Protected `approved` / `completed` state
- In-memory payment state limitation documented

**Operator approval:** required; no automatic promotion from Stage 3.  
**Verification:** Payments starter discoverable; Mainnet warning visible; no Mainnet transaction executed by OpenSail.  
**Success:** Demo/Testnet path usable under operator control.  
**Rollback trigger:** secret exposure, payment-state regression, Mainnet confusion.  
**Rollback action:** set `pi_payments_template` OFF immediately.  
**Exit:** Only after durable payment-state + human Mainnet review (future ops decision — out of Phase 12 scope).

---

## Observability (existing mechanisms)

Do **not** introduce a new monitoring platform.

Use existing logs / health:

| Signal | Where |
|--------|-------|
| Feature flag load | orchestrator `feature_flags` logger (`Feature flags loaded: env=...`) |
| Public flag state | `GET /api/feature-flags` |
| Marketplace seed / starter / skill / catalog health | `scripts/pi-ops-healthcheck.sh` / `pi_ops_health.py` |
| Project create / clone failures | project setup pipeline logs |
| Auth starter errors | generated-app backend logs (`token redacted`) |
| Payment starter errors | generated-app backend logs (path only; never key/token) |

**Never log:** Pi access tokens, Server API Keys, payment secrets, private credentials.

---

## Operational health checks

```bash
./scripts/pi-ops-healthcheck.sh
```

Covers:

- Marketplace seed availability
- Pi starter registration + bundles
- Orphan branch resolution
- Pi skill registration
- Knowledge catalog integrity
- Feature flag registration + safe defaults

No real payment / Mainnet / credential calls.

---

## Emergency rollback

```text
Turn affected Pi flag(s) OFF in the env overlay and restart/redeploy.
Emergency baseline = Stage 0 (all Pi flags OFF).
```

Does **not** require: database deletion, Stripe changes, OpenSail auth changes, agent runner / Redis / Docker / K8s redesign.

### Credential incident

1. Stage 0 immediately.
2. Rotate exposed secrets outside OpenSail git.
3. Audit logs for token/key leakage.
4. Do not re-enable Stage 4 until cleared.

### Payment incident

1. Disable `pi_payments_template`.
2. Confirm no fake success path; confirm P9-01 protected statuses.
3. Remind operators: in-memory state ≠ Mainnet ledger.

### Marketplace incident

1. Disable `pi_templates` / `pi_skills` as needed.
2. Confirm no silent `main` fallback for Pi orphan bases.
3. Re-run `pi-ops-healthcheck.sh`.

### Skill/provenance incident

1. Disable `pi_skills` (and `pi_knowledge` if normative claims wrong).
2. Do not invent endpoints; restore from Phase 1 catalog authority.

---

## Production runbook

### PRE-ROLLOUT

```text
[ ] Release candidate verified (0.1.0-rc.10)
[ ] Phase 11 launch-ready
[ ] All Pi flags OFF
[ ] No credentials committed
[ ] Marketplace healthy (pi-ops-healthcheck)
[ ] Starter branches healthy
[ ] Skills healthy
[ ] Provenance healthy
[ ] Rollback tested (flag OFF drill)
```

### STAGE 1

```text
[ ] Operator approval
[ ] pi_knowledge ON (env overlay only)
[ ] Verify knowledge UX + provenance
[ ] Monitor flag endpoint + logs
[ ] Rollback ready
```

### STAGE 2

```text
[ ] Operator approval
[ ] pi_skills ON
[ ] Verify seven skills + AgentSkillAssignment limitation
[ ] Monitor
[ ] Rollback ready
```

### STAGE 3

```text
[ ] Operator approval
[ ] pi_templates ON
[ ] Verify web/auth create-project orphan branches
[ ] Clean-room validation
[ ] Rollback ready
```

### STAGE 4

```text
[ ] Separate security review
[ ] Operator approval
[ ] Testnet-first
[ ] Server key verified (server-only)
[ ] No frontend secret
[ ] No Mainnet transaction
[ ] Payment-state safety verified
[ ] Rollback ready
```

---

## Failure scenario expectations

| Scenario | Expected |
|----------|----------|
| Marketplace failure | No silent `main` fallback for Pi orphan bases; clear error; no corrupted template assumption |
| Skill failure | Assignment limitation explicit; no fabricated skill body |
| Authentication failure | No token leakage; no OpenSail `/api/auth/*` fallback |
| Payment failure | No fake success; Platform errors handled; protected statuses preserved |
| Feature-flag failure | Safe default = OFF |

---

## Security gate

```text
Pi Server API Key: PASS
Pi access token hygiene: PASS
Frontend secret exposure: PASS
Pi → OpenSail auth isolation: PASS
Pi → Stripe isolation: PASS
Payment completion safety: PASS
Provenance safety: PASS
Feature flag safe default: PASS
Rollback safety: PASS
Mainnet safety: PASS (Stage 4 NOT ACTIVATED; starter not Mainnet-ready)
```

---

## Defects / fixes

| ID | Severity | Observed | Fix | Regression |
|----|----------|----------|-----|------------|
| — | — | No P0/P1 blockers in Phase 12 | Added ops healthcheck + rollout tests/docs | `test_pi_phase12_controlled_rollout.py` |

---

## Remaining limitations

Same as Phase 11 (manual Portal/Mainnet; no App Studio/auto-publish/wallet/refunds/recurring/webhooks/A2U; in-memory payments; skills need assignment). Stage 4 remains **NOT ACTIVATED**.

---

## Related

- [Phase 11 launch readiness](./pi-dev-studio-phase11-launch-readiness.md)
- [Phase 10 RC](./pi-dev-studio-phase10-release-candidate.md)
- [Release manifest](./pi-dev-studio-release-manifest.json)
- Healthcheck: `scripts/pi-ops-healthcheck.sh`
