#!/usr/bin/env bash
# Phase 15 — live beta soak package (labels LIVE vs SIMULATED; never fakes soak).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONPATH="${ROOT}/packages/tesslate-marketplace${PYTHONPATH:+:$PYTHONPATH}"
cd "${ROOT}/packages/tesslate-marketplace"
exec python3 -m app.services.pi_ops_health --phase15-soak
