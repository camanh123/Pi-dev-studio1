"""Load and validate the Phase 1 Pi knowledge corpus from package data."""

from __future__ import annotations

import json
from importlib import resources
from pathlib import Path

from pi_integration.knowledge.schema import (
    DocClass,
    KnowledgeCatalogFile,
    KnowledgeEntry,
    UnsupportedClaim,
    UnsupportedClaimsFile,
)

_PKG = "pi_integration.knowledge"


def _read_json(name: str) -> dict:
    """Read a JSON resource shipped with the package (or adjacent for editable installs)."""
    try:
        root = resources.files(_PKG)
        data = root.joinpath(name).read_text(encoding="utf-8")
        return json.loads(data)
    except (FileNotFoundError, TypeError, ModuleNotFoundError):
        # Editable / source-tree fallback
        path = Path(__file__).resolve().parent / name
        return json.loads(path.read_text(encoding="utf-8"))


def load_catalog() -> list[KnowledgeEntry]:
    """Return validated knowledge entries from catalog.json."""
    raw = _read_json("catalog.json")
    catalog = KnowledgeCatalogFile.model_validate(raw)
    return catalog.entries


def load_unsupported_claims() -> list[UnsupportedClaim]:
    """Return validated unsupported/unknown claim registry entries."""
    raw = _read_json("unsupported_claims.json")
    registry = UnsupportedClaimsFile.model_validate(raw)
    return registry.claims


def validate_corpus() -> None:
    """Raise ``ValueError`` if catalog or claims registry integrity checks fail."""
    entries = load_catalog()
    claims = load_unsupported_claims()

    entry_ids = [e.id for e in entries]
    if len(entry_ids) != len(set(entry_ids)):
        dupes = sorted({i for i in entry_ids if entry_ids.count(i) > 1})
        raise ValueError(f"duplicate knowledge entry ids: {dupes}")

    source_urls = [str(e.source_url) for e in entries]
    if len(source_urls) != len(set(source_urls)):
        dupes = sorted({u for u in source_urls if source_urls.count(u) > 1})
        raise ValueError(f"duplicate knowledge source_url values: {dupes}")

    for entry in entries:
        if entry.doc_class == DocClass.NORMATIVE_API and entry.community:
            raise ValueError(
                f"normative-api entry '{entry.id}' must have community=false"
            )

    claim_ids = [c.id for c in claims]
    if len(claim_ids) != len(set(claim_ids)):
        dupes = sorted({i for i in claim_ids if claim_ids.count(i) > 1})
        raise ValueError(f"duplicate unsupported claim ids: {dupes}")
