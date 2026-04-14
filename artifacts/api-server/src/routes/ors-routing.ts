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
    options: {
      avoid_polygons: avoid,
    },
  };

  /** Prefer GeoJSON endpoint — returns LineString coordinates (no encoded polyline ambiguity). */
  let res = await orsPost("/v2/directions/driving-car/geojson", baseBody);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("[ORS] GeoJSON directions failed, trying default endpoint:", res.status, errText.slice(0, 300));
    res = await orsPost("/v2/directions/driving-car", { ...baseBody, geometry: true });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      console.warn("[ORS] Invalid API key or forbidden:", res.status, errText.slice(0, 200));
    } else {
      console.warn("[ORS] Directions request failed:", res.status, errText.slice(0, 400));
    }
    return null;
  }

  const raw = (await res.json()) as unknown;
  const parsed = parseOrsDirectionsJson(raw);
  if (!parsed) {
    console.warn("[ORS] Could not parse route geometry from response");
    return null;
  }
  return parsed;
}

type OrsRoutesEnvelope = {
  routes?: Array<{
    summary?: { distance?: number; duration?: number };
    geometry?: unknown;
  }>;
  error?: { code?: number; message?: string };
};

type OrsGeoJsonFc = {
  type?: string;
  features?: Array<{
    geometry?: { type?: string; coordinates?: [number, number][] };
    properties?: { summary?: { distance?: number; duration?: number } };
  }>;
  error?: { message?: string };
};

function parseOrsDirectionsJson(raw: unknown): OsrmCompatibleRoute | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as OrsGeoJsonFc & OrsRoutesEnvelope;

  if (data.error?.message) {
    console.warn("[ORS] Error:", data.error.message);
    return null;
  }

  if (data.type === "FeatureCollection" && Array.isArray(data.features) && data.features.length > 0) {
    const feat =
      data.features.find(f => f.geometry?.type === "LineString" && f.geometry.coordinates?.length) ?? data.features[0];
    const coords = feat?.geometry?.coordinates;
    const summary = feat?.properties?.summary;
    if (coords?.length) {
      return {
        geometry: { type: "LineString", coordinates: coords },
        distance: Number(summary?.distance ?? 0),
        duration: Number(summary?.duration ?? 0),
      };
    }
  }

  const route = data.routes?.[0];
  if (!route) return null;

  const summary = route.summary;
  const distance = Number(summary?.distance ?? 0);
  const duration = Number(summary?.duration ?? 0);

  const geom = route.geometry as unknown;
  let coords: [number, number][] | undefined;
  if (geom && typeof geom === "object" && geom !== null && "coordinates" in geom) {
    const c = (geom as { coordinates: unknown }).coordinates;
    if (Array.isArray(c) && c.length && Array.isArray(c[0])) {
      coords = c as [number, number][];
    }
  } else if (typeof geom === "string" && geom.length > 0) {
    coords = decodeGooglePolylineLngLat(geom);
  }
  if (!coords?.length) return null;

  return {
    geometry: {
      type: "LineString",
      coordinates: coords,
    },
    distance,
    duration,
  };
}

/** ORS returns `geometry` as a Google-encoded polyline string unless GeoJSON is requested; decode to [lng,lat][]. */
function decodeGooglePolylineLngLat(encoded: string): [number, number][] {
  const out: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    out.push([lng / 1e5, lat / 1e5]);
  }
  return out;
}
