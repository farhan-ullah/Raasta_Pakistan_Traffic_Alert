/**
 * Shared “influence” radii for incidents: conflict detection vs ORS avoid polygons must use compatible
 * scales — otherwise ORS can exclude a small disk while we still flag the whole corridor as a conflict.
 */

export function normalizeIncidentType(type: string | null | undefined): string {
  return (type || "").toLowerCase().trim().replace(/\s+/g, "_");
}

/**
 * Influence radius around each incident’s point coordinate (see findConflicts in routing.ts).
 */
export function bufferMeters(inc: { type: string; severity: string }): number {
  const sev = (inc.severity || "medium").toLowerCase();
  const t = normalizeIncidentType(inc.type);

  if (t === "blockage") {
    switch (sev) {
      case "critical":
        return 1_900;
      case "high":
        return 1_500;
      case "medium":
        return 1_200;
      case "low":
        return 950;
      default:
        return 1_250;
    }
  }
  if (t === "vip_movement") {
    switch (sev) {
      case "critical":
        return 1_600;
      case "high":
        return 1_300;
      case "medium":
        return 1_050;
      case "low":
        return 800;
      default:
        return 1_100;
    }
  }
  if (t === "construction") {
    switch (sev) {
      case "critical":
        return 1_350;
      case "high":
        return 1_100;
      case "medium":
        return 880;
      case "low":
        return 700;
      default:
        return 920;
    }
  }

  let base: number;
  switch (sev) {
    case "critical":
      base = 520;
      break;
    case "high":
      base = 420;
      break;
    case "medium":
      base = 320;
      break;
    case "low":
      base = 240;
      break;
    default:
      base = 300;
  }
  return base;
}

/**
 * Radius for ORS `avoid_polygons` disks — must cover {@link bufferMeters} so the solver’s exclusion
 * matches what we treat as “too close” on the returned line.
 */
export function orsAvoidRadiusMeters(inc: { type: string; severity: string }): number {
  const padded = bufferMeters(inc) + 150;
  return Math.min(4_500, Math.max(400, padded));
}
