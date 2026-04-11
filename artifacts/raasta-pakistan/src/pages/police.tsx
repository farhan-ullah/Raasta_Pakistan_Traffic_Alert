import { useState } from "react";
import { useListIncidents, useCreateIncident, useUpdateIncident } from "@workspace/api-client-react";
import { Shield, Plus, MapPin, Clock, AlertTriangle, CheckCircle, X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const INCIDENT_TYPES = [
  { value: "blockage", label: "Road Blockage", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "construction", label: "Construction", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "vip_movement", label: "VIP Movement", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "accident", label: "Accident", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "congestion", label: "Congestion", color: "bg-amber-100 text-amber-700 border-amber-200" },
];

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-green-600 text-white",
};

const islamabadAreas = ["Blue Area", "F-6", "F-7", "F-8", "G-9", "G-11", "I-8", "Faizabad", "Zero Point", "Constitution Avenue", "Margalla Hills", "Pir Wadhai", "Diplomatic Enclave", "Federal Area"];

export default function PoliceDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "blockage",
    title: "",
    description: "",
    location: "",
    area: "",
    severity: "medium",
    officerName: "",
    affectedRoads: "",
    alternateRoutes: "",
    estimatedDuration: "",
    lat: 33.6844,
    lng: 73.0479,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: incidents, isLoading } = useListIncidents({ status: "all" }, { query: { refetchInterval: 10_000 } });
  const createMutation = useCreateIncident();
  const updateMutation = useUpdateIncident();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.location) {
      toast({ title: "Missing fields", description: "Title and location are required.", variant: "destructive" });
      return;
    }

    try {
      await createMutation.mutateAsync({
        data: {
          type: form.type as "blockage" | "construction" | "vip_movement" | "accident" | "congestion",
          title: form.title,
          description: form.description,
          location: form.location,
          area: form.area,
          city: "Islamabad",
          lat: form.lat,
          lng: form.lng,
          severity: form.severity as "low" | "medium" | "high" | "critical",
          officerName: form.officerName,
          affectedRoads: form.affectedRoads.split("\n").filter(Boolean),
          alternateRoutes: form.alternateRoutes.split("\n").filter(Boolean),
          estimatedDuration: form.estimatedDuration,
        }
      });
      await queryClient.invalidateQueries();
      toast({ title: "Incident posted!", description: "Alert is now live on the map." });
      setShowForm(false);
      setForm({ type: "blockage", title: "", description: "", location: "", area: "", severity: "medium", officerName: "", affectedRoads: "", alternateRoutes: "", estimatedDuration: "", lat: 33.6844, lng: 73.0479 });
    } catch {
      toast({ title: "Failed to post incident", variant: "destructive" });
    }
  };

  const resolveIncident = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status: "resolved" } });
      await queryClient.invalidateQueries();
      toast({ title: "Incident resolved" });
    } catch {
      toast({ title: "Failed to resolve", variant: "destructive" });
    }
  };

  const activeIncidents = incidents?.filter(i => i.status === "active") || [];
  const resolvedIncidents = incidents?.filter(i => i.status === "resolved") || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="bg-[#01411C] px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <h1 className="text-xl font-bold">Police Command</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-300 font-medium">LIVE</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-red-300">{activeIncidents.length}</div>
            <div className="text-xs text-white/70 mt-0.5">Active</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-green-300">{resolvedIncidents.length}</div>
            <div className="text-xs text-white/70 mt-0.5">Resolved</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-amber-300">
              {activeIncidents.filter(i => i.severity === "critical").length}
            </div>
            <div className="text-xs text-white/70 mt-0.5">Critical</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Report New Incident
        </Button>

        {showForm && (
          <Card className="bg-gray-900 border-gray-700 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>New Incident Report</span>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Incident Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {INCIDENT_TYPES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, type: t.value }))}
                        className={`p-2 rounded-xl text-xs font-medium border transition-all ${
                          form.type === t.value ? "bg-white/20 border-white/40" : "bg-white/5 border-white/10"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Severity</label>
                  <div className="grid grid-cols-4 gap-1">
                    {["low", "medium", "high", "critical"].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, severity: s }))}
                        className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                          form.severity === s ? SEVERITY_STYLES[s] : "bg-white/10 text-gray-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Incident title *"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/40"
                />

                <div className="relative">
                  <select
                    value={form.area}
                    onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-white/40"
                  >
                    <option value="" className="bg-gray-800">Select Area</option>
                    {islamabadAreas.map(a => (
                      <option key={a} value={a} className="bg-gray-800">{a}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Specific location / street *"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/40"
                />

                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description of the incident..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/40 resize-none"
                />

                <input
                  value={form.officerName}
                  onChange={e => setForm(f => ({ ...f, officerName: e.target.value }))}
                  placeholder="Officer name / badge"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/40"
                />

                <textarea
                  value={form.affectedRoads}
                  onChange={e => setForm(f => ({ ...f, affectedRoads: e.target.value }))}
                  placeholder="Affected roads (one per line)"
                  rows={2}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/40 resize-none"
                />

                <textarea
                  value={form.alternateRoutes}
                  onChange={e => setForm(f => ({ ...f, alternateRoutes: e.target.value }))}
                  placeholder="Alternate routes (one per line)"
                  rows={2}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/40 resize-none"
                />

                <input
                  value={form.estimatedDuration}
                  onChange={e => setForm(f => ({ ...f, estimatedDuration: e.target.value }))}
                  placeholder="Estimated duration (e.g. 2 hours)"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:border-white/40"
                />

                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full bg-[#01411C] hover:bg-[#025a28] font-bold py-3 rounded-xl"
                >
                  {createMutation.isPending ? "Posting..." : "Post Live Alert"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Active Incidents
          </h2>
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-800 animate-pulse rounded-2xl mb-3" />
            ))
          ) : activeIncidents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-600" />
              <p>No active incidents</p>
            </div>
          ) : (
            activeIncidents.map(incident => (
              <Card key={incident.id} className="bg-gray-900 border-gray-800 mb-3">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEVERITY_STYLES[incident.severity] || "bg-gray-700 text-white"}`}>
                          {incident.severity?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400 capitalize">{incident.type?.replace(/_/g, " ")}</span>
                      </div>
                      <h3 className="font-bold text-white text-sm">{incident.title}</h3>
                      <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{incident.location}</span>
                      </div>
                      {incident.officerName && (
                        <div className="text-xs text-gray-500 mt-0.5">Officer: {incident.officerName}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => resolveIncident(incident.id)}
                      disabled={updateMutation.isPending}
                      className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-800 text-xs px-3 shrink-0"
                    >
                      Resolve
                    </Button>
                  </div>
                  {incident.estimatedDuration && (
                    <div className="flex items-center gap-1 text-gray-500 text-xs mt-2">
                      <Clock className="w-3 h-3" />
                      <span>Est. clear: {incident.estimatedDuration}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {resolvedIncidents.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Resolved Today ({resolvedIncidents.length})
            </h2>
            {resolvedIncidents.slice(0, 3).map(incident => (
              <Card key={incident.id} className="bg-gray-900/50 border-gray-800 mb-2 opacity-60">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <div>
                      <h4 className="text-sm text-gray-400 font-medium">{incident.title}</h4>
                      <p className="text-xs text-gray-600">{incident.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
