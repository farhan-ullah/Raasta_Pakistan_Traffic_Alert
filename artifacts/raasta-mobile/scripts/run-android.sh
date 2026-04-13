#!/usr/bin/env bash
# Monorepo: always install from the workspace root first. Expo's inner `pnpm install`
# can fail if package.json was edited by prebuild or if only a nested install is run.
#
# For release on a **physical device**, pass `--no-bundler` (see package "android:release").
# Otherwise Metro runs on your PC while the APK looks for the bundle at the phone's
# localhost:8081 → instant crash / app closes. Release APKs already embed JS; they do not need Metro.
set -euo pipefail
MOBILE="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$MOBILE/../.." && pwd)"
cd "$ROOT"
npx --yes pnpm@9.15.0 install
cd "$MOBILE"

# Release builds: load server URLs from .env.production (EXPO_PUBLIC_*), unless already exported.
if [[ "$*" == *--variant*release* ]] || [[ "$*" == *Release* ]]; then
  if [[ -f "$MOBILE/.env.production" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$MOBILE/.env.production"
    set +a
    echo "[android] Using EXPO_PUBLIC_* from .env.production (release / server APIs)"
  fi
fi

export EXPO_PUBLIC_API_ORIGIN="${EXPO_PUBLIC_API_ORIGIN:-http://127.0.0.1:3000}"
if [[ -n "${EXPO_PUBLIC_API_ORIGIN:-}" ]]; then
  echo "[android] EXPO_PUBLIC_API_ORIGIN=$EXPO_PUBLIC_API_ORIGIN"
fi

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
