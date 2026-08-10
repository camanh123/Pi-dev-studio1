# pi-integration

Source-verified **Pi Network knowledge corpus** and provenance catalog for Pi Dev Studio.

## Phase 1 scope

This package currently provides:

- Machine-readable knowledge entry schema (`KnowledgeEntry`)
- Official Pi source catalog (`knowledge/catalog.json`)
- Unsupported / unknown claim registry (`knowledge/unsupported_claims.json`)
- Validation helpers and tests

It does **not** implement Pi authentication, payments, templates, skills, App Studio APIs, or OpenSail platform changes.

## Layout

```text
packages/pi-integration/
├── pyproject.toml
├── README.md
├── src/pi_integration/
│   ├── __init__.py
│   └── knowledge/
│       ├── __init__.py
│       ├── schema.py
│       ├── loader.py
│       ├── catalog.json
│       └── unsupported_claims.json
└── tests/
    └── test_knowledge_catalog.py
```

## Migration path (later phases)

```text
packages/pi-integration/knowledge/
        ↓
marketplace skill seeds (Phase 2: packages/tesslate-marketplace/app/seeds/skills_pi.json)
        ↓
load_skill progressive disclosure
        ↓
AI agent (unchanged runner)
```

Phase 2 Pi skills (`pi-sdk`, `pi-auth`, `pi-platform-api`, `pi-payments`,
`pi-developer-portal`, `pi-browser`, `pi-compliance`) cite catalog entry IDs
from this package. Do not treat skill bodies as a second provenance authority.

Phase 3 MarketplaceBase `pi-web-starter` (`bases/pi-web-starter/`) consumes the
same verified SDK facts (CDN + `Pi.init` 2.0) without embedding this package at
runtime in generated projects.

Phase 4 MarketplaceBase `pi-auth-starter` (`bases/pi-auth-starter/`) adds
generated-app `Pi.authenticate` + backend `GET /v2/me` verification from this
catalog. It does not modify OpenSail platform authentication.

Phase 5 MarketplaceBase `pi-payments-starter` (`bases/pi-payments-starter/`)
adds generated-app U2A payments (`Pi.createPayment` + `/approve` + `/complete`)
from this catalog. It does not replace OpenSail Stripe / Team credits billing.

Phase 6 adds OpenSail feature-flag gated discovery + project wizard/checklist UX
(`pi_knowledge`, `pi_skills`, `pi_templates`, `pi_payments_template` in
`orchestrator/feature_flags/`). This package remains the provenance authority;
Phase 6 does not invent Portal/App Studio APIs. See
`docs/guides/pi-dev-studio-phase6.md`.

Phase 7–8 harden create-project branch sync / skill slug loading and document
the production release gate (`docs/guides/pi-dev-studio-phase8-release.md`).

## Usage

```python
from pi_integration.knowledge import load_catalog, load_unsupported_claims, validate_corpus

catalog = load_catalog()
claims = load_unsupported_claims()
validate_corpus()  # raises on schema / integrity errors
```

## Authority rule

Only official Pi sources may be `community: false` with `doc_class: normative-api`.

Community material must never be treated as normative Pi API authority.

## Official API allowlist (Phase 0.4)

- Frontend SDK artifact: `https://sdk.minepi.com/pi-sdk.js`
- Platform API base: `https://api.minepi.com/v2`

Do not invent additional hosts, versions, or undocumented routes.
