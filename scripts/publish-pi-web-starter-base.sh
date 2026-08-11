#!/usr/bin/env bash
# Publish bases/pi-web-starter as orphan branch base/pi-web-starter for
# MarketplaceBase git clone acquisition (create-project).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/bases/pi-web-starter"
BRANCH="base/pi-web-starter"
REMOTE="${REMOTE:-origin}"

if [[ ! -d "${SRC}" ]]; then
  echo "missing template source: ${SRC}" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "${TMP}"; }
trap cleanup EXIT

# Build a clean tree with template files at repo root (what create-project clones).
# Prefer rsync when available; otherwise fall back to cp + prune.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude node_modules --exclude dist --exclude .git --exclude __pycache__ \
    --exclude package-lock.json --exclude yarn.lock --exclude pnpm-lock.yaml \
    "${SRC}/" "${TMP}/"
else
  cp -a "${SRC}/." "${TMP}/"
  find "${TMP}" \( -name node_modules -o -name dist -o -name .git -o -name __pycache__ \) \
    -type d -prune -exec rm -rf {} + 2>/dev/null || true
  find "${TMP}" \( -name package-lock.json -o -name yarn.lock -o -name pnpm-lock.yaml \) \
    -type f -delete 2>/dev/null || true
fi

git -C "${TMP}" init -b "${BRANCH}"
git -C "${TMP}" config user.email "noreply@tesslate.local"
git -C "${TMP}" config user.name "Pi Web Starter Publisher"
git -C "${TMP}" add -A
git -C "${TMP}" commit -m "chore: publish Pi Web Starter MarketplaceBase template"

# Fetch remote URL from the monorepo without printing tokens in normal output.
REMOTE_URL="$(git -C "${ROOT}" remote get-url "${REMOTE}")"
git -C "${TMP}" remote add origin "${REMOTE_URL}"
git -C "${TMP}" push -f origin "HEAD:refs/heads/${BRANCH}"

echo "Published ${BRANCH} from ${SRC}"
