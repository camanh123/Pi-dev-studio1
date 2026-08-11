#!/usr/bin/env bash
# Dry-run validate Stage 3 activation overlay (does NOT modify production.yaml).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONPATH="${ROOT}/packages/tesslate-marketplace${PYTHONPATH:+:$PYTHONPATH}"
cd "${ROOT}/packages/tesslate-marketplace"
exec python3 -m app.services.pi_ops_health --env production --simulate-stage3
