# Phase 9 — Production Hardening & Real Developer Workflow

Phase 9 hardens the Phase 8 MVP without expanding Pi API scope.

## Final verdict

```text
PHASE 9 — PASS WITH KNOWN LIMITATIONS
```

## Developer workflow validated

```text
Create Pi Project
→ Select Pi Starter
→ Project Setup
→ Pi Setup Checklist
→ Marketplace / Skills (AgentSkillAssignment)
→ AI Agent (load_skill)
→ Generate / modify Pi code
→ Build
→ Validate security
→ Clean-room reproducibility
```

## Automated vs manual vs unsupported

### Automated (OpenSail-assisted)

- Project creation from Pi MarketplaceBases
- Starter acquisition via seeded `default_branch` orphan branches
- Skill discovery / `load_skill` after AgentSkillAssignment
- Code generation guidance from Phase 1–2 corpus + skills
- Frontend build / contract tests / clean-room archive checks

### Manual (developer / Developer Portal)

- Developer Portal registration
- Application / development URL configuration
- Domain validation when required
- Sandbox authorization / Pi Browser verification
- Testnet verification
- Mainnet transition + human production review

### Unsupported (out of scope)

- App Studio automation / auto publishing
- Wallet custody / wallet balance-history APIs
- Refunds, recurring billing, webhooks
- Undocumented Pi endpoints
- Pi → OpenSail authentication
- Pi → Stripe / Team credits replacement
- A2U Mainnet implementation

## Feature flags

Registered YAML names (default OFF, public):

```text
pi_knowledge
pi_skills
pi_templates
pi_payments_template
```

Do not use dotted proposal names (`pi.knowledge`, …) as registered keys.

## Skill assignment

Pi skills remain `is_builtin: false`. Creating a Pi starter does **not** auto-assign skills.

The Pi Setup Checklist lists recommended skill slugs and directs developers to:

```text
Marketplace → Skills → purchase → install on project agent (AgentSkillAssignment)
```

## Payment state

Payments Starter keeps in-memory local payment records (demo limitation).

Phase 9 fix: Platform non-2xx approve/complete responses reconcile via GET and must not downgrade a prior local `approved` / `completed` status. Frontend callbacks alone never mark success.

## Environment concepts (never collapse)

```text
OpenSail preview
≠ Pi SDK sandbox
≠ Developer Portal Testnet/Mainnet
≠ Payment DTO network
```

## Intentionally untouched

```text
tesslate-agent
agent runner / Redis / worker queue
OpenSail /api/auth/*
Stripe / Team credits
orchestration factory / Docker / K8s
Phase 1 provenance model
package-manager dual-lock policy
```

## Related docs

- [Phase 6 wizard](./pi-dev-studio-phase6.md)
- [Phase 7 audit](./pi-dev-studio-phase7-audit.md)
- [Phase 8 release](./pi-dev-studio-phase8-release.md)
- [packages/pi-integration/README.md](../../packages/pi-integration/README.md)
