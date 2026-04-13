#!/usr/bin/env bash
# Stream JS + API debug lines from the device. Run from artifacts/raasta-mobile: npm run android:log
#
# [API] lines appear when:
#   - Debug/dev build (__DEV__) — no extra env, or
#   - Release bundle built with EXPO_PUBLIC_API_DEBUG=1 in .env at bundle time.
#
# zsh: quote '*:S' — use this script or: adb logcat '*:S' 'ReactNativeJS:W'
set -euo pipefail
echo "Streaming logcat (ReactNativeJS + errors). Ctrl+C to stop." >&2
echo "Tip: Release APK only shows [API] if you set EXPO_PUBLIC_API_DEBUG=1 before building." >&2
# *:S = silence default; ReactNativeJS:I = Info+ (includes console.warn → [API])
exec adb logcat \
  '*:S' \
  'ReactNativeJS:I' \
  'AndroidRuntime:E' \
  2>/dev/null | grep --line-buffered -E '\[API\]|ReactNativeJS|AndroidRuntime|FATAL|ApiError|network|fetch'
