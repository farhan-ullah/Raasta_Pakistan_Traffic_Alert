import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, incidentsTable } from "@workspace/db";
import { catchAsync } from "../lib/dbError";
import { isInPakistan, whereIncidentInPakistan } from "../lib/pakistan-geo";
import { bufferMeters, normalizeIncidentType } from "./incident-zones";
import { fetchOrsRouteWithAvoidPolygons } from "./ors-routing";

const router: IRouter = Router();

const OSRM_BASE = process.env["OSRM_BASE_URL"] ?? "https://router.project-osrm.org";

/** Cap detour OSRM fetches — too many sequential calls cause nginx 504 upstream timeouts. */
const MAX_DETOUR_TASKS = Number(process.env["OSRM_MAX_DETOUR_TASKS"] ?? 14);
/** Run detour requests in parallel batches (still capped by MAX_DETOUR_TASKS). */
const OSRM_PARALLEL_BATCH = Number(process.env["OSRM_PARALLEL_BATCH"] ?? 4);
const OSRM_TIMEOUT_INITIAL_MS = Number(process.env["OSRM_TIMEOUT_INITIAL_MS"] ?? 14_000);
const OSRM_TIMEOUT_VIA_MS = Number(process.env["OSRM_TIMEOUT_VIA_MS"] ?? 8_000);

async function fetchOsrmGet(url: string, timeoutMs: number): Promise<Response> {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { method: "GET", signal: ac.signal });
  } finally {
    clearTimeout(id);
  }
}

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
 * `flipRoadSide` tries the **other** side of the street — essential when one side still
 * snaps back through the hazard on dense grids.
 */
function detourWaypointLngLat(
  coords: [number, number][],
  incidentLat: number,
  incidentLng: number,
  offsetMeters: number,
  flipRoadSide = false,
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
  let sign = dot > 0 ? -1 : 1;
  if (flipRoadSide) sign *= -1;

  const wx = cx + sign * px * offsetMeters;
  const wy = cy + sign * py * offsetMeters;
  const wLat = wy / METERS_PER_DEG_LAT;
  const wLng = wx / metersPerDegLng(wLat);
  if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) return null;
  return [wLng, wLat];
}

/**
 * Waypoint = incident + offset along a unit vector ⟂ to A→B (two flips = both sides of corridor).
 * Helps when the pin is between A and B but not snapped onto OSRM’s polyline vertex spacing.
 */
function detourWaypointFromChord(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  incidentLat: number,
  incidentLng: number,
  offsetMeters: number,
  flipRoadSide = false,
): [number, number] | null {
  if (offsetMeters <= 0) return null;
  const vx = (toLng - fromLng) * metersPerDegLng(fromLat);
  const vy = (toLat - fromLat) * METERS_PER_DEG_LAT;
  const len = Math.hypot(vx, vy) || 1;
  const px = -vy / len;
  const py = vx / len;
  const ix = (incidentLng - fromLng) * metersPerDegLng(fromLat);
  const iy = (incidentLat - fromLat) * METERS_PER_DEG_LAT;
  const sign = flipRoadSide ? -1 : 1;
  const wx = ix + sign * px * offsetMeters;
  const wy = iy + sign * py * offsetMeters;
  const wLat = fromLat + wy / METERS_PER_DEG_LAT;
  const wLng = fromLng + wx / metersPerDegLng(wLat);
  if (!Number.isFinite(wLat) || !Number.isFinite(wLng)) return null;
  return [wLng, wLat];
}

/** Waypoint on a circle around the incident — forces OSRM onto a different corridor than small perpendicular nudges. */
function radialWaypointLngLat(
  incidentLat: number,
  incidentLng: number,
  radiusM: number,
  bearingIndex: number,
  totalBearings: number,
): [number, number] {
  const theta = (2 * Math.PI * bearingIndex) / totalBearings;
  const dn = radiusM * Math.cos(theta);
  const de = radiusM * Math.sin(theta);
  const p = offsetLatLng(incidentLat, incidentLng, dn, de);
  return [p.lng, p.lat];
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
  const t = normalizeIncidentType(inc.type);
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

/**
 * Approximate a “zone” around a point: if the route passes near any sample, it conflicts.
 * Helps when the map pin is off the road centerline or the closure spans along the road.
 */
const ZONE_SAMPLE_OFFSETS_M: { dn: number; de: number }[] = [
  { dn: 0, de: 0 },
  { dn: 280, de: 0 },
  { dn: -280, de: 0 },
  { dn: 0, de: 280 },
  { dn: 0, de: -280 },
  { dn: 200, de: 200 },
  { dn: -200, de: 200 },
  { dn: 200, de: -200 },
  { dn: -200, de: -200 },
];

function offsetLatLng(lat: number, lng: number, dn: number, de: number): { lat: number; lng: number } {
  return {
    lat: lat + dn / METERS_PER_DEG_LAT,
    lng: lng + de / metersPerDegLng(lat),
  };
}

function incidentSamplesForClearance(inc: IncidentRow): { lat: number; lng: number }[] {
  const t = normalizeIncidentType(inc.type);
  const sev = (inc.severity || "medium").toLowerCase();
  const useZone =
    t === "blockage" ||
    t === "construction" ||
    t === "vip_movement" ||
    sev === "critical" ||
    sev === "high";
  return useZone
    ? ZONE_SAMPLE_OFFSETS_M.map(o => offsetLatLng(inc.lat, inc.lng, o.dn, o.de))
    : [{ lat: inc.lat, lng: inc.lng }];
}

/** Smallest distance (m) from polyline to any hazard sample — higher = route stays farther from hazards. */
function minClearanceToIncidents(coords: [number, number][], incidents: IncidentRow[]): number {
  let minD = Infinity;
  for (const inc of incidents) {
    for (const s of incidentSamplesForClearance(inc)) {
      const d = minDistanceToPolylineMeters(s.lat, s.lng, coords);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

function findConflicts(coords: [number, number][], incidents: IncidentRow[]): Conflict[] {
  const out: Conflict[] = [];
  const seen = new Set<number>();

  for (const inc of incidents) {
    const buf = bufferMeters(inc);
    const samples = incidentSamplesForClearance(inc);

    let hit = false;
    for (const s of samples) {
      const d = minDistanceToPolylineMeters(s.lat, s.lng, coords);
      if (d < buf) {
        hit = true;
        break;
      }
    }
    if (hit && !seen.has(inc.id)) {
      seen.add(inc.id);
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
  const url = `${OSRM_BASE}/route/v1/driving/${path}?overview=full&geometries=geojson&alternatives=3`;
  let res: Response;
  try {
    res = await fetchOsrmGet(url, OSRM_TIMEOUT_INITIAL_MS);
  } catch {
    throw new Error("Routing service timed out or unreachable");
  }
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
  let res: Response;
  try {
    res = await fetchOsrmGet(url, OSRM_TIMEOUT_VIA_MS);
  } catch {
    return null;
  }
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

/**
 * Active incidents whose pins lie near this A→B request. Drops stray rows (wrong lat/lng in DB,
 * other cities) so ORS avoid polygons and conflict scoring stay local to the trip.
 */
function incidentsNearRouteSegment(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  rows: IncidentRow[],
): IncidentRow[] {
  const pad = 0.55;
  const minLat = Math.min(fromLat, toLat) - pad;
  const maxLat = Math.max(fromLat, toLat) + pad;
  const minLng = Math.min(fromLng, toLng) - pad;
  const maxLng = Math.max(fromLng, toLng) + pad;
  const out: IncidentRow[] = [];
  const dropped: number[] = [];
  for (const row of rows) {
    if (row.lat >= minLat && row.lat <= maxLat && row.lng >= minLng && row.lng <= maxLng) {
      out.push(row);
    } else {
      dropped.push(row.id);
    }
  }
  if (dropped.length > 0) {
    console.warn("[routing] Skipped incidents outside route corridor (planning only), ids:", dropped.join(", "));
  }
  return out;
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
    if (!isInPakistan(fromLat, fromLng) || !isInPakistan(toLat, toLng)) {
      res.status(400).json({ error: "from and to coordinates must be within Pakistan" });
      return;
    }

    const allActiveIncidents = await db
      .select()
      .from(incidentsTable)
      .where(and(eq(incidentsTable.status, "active"), whereIncidentInPakistan()));
    const incidents = incidentsNearRouteSegment(fromLat, fromLng, toLat, toLng, allActiveIncidents);

    const toSegment = (r: OsrmRoute, conflicts: Conflict[]) => ({
      geometry: {
        type: "LineString" as const,
        coordinates: r.geometry.coordinates,
      },
      distanceMeters: r.distance,
      durationSeconds: r.duration,
      conflicts,
    });

    const orsRoute = await fetchOrsRouteWithAvoidPolygons(fromLat, fromLng, toLat, toLng, incidents).catch(err => {
      console.warn("[ORS] fetchOrsRouteWithAvoidPolygons threw:", err instanceof Error ? err.message : err);
      return null;
    });

    if (orsRoute) {
      let osrmRoutes: OsrmRoute[];
      try {
        osrmRoutes = await fetchOsrmRoutes(fromLat, fromLng, toLat, toLng);
      } catch (e) {
        res.status(502).json({
          error: e instanceof Error ? e.message : "Routing service unavailable",
        });
        return;
      }
      const primaryRoute = osrmRoutes[0]!;
      const primaryCoords = primaryRoute.geometry.coordinates as [number, number][];
      const primaryConflicts = findConflicts(primaryCoords, incidents);
      const orsCoords = orsRoute.geometry.coordinates as [number, number][];
      const orsConflicts = findConflicts(orsCoords, incidents);

      const textSuggestions = new Set<string>();
      for (const c of primaryConflicts) {
        const row = incidents.find(i => i.id === c.id);
        if (row?.alternateRoutes?.length) {
          for (const line of row.alternateRoutes) {
            if (line?.trim()) textSuggestions.add(line.trim());
          }
        }
      }
      if (incidents.length > 0) {
        textSuggestions.add("Recommended route avoids reported hazard areas (OpenRouteService).");
      } else {
        textSuggestions.add(
          "Recommended route uses OpenRouteService (no active incidents to avoid — add alerts to enable polygon avoidance).",
        );
      }
      if (orsConflicts.length > 0) {
        textSuggestions.add(
          "The line may still run near a red alert: ORS blocks fixed disks around pins, while the map shows a wider “danger” corridor. Real closures follow police on the ground.",
        );
      }

      res.json({
        primary: toSegment(primaryRoute, primaryConflicts),
        recommended: toSegment(orsRoute, orsConflicts),
        recommendedIsAlternative: true,
        routingBackend: "openrouteservice" as const,
        textSuggestions: [...textSuggestions],
      });
      return;
    }

    let osrmRoutes: OsrmRoute[];
    try {
      osrmRoutes = await fetchOsrmRoutes(fromLat, fromLng, toLat, toLng);
    } catch (e) {
      res.status(502).json({
        error: e instanceof Error ? e.message : "Routing service unavailable",
      });
      return;
    }

    type Analyzed = {
      route: OsrmRoute;
      conflicts: Conflict[];
      score: number;
      index: number;
      source: string;
      clearance: number;
    };
    const analyzed: Analyzed[] = osrmRoutes.map((r, index) => {
      const coords = r.geometry.coordinates as [number, number][];
      const conflicts = findConflicts(coords, incidents);
      return {
        index,
        route: r,
        conflicts,
        score: scoreConflicts(conflicts),
        clearance: minClearanceToIncidents(coords, incidents),
        source: index === 0 ? "osrm_direct" : "osrm_alternative",
      };
    });

    const primary = analyzed[0]!;
    const polylineForDetours = primary.route.geometry.coordinates as [number, number][];

    /** Collect extra routes that explicitly avoid hazard coordinates via detour waypoints. */
    const addDetourRoute = (route: OsrmRoute, source: string) => {
      const coords = route.geometry.coordinates as [number, number][];
      const conflicts = findConflicts(coords, incidents);
      analyzed.push({
        index: analyzed.length,
        route,
        conflicts,
        score: scoreConflicts(conflicts),
        clearance: minClearanceToIncidents(coords, incidents),
        source,
      });
    };

    const conflictsForDetour = sortConflictsBySeverity(findConflicts(polylineForDetours, incidents));
    const uniqueById = new Map<number, Conflict>();
    for (const c of conflictsForDetour) {
      if (!uniqueById.has(c.id)) uniqueById.set(c.id, c);
    }
    const topHazards = [...uniqueById.values()].slice(0, 6);

    /**
     * Few OSRM calls, executed in parallel batches — sequential ~120 calls caused nginx 504.
     */
    type DetourTask = { points: [number, number][]; source: string };
    const detourTasks: DetourTask[] = [];
    const pushTask = (points: [number, number][], source: string) => {
      if (detourTasks.length >= MAX_DETOUR_TASKS) return;
      detourTasks.push({ points, source });
    };

    const polyOffsetsM = [800, 1800];
    for (const c of topHazards.slice(0, 2)) {
      for (const off of polyOffsetsM) {
        for (const flip of [false, true]) {
          const via = detourWaypointLngLat(polylineForDetours, c.lat, c.lng, off, flip);
          if (via) pushTask([[fromLng, fromLat], via, [toLng, toLat]], `detour_via_${off}m_${flip ? "b" : "a"}_inc${c.id}`);
        }
      }
    }

    const chordOffM = [2000];
    for (const c of topHazards.slice(0, 2)) {
      for (const off of chordOffM) {
        for (const flip of [false, true]) {
          const via = detourWaypointFromChord(fromLat, fromLng, toLat, toLng, c.lat, c.lng, off, flip);
          if (via) pushTask([[fromLng, fromLat], via, [toLng, toLat]], `detour_chord_${off}m_${flip ? "b" : "a"}_inc${c.id}`);
        }
      }
    }

    const c0 = topHazards[0];
    if (c0) {
      const viaA = radialWaypointLngLat(c0.lat, c0.lng, 4500, 0, 8);
      pushTask([[fromLng, fromLat], viaA, [toLng, toLat]], `detour_radial_4500m_b0_inc${c0.id}`);
      const viaB = radialWaypointLngLat(c0.lat, c0.lng, 7500, 4, 8);
      pushTask([[fromLng, fromLat], viaB, [toLng, toLat]], `detour_radial_7500m_b4_inc${c0.id}`);
    }

    for (let i = 0; i < detourTasks.length; i += OSRM_PARALLEL_BATCH) {
      const batch = detourTasks.slice(i, i + OSRM_PARALLEL_BATCH);
      const results = await Promise.all(batch.map(t => fetchOsrmRouteThroughPoints(t.points)));
      results.forEach((r, j) => {
        if (r) addDetourRoute(r, batch[j]!.source);
      });
    }

    const compareAnalyzed = (a: Analyzed, b: Analyzed): number => {
      const na = a.conflicts.length;
      const nb = b.conflicts.length;
      if (na !== nb) return na - nb;
      if (a.score !== b.score) return a.score - b.score;
      if (a.clearance !== b.clearance) return b.clearance - a.clearance;
      return a.route.duration - b.route.duration;
    };

    let best = analyzed[0]!;
    for (const a of analyzed) {
      if (compareAnalyzed(a, best) < 0) best = a;
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
    if (best.conflicts.length > 0) {
      textSuggestions.add(
        "OpenStreetMap routing cannot block roads; we bias away from alerts. Obey police signs and local closures on the ground.",
      );
    }
    if (!process.env["OPENROUTESERVICE_API_KEY"]?.trim() && incidents.length > 0) {
      textSuggestions.add(
        "Stronger avoidance around alerts: set OPENROUTESERVICE_API_KEY on the API server (OpenRouteService).",
      );
    }

    res.json({
      primary: toSegment(primary.route, primary.conflicts),
      recommended: toSegment(best.route, best.conflicts),
      recommendedIsAlternative,
      routingBackend: "osrm" as const,
      textSuggestions: [...textSuggestions],
    });
  }),
);

export default router;
