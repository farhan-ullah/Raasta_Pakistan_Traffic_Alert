import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, incidentsTable } from "@workspace/db";
import { catchAsync } from "../lib/dbError";

const router: IRouter = Router();

const OSRM_BASE = process.env["OSRM_BASE_URL"] ?? "https://router.project-osrm.org";

/** Max extra OSRM calls for hazard-avoidance attempts (public OSRM is rate-limited). */
const MAX_DETOUR_ATTEMPTS = 14;

const METERS_PER_DEG_LAT = 111_320;

function metersPerDegLng(lat: number): number {
  return 111_320 * Math.cos((lat * Math.PI) / 180);
}

function pointToSegmentMeters(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const x = (lng - lng1) * metersPerDegLng(lat1);
  const y = (lat - lat1) * METERS_PER_DEG_LAT;
  const x2 = (lng2 - lng1) * metersPerDegLng(lat1);
  const y2 = (lat2 - lat1) * METERS_PER_DEG_LAT;
  const dx = x2;
  const dy = y2;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x, y);
  const t = Math.max(0, Math.min(1, (x * dx + y * dy) / len2));
  return Math.hypot(x - t * dx, y - t * dy);
}

function nearestPointOnSegment(
  latP: number,
  lngP: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): { lat: number; lng: number } {
  const x = (lngP - lng1) * metersPerDegLng(lat1);
  const y = (latP - lat1) * METERS_PER_DEG_LAT;
  const x2 = (lng2 - lng1) * metersPerDegLng(lat1);
  const y2 = (lat2 - lat1) * METERS_PER_DEG_LAT;
  const len2 = x2 * x2 + y2 * y2;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (x * x2 + y * y2) / len2));
  const projY = t * y2;
  const projX = t * x2;
  const lat = lat1 + projY / METERS_PER_DEG_LAT;
  const lng = lng1 + projX / metersPerDegLng(lat1);
  return { lat, lng };
}

/** Closest point on polyline to (latP, lngP); used for detour placement. */
function closestPointOnPolyline(
  coords: [number, number][],
  latP: number,
  lngP: number,
): { lng: number; lat: number; segIndex: number } {
  let bestD = Infinity;
  let best: { lng: number; lat: number; segIndex: number } = {
    lng: coords[0]![0],
    lat: coords[0]![1],
    segIndex: 0,
  };
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i]!;
    const [lng2, lat2] = coords[i + 1]!;
    const { lat, lng } = nearestPointOnSegment(latP, lngP, lat1, lng1, lat2, lng2);
    const d = pointToSegmentMeters(latP, lngP, lat1, lng1, lat2, lng2);
    if (d < bestD) {
      bestD = d;
      best = { lng, lat, segIndex: i };
    }
  }
  return best;
}

/**
 * Places a waypoint offset perpendicular to the road at the nearest point to the hazard,
 * on the side **away** from the incident so OSRM is pushed around the obstruction.
 */
function detourWaypointLngLat(
  coords: [number, number][],
  incidentLat: number,
  incidentLng: number,
  offsetMeters: number,
): [number, number] | null {
  if (coords.length < 2 || offsetMeters <= 0) return null;
  const close = closestPointOnPolyline(coords, incidentLat, incidentLng);
  const i = close.segIndex;
  const [lng1, lat1] = coords[i]!;
  const [lng2, lat2] = coords[i + 1]!;

  const mx1 = lng1 * metersPerDegLng(lat1);
  const my1 = lat1 * METERS_PER_DEG_LAT;
  const mx2 = lng2 * metersPerDegLng(lat1);
  const my2 = lat2 * METERS_PER_DEG_LAT;
  let tx = mx2 - mx1;
  let ty = my2 - my1;
  const tlen = Math.hypot(tx, ty) || 1;
  tx /= tlen;
  ty /= tlen;
  const px = -ty;
  const py = tx;

  const cx = close.lng * metersPerDegLng(lat1);
  const cy = close.lat * METERS_PER_DEG_LAT;
  const ix = incidentLng * metersPerDegLng(lat1);
  const iy = incidentLat * METERS_PER_DEG_LAT;
  const toIncX = ix - cx;
  const toIncY = iy - cy;
  const dot = px * toIncX + py * toIncY;
  const sign = dot > 0 ? -1 : 1;

  const wx = cx + sign * px * offsetMeters;
  const wy = cy + sign * py * offsetMeters;
  const wLat = wy / METERS_PER_DEG_LAT;
  const wLng = wx / metersPerDegLng(wLat);
  if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) return null;
  return [wLng, wLat];
}

function minDistanceToPolylineMeters(lat: number, lng: number, coords: [number, number][]): number {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i]!;
    const [lng2, lat2] = coords[i + 1]!;
    const d = pointToSegmentMeters(lat, lng, lat1, lng1, lat2, lng2);
    if (d < min) min = d;
  }
  return min;
}

type IncidentRow = typeof incidentsTable.$inferSelect;

/**
 * Every active map incident (any type you add later, any severity low→critical) uses its
 * lat/lng as a hazard: corridor radius scales mainly with severity.
 */
function bufferMeters(inc: { type: string; severity: string }): number {
  const sev = (inc.severity || "medium").toLowerCase();
  let base: number;
  switch (sev) {
    case "critical":
      base = 480;
      break;
    case "high":
      base = 380;
      break;
    case "medium":
      base = 280;
      break;
    case "low":
      base = 195;
      break;
    default:
      base = 260;
  }
  const t = (inc.type || "").toLowerCase();
  if (t === "blockage" || t === "vip_movement") return Math.min(base + 45, 540);
  if (t === "construction") return Math.min(base + 30, 520);
  return base;
}

/** Higher = detour / scoring priority (severity + type hint; unknown types still counted). */
function conflictWeight(inc: { type: string; severity: string }): number {
  const sev = (inc.severity || "medium").toLowerCase();
  let w = 0;
  switch (sev) {
    case "critical":
      w += 100;
      break;
    case "high":
      w += 68;
      break;
    case "medium":
      w += 40;
      break;
    case "low":
      w += 18;
      break;
    default:
      w += 32;
  }
  const t = (inc.type || "").toLowerCase();
  if (t === "blockage") w += 30;
  else if (t === "construction") w += 24;
  else if (t === "vip_movement") w += 28;
  else if (t === "accident") w += 20;
  else if (t === "congestion") w += 12;
  else w += 10;
  return w;
}

type Conflict = {
  id: number;
  title: string;
  type: string;
  severity: string;
  lat: number;
  lng: number;
};

function findConflicts(coords: [number, number][], incidents: IncidentRow[]): Conflict[] {
  const out: Conflict[] = [];
  for (const inc of incidents) {
    const buf = bufferMeters(inc);
    const d = minDistanceToPolylineMeters(inc.lat, inc.lng, coords);
    if (d < buf) {
      out.push({
        id: inc.id,
        title: inc.title,
        type: inc.type,
        severity: inc.severity,
        lat: inc.lat,
        lng: inc.lng,
      });
    }
  }
  return out;
}

function scoreConflicts(conflicts: Conflict[]): number {
  return conflicts.reduce((sum, c) => {
    const inc = { type: c.type, severity: c.severity };
    return sum + conflictWeight(inc);
  }, 0);
}

interface OsrmRoute {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance: number;
  duration: number;
}

interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
}

async function fetchOsrmRoutes(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<OsrmRoute[]> {
  const path = `${fromLng},${fromLat};${toLng},${toLat}`;
  const url = `${OSRM_BASE}/route/v1/driving/${path}?overview=full&geometries=geojson&alternatives=true`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Routing service returned ${res.status}`);
  }
  const data = (await res.json()) as OsrmResponse;
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No route found for these points");
  }
  return data.routes;
}

/** Single route through one or more via points [lng,lat], ... */
async function fetchOsrmRouteThroughPoints(pointsLngLat: [number, number][]): Promise<OsrmRoute | null> {
  if (pointsLngLat.length < 2) return null;
  const path = pointsLngLat.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_BASE}/route/v1/driving/${path}?overview=full&geometries=geojson`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return null;
  const data = (await res.json()) as OsrmResponse;
  if (data.code !== "Ok" || !data.routes?.length) return null;
  return data.routes[0] ?? null;
}

function sortConflictsBySeverity(conflicts: Conflict[]): Conflict[] {
  return [...conflicts].sort((a, b) => {
    const wa = conflictWeight({ type: a.type, severity: a.severity });
    const wb = conflictWeight({ type: b.type, severity: b.severity });
    return wb - wa;
  });
}

/** Distance along straight line A→B (proxy for ordering two vias). */
function progressAlongChord(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  lat: number,
  lng: number,
): number {
  const bx = (toLng - fromLng) * metersPerDegLng(fromLat);
  const by = (toLat - fromLat) * METERS_PER_DEG_LAT;
  const px = (lng - fromLng) * metersPerDegLng(fromLat);
  const py = (lat - fromLat) * METERS_PER_DEG_LAT;
  const ab2 = bx * bx + by * by || 1;
  return (px * bx + py * by) / Math.sqrt(ab2);
}

router.post(
  "/routes/plan",
  catchAsync(async (req, res): Promise<void> => {
    const body = req.body as {
      fromLat?: unknown;
      fromLng?: unknown;
      toLat?: unknown;
      toLng?: unknown;
    };
    const fromLat = Number(body.fromLat);
    const fromLng = Number(body.fromLng);
    const toLat = Number(body.toLat);
    const toLng = Number(body.toLng);
    if (![fromLat, fromLng, toLat, toLng].every(n => Number.isFinite(n))) {
      res.status(400).json({ error: "fromLat, fromLng, toLat, toLng must be numbers" });
      return;
    }

    const incidents = await db.select().from(incidentsTable).where(eq(incidentsTable.status, "active"));

    let osrmRoutes: OsrmRoute[];
    try {
      osrmRoutes = await fetchOsrmRoutes(fromLat, fromLng, toLat, toLng);
    } catch (e) {
      res.status(502).json({
        error: e instanceof Error ? e.message : "Routing service unavailable",
      });
      return;
    }

    type Analyzed = { route: OsrmRoute; conflicts: Conflict[]; score: number; index: number; source: string };
    const analyzed: Analyzed[] = osrmRoutes.map((r, index) => {
      const coords = r.geometry.coordinates;
      const conflicts = findConflicts(coords, incidents);
      return {
        index,
        route: r,
        conflicts,
        score: scoreConflicts(conflicts),
        source: index === 0 ? "osrm_direct" : "osrm_alternative",
      };
    });

    const primary = analyzed[0]!;
    const polylineForDetours = primary.route.geometry.coordinates as [number, number][];

    /** Collect extra routes that explicitly avoid hazard coordinates via detour waypoints. */
    let detourAttempts = 0;
    const addDetourRoute = (route: OsrmRoute, source: string) => {
      const conflicts = findConflicts(route.geometry.coordinates, incidents);
      analyzed.push({
        index: analyzed.length,
        route,
        conflicts,
        score: scoreConflicts(conflicts),
        source,
      });
    };

    const offsetsM = [350, 550, 800, 1100];
    const conflictsForDetour = sortConflictsBySeverity(findConflicts(polylineForDetours, incidents));
    const uniqueById = new Map<number, Conflict>();
    for (const c of conflictsForDetour) {
      if (!uniqueById.has(c.id)) uniqueById.set(c.id, c);
    }
    const topHazards = [...uniqueById.values()].slice(0, 5);

    for (const c of topHazards) {
      if (detourAttempts >= MAX_DETOUR_ATTEMPTS) break;
      for (const off of offsetsM) {
        if (detourAttempts >= MAX_DETOUR_ATTEMPTS) break;
        const via = detourWaypointLngLat(polylineForDetours, c.lat, c.lng, off);
        if (!via) continue;
        detourAttempts++;
        const r = await fetchOsrmRouteThroughPoints([
          [fromLng, fromLat],
          via,
          [toLng, toLat],
        ]);
        if (r) addDetourRoute(r, `detour_via_${off}m_incident_${c.id}`);
      }
    }

    /** Two vias: two worst distinct hazards, ordered along A→B chord. */
    if (detourAttempts < MAX_DETOUR_ATTEMPTS && topHazards.length >= 2) {
      const c0 = topHazards[0]!;
      const c1 = topHazards[1]!;
      for (const off of [550, 900]) {
        if (detourAttempts >= MAX_DETOUR_ATTEMPTS) break;
        const v0 = detourWaypointLngLat(polylineForDetours, c0.lat, c0.lng, off);
        const v1 = detourWaypointLngLat(polylineForDetours, c1.lat, c1.lng, off);
        if (!v0 || !v1) continue;
        const p0 = progressAlongChord(fromLat, fromLng, toLat, toLng, v0[1], v0[0]);
        const p1 = progressAlongChord(fromLat, fromLng, toLat, toLng, v1[1], v1[0]);
        const ordered = p0 <= p1 ? [v0, v1] : [v1, v0];
        detourAttempts++;
        const r = await fetchOsrmRouteThroughPoints([[fromLng, fromLat], ordered[0]!, ordered[1]!, [toLng, toLat]]);
        if (r) addDetourRoute(r, `detour_2via_${off}m`);
      }
    }

    let best = analyzed[0]!;
    for (const a of analyzed) {
      if (a.score < best.score) best = a;
      else if (a.score === best.score && a.route.duration < best.route.duration) best = a;
    }

    const recommendedIsAlternative = best.index !== 0 || best.source !== "osrm_direct";

    const textSuggestions = new Set<string>();
    for (const c of primary.conflicts) {
      const row = incidents.find(i => i.id === c.id);
      if (row?.alternateRoutes?.length) {
        for (const line of row.alternateRoutes) {
          if (line?.trim()) textSuggestions.add(line.trim());
        }
      }
    }
    if (primary.conflicts.length > 0 && best.score < primary.score) {
      if (best.source.startsWith("detour")) {
        textSuggestions.add("Route was recalculated to steer away from reported hazard coordinates.");
      } else {
        textSuggestions.add("A safer path was selected from alternative driving routes.");
      }
    }

    const toSegment = (r: OsrmRoute, conflicts: Conflict[]) => ({
      geometry: {
        type: "LineString" as const,
        coordinates: r.geometry.coordinates,
      },
      distanceMeters: r.distance,
      durationSeconds: r.duration,
      conflicts,
    });

    res.json({
      primary: toSegment(primary.route, primary.conflicts),
      recommended: toSegment(best.route, best.conflicts),
      recommendedIsAlternative,
      textSuggestions: [...textSuggestions],
    });
  }),
);

export default router;
