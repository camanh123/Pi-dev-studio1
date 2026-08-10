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
marketplace skill seeds (Phase 2)
        ↓
load_skill progressive disclosure
        ↓
AI agent (unchanged runner)
```

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
