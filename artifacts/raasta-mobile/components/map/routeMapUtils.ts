/** OSRM / GeoJSON uses [lng, lat]. */
export function lineStringToIosLatLng(coords: [number, number][]) {
  return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export function lineStringFeature(geometry: { type: string; coordinates: number[][] }) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: geometry.coordinates as [number, number][],
    },
  };
}

export function boundsCenterZoom(coords: [number, number][]): { center: [number, number]; zoomLevel: number } {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  const latSpan = Math.max(maxLat - minLat, 1e-6);
  const lngSpan = Math.max(maxLng - minLng, 1e-6);
  const span = Math.max(latSpan, lngSpan);
  const zoomLevel = Math.max(10, Math.min(15.5, 14 - Math.log2(span * 90)));
  return { center, zoomLevel };
}

export function formatRouteDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${r} min` : `${h} h`;
}

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
