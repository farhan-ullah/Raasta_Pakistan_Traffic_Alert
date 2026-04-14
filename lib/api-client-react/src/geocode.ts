import { customFetch } from "./custom-fetch";

export type GeocodePlace = {
  id: string;
  label: string;
  fullName: string;
  state: string | null;
  area: string | null;
  lat: number;
  lng: number;
};

/** Default route start (point A): device GPS. Same id/coords until refreshed or user picks another place. */
export function currentLocationPlace(lat: number, lng: number): GeocodePlace {
  return {
    id: "current-location",
    label: "Current location",
    fullName: "Your current location",
    state: null,
    area: null,
    lat,
    lng,
  };
}

/**
 * Map-style place search (server proxies OpenStreetMap Photon). Requires API
 * base URL via relative `/api/...` (Vite proxy) or `setBaseUrl()` on native.
 */
export async function fetchGeocodeSearch(query: string): Promise<GeocodePlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  return customFetch<GeocodePlace[]>(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
    responseType: "json",
  });
}
