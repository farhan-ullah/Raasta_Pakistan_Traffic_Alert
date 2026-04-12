import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useGetDashboardSummary, useGetRecentActivity, useListIncidents } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { ActivityItem } from "@workspace/api-client-react";

const SEV_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

const TYPE_LABEL: Record<string, string> = {
  blockage: "Road Blocked",
  construction: "Construction",
  vip_movement: "VIP Movement",
  accident: "Accident",
  congestion: "Traffic Jam",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const { data: summary, isLoading: sumLoading, refetch: refetchSum } = useGetDashboardSummary({
    query: { refetchInterval: 20_000 } as any,
  });

  const { data: activity = [], isLoading: actLoading, refetch: refetchAct } = useGetRecentActivity({
    query: { refetchInterval: 20_000 } as any,
  });

  const { data: allIncidents = [] } = useListIncidents(
    {},
    { query: { refetchInterval: 20_000, queryKey: ["listIncidents", "dashboard"] } }
  );

  const isLoading = sumLoading || actLoading;
  const refetch = () => { refetchSum(); refetchAct(); };

  const activeCount = summary?.activeIncidents ?? allIncidents.filter((i) => i.status === "active").length;
  const resolvedToday = summary?.resolvedToday ?? allIncidents.filter((i) => i.status === "resolved").length;
  const criticalAlerts = summary?.criticalAlerts ?? 0;
  const incidentsByType = summary?.incidentsByType ?? [];

  function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
    return (
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
          <Feather name={icon as any} size={18} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSub}>Islamabad Traffic Overview</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
      >
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard label="Active" value={activeCount} icon="alert-circle" color="#ef4444" />
          <StatCard label="Resolved Today" value={resolvedToday} icon="check-circle" color="#22c55e" />
          <StatCard label="Critical" value={criticalAlerts} icon="alert-triangle" color="#f97316" />
          <StatCard label="Merchants" value={summary?.totalMerchants ?? 0} icon="shopping-bag" color="#8b5cf6" />
        </View>

        {/* Active Offers */}
        {(summary?.activeOffers ?? 0) > 0 && (
          <View style={[styles.offersBanner, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}>
            <Feather name="tag" size={18} color={colors.primaryLight} />
            <Text style={[styles.offersText, { color: colors.text }]}>
              <Text style={{ fontWeight: "700" as const, color: colors.primaryLight }}>{summary!.activeOffers}</Text> live offers available in Islamabad
            </Text>
          </View>
        )}

        {/* By Type */}
        {incidentsByType.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>By Incident Type</Text>
            {incidentsByType.map(({ category, count }: { category: string; count: number }) => {
              const pct = activeCount > 0 ? (count / activeCount) * 100 : 0;
              return (
                <View key={category} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.text }]}>{TYPE_LABEL[category] ?? category}</Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.barCount, { color: colors.mutedForeground }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Severity breakdown from incidents */}
        {allIncidents.length > 0 && (() => {
          const sevCounts: Record<string, number> = {};
          for (const inc of allIncidents) {
            if (inc.status === "active" && inc.severity) {
              sevCounts[inc.severity] = (sevCounts[inc.severity] ?? 0) + 1;
            }
          }
          const hasSev = Object.values(sevCounts).some(Boolean);
          if (!hasSev) return null;
          return (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>By Severity</Text>
              {["critical", "high", "medium", "low"].map((sev) => {
                const count = sevCounts[sev] ?? 0;
                if (!count) return null;
                const pct = activeCount > 0 ? (count / activeCount) * 100 : 0;
                const color = SEV_COLOR[sev] ?? "#888";
                return (
                  <View key={sev} style={styles.barRow}>
                    <View style={[styles.sevDot, { backgroundColor: color }]} />
                    <Text style={[styles.barLabel, { color: colors.text, flex: 1 }]}>{sev.charAt(0).toUpperCase() + sev.slice(1)}</Text>
                    <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.barCount, { color: colors.mutedForeground }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* Recent Activity */}
        {activity.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            {activity.slice(0, 10).map((item: ActivityItem, i: number) => (
              <View key={i} style={[styles.actRow, i < activity.length - 1 ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth } : {}]}>
                <View style={[styles.actDot, { backgroundColor: colors.primaryLight }]} />
                <View style={styles.actContent}>
                  <Text style={[styles.actTitle, { color: colors.text }]} numberOfLines={1}>{item.title ?? "Activity"}</Text>
                  <Text style={[styles.actTime, { color: colors.mutedForeground }]}>{timeAgo(item.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!isLoading && activeCount === 0 && activity.length === 0 && (
          <View style={styles.empty}>
            <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data yet. Incidents will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "900" as const, color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { flexBasis: "47%", flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 28, fontWeight: "800" as const },
  statLabel: { fontSize: 11, fontWeight: "600" as const },
  offersBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  offersText: { fontSize: 14, flex: 1 },
  section: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: "700" as const, marginBottom: 14 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  barLabel: { fontSize: 12, width: 100 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  barCount: { fontSize: 12, fontWeight: "600" as const, width: 24, textAlign: "right" },
  sevDot: { width: 8, height: 8, borderRadius: 4 },
  actRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  actDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  actContent: { flex: 1 },
  actTitle: { fontSize: 13, fontWeight: "500" as const },
  actTime: { fontSize: 11, marginTop: 2 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
