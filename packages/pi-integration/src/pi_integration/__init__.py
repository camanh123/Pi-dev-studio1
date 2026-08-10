"""Pi integration package — Phase 1 knowledge corpus only."""

from pi_integration.knowledge import (
    KnowledgeEntry,
    UnsupportedClaim,
    load_catalog,
    load_unsupported_claims,
    validate_corpus,
)

__version__ = "0.1.0"

__all__ = [
    "KnowledgeEntry",
    "UnsupportedClaim",
    "load_catalog",
    "load_unsupported_claims",
    "validate_corpus",
    "__version__",
]
