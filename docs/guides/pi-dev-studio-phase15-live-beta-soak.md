# Phase 15 — Live Beta Soak & Rollback Validation

Operations / validation for Pi Dev Studio **RC 0.1.0-rc.10**.

```text
Objective: Prove Stage 1–3 beta soak + rollback readiness without new Pi features;
           keep payments OFF; keep production Stage 0; distinguish LIVE vs SIMULATED.
Commit/branch: cursor/pi-live-beta-soak-a868
Release version: 0.1.0-rc.10 (unchanged)
Live beta access: NOT AVAILABLE (no aws / kubectl / docker on PATH; no beta API URL/credentials)
```

## 1. Overall verdict

```text
PHASE 15 — VALIDATION READY / LIVE SOAK NOT EXECUTED
```

**Reason:** Repository beta Stage 3 activation (Phase 14) remains intact and fully
validated via health + simulated soak/rollback. This environment has **no live beta
deployment access**, so create-project E2E, live auth exercise, live soak, and live
rollback are:

```text
NOT EXECUTED — NO LIVE BETA ACCESS
```

Simulated soak: **SIMULATED SOAK — PASS**.  
Live soak: **LIVE SOAK — NOT EXECUTED**.  
Live rollback: **LIVE BETA ROLLBACK — NOT EXECUTED**.

Production remains Stage 0. Stage 4 payments remain OFF. Phase 16 was **not** started.

---

## 2. Actual repository / environment audit

| Surface | Status |
|---------|--------|
| `orchestrator/feature_flags/beta.yaml` Stage 3 | present |
| `production.yaml` / `defaults.yaml` Stage 0 | present (unchanged) |
| `overlays/pi-stage3-activation.yaml` | present |
| `scripts/pi-ops-healthcheck.sh` | present |
| `scripts/pi-beta-activation-validate.sh` | present |
| `scripts/aws-deploy.sh` (official EKS helper) | present in repo |
| `aws` binary | **absent** |
| `kubectl` binary | **absent** |
| `docker` binary | **absent** |
| Beta API / app URL / credentials in env | **absent** |
| Cursor cloud linked environment / cluster | **none** |

Authority: actual PATH + env inspection. No invented namespaces, URLs, or credentials.

---

## 3. Live beta access status

```text
NOT EXECUTED — NO LIVE BETA ACCESS
```

Detection mechanism: `detect_live_beta_access()` / `./scripts/pi-live-beta-soak-validate.sh`
(requires `aws` + `kubectl` for live mutate path; both missing).

---

## 4. Beta flag state before testing

```text
pi_knowledge = ON
pi_skills = ON
pi_templates = ON
pi_payments_template = OFF
```

Production / defaults:

```text
pi_knowledge = OFF
pi_skills = OFF
pi_templates = OFF
pi_payments_template = OFF
```

Mechanism: `resolve_flags_for_env("beta"|"production")` + `run_pi_ops_health`.

---

## 5. Knowledge validation

| Check | Status |
|-------|--------|
| Flag `pi_knowledge` ON (beta resolved) | PASS |
| Catalog integrity (12 entries, official URLs, no community elevation) | PASS (static / health) |
| Unsupported claims registry | PASS (static / health) |
| Live beta knowledge UX / HTTP | **NOT EXECUTED — NO LIVE BETA ACCESS** |

---

## 6. Skills validation

| Check | Status |
|-------|--------|
| Flag `pi_skills` ON | PASS |
| Seven skills discoverable in seeds; `is_builtin=false` | PASS |
| `AgentSkillAssignment` still required (checklist) | PASS |
| Not auto-assigned / not auto-executed by flag alone | PASS (architecture) |
| Live beta skill load | **NOT EXECUTED — NO LIVE BETA ACCESS** |

---

## 7. Template validation

| Check | Status |
|-------|--------|
| Flag `pi_templates` ON | PASS |
| Web + Auth starters gated by `pi_templates` | PASS (helpers + seeds) |
| Payments starter seed may exist | PASS (seed present) |
| Payments visibility requires `pi_payments_template` | PASS (`isPiBaseVisible`) |
| `pi_templates=ON` + `pi_payments_template=OFF` ⇒ payments starter hidden | PASS |
| Payment execution activated? | **NO** (flag OFF) |

---

## 8. Create-project E2E result

```text
NOT EXECUTED — NO LIVE BETA ACCESS
```

Static contracts still PASS:

- MarketplaceBase `default_branch` = `base/pi-*` (not `main`/`master`)
- Pipeline uses `base_repo.default_branch`
- Clean-room / orphan-branch gates covered by Phase 9–11 regression suite

---

## 9. Auth validation

```text
NOT EXECUTED — NO LIVE BETA ACCESS
```

Static Auth Starter contracts PASS: Bearer `/v2/me`, token redaction, no OpenSail
`/api/auth/*`, no Stripe coupling, no frontend Server API Key, accessToken not logged.

---

## 10. Payment negative-boundary validation

```text
pi_payments_template = OFF
```

Proved via beta resolve + helpers + Phase 9 payment safety protections
(`_PROTECTED_LOCAL_STATUSES`, `_reconcile_after_platform_error`). No Mainnet.
No real credentials. No fake success states.

---

## 11. Observability / soak result

Mechanism used:

```bash
./scripts/pi-live-beta-soak-validate.sh
python -m app.services.pi_ops_health --env beta
python -m app.services.pi_ops_health --env production
./scripts/pi-ops-healthcheck.sh
```

| Label | Result |
|-------|--------|
| LIVE SOAK — EXECUTED | **no** |
| SIMULATED SOAK — PASS | **yes** |
| LIVE SOAK — NOT EXECUTED | **yes** |

Health output contains flag booleans only — no Pi access tokens / Server API Keys.

---

## 12. Rollback result

```text
LIVE BETA ROLLBACK — NOT EXECUTED
```

Simulated: `simulate_beta_rollback_to_stage0()` → all Pi flags false.
`beta.yaml` left **untouched** (repo remains Stage 3 for operator deploy).

Operator live rollback (when access exists):

1. Remove Pi keys from `beta.yaml` (or set all four false)
2. `./scripts/aws-deploy.sh deploy-k8s beta` (or restart with `deployment_env=beta`)
3. Confirm `GET /api/feature-flags` → Stage 0

---

## 13. Post-rollback result

After **simulated** rollback (in-memory only):

- Production still Stage 0
- `beta.yaml` unchanged (intentional — live rollback not performed)
- Regression suites re-run green (see §15)

---

## 14. Security gate

| Gate | Result |
|------|--------|
| Pi Server API Key | PASS |
| Pi access token hygiene | PASS |
| Frontend secret exposure | PASS |
| Pi ↔ OpenSail auth isolation | PASS |
| Pi ↔ Stripe isolation | PASS |
| Payment completion safety | PASS |
| Undocumented Pi API prevention | PASS |
| Agent credential exposure | PASS |
| Skill assignment boundary | PASS |
| Mainnet safety | PASS (not activated) |
| Rollback safety (simulation) | PASS |

```text
ALL PASS (static / simulated). Live cluster security soak NOT EXECUTED.
```

---

## 15. Regression results

| Suite | Result |
|-------|--------|
| Phase 15 gate | PASS (recorded after run) |
| Phase 14 beta activation | PASS |
| Phase 13 activation | PASS |
| Phase 10–12 / 9 / payment safety / skills / starters | PASS (marketplace matrix) |
| Pi-integration | PASS |
| Frontend Pi UX | PASS |
| Orchestrator full suite | env limitation (`fastapi_users`) if missing |

Exact counts are recorded in the Phase 15 commit / PR after the validation run.

---

## 16. Defects found

```text
P0: none
P1: none
P2: none
P3: live beta soak/rollback unavailable (environment limitation)
```

---

## 17. Files changed

- `packages/tesslate-marketplace/app/services/pi_ops_health.py` (Phase 15 soak package + access detector)
- `packages/tesslate-marketplace/tests/test_pi_phase15_live_beta_soak.py`
- `scripts/pi-live-beta-soak-validate.sh`
- `docs/guides/pi-dev-studio-phase15-live-beta-soak.md`
- `docs/guides/pi-dev-studio-release-manifest.json` (gate list)

---

## 18. Intentionally untouched systems

OpenSail `/api/auth/*`, Stripe, team credits, `tesslate-agent`, agent runner, Redis,
orchestration, Docker/K8s architecture, Phase 1 provenance model, starter runtimes,
`defaults.yaml`, `production.yaml`, Stage 4 payments.

---

## 19. Remaining limitations

- No live beta cluster/API access in this validation environment
- Developer Portal / domain / sandbox / Mainnet remain manual
- Payments starter remains in-memory demo; not Mainnet-ready
- production remains Stage 0 until explicit human approval after a **live** beta soak

---

## 20. Operator next step

```text
1. Deploy Phase 14/15 branch artifacts to the real beta environment
   (deployment_env=beta; Stage 3 flags already in beta.yaml).
2. Execute LIVE soak: feature-flags → knowledge → skills → templates → create-project.
3. Execute LIVE rollback drill to Stage 0; verify gating; restore Stage 3 if desired.
4. Only then consider human-approved production Stage 3 activation.
```

```text
Do not start Phase 16 automatically.
Do not activate production from this phase.
Do not enable pi_payments_template.
production remains Stage 0.
```
