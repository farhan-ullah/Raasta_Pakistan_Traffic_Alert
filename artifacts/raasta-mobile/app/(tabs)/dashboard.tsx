import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useGetDashboardSummary, useGetRecentActivity, useListIncidents } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { ActivityItem } from "@workspace/api-client-react";
import { brandGradientColors } from "@/components/ui/screenTokens";

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

const cardLift = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: { elevation: 5 },
  default: {},
});

const statLift = Platform.select({
  ios: {
    shadowColor: "#01411C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {},
});

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
  const bottomPad = Platform.OS === "web" ? 112 : insets.bottom + 88;

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
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }, statLift]}>
        <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
          <Feather name={icon as any} size={19} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#012814", "#01411C", "#0a5c36"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 12 }]}
      >
        <Text style={styles.heroEyebrow}>Insights</Text>
        <Text style={styles.heroTitle}>Analytics</Text>
        <Text style={styles.heroSub}>Islamabad traffic overview</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#25a244" />}
      >

        <Pressable
          onPress={() => router.push("/offers")}
          style={({ pressed }) => [styles.offersCtaOuter, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel="Open offers and deals"
        >
          <LinearGradient
            colors={[...brandGradientColors]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.offersCtaGradient}
          >
            <View style={[styles.offersCtaIcon, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
              <Feather name="tag" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.offersCtaTitle}>Offers & deals</Text>
              <Text style={styles.offersCtaSub}>Browse discounts from Islamabad merchants</Text>
              {(summary?.activeOffers ?? 0) > 0 ? (
                <Text style={styles.offersCtaBadge}>
                  {summary!.activeOffers} live {(summary!.activeOffers === 1 ? "offer" : "offers")} now
                </Text>
              ) : (
                <Text style={styles.offersCtaBadgeMuted}>Tap to browse merchant offers</Text>
              )}
            </View>
            <Feather name="chevron-right" size={22} color="rgba(255,255,255,0.95)" />
          </LinearGradient>
        </Pressable>

        <View style={styles.statsGrid}>
          <StatCard label="Active" value={activeCount} icon="alert-circle" color="#ef4444" />
          <StatCard label="Resolved today" value={resolvedToday} icon="check-circle" color="#22c55e" />
          <StatCard label="Critical" value={criticalAlerts} icon="alert-triangle" color="#f97316" />
          <StatCard label="Merchants" value={summary?.totalMerchants ?? 0} icon="shopping-bag" color="#8b5cf6" />
        </View>

        {incidentsByType.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }, cardLift]}>
            <View style={styles.sectionHead}>
              <Feather name="pie-chart" size={16} color={colors.primaryLight} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>By incident type</Text>
            </View>
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
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }, cardLift]}>
              <View style={styles.sectionHead}>
                <Feather name="alert-octagon" size={16} color={colors.primaryLight} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>By severity</Text>
              </View>
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

        {activity.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }, cardLift]}>
            <View style={styles.sectionHead}>
              <Feather name="activity" size={16} color={colors.primaryLight} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent activity</Text>
            </View>
            {activity.slice(0, 10).map((item: ActivityItem, i: number) => (
              <View key={i} style={[styles.actRow, i < activity.length - 1 ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth } : {}]}>
                <View style={[styles.actDot, { backgroundColor: colors.primary + "44" }]}>
                  <View style={[styles.actDotInner, { backgroundColor: colors.primaryLight }]} />
                </View>
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
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="bar-chart-2" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No analytics yet. Incidents will show here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
    fontWeight: "600",
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  statCard: {
    flexBasis: "46%",
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 30, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600" },
  offersCtaOuter: {
    marginBottom: 18,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#01411C",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  offersCtaGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  offersCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  offersCtaTitle: { color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  offersCtaSub: { color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: "600", marginTop: 4 },
  offersCtaBadge: { color: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: "800", marginTop: 8 },
  offersCtaBadgeMuted: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "600", marginTop: 8 },
  section: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  barLabel: { fontSize: 12, width: 108 },
  barTrack: { flex: 1, height: 7, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 7, borderRadius: 4 },
  barCount: { fontSize: 12, fontWeight: "700", width: 28, textAlign: "right" },
  sevDot: { width: 9, height: 9, borderRadius: 5 },
  actRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  actDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actDotInner: { width: 8, height: 8, borderRadius: 4 },
  actContent: { flex: 1 },
  actTitle: { fontSize: 14, fontWeight: "600" },
  actTime: { fontSize: 12, marginTop: 3 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 48, gap: 16 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 24 },
});
