import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useGetActiveMapIncidents } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { MapScreenHeader } from "./MapScreenHeader";
import { floatShadow } from "@/components/ui/screenTokens";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#16a34a",
};

const TYPE_ICONS: Record<string, string> = {
  blockage: "slash",
  construction: "tool",
  vip_movement: "star",
  accident: "alert-circle",
  congestion: "truck",
};

export default function WebMapFallback({
  mapsHint,
}: {
  mapsHint?: string;
}) {
  const colors = useColors();

  const { data: incidents = [], isLoading, refetch } = useGetActiveMapIncidents({
    query: { refetchInterval: 15_000 } as any,
  });

  const activeCount = incidents.filter((i) => i.status === "active").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS === "web" ? <View style={{ height: 56 }} /> : null}
      <MapScreenHeader subtitle="Islamabad live traffic · list view" />

      <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }, floatShadow]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: "#ef4444" }]}>{criticalCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Critical</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: "#25a244" }]}>{activeCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.statItem} onPress={() => refetch()}>
          <Feather name="refresh-cw" size={18} color="#25a244" />
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.mapPlaceholder, { backgroundColor: colors.muted }]}>
        <Feather name="map" size={48} color={colors.mutedForeground} />
        <Text style={[styles.mapPlaceholderText, { color: colors.mutedForeground }]}>
          {mapsHint ?? "Map view is available in the Expo Go app"}
        </Text>
        {!mapsHint ? (
          <Text style={[styles.mapPlaceholderSub, { color: colors.mutedForeground }]}>
            Scan the QR code in the URL bar to open on your device
          </Text>
        ) : (
          <Text style={[styles.mapPlaceholderSub, { color: colors.mutedForeground }]}>
            Create a key with Maps SDK for Android enabled, set EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY, then run npx expo prebuild and rebuild.
          </Text>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
        {isLoading ? (
          <ActivityIndicator color="#25a244" style={{ marginTop: 20 }} />
        ) : incidents.map((incident) => {
          const color = SEVERITY_COLOR[incident.severity ?? "medium"] ?? "#f59e0b";
          const icon = (TYPE_ICONS[incident.type ?? "blockage"] ?? "alert-triangle") as any;
          return (
            <View
              key={incident.id}
              style={[styles.incidentRow, floatShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.incidentIcon, { backgroundColor: color + "22" }]}>
                <Feather name={icon} size={16} color={color} />
              </View>
              <View style={styles.incidentContent}>
                <Text style={[styles.incidentTitle, { color: colors.text }]} numberOfLines={1}>{incident.title}</Text>
                <Text style={[styles.incidentLoc, { color: colors.mutedForeground }]} numberOfLines={1}>{incident.location}</Text>
              </View>
              <View style={[styles.incidentBadge, { backgroundColor: color }]}>
                <Text style={styles.incidentBadgeText}>{(incident.severity ?? "").toUpperCase()}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: -6,
    borderRadius: 18,
    borderWidth: 1,
  },
  statItem: { alignItems: "center", gap: 3 },
  statNum: { fontSize: 22, fontWeight: "800" as const },
  statLabel: { fontSize: 10, fontWeight: "700" as const },
  statDiv: { width: 1, height: 36 },
  mapPlaceholder: { margin: 16, borderRadius: 20, padding: 28, alignItems: "center", gap: 8 },
  mapPlaceholderText: { fontSize: 14, fontWeight: "600" as const, textAlign: "center" },
  mapPlaceholderSub: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  incidentRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 10 },
  incidentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  incidentContent: { flex: 1 },
  incidentTitle: { fontSize: 14, fontWeight: "600" as const },
  incidentLoc: { fontSize: 11, marginTop: 2 },
  incidentBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  incidentBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" as const },
});
