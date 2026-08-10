# Phase 7 — End-to-End Audit Report

Audit/hardening of Phases 1–6. No new Pi features.

## Verdict

```text
PHASE 7 — PASS WITH KNOWN LIMITATIONS
```

## Defects found and fixed

| ID | Severity | Defect | Fix |
|----|----------|--------|-----|
| P0 | Security / broken E2E | Federated MarketplaceBase sync dropped `default_branch`, so create-project cloned `main` instead of `base/pi-*` | `marketplace_sync._upsert_marketplace_base` now reads `default_branch` from item or version manifest |
| P1 | Broken E2E | `load_skill` matched display name only; Pi skill bodies instruct slug keys (`pi-sdk`, …) | `SkillCatalogEntry.slug` + slug-or-name matching in `load_skill` |
| P3 | UX correctness | Pi setup checklist session stash never cleared | `clearPiSetupBaseSlug()` on ProjectSetup save/skip |

## Remaining known limitations (unchanged MVP scope)

```text
Developer Portal remains manual
Domain validation remains manual
Sandbox authorization remains manual
Mainnet transition requires human review
No App Studio API automation
No automatic Pi publishing
No wallet APIs / refunds / recurring / webhooks / A2U
Pi skills require AgentSkillAssignment (not auto-builtin)
Feature flags default OFF
```

## Intentionally NOT changed

```text
tesslate-agent
agent runner / Redis protocol
OpenSail authentication / OAuth
Stripe / Team credits
orchestration / Docker / K8s
Pi starter runtime implementations (Phases 3–5)
Phase 1 catalog / Phase 2 skill bodies
```
