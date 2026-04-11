import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapIncident, Offer } from "@workspace/api-client-react/src/generated/api.schemas";
import { Badge } from "@/components/ui/badge";

// Fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical": return "#ef4444"; // red-500
    case "high": return "#f97316"; // orange-500
    case "medium": return "#eab308"; // yellow-500
    case "low": return "#22c55e"; // green-500
    default: return "#3b82f6"; // blue-500
  }
};

const createIncidentIcon = (severity: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${getSeverityColor(severity)}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    className: "custom-leaflet-icon",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const createOfferIcon = () => {
  return L.divIcon({
    html: `<div style="background-color: #01411C; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    className: "custom-leaflet-icon",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

interface MapProps {
  incidents?: MapIncident[];
  offers?: Offer[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export function LiveMap({ incidents = [], offers = [], center = [33.6844, 73.0479], zoom = 12, className = "w-full h-full min-h-[300px] z-0" }: MapProps) {
  return (
    <div className={`relative ${className}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {incidents.map((incident) => (
          <Marker
            key={`incident-${incident.id}`}
            position={[incident.lat, incident.lng]}
            icon={createIncidentIcon(incident.severity)}
          >
            <Popup>
              <div className="p-1">
                <h4 className="font-semibold text-sm mb-1">{incident.title}</h4>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{incident.type}</Badge>
                  <span className="text-xs font-medium capitalize" style={{ color: getSeverityColor(incident.severity) }}>
                    {incident.severity}
                  </span>
                </div>
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
              <div className="p-1">
                <h4 className="font-semibold text-sm mb-1">{offer.title}</h4>
                <p className="text-xs text-muted-foreground mb-1">{offer.merchantName}</p>
                <div className="font-bold text-primary text-sm">{offer.discountPercent}% OFF</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
