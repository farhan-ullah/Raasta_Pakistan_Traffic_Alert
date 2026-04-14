import { and, gte, lte, type SQL } from "drizzle-orm";
import { incidentsTable } from "@workspace/db";

/**
 * Rough WGS84 bounding box for Pakistan (mainland). Used to ignore stray coordinates and scope the product.
 */
export const PAKISTAN_BOUNDS = {
  minLat: 23.4,
  maxLat: 37.2,
  minLng: 60.7,
  maxLng: 77.2,
} as const;

export function isInPakistan(lat: number, lng: number): boolean {
  return (
    lat >= PAKISTAN_BOUNDS.minLat &&
    lat <= PAKISTAN_BOUNDS.maxLat &&
    lng >= PAKISTAN_BOUNDS.minLng &&
    lng <= PAKISTAN_BOUNDS.maxLng
  );
}

/** Drizzle WHERE fragment: incident pin lies inside {@link PAKISTAN_BOUNDS}. */
export function whereIncidentInPakistan(): SQL {
  return and(
    gte(incidentsTable.lat, PAKISTAN_BOUNDS.minLat),
    lte(incidentsTable.lat, PAKISTAN_BOUNDS.maxLat),
    gte(incidentsTable.lng, PAKISTAN_BOUNDS.minLng),
    lte(incidentsTable.lng, PAKISTAN_BOUNDS.maxLng),
  )!;
}
