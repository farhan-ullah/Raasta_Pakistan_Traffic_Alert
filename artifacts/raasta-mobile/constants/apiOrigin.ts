/**
 * API origin for the Raasta app.
 *
 * - Local: set `EXPO_PUBLIC_API_ORIGIN` (e.g. `http://localhost:5000`, or
 *   `http://10.0.2.2:5000` for Android emulator → host machine).
 * - Hosted (Replit/production): set `EXPO_PUBLIC_DOMAIN` (hostname only); requests use `https`.
 */
export function getApiOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_API_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!domain) {
    throw new Error(
      "Set EXPO_PUBLIC_API_ORIGIN (local dev) or EXPO_PUBLIC_DOMAIN (hosted build) for API calls.",
    );
  }
  return `https://${domain}`;
}
