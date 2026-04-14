/**
 * OpenRouteService (ORS) directions with options.avoid_polygons — actually excludes
 * those areas from the driving graph (unlike OSRM-only via points).
 *
 * Requires OPENROUTESERVICE_API_KEY (free tier: https://openrouteservice.org/dev/#/signup).
 */
import type { incidentsTable } from "@workspace/db";
import { normalizeIncidentType, orsAvoidRadiusMeters } from "./incident-zones";

const ORS_BASE = process.env["OPENROUTESERVICE_BASE_URL"]?.replace(/\/+$/, "") ?? "https://api.openrouteservice.org";
const ORS_TIMEOUT_MS = Number(process.env["OPENROUTESERVICE_TIMEOUT_MS"] ?? 25_000);

function orsApiKey(): string | undefined {
  return process.env["OPENROUTESERVICE_API_KEY"]?.trim();
}
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

/** `maxPolygons` = how many highest-priority incidents to buffer (capped by {@link MAX_AVOID_POLYGONS}). */
function buildAvoidMultiPolygon(incidents: IncidentRow[], maxPolygons: number): AvoidMultiPolygon | null {
  if (maxPolygons <= 0) return null;
  const sorted = [...incidents].sort((a, b) => conflictWeightHint(b) - conflictWeightHint(a));
  const picked = sorted.slice(0, Math.min(maxPolygons, MAX_AVOID_POLYGONS));
  if (picked.length === 0) return null;

  const coordinates: [number, number][][][] = [];
  for (const inc of picked) {
    const r = orsAvoidRadiusMeters(inc);
    const ring = circleRingLngLat(inc.lat, inc.lng, r, 18);
    coordinates.push([ring]);
  }
  return { type: "MultiPolygon", coordinates };
}

async function orsPost(path: string, body: unknown, apiKey: string): Promise<Response> {
  const url = `${ORS_BASE}${path}`;
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ORS_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

async function executeOrsDirections(
  baseBody: {
    coordinates: [number, number][];
    preference: string;
    units: string;
    options?: { avoid_polygons: AvoidMultiPolygon };
  },
  apiKey: string,
): Promise<OsrmCompatibleRoute | null> {
  let res = await orsPost("/v2/directions/driving-car/geojson", baseBody, apiKey);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("[ORS] GeoJSON directions failed, trying default endpoint:", res.status, errText.slice(0, 300));
    res = await orsPost("/v2/directions/driving-car", { ...baseBody, geometry: true }, apiKey);
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

  let raw: unknown;
  try {
    raw = await res.json();
  } catch (e) {
    console.warn("[ORS] Response was not JSON:", e);
    return null;
  }
  const parsed = parseOrsDirectionsJson(raw);
  if (!parsed) {
    const snippet =
      typeof raw === "object" && raw !== null
        ? JSON.stringify(raw).slice(0, 900)
        : String(raw).slice(0, 200);
    console.warn("[ORS] Could not parse route geometry. Response snippet:", snippet);
    return null;
  }
  return parsed;
}

export type OrsFetchResult = {
  route: OsrmCompatibleRoute | null;
  /** `no_key` = OPENROUTESERVICE_API_KEY missing; `failed` = ORS returned errors / no route for all caps. */
  orsStatus: "ok" | "no_key" | "failed";
};

/**
 * Returns an OpenRouteService route, or `orsStatus` explaining why not.
 * Retries with fewer avoid polygons when the graph is over-constrained.
 */
export async function fetchOrsRouteWithAvoidPolygons(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  incidents: IncidentRow[],
): Promise<OrsFetchResult> {
  const apiKey = orsApiKey();
  if (!apiKey) return { route: null, orsStatus: "no_key" };

  const baseCoords = {
    coordinates: [
      [fromLng, fromLat],
      [toLng, toLat],
    ] as [number, number][],
    preference: "recommended",
    units: "m",
  };

  /**
   * Descending caps: full set → 4 → 2. We intentionally do **not** fall back to plain ORS (0 polygons)
   * while incidents exist — that would route straight through blockages and defeats avoidance.
   */
  const caps =
    incidents.length === 0
      ? [0]
      : [...new Set([MAX_AVOID_POLYGONS, 4, 2])].sort((a, b) => b - a);

  for (const cap of caps) {
    const avoid = buildAvoidMultiPolygon(incidents, cap);
    const baseBody = {
      ...baseCoords,
      ...(avoid ? { options: { avoid_polygons: avoid } } : {}),
    };
    const route = await executeOrsDirections(baseBody, apiKey);
    if (route) {
      if (incidents.length > 0 && cap < MAX_AVOID_POLYGONS) {
        console.warn(
          `[ORS] Route obtained with reduced avoidance (cap=${cap} polygons; full set failed or unparsable).`,
        );
      }
      return { route, orsStatus: "ok" };
    }
  }

  return { route: null, orsStatus: "failed" };
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
    geometry?: { type?: string; coordinates?: unknown };
    properties?: { summary?: { distance?: number; duration?: number } };
  }>;
  error?: { message?: string };
};

/** Normalize ORS GeoJSON coords (2D or 3D points; MultiLineString → one LineString). */
function lineStringCoordsFromOrsGeometry(geom: { type?: string; coordinates?: unknown } | undefined): [number, number][] | undefined {
  if (!geom?.coordinates) return undefined;
  const t = geom.type?.toLowerCase();
  if (t === "linestring") {
    return normalizeCoordRing(geom.coordinates as unknown[]);
  }
  if (t === "multilinestring" && Array.isArray(geom.coordinates)) {
    const out: [number, number][] = [];
    for (const ring of geom.coordinates as unknown[]) {
      if (Array.isArray(ring)) {
        const part = normalizeCoordRing(ring as unknown[]);
        if (part.length) out.push(...part);
      }
    }
    return out.length ? out : undefined;
  }
  return undefined;
}

function normalizeCoordRing(ring: unknown[]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of ring) {
    if (Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number") {
      out.push([p[0], p[1]]);
    }
  }
  return out;
}

function parseOrsDirectionsJson(raw: unknown): OsrmCompatibleRoute | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as OrsGeoJsonFc & OrsRoutesEnvelope;

  if (data.error?.message) {
    console.warn("[ORS] Error:", data.error.message);
    return null;
  }

  const isFc =
    (data as { type?: string }).type?.toLowerCase() === "featurecollection" ||
    (Array.isArray(data.features) && data.features.length > 0);

  if (isFc && Array.isArray(data.features) && data.features.length > 0) {
    const lineFeat =
      data.features.find(f => {
        const gt = f.geometry?.type?.toLowerCase();
        return gt === "linestring" || gt === "multilinestring";
      }) ?? data.features[0];
    const coords = lineFeat?.geometry ? lineStringCoordsFromOrsGeometry(lineFeat.geometry) : undefined;
    const summary = lineFeat?.properties?.summary;
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
  if (geom && typeof geom === "object" && geom !== null && "type" in geom && "coordinates" in geom) {
    coords = lineStringCoordsFromOrsGeometry(geom as { type?: string; coordinates?: unknown });
  }
  if (!coords?.length && geom && typeof geom === "object" && geom !== null && "coordinates" in geom) {
    const c = (geom as { coordinates: unknown }).coordinates;
    if (Array.isArray(c) && c.length) {
      coords = normalizeCoordRing(c as unknown[]);
    }
  }
  if (!coords?.length && typeof geom === "string" && geom.length > 0) {
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
