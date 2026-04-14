import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { PAKISTAN_BOUNDS, isInPakistan } from "../lib/pakistan-geo";

const PHOTON = "https://photon.komoot.io/api";

/** Photon `bbox`: minLon,minLat,maxLon,maxLat — restricts search to Pakistan. */
const PHOTON_PAKISTAN_BBOX = `${PAKISTAN_BOUNDS.minLng},${PAKISTAN_BOUNDS.minLat},${PAKISTAN_BOUNDS.maxLng},${PAKISTAN_BOUNDS.maxLat}`;

type PhotonProps = {
  osm_type?: string;
  osm_id?: number;
  name?: string;
  housenumber?: string;
  street?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
  countrycode?: string;
  type?: string;
};

type PhotonFeature = {
  geometry: { type: string; coordinates: [number, number] };
  properties: PhotonProps;
};

function buildStreetLine(p: PhotonProps): string | undefined {
  const h = p.housenumber?.trim();
  const s = p.street?.trim();
  if (h && s) return `${h} ${s}`;
  return s || h;
}

function photonToFullName(p: PhotonProps): string {
  const parts: string[] = [];
  const name = p.name?.trim();
  const streetLine = buildStreetLine(p);
  if (name) parts.push(name);
  if (streetLine && streetLine !== name) parts.push(streetLine);
  for (const x of [p.locality, p.district, p.city, p.county, p.state, p.country]) {
    const t = x?.trim();
    if (t && !parts.includes(t)) parts.push(t);
  }
  return parts.join(", ");
}

function buildArea(p: PhotonProps): string | null {
  const name = p.name?.trim();
  const loc = p.locality?.trim();
  const dist = p.district?.trim();
  const city = p.city?.trim();
  const cand =
    loc ||
    (dist && dist !== name ? dist : "") ||
    (city && city !== name ? city : "") ||
    name ||
    "";
  return cand || null;
}

function buildLabel(p: PhotonProps, fullName: string): string {
  const primary = p.name?.trim() || buildStreetLine(p) || p.locality?.trim() || p.city?.trim() || fullName.split(",")[0]?.trim() || "Location";
  const region = p.state?.trim();
  const short = region && !primary.includes(region) ? `${primary}, ${region}` : primary;
  return short.length > 96 ? `${short.slice(0, 93)}…` : short;
}

const router: IRouter = Router();

router.get("/geocode/search", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    return res.json([]);
  }

  const url = new URL(PHOTON);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "12");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bbox", PHOTON_PAKISTAN_BBOX);

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TrafficAlertPakistan/1.0 (geocode proxy; +https://github.com/)",
      },
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: "Geocoding service unavailable" });
    }
    const data = (await upstream.json()) as { features?: PhotonFeature[] };
    const features = Array.isArray(data.features) ? data.features : [];

    const out = features.map((f, i) => {
      const p = f.properties ?? {};
      const coords = f.geometry?.coordinates;
      const lng = Array.isArray(coords) ? Number(coords[0]) : NaN;
      const lat = Array.isArray(coords) ? Number(coords[1]) : NaN;
      const fullName = photonToFullName(p);
      const osmId = p.osm_id != null ? String(p.osm_id) : String(i);
      const osmType = p.osm_type ?? "X";
      const id = `${osmType}-${osmId}`;

      return {
        id,
        label: buildLabel(p, fullName),
        fullName: fullName || q,
        state: p.state?.trim() || null,
        area: buildArea(p),
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
      };
    }).filter(
      (x) => Number.isFinite(x.lat) && Number.isFinite(x.lng) && isInPakistan(x.lat, x.lng),
    );

    return res.json(out);
  } catch {
    return res.status(502).json({ error: "Geocoding request failed" });
  }
});

export default router;
