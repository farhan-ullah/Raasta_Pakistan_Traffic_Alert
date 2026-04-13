#!/usr/bin/env bash
# LAN dev server for physical devices. Prints a manual Expo Go URL because some
# terminals (e.g. embedded IDE) do not render the ASCII QR until you press "c".
set -euo pipefail
MOBILE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$MOBILE"

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")"
export EXPO_PUBLIC_API_ORIGIN="http://${IP}:3000"
METRO_PORT="${METRO_PORT:-8081}"

echo "EXPO_PUBLIC_API_ORIGIN=${EXPO_PUBLIC_API_ORIGIN}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  QR code missing in this window?"
echo "    • With Expo running, press  c  in this terminal → show QR"
echo "    • Or open Terminal.app / iTerm here (embedded terminals often hide QR)"
echo ""
echo "  Expo Go → \"Enter URL manually\":"
echo "    exp://${IP}:${METRO_PORT}"
echo ""
echo "  Dev UI in browser: http://localhost:${METRO_PORT}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec pnpm exec expo start --lan --port "${METRO_PORT}"
