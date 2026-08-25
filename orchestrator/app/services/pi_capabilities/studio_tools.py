"""Studio *tooling* availability — not Pi Network capability implementation.

``CapabilityRecord.studio_status`` answers whether Pi Dev Studio has
implemented a Pi Network capability (auth, U2A payments, A2U, …).

This module answers a different question: which Pi Dev Studio
infrastructure tools the agent can call. The capability-check guard is
Studio infrastructure. It does **not** change any capability's
``studio_status``; those remain ``NOT_IMPLEMENTED`` until a later phase
adds a real generator/integration.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class StudioToolAvailability(StrEnum):
    AVAILABLE = "AVAILABLE"
    PLANNED = "PLANNED"


@dataclass(frozen=True)
class StudioToolRecord:
    public_name: str
    registry_name: str
    availability: StudioToolAvailability
    notes: str


STUDIO_PI_TOOLS: tuple[StudioToolRecord, ...] = (
    StudioToolRecord(
        public_name="pi.capability_check",
        registry_name="pi_capability_check",
        availability=StudioToolAvailability.AVAILABLE,
        notes=(
            "Read-only guard that queries the Phase 2 capability registry. "
            "Does not authenticate users, transfer Pi, access wallets, or call Pi APIs."
        ),
    ),
)
