#!/usr/bin/env bash
# Pi Dev Studio Phase 12 operational healthcheck (no Mainnet / no credentials).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONPATH="${ROOT}/packages/tesslate-marketplace${PYTHONPATH:+:$PYTHONPATH}"
cd "${ROOT}/packages/tesslate-marketplace"
exec python3 -m app.services.pi_ops_health
