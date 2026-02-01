#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(pwd)"
OUT_DIR="${1:-dist-runtime}"

VERSION="$(node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json','utf8')); console.log(pkg.version)")"

if [ ! -d "dist/cli" ]; then
  echo "dist/cli not found. Run pnpm build first." >&2
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "node_modules not found. Run pnpm install first." >&2
  exit 1
fi

if [ "${CITEPO_SKIP_PNPM_PRUNE:-}" != "true" ]; then
  pnpm prune --prod
fi

STAGE_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

mkdir -p "$STAGE_DIR/citepo-cli/src"

cp -a dist package.json node_modules "$STAGE_DIR/citepo-cli/"

cp -a src/astro-project \
  src/engine \
  src/theme \
  src/ui \
  src/mdx-components \
  src/scaffold \
  "$STAGE_DIR/citepo-cli/src/"

mkdir -p "$OUT_DIR"

ARCHIVE_NAME="citepo-cli-${VERSION}.tar.gz"
tar -czf "${OUT_DIR}/${ARCHIVE_NAME}" -C "$STAGE_DIR" citepo-cli

sha256sum "${OUT_DIR}/${ARCHIVE_NAME}" > "${OUT_DIR}/${ARCHIVE_NAME}.sha256"

echo "runtime package: ${OUT_DIR}/${ARCHIVE_NAME}"
