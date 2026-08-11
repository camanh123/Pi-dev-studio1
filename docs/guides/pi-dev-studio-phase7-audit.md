# Phase 7 — End-to-End Audit Report

Audit/hardening of the completed Phase 1–6 Pi Dev Studio MVP. No new Pi APIs,
App Studio automation, or OpenSail auth/billing changes.

## Final verdict

```text
PHASE 7 — PASS WITH KNOWN LIMITATIONS
```

## Status by area

| Area | Status |
|------|--------|
| Create Project flow | PASS (after P0 fix) |
| Feature flag flow | PASS |
| MarketplaceBase acquisition | PASS (after P0 fix) |
| Web Starter | PASS |
| Auth Starter | PASS |
| Payments Starter | PASS |
| Skill discovery | PARTIAL (assignment required; by design) |
| load_skill | PASS (after P1 slug match) |
| Provenance chain | PASS |
| Security boundary | PASS |
| Sandbox/Testnet/Mainnet | PASS |
| Project Setup checklist | PASS (after P3 stash clear) |

## Defects found and fixed

| ID | Severity | Defect | Fix |
|----|----------|--------|-----|
| P0 | Broken E2E | Federated `MarketplaceBase` sync dropped `default_branch`, so create-project cloned `main` instead of `base/pi-*` | `resolve_marketplace_base_default_branch()` + sync upsert |
| P1 | Broken E2E | `load_skill` matched display name only; Pi skills cite slugs (`pi-sdk`, …) | `SkillCatalogEntry.slug` + `match_skill_catalog_entry()` |
| P3 | UX correctness | Pi setup checklist session stash never cleared | `clearPiSetupBaseSlug()` on ProjectSetup save/skip |

## Remaining known limitations

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
Phase 1 catalog bodies / Phase 2 skill bodies
```
