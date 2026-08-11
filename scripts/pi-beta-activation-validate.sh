#!/usr/bin/env bash
# Phase 14 — validate beta Stage 3 activation (no live cluster mutation).
# Proves beta ON / production Stage 0 / payments OFF + simulated rollback.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONPATH="${ROOT}/packages/tesslate-marketplace${PYTHONPATH:+:$PYTHONPATH}"
cd "${ROOT}/packages/tesslate-marketplace"
exec python3 -m app.services.pi_ops_health --env beta --simulate-beta-rollback
