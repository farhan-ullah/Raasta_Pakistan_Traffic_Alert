import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, AlertTriangle, CheckCircle, Store, Tag, ShieldAlert, Clock, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#d97706",
  low: "#16a34a",
};

const PIE_COLORS = ["#01411C", "#025a28", "#14532d", "#166534", "#15803d", "#16a34a"];

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: activities } = useGetRecentActivity();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "incident_created": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "incident_resolved": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "offer_created": return <Tag className="w-4 h-4 text-blue-500" />;
      case "merchant_registered": return <Store className="w-4 h-4 text-purple-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-[#01411C] px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Command Center</h1>
            <p className="text-green-200 text-xs mt-0.5">Islamabad Traffic Operations</p>
          </div>
          <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white text-xs font-medium">LIVE</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={AlertTriangle} label="Active Incidents" value={summary.activeIncidents} color="bg-red-500" />
              <StatCard icon={CheckCircle} label="Resolved Today" value={summary.resolvedToday} color="bg-green-600" />
              <StatCard icon={ShieldAlert} label="Critical Alerts" value={summary.criticalAlerts} color="bg-orange-500" />
              <StatCard icon={Navigation} label="Affected Roads" value={summary.affectedRoads} color="bg-amber-500" />
              <StatCard icon={Store} label="Total Merchants" value={summary.totalMerchants} color="bg-[#01411C]" />
              <StatCard icon={Tag} label="Active Offers" value={summary.activeOffers} color="bg-blue-600" />
            </div>

            {summary.incidentsByType && summary.incidentsByType.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-800">Incidents by Type</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={summary.incidentsByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="label"
                      >
                        {summary.incidentsByType.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [val, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {summary.incidentsByType.map((item, idx) => (
                      <div key={item.category} className="flex items-center gap-1 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-gray-600 capitalize">{item.label || item.category.replace(/_/g, " ")}</span>
                        <span className="font-bold text-gray-800">({item.count})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {summary.hourlyIncidents && summary.hourlyIncidents.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-800">Hourly Incidents (Today)</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={summary.hourlyIncidents} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#01411C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}

        {activities && activities.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#01411C]" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {activities.slice(0, 8).map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{activity.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(activity.timestamp).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {activity.severity && activity.severity !== "low" && (
                        <Badge
                          className="text-xs px-1.5 py-0"
                          style={{ backgroundColor: SEVERITY_COLORS[activity.severity] + "20", color: SEVERITY_COLORS[activity.severity], borderColor: SEVERITY_COLORS[activity.severity] + "40" }}
                        >
                          {activity.severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
