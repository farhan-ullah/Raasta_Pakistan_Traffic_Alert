import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, incidentsTable } from "@workspace/db";
import { catchAsync } from "../lib/dbError";

const router: IRouter = Router();

const OSRM_BASE = process.env["OSRM_BASE_URL"] ?? "https://router.project-osrm.org";

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

function isRoutingRisk(inc: { type: string; severity: string }): boolean {
  if (inc.severity === "high" || inc.severity === "critical") return true;
  if (inc.type === "blockage" || inc.type === "vip_movement") return true;
  return false;
}

function bufferMeters(inc: { type: string; severity: string }): number {
  if (inc.severity === "critical") return 400;
  if (inc.severity === "high") return 300;
  if (inc.type === "blockage" || inc.type === "vip_movement") return 220;
  return 180;
}

function conflictWeight(inc: { type: string; severity: string }): number {
  let w = 0;
  if (inc.severity === "critical") w += 100;
  else if (inc.severity === "high") w += 40;
  else if (inc.severity === "medium") w += 15;
  else w += 5;
  if (inc.type === "blockage") w += 30;
  if (inc.type === "vip_movement") w += 20;
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
    if (!isRoutingRisk(inc)) continue;
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

    const analyzed = osrmRoutes.map((r, index) => {
      const coords = r.geometry.coordinates;
      const conflicts = findConflicts(coords, incidents);
      return {
        index,
        route: r,
        conflicts,
        score: scoreConflicts(conflicts),
      };
    });

    const primary = analyzed[0]!;
    let best = analyzed[0]!;
    for (const a of analyzed) {
      if (a.score < best.score) best = a;
      else if (a.score === best.score && a.route.duration < best.route.duration) best = a;
    }

    const recommendedIsAlternative = best.index !== 0;

    const textSuggestions = new Set<string>();
    for (const c of primary.conflicts) {
      const row = incidents.find(i => i.id === c.id);
      if (row?.alternateRoutes?.length) {
        for (const line of row.alternateRoutes) {
          if (line?.trim()) textSuggestions.add(line.trim());
        }
      }
    }
    if (primary.conflicts.length > 0 && best.conflicts.length < primary.conflicts.length) {
      textSuggestions.add("A safer path was selected from alternative driving routes.");
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
