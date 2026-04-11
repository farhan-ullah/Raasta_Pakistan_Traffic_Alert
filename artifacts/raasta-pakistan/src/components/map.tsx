import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapIncident, Offer } from "@workspace/api-client-react/src/generated/api.schemas";
import { Badge } from "@/components/ui/badge";

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

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

interface MapProps {
  incidents?: MapIncident[];
  offers?: Offer[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  lastUpdated?: Date;
}

export function LiveMap({
  incidents = [],
  offers = [],
  center = [33.6844, 73.0479],
  zoom = 12,
  className = "w-full h-full min-h-[300px] z-0",
  lastUpdated,
}: MapProps) {
  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
      <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-1.5">
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

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur rounded-xl px-3 py-2 shadow text-[10px] space-y-1">
        <div className="font-bold text-gray-700 mb-1">Map Legend</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Critical</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> High</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500" /> Medium</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#01411C]" /> Offers</div>
      </div>
    </div>
  );
}
