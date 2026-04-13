/** Default deployed API (no trailing slash). Overridden by env in `.env.development` / `.env.production`. */
const DEFAULT_API_ORIGIN = "http://5.189.173.244:8090";

/**
 * API origin for the Raasta app.
 *
 * - **Env:** `EXPO_PUBLIC_API_ORIGIN` (full URL) or `EXPO_PUBLIC_DOMAIN` (hostname → `https://…`).
 * - **Files:** `.env.development` (local `expo start`) and `.env.production` (release / EAS) — see repo.
 * - If unset, falls back to {@link DEFAULT_API_ORIGIN}.
 */
export function getApiOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_API_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) {
    return `https://${domain}`;
  }
  return DEFAULT_API_ORIGIN;
}
