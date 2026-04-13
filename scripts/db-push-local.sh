#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f "$ROOT/.env.local" ]]; then
  echo "Missing .env.local — copy env.local.example to .env.local and set DATABASE_URL." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$ROOT/.env.local"
set +a
exec pnpm run db:push
