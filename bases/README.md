# Marketplace base sources (monorepo)

Official MarketplaceBases are registered in
`packages/tesslate-marketplace/app/seeds/bases.json` and acquired by
create-project via `git clone` of `git_repo_url`.

## Pi Web Starter

| Field | Value |
|-------|-------|
| Slug | `pi-web-starter` |
| In-repo source | `bases/pi-web-starter/` |
| Clone branch | `base/pi-web-starter` |

```bash
./scripts/publish-pi-web-starter-base.sh
```

## Pi Auth Starter

| Field | Value |
|-------|-------|
| Slug | `pi-auth-starter` |
| In-repo source | `bases/pi-auth-starter/` |
| Clone branch | `base/pi-auth-starter` |

```bash
./scripts/publish-pi-auth-starter-base.sh
```

## Pi Payments Starter

| Field | Value |
|-------|-------|
| Slug | `pi-payments-starter` |
| In-repo source | `bases/pi-payments-starter/` |
| Clone URL | `https://github.com/camanh123/Pi-dev-studio1.git` |
| Clone branch | `base/pi-payments-starter` |

```bash
./scripts/publish-pi-payments-starter-base.sh
```

Extends Auth Starter with generated-app U2A payments (`Pi.createPayment` +
server approve/complete). Not OpenSail Stripe billing. A2U/refunds/webhooks
out of scope.

All Pi bases share clone URL `https://github.com/camanh123/Pi-dev-studio1.git`
and keep the existing MarketplaceBase git-acquisition path.

## Phase 6 — discovery / wizard UX

OpenSail surfaces these bases in create-flow and marketplace when YAML feature
flags are enabled (`pi_templates`, `pi_payments_template`). See
[docs/guides/pi-dev-studio-phase6.md](../docs/guides/pi-dev-studio-phase6.md).

Boundaries remain:

```text
Pi identity ≠ OpenSail identity
Pi payments ≠ OpenSail billing
sandbox ≠ Portal network
OpenSail deployment ≠ Pi network
```

Developer Portal registration, domain validation, sandbox authorization, and
Mainnet transition remain manual. No App Studio automation.
