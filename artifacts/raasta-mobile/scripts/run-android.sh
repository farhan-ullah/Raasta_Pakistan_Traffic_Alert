#!/usr/bin/env bash
# Monorepo: always install from the workspace root first. Expo's inner `pnpm install`
# can fail if package.json was edited by prebuild or if only a nested install is run.
set -euo pipefail
MOBILE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$MOBILE/../.." && pwd)"
cd "$ROOT"
npx --yes pnpm@9.15.0 install
cd "$MOBILE"
export EXPO_PUBLIC_API_ORIGIN="${EXPO_PUBLIC_API_ORIGIN:-http://127.0.0.1:3000}"

# Gradle needs the Android SDK. Prefer ANDROID_HOME; else default Mac Studio path.
if [[ -z "${ANDROID_HOME:-}" ]]; then
  if [[ -d "${HOME}/Library/Android/sdk" ]]; then
    export ANDROID_HOME="${HOME}/Library/Android/sdk"
  fi
fi
if [[ -n "${ANDROID_HOME:-}" ]] && [[ -d "$MOBILE/android" ]]; then
  echo "sdk.dir=${ANDROID_HOME}" > "$MOBILE/android/local.properties"
fi

exec npx expo run:android "$@"
