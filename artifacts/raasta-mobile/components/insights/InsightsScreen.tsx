import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Pressable,
  Image,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";
import { router } from "expo-router";
import { useGetDashboardSummary, useGetRecentActivity, useListIncidents } from "@workspace/api-client-react";
import type { ActivityItem } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ScreenHero } from "@/components/ui/ScreenHero";
import { cardShadow } from "@/components/ui/screenTokens";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

const SEV_COLOR: Record<string, string> = {
  critical: "#ba1a1a",
  high: "#f97316",
  medium: "#717970",
  low: "#53b46a",
};

const BAR_COLORS: Record<string, string> = {
  accident: "#ba1a1a",
  blockage: "#01411c",
  construction: "#01411c",
  congestion: "#006E26",
  vip_movement: "#53b46a",
  weather: "#53b46a",
  event: "#00290f",
};

const TYPE_LABEL: Record<string, string> = {
  blockage: "Roadworks",
  construction: "Roadworks",
  vip_movement: "Events",
  accident: "Accidents",
  congestion: "Traffic",
  weather: "Weather",
  event: "Events",
};

const DASH_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDuz-76AqOBZpY1h0e-sRr9mVOmej2QtHCo6lMFnK90zPnxf-BU4CgytxwYfDmGQRBxx_SSaCZ3yToUUmHaqGX8HUTO6PWyLIRqkP61yetAGT7CvdeFq3OsPCm8Bbq4SrV8Rrk7ATYx1UaR-SSmjjMZdZaVbkYNixDt5vS32icohyZ_743HPDCnEy39DYr5_HjLKXgYVVAKSrgMRUA62Kr6NaDXLz6fHNodjXnzPijd44DiTCUq_W_cledubiYhy-J7JxNN9sQCgd8e";

const OFFERS_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBOdtHdR79suOWFQAv_JIUrmoVF9dfMbo-hrMgkc0vx6N-QVLbA8ypCJ5TLltn_lavPEoFDK_asFaLPNalEca8nXRsbsWE4XqzJ_j_1mPdGzv2wzhY1yh8vYvGI_90DdAyQ99MKrpa1bYmzPviktTAliFqWG-vHlu93yIDcjyDSENADmoDkAAFMBwFwKg6BTB82wXgNrqPCeDfajZdcaWZfYbLJX6t9UcVMnfMcrlismqExsiIv9OkoB2TEVFQRGfVEFWqK-GkTUPqw";

const cardLift = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: { elevation: 5 },
  default: {},
});

function timeAgo(ts: string | Date): string {
  const t = typeof ts === "string" ? ts : ts.toISOString();
  const diff = Math.floor((Date.now() - new Date(t).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function InsightsScreen() {
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
    { query: { refetchInterval: 20_000, queryKey: ["listIncidents", "home-insights"] } }
  );

  const isLoading = sumLoading || actLoading;
  const refetch = () => {
    refetchSum();
    refetchAct();
  };

  const activeCount = summary?.activeIncidents ?? allIncidents.filter((i) => i.status === "active").length;
  const resolvedToday = summary?.resolvedToday ?? allIncidents.filter((i) => i.status === "resolved").length;
  const criticalAlerts = summary?.criticalAlerts ?? 0;
  const incidentsByType = summary?.incidentsByType ?? [];

  const partners = summary?.totalMerchants ?? 0;
  const offers = summary?.activeOffers ?? 0;

  const chartCategories = ["accident", "construction", "congestion", "weather", "event"] as const;
  const barHeights = chartCategories.map((cat) => {
    const row = incidentsByType.find((x: { category: string }) => x.category === cat);
    const count = row?.count ?? 0;
    const max = Math.max(1, ...incidentsByType.map((x: { count: number }) => x.count), 1);
    return { cat, pct: Math.round((count / max) * 100), count, label: TYPE_LABEL[cat] ?? cat };
  });

  const insightsToolbar = (
    <View style={styles.dashToolbar}>
      <Image source={{ uri: DASH_AVATAR }} style={styles.toolbarAvatar} accessibilityIgnoresInvertColors />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: "#f9f9fe" }]}>
      {Platform.OS === "web" ? <View style={{ height: topPad }} /> : null}
      <ScreenHero
        tall
        toolbar={insightsToolbar}
        eyebrow="Insights"
        title="Islamabad Overview"
        subtitle="Daily traffic summary and civic reporting analytics"
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#006E26" />}
      >
        <Pressable
          onPress={() => router.push("/offers")}
          style={({ pressed }) => [styles.offersBento, cardLift as ViewStyle, pressed && { opacity: 0.96 }]}
          accessibilityRole="button"
          accessibilityLabel="View marketplace offers"
        >
          <View style={styles.offersLeft}>
            <View style={styles.exclusivePill}>
              <Feather name="tag" size={14} color="#007329" />
              <Text style={styles.exclusiveTxt}>EXCLUSIVE ACCESS</Text>
            </View>
            <Text style={styles.offersTitle}>{offers > 0 ? `${offers} live offers` : "Marketplace"}</Text>
            <Text style={styles.offersSub}>Redeem points for fuels, tolls, and merchant discounts across Islamabad.</Text>
            <View style={styles.marketBtn}>
              <Text style={styles.marketBtnTxt}>View Marketplace</Text>
            </View>
          </View>
          <View style={styles.offersImgWrap}>
            <Image source={{ uri: OFFERS_IMG }} style={styles.offersImg} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
        </Pressable>

        <View style={styles.statsRow}>
          <View style={[styles.statCell, cardLift as ViewStyle]}>
            <Text style={[styles.statEyebrow, { color: "#ba1a1a" }]}>Active incidents</Text>
            <Text style={styles.statBig}>{activeCount}</Text>
            <View style={styles.statFoot}>
              <Feather name="trending-up" size={14} color="rgba(65,73,65,0.55)" />
              <Text style={styles.statFootTxt}>Live map</Text>
            </View>
          </View>
          <View style={[styles.statCell, cardLift as ViewStyle]}>
            <Text style={[styles.statEyebrow, { color: "#006E26" }]}>Resolved today</Text>
            <Text style={styles.statBig}>{resolvedToday}</Text>
            <View style={styles.statFoot}>
              <Feather name="check-circle" size={14} color="#006E26" />
              <Text style={[styles.statFootTxt, { color: "#006E26" }]}>Efficiency</Text>
            </View>
          </View>
          <View style={[styles.statCell, cardLift as ViewStyle]}>
            <Text style={[styles.statEyebrow, { color: "#01411c" }]}>Critical areas</Text>
            <Text style={styles.statBig}>{String(criticalAlerts).padStart(2, "0")}</Text>
            <View style={styles.statFoot}>
              <Feather name="map" size={14} color="rgba(65,73,65,0.55)" />
              <Text style={styles.statFootTxt} numberOfLines={1}>
                Hotspots
              </Text>
            </View>
          </View>
          <View style={[styles.statCell, cardLift as ViewStyle]}>
            <Text style={[styles.statEyebrow, { color: "#53b46a" }]}>Partners</Text>
            <Text style={styles.statBig}>{partners}</Text>
            <View style={styles.statFoot}>
              <Feather name="shield" size={14} color="rgba(65,73,65,0.55)" />
              <Text style={styles.statFootTxt}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={[styles.chartCard, cardLift as ViewStyle]}>
          <View style={styles.chartIntro}>
            <Text style={styles.chartTitleCenter}>Incidents by type</Text>
            <Text style={styles.chartSubCenter}>Categorized reports from the last 24 hours</Text>
            <TouchableOpacity style={styles.detailsPillCenter} accessibilityRole="button">
              <Text style={styles.detailsPillTxt}>Details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chartPanel}>
            <View style={styles.barChart}>
              {barHeights.map((b) => (
                <View key={b.cat} style={styles.barCol}>
                  <View style={styles.barTrackVert}>
                    <View
                      style={[
                        styles.barFillVert,
                        {
                          height: `${Math.max(12, b.pct)}%`,
                          backgroundColor: BAR_COLORS[b.cat] ?? "#01411c",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCountMini}>{b.count}</Text>
                  <Text style={styles.barCatLabel} numberOfLines={2}>
                    {b.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

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
            <View style={[styles.chartCard, cardLift as ViewStyle]}>
              <View style={styles.chartHead}>
                <Text style={styles.chartTitle}>By severity</Text>
              </View>
              {["critical", "high", "medium", "low"].map((sev) => {
                const count = sevCounts[sev] ?? 0;
                if (!count) return null;
                const pct = activeCount > 0 ? (count / activeCount) * 100 : 0;
                const color = SEV_COLOR[sev] ?? "#888";
                return (
                  <View key={sev} style={styles.hBarRow}>
                    <View style={[styles.sevDot, { backgroundColor: color }]} />
                    <Text style={[styles.hBarLabel, { flex: 1 }]}>{sev.charAt(0).toUpperCase() + sev.slice(1)}</Text>
                    <View style={styles.hBarTrack}>
                      <View style={[styles.hBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.hBarCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}

        {activity.length > 0 && (
          <View style={styles.activityBlock}>
            <View style={styles.activityHead}>
              <Text style={styles.chartTitle}>Recent activity</Text>
              <Text style={styles.exportLink}>Export logs</Text>
            </View>
            <View style={{ gap: 10 }}>
              {activity.slice(0, 10).map((item: ActivityItem, i: number) => {
                const tone = item.title?.toLowerCase().includes("accident") ? "err" : item.title?.toLowerCase().includes("clear") ? "ok" : "mid";
                const bg = tone === "err" ? "#ffdad6" : tone === "ok" ? "#b4f1bc" : "#82f98e";
                const fg = tone === "err" ? "#ba1a1a" : tone === "ok" ? "#01411c" : "#006E26";
                const icon: FeatherName = tone === "err" ? "alert-triangle" : tone === "ok" ? "check-circle" : "gift";
                return (
                  <View key={i} style={[styles.actCard, cardLift as ViewStyle]}>
                    <View style={[styles.actIconCircle, { backgroundColor: bg }]}>
                      <Feather name={icon} size={18} color={fg} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.actTitleRow}>
                        <Text style={styles.actTitle} numberOfLines={2}>
                          {item.title ?? "Activity"}
                        </Text>
                        <Text style={styles.actWhen}>{timeAgo(item.timestamp)}</Text>
                      </View>
                      {item.description ? (
                        <Text style={styles.actDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {!isLoading && activeCount === 0 && activity.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Feather name="bar-chart-2" size={36} color="#717970" />
            </View>
            <Text style={styles.emptyText}>No analytics yet. Incidents will show here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dashToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 8,
  },
  toolbarAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)" },
  offersBento: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#82f98e",
    borderRadius: 18,
    padding: 22,
    marginBottom: 20,
    overflow: "hidden",
    gap: 12,
  },
  offersLeft: { flex: 1, minWidth: 0 },
  exclusivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,115,41,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  exclusiveTxt: { fontSize: 10, fontWeight: "900", color: "#007329", letterSpacing: 0.6 },
  offersTitle: { fontSize: 22, fontWeight: "900", color: "#00290f", marginBottom: 6 },
  offersSub: { fontSize: 13, fontWeight: "600", color: "#00531b", lineHeight: 19, maxWidth: 260 },
  marketBtn: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "#00290f",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  marketBtnTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },
  offersImgWrap: { width: 100, height: 120, position: "relative" },
  offersImg: { width: "100%", height: "100%" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCell: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  statEyebrow: { fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },
  statBig: { fontSize: 28, fontWeight: "900", color: "#00290f" },
  statFoot: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  statFootTxt: { fontSize: 11, fontWeight: "600", color: "rgba(65,73,65,0.55)" },
  chartCard: {
    backgroundColor: "#e8e8ed",
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  chartIntro: { alignItems: "center", paddingBottom: 6 },
  chartTitleCenter: {
    fontSize: 20,
    fontWeight: "900",
    color: "#01411c",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  chartSubCenter: {
    fontSize: 13,
    color: "#414941",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
    fontWeight: "600",
    maxWidth: 300,
    paddingHorizontal: 8,
  },
  detailsPillCenter: {
    marginTop: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(1,65,28,0.12)",
  },
  chartPanel: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, gap: 12 },
  chartTitle: { fontSize: 18, fontWeight: "800", color: "#01411c" },
  chartSub: { fontSize: 13, color: "#414941", marginTop: 4, fontWeight: "500" },
  detailsPillTxt: { fontSize: 11, fontWeight: "900", color: "#01411c", letterSpacing: 0.4 },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 178,
    gap: 8,
    paddingHorizontal: 4,
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
  },
  barCol: { flex: 1, maxWidth: 56, alignItems: "center", gap: 6 },
  barTrackVert: {
    flex: 1,
    width: "88%",
    maxWidth: 40,
    justifyContent: "flex-end",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(1,65,28,0.06)",
    minHeight: 100,
  },
  barFillVert: { width: "100%", borderTopLeftRadius: 10, borderTopRightRadius: 10, minHeight: 6 },
  barCountMini: { fontSize: 11, fontWeight: "900", color: "#00290f" },
  barCatLabel: { fontSize: 9, fontWeight: "800", color: "#414941", textAlign: "center", lineHeight: 12 },
  hBarRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  hBarLabel: { fontSize: 12, color: "#1a1c1f", fontWeight: "600" },
  hBarTrack: { flex: 1, height: 7, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.06)" },
  hBarFill: { height: 7, borderRadius: 4 },
  hBarCount: { fontSize: 12, fontWeight: "800", width: 28, textAlign: "right", color: "#414941" },
  sevDot: { width: 9, height: 9, borderRadius: 5 },
  activityBlock: { marginBottom: 24 },
  activityHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  exportLink: { fontSize: 11, fontWeight: "800", color: "#006E26" },
  actCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  actIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actTitleRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" },
  actTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: "#01411c" },
  actWhen: { fontSize: 11, fontWeight: "600", color: "#414941" },
  actDesc: { fontSize: 12, color: "#414941", marginTop: 6, lineHeight: 17 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 48, gap: 16 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8e8ed",
  },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 24, color: "#717970" },
});
