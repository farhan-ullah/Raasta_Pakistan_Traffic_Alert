import { useListIncidents } from "@workspace/api-client-react";
import { AlertTriangle, Clock, MapPin, ShieldAlert, ArrowRight, Construction, Car, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const getTypeIcon = (type: string) => {
  switch (type) {
    case "construction": return <Construction className="h-4 w-4" />;
    case "accident": return <Car className="h-4 w-4" />;
    case "congestion": return <Activity className="h-4 w-4" />;
    case "vip_movement": return <ShieldAlert className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "blockage": return "bg-red-100 text-red-800 border-red-200";
    case "construction": return "bg-orange-100 text-orange-800 border-orange-200";
    case "vip_movement": return "bg-purple-100 text-purple-800 border-purple-200";
    case "accident": return "bg-crimson-100 text-crimson-800 border-crimson-200";
    case "congestion": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical": return "bg-red-500";
    case "high": return "bg-orange-500";
    case "medium": return "bg-yellow-500";
    case "low": return "bg-green-500";
    default: return "bg-blue-500";
  }
};

export default function Traffic() {
  const [filter, setFilter] = useState<string>("all");
  const { data: incidentsRaw, isLoading, dataUpdatedAt } = useListIncidents(
    { status: "active", type: filter !== "all" ? filter as any : undefined },
    { query: { refetchInterval: 15_000 } }
  );
  const incidents = Array.isArray(incidentsRaw) ? incidentsRaw : [];
  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastUpdated = useRef<Date>(new Date());
  useEffect(() => { lastUpdated.current = new Date(dataUpdatedAt); }, [dataUpdatedAt]);
  useEffect(() => {
    const id = setInterval(() => setSecondsAgo(Math.round((Date.now() - lastUpdated.current.getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-gray-50"
    >
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
              Live Traffic Updates
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {secondsAgo < 5 ? "Just updated" : `${secondsAgo}s ago`}
            </div>
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full bg-gray-50">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Incidents</SelectItem>
              <SelectItem value="blockage">Blockage</SelectItem>
              <SelectItem value="construction">Construction</SelectItem>
              <SelectItem value="vip_movement">VIP Movement</SelectItem>
              <SelectItem value="accident">Accident</SelectItem>
              <SelectItem value="congestion">Congestion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32 p-4" />
              </Card>
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <ShieldAlert className="h-12 w-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-900">All Clear</p>
            <p className="text-sm">No active traffic incidents reported.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            {incidents.map((incident) => (
              <Card key={incident.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: getSeverityColor(incident.severity).replace('bg-', '') }}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold flex items-center gap-1 ${getTypeColor(incident.type)}`}>
                          {getTypeIcon(incident.type)}
                          {incident.type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase bg-gray-100">
                          {incident.severity}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold leading-tight">{incident.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">{incident.description}</p>
                  
                  <div className="flex flex-col gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="font-medium text-gray-700">{incident.location}</span>
                    </div>
                    {incident.estimatedDuration && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>Est. clear: <span className="font-medium text-gray-700">{incident.estimatedDuration}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Citizen photos */}
                  {(incident as any).mediaUrls && (incident as any).mediaUrls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                        📸 Citizen Photos
                      </p>
                      <div className="flex gap-2 overflow-x-auto">
                        {(incident as any).mediaUrls
                          .filter((u: string) => u.startsWith("data:image") || u.match(/\.(jpg|jpeg|png|webp)/i))
                          .slice(0, 3)
                          .map((url: string, idx: number) => (
                            <img key={idx} src={url} alt="incident" className="w-20 h-16 rounded-lg object-cover shrink-0 border border-gray-200" />
                          ))}
                      </div>
                    </div>
                  )}

                  {incident.alternateRoutes && incident.alternateRoutes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                        <ArrowRight className="h-3.5 w-3.5 text-primary" />
                        Alternate Routes
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {incident.alternateRoutes.map((route, i) => (
                          <Badge key={i} variant="secondary" className="bg-primary/5 text-primary border border-primary/10 font-medium">
                            {route}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
}
