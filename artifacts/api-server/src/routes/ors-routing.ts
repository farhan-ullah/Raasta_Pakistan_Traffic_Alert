/**
 * OpenRouteService (ORS) directions with options.avoid_polygons — actually excludes
 * those areas from the driving graph (unlike OSRM-only via points).
 *
 * Requires OPENROUTESERVICE_API_KEY (free tier: https://openrouteservice.org/dev/#/signup).
 */
import type { incidentsTable } from "@workspace/db";
import { normalizeIncidentType, orsAvoidRadiusMeters } from "./incident-zones";

const ORS_BASE = process.env["OPENROUTESERVICE_BASE_URL"]?.replace(/\/+$/, "") ?? "https://api.openrouteservice.org";
const ORS_KEY = process.env["OPENROUTESERVICE_API_KEY"]?.trim();
const ORS_TIMEOUT_MS = Number(process.env["OPENROUTESERVICE_TIMEOUT_MS"] ?? 25_000);
/** Max hazard circles to send (ORS request size / solver limits). */
const MAX_AVOID_POLYGONS = Number(process.env["ORS_MAX_AVOID_POLYGONS"] ?? 8);

const METERS_PER_DEG_LAT = 111_320;

function metersPerDegLng(lat: number): number {
  return 111_320 * Math.cos((lat * Math.PI) / 180);
}

/** Approximate circle as a closed ring [lng,lat] for GeoJSON. */
function circleRingLngLat(lat: number, lng: number, radiusM: number, points = 18): [number, number][] {
  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const theta = (2 * Math.PI * i) / points;
    const dn = radiusM * Math.cos(theta);
    const de = radiusM * Math.sin(theta);
    const pLat = lat + dn / METERS_PER_DEG_LAT;
    const pLng = lng + de / metersPerDegLng(lat);
    ring.push([pLng, pLat]);
  }
  return ring;
}

function conflictWeightHint(inc: { type: string; severity: string }): number {
  const sev = (inc.severity || "medium").toLowerCase();
  let w = 40;
  if (sev === "critical") w = 120;
  else if (sev === "high") w = 90;
  else if (sev === "medium") w = 55;
  const t = normalizeIncidentType(inc.type);
  if (t === "blockage" || t === "vip_movement") w += 25;
  return w;
}

export type OsrmCompatibleRoute = {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance: number;
  duration: number;
};

type IncidentRow = typeof incidentsTable.$inferSelect;

/** RFC 7946 MultiPolygon geometry (ORS `options.avoid_polygons`). */
type AvoidMultiPolygon = {
  type: "MultiPolygon";
  coordinates: [number, number][][][];
};

function buildAvoidMultiPolygon(incidents: IncidentRow[]): AvoidMultiPolygon | null {
  const sorted = [...incidents].sort((a, b) => conflictWeightHint(b) - conflictWeightHint(a));
  const picked = sorted.slice(0, MAX_AVOID_POLYGONS);
  if (picked.length === 0) return null;

  const coordinates: [number, number][][][] = [];
  for (const inc of picked) {
    const r = orsAvoidRadiusMeters(inc);
    const ring = circleRingLngLat(inc.lat, inc.lng, r, 18);
    coordinates.push([ring]);
  }
  return { type: "MultiPolygon", coordinates };
}

async function orsPost(path: string, body: unknown): Promise<Response> {
  const url = `${ORS_BASE}${path}`;
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ORS_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ORS_KEY}`,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Returns a route that **avoids** blocked areas, or `null` if ORS is not configured / failed.
 */
export async function fetchOrsRouteWithAvoidPolygons(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  incidents: IncidentRow[],
): Promise<OsrmCompatibleRoute | null> {
  if (!ORS_KEY) return null;

  const avoid = buildAvoidMultiPolygon(incidents);
  if (!avoid) return null;
  const baseBody = {
    coordinates: [
      [fromLng, fromLat],
      [toLng, toLat],
    ] as [number, number][],
    preference: "recommended",
    units: "m",
    geometry: true,
    geometry_format: "geojson",
    options: {
      avoid_polygons: avoid,
    },
  };

  const res = await orsPost("/v2/directions/driving-car", baseBody);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      console.warn("[ORS] Invalid API key or forbidden:", res.status, errText.slice(0, 200));
    } else {
      console.warn("[ORS] Directions request failed:", res.status, errText.slice(0, 400));
    }
    return null;
  }

  const data = (await res.json()) as {
    routes?: Array<{
      summary?: { distance?: number; duration?: number };
      geometry?: { type?: string; coordinates?: [number, number][] };
    }>;
    error?: { code?: number; message?: string };
  };

  if (data.error?.message) {
    console.warn("[ORS] Error:", data.error.message);
    return null;
  }

  const route = data.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (!route || !coords?.length) return null;

  const summary = route.summary;
  const distance = Number(summary?.distance ?? 0);
  const duration = Number(summary?.duration ?? 0);

  return {
    geometry: {
      type: "LineString",
      coordinates: coords as [number, number][],
    },
    distance,
    duration,
  };
}
