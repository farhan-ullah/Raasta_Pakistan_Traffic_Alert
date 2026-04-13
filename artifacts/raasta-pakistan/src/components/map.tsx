import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
} from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { MapIncident, Offer } from "@workspace/api-client-react";
import { Navigation } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
    default: return "#3b82f6";
  }
};

const getTypeEmoji = (type: string) => {
  switch (type) {
    case "vip_movement": return "👑";
    case "accident": return "💥";
    case "construction": return "🚧";
    case "blockage": return "🚫";
    case "congestion": return "🚗";
    default: return "⚠️";
  }
};

const createIncidentIcon = (severity: string, type: string) => {
  const color = getSeverityColor(severity);
  const emoji = getTypeEmoji(type);
  const isPulsing = severity === "critical" || severity === "high";
  const size = severity === "critical" ? 28 : severity === "high" ? 24 : 20;

  const pulseRing = isPulsing ? `
    <div style="
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: ${size + 16}px; height: ${size + 16}px;
      border-radius: 50%;
      border: 2px solid ${color};
      opacity: 0.6;
      animation: ripple 1.5s ease-out infinite;
    "></div>
    <div style="
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: ${size + 30}px; height: ${size + 30}px;
      border-radius: 50%;
      border: 1px solid ${color};
      opacity: 0.3;
      animation: ripple 1.5s ease-out infinite 0.5s;
    "></div>
  ` : "";

  return L.divIcon({
    html: `
      <style>
        @keyframes ripple {
          0% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
        }
      </style>
      <div style="position: relative; width: ${size + 30}px; height: ${size + 30}px; display: flex; align-items: center; justify-content: center;">
        ${pulseRing}
        <div style="
          width: ${size}px; height: ${size}px;
          background: ${color};
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: ${size * 0.5}px;
          position: relative; z-index: 2;
        ">${emoji}</div>
      </div>
    `,
    className: "",
    iconSize: [size + 30, size + 30],
    iconAnchor: [(size + 30) / 2, (size + 30) / 2],
  });
};

const createOfferIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        width: 22px; height: 22px;
        background: #01411C;
        border-radius: 50%;
        border: 2.5px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        font-size: 11px;
      ">🏷️</div>
    `,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

interface MapProps {
  incidents?: MapIncident[];
  offers?: Offer[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  lastUpdated?: Date;
}

const ISLAMABAD: [number, number] = [33.6844, 73.0479];

export function LiveMap({
  incidents = [],
  offers = [],
  center = ISLAMABAD,
  zoom = 12,
  className = "w-full flex-1 min-h-[200px] z-0",
  lastUpdated,
}: MapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const initialFlyDone = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setAccuracyM(pos.coords.accuracy);
        setGeoError(null);
      },
      () => {
        setGeoError("Location unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    if (!userPos || initialFlyDone.current) return;
    const run = () => {
      if (!mapRef.current) return false;
      initialFlyDone.current = true;
      mapRef.current.flyTo(userPos, 15, { duration: 0.8 });
      return true;
    };
    if (run()) return;
    const t = window.setInterval(() => {
      if (run()) window.clearInterval(t);
    }, 50);
    const timeout = window.setTimeout(() => window.clearInterval(t), 4000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(timeout);
    };
  }, [userPos]);

  const onLocatePress = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(next);
        setAccuracyM(pos.coords.accuracy);
        mapRef.current?.flyTo(next, 15, { duration: 0.5 });
        setLocating(false);
        setGeoError(null);
      },
      () => {
        setLocating(false);
        setGeoError("Location unavailable");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  return (
    <div ref={containerRef} className={`relative flex flex-col w-full min-h-0 h-full ${className}`}>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[200px] z-0 rounded-lg"
        style={{ height: "100%", minHeight: 200 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userPos && accuracyM != null && accuracyM < 1200 && (
          <Circle
            center={userPos}
            radius={Math.max(accuracyM, 25)}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#3b82f6",
              fillOpacity: 0.14,
              weight: 1,
            }}
          />
        )}

        {userPos && (
          <CircleMarker
            center={userPos}
            radius={10}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#2563eb",
              weight: 3,
              opacity: 1,
              fillOpacity: 1,
            }}
          />
        )}

        {incidents.map((incident) => (
          <Marker
            key={`incident-${incident.id}`}
            position={[incident.lat, incident.lng]}
            icon={createIncidentIcon(incident.severity, incident.type)}
          >
            <Popup>
              <div className="p-1 min-w-[160px]">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-base">{getTypeEmoji(incident.type)}</span>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: getSeverityColor(incident.severity) }}
                  >
                    {incident.severity?.toUpperCase()}
                  </span>
                </div>
                <h4 className="font-bold text-sm leading-tight mb-1">{incident.title}</h4>
                <p className="text-xs text-gray-500 capitalize">{incident.type?.replace(/_/g, " ")}</p>
                {incident.location && (
                  <p className="text-xs text-gray-600 mt-1">📍 {incident.location}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {offers.map((offer) => (
          <Marker
            key={`offer-${offer.id}`}
            position={[offer.lat, offer.lng]}
            icon={createOfferIcon()}
          >
            <Popup>
              <div className="p-1 min-w-[140px]">
                <h4 className="font-bold text-sm mb-0.5">{offer.title}</h4>
                <p className="text-xs text-gray-500">{offer.merchantName}</p>
                {offer.discountPercent && (
                  <div className="font-bold text-[#01411C] text-sm mt-1">{offer.discountPercent}% OFF</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Live badge + last updated */}
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-[400] flex flex-col items-end gap-1.5">
        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
        {lastUpdated && (
          <div className="bg-white/90 backdrop-blur text-gray-600 text-[10px] px-2 py-1 rounded-full shadow">
            Updated {Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago
          </div>
        )}
      </div>

      {/* Compass — recenter on your location (browser will prompt for permission) */}
      <button
        type="button"
        onClick={onLocatePress}
        disabled={locating}
        className="absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] right-[max(0.75rem,env(safe-area-inset-right))] z-[450] flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/95 backdrop-blur shadow-lg text-[#01411C] active:scale-95 disabled:opacity-60"
        aria-label="Center map on my location"
        title="My location"
      >
        <Navigation className="h-5 w-5" strokeWidth={2.2} />
      </button>

      {/* Legend — on the map, above the floating quick nav; left side */}
      <div className="absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] left-[max(0.75rem,env(safe-area-inset-left))] z-[400] max-w-[min(12rem,calc(100%-6rem))] bg-white/90 backdrop-blur rounded-xl px-3 py-2 shadow text-[10px] space-y-1">
        <div className="font-bold text-gray-700 mb-1">Map Legend</div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-white shadow shrink-0 bg-blue-600 ring-1 ring-blue-500/80" />
          You (GPS)
        </div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Critical</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> High</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500" /> Medium</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#01411C]" /> Offers</div>
        {geoError && <p className="text-[9px] text-amber-700 pt-0.5">{geoError}</p>}
      </div>
    </div>
  );
}
