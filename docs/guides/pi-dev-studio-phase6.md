# Pi Dev Studio — Phase 6 (Feature Flags + Wizard UX)

Additive OpenSail UX for discovering Pi MarketplaceBases / skills and guiding
manual Developer Portal setup. Does **not** invent Pi APIs, automate App Studio,
or change OpenSail authentication / Stripe billing.

## Feature flags

Uses the existing YAML feature-flag system in `orchestrator/feature_flags/`
(served by `GET /api/feature-flags`). No second flag system.

| Phase 0.5 proposal | Repository flag | Default | Controls |
|--------------------|-----------------|---------|----------|
| `pi.knowledge` | `pi_knowledge` | `false` | Knowledge / provenance notes in Pi UX |
| `pi.skills` | `pi_skills` | `false` | Pi skills in marketplace discovery |
| `pi.templates` | `pi_templates` | `false` | `pi-web-starter` + `pi-auth-starter` visibility / create-flow featured tiles |
| `pi.payments_template` | `pi_payments_template` | `false` | `pi-payments-starter` visibility / create-flow featured tile |

Enable per environment by overriding in `orchestrator/feature_flags/{env}.yaml`.

## Pi starters (MarketplaceBase — authoritative seeds)

| Name | Slug |
|------|------|
| Pi Web Starter | `pi-web-starter` |
| Pi Auth Starter | `pi-auth-starter` |
| Pi Payments Starter | `pi-payments-starter` |

Seeded in `packages/tesslate-marketplace/app/seeds/bases.json`. Create-project
still uses the normal git-clone MarketplaceBase path.

## Skills

`pi-sdk`, `pi-auth`, `pi-platform-api`, `pi-payments`, `pi-developer-portal`,
`pi-browser`, `pi-compliance` (seeded in `skills_pi.json`).

## UX surfaces

- **Create workspace modal** — featured Pi starters when flags allow; inline
  Pi setup checklist when a Pi starter is selected.
- **Project setup page** — checklist continues after create (session stash).
- **Marketplace browse / home** — Pi bases/skills filtered by flags.
- **Marketplace detail** — boundary / payment safety panel for Pi items.

## Important boundaries

```text
Pi identity        ≠ OpenSail identity
Pi payments        ≠ OpenSail billing (Stripe / Team credits)
SDK sandbox        ≠ Developer Portal Testnet / Mainnet
OpenSail deployment / preview ≠ Pi Browser / Portal network
```

Four environment concepts are never collapsed into one toggle:

1. OpenSail preview / deployment mode
2. Pi SDK sandbox flag
3. Developer Portal app network
4. Payment DTO network

## Manual operations (unchanged)

- Developer Portal registration — manual
- Domain validation — manual
- Sandbox authorization / Pi Browser testing — manual
- Mainnet transition — human review
- No App Studio API automation in this MVP
