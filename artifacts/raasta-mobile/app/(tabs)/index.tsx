import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useGetActiveMapIncidents } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

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

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function WebMapFallback() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = 67;

  const { data: incidents = [], isLoading, refetch } = useGetActiveMapIncidents({
    query: { refetchInterval: 15_000 } as any,
  });

  const activeCount = incidents.filter((i) => i.status === "active").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Raasta</Text>
            <Text style={styles.headerSub}>Islamabad Live Traffic</Text>
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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
          Map view is available in the Expo Go app
        </Text>
        <Text style={[styles.mapPlaceholderSub, { color: colors.mutedForeground }]}>
          Scan the QR code in the URL bar to open on your device
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 120 }}>
        {isLoading ? (
          <ActivityIndicator color="#25a244" style={{ marginTop: 20 }} />
        ) : incidents.map((incident) => {
          const color = SEVERITY_COLOR[incident.severity ?? "medium"] ?? "#f59e0b";
          const icon = (TYPE_ICONS[incident.type ?? "blockage"] ?? "alert-triangle") as any;
          return (
            <View key={incident.id} style={[styles.incidentRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

let MapView: any, Marker: any, Callout: any, PROVIDER_DEFAULT: any;

if (Platform.OS !== "web") {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
  Callout = maps.Callout;
  PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;
}

const ISLAMABAD = { latitude: 33.6844, longitude: 73.0479, latitudeDelta: 0.12, longitudeDelta: 0.12 };

function NativeMapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const [_selected, setSelected] = useState<string | null>(null);

  const { data: incidents = [], isLoading, refetch } = useGetActiveMapIncidents({
    query: { refetchInterval: 15_000 } as any,
  });

  const topPad = insets.top;
  const activeCount = incidents.filter((i) => i.status === "active").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={ISLAMABAD}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {incidents.map((incident: (typeof incidents)[0]) => {
          const color = SEVERITY_COLOR[incident.severity ?? "medium"] ?? "#f59e0b";
          const key = incident.id ?? `${incident.lat}_${incident.lng}`;
          return (
            <Marker
              key={key}
              coordinate={{ latitude: incident.lat, longitude: incident.lng }}
              onPress={() => setSelected(key)}
            >
              <View style={[styles.markerOuter, { borderColor: color }]}>
                <View style={[styles.markerInner, { backgroundColor: color }]} />
              </View>
              <Callout tooltip>
                <View style={[styles.callout, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.calloutBadge, { backgroundColor: color }]}>
                    <Text style={styles.calloutBadgeText}>{(incident.severity ?? "").toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.calloutTitle, { color: colors.text }]} numberOfLines={2}>
                    {incident.title}
                  </Text>
                  <Text style={[styles.calloutLocation, { color: colors.subtext }]} numberOfLines={1}>
                    {incident.location}
                  </Text>
                  <Text style={[styles.calloutTime, { color: colors.mutedForeground }]}>
                    {timeAgo(incident.createdAt ?? new Date().toISOString())}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Raasta</Text>
            <Text style={styles.headerSub}>Islamabad Live Traffic</Text>
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* Bottom summary */}
      <View style={[styles.summary, { bottom: insets.bottom + 90, backgroundColor: colors.card, borderColor: colors.border }]}>
        {isLoading ? (
          <ActivityIndicator color="#25a244" size="small" />
        ) : (
          <View style={styles.summaryInner}>
            <View style={styles.statBlock}>
              <Text style={[styles.statNum2, { color: "#ef4444" }]}>{criticalCount}</Text>
              <Text style={[styles.statLabel2, { color: colors.mutedForeground }]}>Critical</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statBlock}>
              <Text style={[styles.statNum2, { color: "#25a244" }]}>{activeCount}</Text>
              <Text style={[styles.statLabel2, { color: colors.mutedForeground }]}>Active</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
              <Feather name="refresh-cw" size={16} color="#25a244" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* My location button */}
      <TouchableOpacity
        style={[styles.myLocBtn, { bottom: insets.bottom + 165, backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => mapRef.current?.animateToRegion(ISLAMABAD, 800)}
      >
        <Feather name="navigation" size={18} color="#25a244" />
      </TouchableOpacity>
    </View>
  );
}

export default function MapScreen() {
  if (Platform.OS === "web") {
    return <WebMapFallback />;
  }
  return <NativeMapScreen />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#01411Cee",
  },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "900" as const, color: "#fff", letterSpacing: -0.5 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ef444488", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 11, fontWeight: "800" as const },
  markerOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  markerInner: { width: 10, height: 10, borderRadius: 5 },
  callout: { borderRadius: 12, padding: 12, borderWidth: 1, minWidth: 180, maxWidth: 240, gap: 4 },
  calloutBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, alignSelf: "flex-start" },
  calloutBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" as const },
  calloutTitle: { fontSize: 13, fontWeight: "700" as const, lineHeight: 18 },
  calloutLocation: { fontSize: 11 },
  calloutTime: { fontSize: 10 },
  summary: { position: "absolute", left: 16, right: 16, borderRadius: 16, borderWidth: 1, padding: 14 },
  summaryInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  statBlock: { alignItems: "center", gap: 2 },
  statNum2: { fontSize: 24, fontWeight: "800" as const },
  statLabel2: { fontSize: 10, fontWeight: "600" as const },
  divider: { width: 1, height: 32 },
  refreshBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  myLocBtn: { position: "absolute", right: 16, borderRadius: 12, borderWidth: 1, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  // Web fallback styles
  statsBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 14, borderBottomWidth: 1 },
  statItem: { alignItems: "center", gap: 3 },
  statNum: { fontSize: 22, fontWeight: "800" as const },
  statLabel: { fontSize: 10, fontWeight: "600" as const },
  statDiv: { width: 1, height: 36 },
  mapPlaceholder: { margin: 16, borderRadius: 16, padding: 32, alignItems: "center", gap: 8 },
  mapPlaceholderText: { fontSize: 14, fontWeight: "600" as const, textAlign: "center" },
  mapPlaceholderSub: { fontSize: 12, textAlign: "center" },
  incidentRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  incidentIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  incidentContent: { flex: 1 },
  incidentTitle: { fontSize: 13, fontWeight: "600" as const },
  incidentLoc: { fontSize: 11, marginTop: 2 },
  incidentBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  incidentBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" as const },
});
