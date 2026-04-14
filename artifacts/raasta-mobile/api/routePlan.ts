import { getApiOrigin } from "@/constants/apiOrigin";

/** Mirrors OpenAPI `RoutePlanRequest`. */
export type RoutePlanRequest = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
};

export type RouteConflict = {
  id: number;
  title: string;
  type: string;
  severity: string;
  lat: number;
  lng: number;
};

export type RouteSegment = {
  geometry: { type: "LineString"; coordinates: number[][] };
  distanceMeters: number;
  durationSeconds: number;
  conflicts: RouteConflict[];
};

/** Mirrors OpenAPI `RoutePlanResponse.routingBackend`. */
export type RoutePlanRoutingBackend = "openrouteservice" | "osrm";

export type RoutePlanResponse = {
  primary: RouteSegment;
  recommended: RouteSegment;
  recommendedIsAlternative: boolean;
  routingBackend: RoutePlanRoutingBackend;
  /** Hazards between start & destination along the direct corridor — consider an alternative road. */
  betweenEndpointsAlert?: string;
  textSuggestions?: string[];
};

export async function planRoute(body: RoutePlanRequest): Promise<RoutePlanResponse> {
  const base = getApiOrigin().replace(/\/+$/, "");
  const res = await fetch(`${base}/api/routes/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, application/problem+json",
    },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as RoutePlanResponse;
}
