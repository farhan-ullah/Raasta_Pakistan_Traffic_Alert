import { useState, useEffect, useCallback } from "react";
import { useListIncidents, type GeocodePlace } from "@workspace/api-client-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import {
  Shield, Plus, MapPin, Clock, AlertTriangle, CheckCircle,
  X, Camera, Users, ShieldCheck, LogOut, Lock, Eye, EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { getWebApiOrigin } from "@/constants/apiOrigin";
const TOKEN_KEY = "raasta_police_token";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-500 text-white",
  low: "bg-green-600 text-white",
};
const TYPE_EMOJI: Record<string, string> = {
  blockage: "🚫", construction: "🚧", vip_movement: "👑", accident: "💥", congestion: "🚗",
};
const INCIDENT_TYPES = [
  { value: "blockage", label: "Road Blockage" },
  { value: "construction", label: "Construction" },
  { value: "vip_movement", label: "VIP Movement" },
  { value: "accident", label: "Accident" },
  { value: "congestion", label: "Congestion" },
];

type Tab = "citizen" | "post" | "resolved";

function policeHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getWebApiOrigin()}/api/auth/police/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const { token } = await res.json() as { token: string };
        localStorage.setItem(TOKEN_KEY, token);
        toast({ title: "Access granted", description: "Welcome, Officer." });
        onLogin(token);
      } else {
        let msg = "Invalid access code. Contact your supervisor.";
        try {
          const body = await res.json() as { error?: string };
          if (body.error === "Police auth not configured") {
            msg = "Police login is not configured on the server (set POLICE_PIN).";
          } else if (res.status === 401) {
            msg = "Invalid access code. Contact your supervisor.";
          } else if (body.error) {
            msg = body.error;
          }
        } catch {
          if (res.status === 404) {
            msg = "API not reachable. Start the API server and use Vite dev (proxies /api), or deploy API and web together.";
          }
        }
        setError(msg);
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#01411C] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900/40">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Police Command</h1>
          <p className="text-gray-400 text-sm mt-1">Raasta — Islamabad Traffic Control</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-[#25a244]" />
            <p className="text-sm text-gray-300 font-medium">Officer Access Code Required</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={e => { setPin(e.target.value); setError(""); }}
                placeholder="Enter access code"
                maxLength={30}
                autoComplete="current-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 pr-12 focus:outline-none focus:border-[#01411C] text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPin(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-300 text-xs">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !pin.trim()}
              className="w-full bg-[#01411C] hover:bg-[#025a28] font-bold py-3 rounded-xl text-sm"
            >
              {loading ? "Verifying..." : "🚔 Enter Portal"}
            </Button>
          </form>

          <p className="text-center text-[11px] text-gray-600 mt-4">
            Access restricted to authorized Islamabad Traffic Police officers.
          </p>
        </div>

        <Link href="/">
          <p className="text-center text-xs text-gray-600 mt-5 hover:text-gray-400">← Back to Map</p>
        </Link>
      </div>
    </div>
  );
}

export default function PoliceDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tab, setTab] = useState<Tab>("citizen");
  const [form, setForm] = useState({
    type: "blockage", title: "", description: "", severity: "medium", officerName: "", badge: "",
    affectedRoads: "", alternateRoutes: "", estimatedDuration: "",
  });
  const [place, setPlace] = useState<GeocodePlace | null>(null);
  const [locQuery, setLocQuery] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) { setCheckingToken(false); return; }
    fetch(`${getWebApiOrigin()}/api/auth/police/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: saved }),
    })
      .then(r => r.json() as Promise<{ valid: boolean }>)
      .then(({ valid }) => {
        if (valid) setToken(saved);
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setCheckingToken(false));
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    toast({ title: "Logged out", description: "Police session ended." });
  };

  const { data: incidentsRaw, isLoading } = useListIncidents(
    { status: "all" },
    { query: { refetchInterval: token ? 10_000 : false } }
  );
  const incidents = Array.isArray(incidentsRaw) ? incidentsRaw : [];

  const activeIncidents = incidents.filter(i => i.status === "active");
  const resolvedIncidents = incidents.filter(i => i.status === "resolved");
  const citizenReports = activeIncidents.filter(i => i.reportedBy === "citizen");
  const policeReports = activeIncidents.filter(i => i.reportedBy !== "citizen");
  const unverified = citizenReports.filter((i: any) => !i.isVerifiedByPolice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !place || !token) return;
    const locationLine = [place.fullName, locationDetail.trim()].filter(Boolean).join(", ");
    setSubmitting(true);
    try {
      const res = await fetch(`${getWebApiOrigin()}/api/incidents`, {
        method: "POST",
        headers: policeHeaders(token),
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          description: form.description,
          location: locationLine,
          area: place.area ?? "",
          city: place.state ?? "Unknown",
          lat: place.lat,
          lng: place.lng,
          severity: form.severity,
          officerName: `${form.officerName}${form.badge ? ` (${form.badge})` : ""}`,
          reportedBy: "police",
          affectedRoads: form.affectedRoads.split("\n").filter(Boolean),
          alternateRoutes: form.alternateRoutes.split("\n").filter(Boolean),
          estimatedDuration: form.estimatedDuration,
        }),
      });
      if (!res.ok) throw new Error();
      await queryClient.invalidateQueries();
      toast({ title: "Alert posted!", description: "Live on the map now." });
      setForm({ type: "blockage", title: "", description: "", severity: "medium", officerName: "", badge: "", affectedRoads: "", alternateRoutes: "", estimatedDuration: "" });
      setPlace(null);
      setLocQuery("");
      setLocationDetail("");
    } catch {
      toast({ title: "Failed to post alert", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resolveIncident = async (id: string) => {
    if (!token) return;
    const res = await fetch(`${getWebApiOrigin()}/api/incidents/${id}`, {
      method: "PATCH",
      headers: policeHeaders(token),
      body: JSON.stringify({ status: "resolved" }),
    });
    if (res.ok) {
      await queryClient.invalidateQueries();
      toast({ title: "Incident resolved ✓" });
    }
  };

  const verifyReport = async (id: string) => {
    if (!token) return;
    const res = await fetch(`${getWebApiOrigin()}/api/incidents/${id}`, {
      method: "PATCH",
      headers: policeHeaders(token),
      body: JSON.stringify({ isVerifiedByPolice: true, severity: "high" }),
    });
    if (res.ok) {
      await queryClient.invalidateQueries();
      toast({ title: "Report verified ✓", description: "Marked as police-verified." });
    }
  };

  const IncidentCard = ({ incident, showVerify = false }: { incident: any; showVerify?: boolean }) => (
    <Card className="bg-gray-900 border-gray-800 mb-3">
      <CardContent className="p-4">
        {incident.mediaUrls && incident.mediaUrls.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {incident.mediaUrls
              .filter((u: string) => u.startsWith("data:image") || u.match(/\.(jpg|jpeg|png|webp|gif)/i))
              .slice(0, 3)
              .map((url: string, idx: number) => (
                <img key={idx} src={url} alt={`photo ${idx + 1}`}
                  className="w-24 h-20 rounded-xl object-cover shrink-0 border border-gray-700" />
              ))}
            {incident.mediaUrls.some((u: string) => u.startsWith("http") && !u.match(/\.(jpg|jpeg|png|webp|gif)/i)) && (
              <div className="w-24 h-20 rounded-xl border border-gray-700 flex items-center justify-center text-xs text-gray-400 shrink-0">📹 Video</div>
            )}
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-base">{TYPE_EMOJI[incident.type] || "⚠️"}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_STYLES[incident.severity] || "bg-gray-700 text-white"}`}>
                {incident.severity?.toUpperCase()}
              </span>
              {incident.reportedBy === "citizen" && (
                <Badge className={`text-[10px] ${incident.isVerifiedByPolice ? "bg-blue-900/40 text-blue-300 border-blue-700" : "bg-yellow-900/40 text-yellow-300 border-yellow-700"}`}>
                  {incident.isVerifiedByPolice ? "✓ Verified" : "👤 Citizen"}
                </Badge>
              )}
              {incident.reportedBy === "police" && (
                <Badge className="text-[10px] bg-green-900/40 text-green-300 border-green-700">🚔 Police</Badge>
              )}
            </div>
            <h3 className="font-bold text-white text-sm leading-tight">{incident.title}</h3>
            {incident.description && <p className="text-gray-400 text-xs mt-1 line-clamp-2">{incident.description}</p>}
            <div className="flex items-center gap-1 text-gray-500 text-xs mt-1.5">
              <MapPin className="w-3 h-3" /><span className="truncate">{incident.location}</span>
            </div>
            {incident.officerName && <div className="text-xs text-gray-500 mt-0.5">👮 {incident.officerName}</div>}
            {incident.estimatedDuration && (
              <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                <Clock className="w-3 h-3" />{incident.estimatedDuration}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {showVerify && !incident.isVerifiedByPolice && (
              <Button size="sm" onClick={() => verifyReport(incident.id)}
                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-800 text-[10px] px-2 h-7">
                <ShieldCheck className="w-3 h-3 mr-1" />Verify
              </Button>
            )}
            <Button size="sm" onClick={() => resolveIncident(incident.id)}
              className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-800 text-[10px] px-2 h-7">
              ✓ Resolve
            </Button>
          </div>
        </div>
        {incident.alternateRoutes && incident.alternateRoutes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <p className="text-[10px] text-gray-500 mb-1">ALTERNATE ROUTES:</p>
            <div className="flex flex-wrap gap-1">
              {incident.alternateRoutes.map((r: string, i: number) => (
                <span key={i} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{r}</span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#01411C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <LoginScreen onLogin={setToken} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      <div className="bg-[#01411C] px-4 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-black">Police Command</h1>
              <p className="text-green-200 text-[10px]">Islamabad Traffic Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-red-500 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-white text-[10px] font-bold">LIVE</span>
            </div>
            <button onClick={logout} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors" title="Logout">
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-xl font-black text-red-300">{activeIncidents.length}</div>
            <div className="text-[9px] text-white/60">Active</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-xl font-black text-yellow-300">{unverified.length}</div>
            <div className="text-[9px] text-white/60">Unverified</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-xl font-black text-blue-300">{citizenReports.length}</div>
            <div className="text-[9px] text-white/60">Citizens</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-xl font-black text-green-300">{resolvedIncidents.length}</div>
            <div className="text-[9px] text-white/60">Resolved</div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        {([
          { key: "citizen", label: "Citizen Reports", count: citizenReports.length, icon: <Users className="w-3.5 h-3.5" /> },
          { key: "post", label: "Post Alert", icon: <Plus className="w-3.5 h-3.5" /> },
          { key: "resolved", label: "Resolved", count: resolvedIncidents.length, icon: <CheckCircle className="w-3.5 h-3.5" /> },
        ] as { key: Tab; label: string; count?: number; icon: React.ReactNode }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold border-b-2 transition-colors ${
              tab === t.key ? "border-[#01411C] text-[#25a244]" : "border-transparent text-gray-500"
            }`}>
            {t.icon}<span>{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === t.key ? "bg-[#01411C] text-white" : "bg-gray-800 text-gray-400"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "citizen" && (
          <div>
            {unverified.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-yellow-300 text-xs font-medium">
                  {unverified.length} citizen report{unverified.length > 1 ? "s" : ""} awaiting verification
                </p>
              </div>
            )}
            {isLoading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-800 animate-pulse rounded-2xl mb-3" />)
            ) : citizenReports.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No citizen reports right now</p>
                <p className="text-xs mt-1">Reports submitted by citizens will appear here</p>
              </div>
            ) : (
              citizenReports.map(incident => <IncidentCard key={incident.id} incident={incident} showVerify={true} />)
            )}
            {policeReports.length > 0 && (
              <>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 mt-4 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />Police-Posted ({policeReports.length})
                </h3>
                {policeReports.map(incident => <IncidentCard key={incident.id} incident={incident} />)}
              </>
            )}
          </div>
        )}

        {tab === "post" && (
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />Post Official Police Alert
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-2">Incident Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {INCIDENT_TYPES.map(t => (
                      <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                          form.type === t.value ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-white/10 text-gray-400"
                        }`}>
                        {TYPE_EMOJI[t.value]} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Severity</p>
                  <div className="grid grid-cols-4 gap-1">
                    {["low", "medium", "high", "critical"].map(s => (
                      <button key={s} type="button" onClick={() => setForm(f => ({ ...f, severity: s }))}
                        className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all ${
                          form.severity === s ? SEVERITY_STYLES[s] : "bg-white/10 text-gray-400"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Incident title *" className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.officerName} onChange={e => setForm(f => ({ ...f, officerName: e.target.value }))}
                    placeholder="Officer name" className="bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40" />
                  <input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                    placeholder="Badge #" className="bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Location * — search any place</p>
                  <LocationAutocomplete
                    variant="dark"
                    value={locQuery}
                    onChange={(v) => {
                      setLocQuery(v);
                      if (place && v !== place.fullName) setPlace(null);
                    }}
                    selected={place}
                    onSelect={(p) => {
                      setPlace(p);
                      setLocQuery(p.fullName);
                    }}
                    placeholder="e.g. F-6 Islamabad, MM Alam Road Lahore…"
                  />
                </div>
                <input value={locationDetail} onChange={e => setLocationDetail(e.target.value)}
                  placeholder="Additional detail (optional) — e.g. near Gate 2, main signal"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40" />
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Situation description..." rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40 resize-none" />
                <textarea value={form.affectedRoads} onChange={e => setForm(f => ({ ...f, affectedRoads: e.target.value }))}
                  placeholder="Affected roads (one per line)" rows={2}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40 resize-none" />
                <textarea value={form.alternateRoutes} onChange={e => setForm(f => ({ ...f, alternateRoutes: e.target.value }))}
                  placeholder="Alternate routes (one per line)" rows={2}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40 resize-none" />
                <input value={form.estimatedDuration} onChange={e => setForm(f => ({ ...f, estimatedDuration: e.target.value }))}
                  placeholder="Estimated duration (e.g. 2 hours)" className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/40" />
                {(!form.title.trim() || !place) && !submitting && (
                  <p className="text-xs text-amber-300/95 text-center leading-snug px-1">
                    Add <span className="font-semibold">incident title</span> and{" "}
                    <span className="font-semibold">choose a location</span> from search suggestions — both are required to post.
                  </p>
                )}
                <Button type="submit" disabled={submitting || !form.title.trim() || !place}
                  className="w-full bg-[#01411C] hover:bg-[#025a28] font-bold py-3 rounded-xl text-sm disabled:opacity-50">
                  {submitting ? "Posting..." : "🚔 Post Live Alert"}
                </Button>
              </form>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 text-center">
              <p className="text-gray-400 text-sm mb-3">Other portals</p>
              <div className="flex gap-2 justify-center">
                <Link href="/merchant-portal">
                  <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs">🏪 Merchant Portal</Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs">📊 Analytics</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {tab === "resolved" && (
          <div>
            {resolvedIncidents.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No resolved incidents yet</p>
              </div>
            ) : (
              resolvedIncidents.slice(0, 20).map(incident => (
                <Card key={incident.id} className="bg-gray-900/60 border-gray-800 mb-3 opacity-70">
                  <CardContent className="p-3 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{TYPE_EMOJI[incident.type] || "⚠️"}</span>
                        <h4 className="text-sm text-gray-300 font-medium truncate">{incident.title}</h4>
                      </div>
                      <p className="text-xs text-gray-600 truncate mt-0.5">{incident.location}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
