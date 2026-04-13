import React, { useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useGetActiveMapIncidents } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import WebMapFallback from "./WebMapFallback";
import { nativeMapChromeStyles as styles } from "./nativeMapChromeStyles";

function hasGoogleMapsNativeKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY?.trim());
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#16a34a",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

const ISLAMABAD = { latitude: 33.6844, longitude: 73.0479, latitudeDelta: 0.12, longitudeDelta: 0.12 };

function IosGoogleMapScreen() {
  const maps = useMemo(() => require("react-native-maps"), []);
  const MapView = maps.default;
  const Marker = maps.Marker;
  const Callout = maps.Callout;
  const PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;

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

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Raasta by Averox</Text>
            <Text style={styles.headerSub}>Islamabad Live Traffic</Text>
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

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

      <TouchableOpacity
        style={[styles.myLocBtn, { bottom: insets.bottom + 165, backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => mapRef.current?.animateToRegion(ISLAMABAD, 800)}
      >
        <Feather name="navigation" size={18} color="#25a244" />
      </TouchableOpacity>
    </View>
  );
}

export default function MapCanvas() {
  if (!hasGoogleMapsNativeKey()) {
    return (
      <WebMapFallback mapsHint="Map is disabled until you add a Google Maps API key (see EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY) and rebuild." />
    );
  }
  return <IosGoogleMapScreen />;
}
