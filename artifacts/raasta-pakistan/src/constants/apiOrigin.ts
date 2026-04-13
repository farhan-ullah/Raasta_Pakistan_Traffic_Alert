/**
 * API origin for the Vite app.
 *
 * - **Production:** `VITE_PUBLIC_API_ORIGIN` in `.env.production` (e.g. `http://host:8090`, no trailing slash).
 * - **Local dev:** Leave unset to use same-origin `/api` paths; Vite proxies `/api` to your local backend (`vite.config.ts`).
 */
export function getWebApiOrigin(): string {
  const explicit = import.meta.env.VITE_PUBLIC_API_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  return import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
}
