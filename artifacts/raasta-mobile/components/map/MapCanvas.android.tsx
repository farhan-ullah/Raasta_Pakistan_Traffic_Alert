import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Pressable } from "react-native";
import {
  MapView,
  Camera,
  UserLocation,
  MarkerView,
  requestAndroidLocationPermissions,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { useGetActiveMapIncidents } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { nativeMapChromeStyles as styles } from "./nativeMapChromeStyles";

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

/** MapLibre style: OSM raster tiles (no Google Maps SDK). */
const OSM_MAP_STYLE = {
  version: 8,
  name: "osm",
  sources: {
    openstreetmap: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster" as const,
      source: "openstreetmap",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

/** Islamabad — MapLibre uses [longitude, latitude]. */
const ISLAMABAD_CENTER: [number, number] = [73.0479, 33.6844];
const INITIAL_ZOOM = 10;

export default function MapCanvas() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);
  const [selected, setSelected] = useState<{
    id: string;
    title: string;
    location: string;
    severity: string;
    createdAt: string;
    color: string;
  } | null>(null);
  /** OS runtime permission — manifest alone is not enough on Android 6+. */
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!cancelled) setLocationGranted(status === "granted");
      await requestAndroidLocationPermissions();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: incidents = [], isLoading, refetch } = useGetActiveMapIncidents({
    query: { refetchInterval: 15_000 } as any,
  });

  const topPad = insets.top;
  const activeCount = incidents.filter((i) => i.status === "active").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;

  const mapStyle = useMemo(() => OSM_MAP_STYLE, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapStyle={mapStyle}
        logoEnabled
        attributionEnabled
        attributionPosition={{ bottom: 8, right: 8 }}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: ISLAMABAD_CENTER,
            zoomLevel: INITIAL_ZOOM,
          }}
        />
        <UserLocation visible={locationGranted} />

        {incidents.map((incident: (typeof incidents)[0]) => {
          const color = SEVERITY_COLOR[incident.severity ?? "medium"] ?? "#f59e0b";
          const key = String(incident.id ?? `${incident.lat}_${incident.lng}`);
          return (
            <MarkerView key={key} coordinate={[incident.lng, incident.lat]} allowOverlap>
              <Pressable
                onPress={() =>
                  setSelected({
                    id: key,
                    title: incident.title ?? "",
                    location: incident.location ?? "",
                    severity: incident.severity ?? "",
                    createdAt: incident.createdAt ?? new Date().toISOString(),
                    color,
                  })
                }
              >
                <View style={[styles.markerOuter, { borderColor: color }]}>
                  <View style={[styles.markerInner, { backgroundColor: color }]} />
                </View>
              </Pressable>
            </MarkerView>
          );
        })}
      </MapView>

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Raasta</Text>
            <Text style={styles.headerSub}>Islamabad Live Traffic · OSM</Text>
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      {selected ? (
        <View
          style={[
            styles.summary,
            {
              bottom: insets.bottom + 160,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.callout, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.calloutBadge, { backgroundColor: selected.color }]}>
              <Text style={styles.calloutBadgeText}>{selected.severity.toUpperCase()}</Text>
            </View>
            <Text style={[styles.calloutTitle, { color: colors.text }]} numberOfLines={2}>
              {selected.title}
            </Text>
            <Text style={[styles.calloutLocation, { color: colors.subtext }]} numberOfLines={2}>
              {selected.location}
            </Text>
            <Text style={[styles.calloutTime, { color: colors.mutedForeground }]}>
              {timeAgo(selected.createdAt)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelected(null)}
            style={{ alignSelf: "flex-end", marginTop: 6 }}
            hitSlop={8}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
        onPress={() =>
          cameraRef.current?.setCamera({
            centerCoordinate: ISLAMABAD_CENTER,
            zoomLevel: INITIAL_ZOOM,
            animationDuration: 800,
            animationMode: "easeTo",
          })
        }
      >
        <Feather name="navigation" size={18} color="#25a244" />
      </TouchableOpacity>
    </View>
  );
}
