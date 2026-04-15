import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  MapView,
  Camera,
  UserLocation,
  MarkerView,
  ShapeSource,
  LineLayer,
  CircleLayer,
  requestAndroidLocationPermissions,
  type CameraRef,
  type OnPressEvent,
} from "@maplibre/maplibre-react-native";
import { useGetActiveMapIncidents } from "@workspace/api-client-react";
import type { RoutePlanResponse } from "@/api/routePlan";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { nativeMapChromeStyles as styles } from "./nativeMapChromeStyles";
import { MapScreenHeader, MAP_HEADER_OFFSET_BELOW_SAFE } from "./MapScreenHeader";
import { FeaturedOffersStrip } from "@/components/FeaturedOffersStrip";
import { RoutePlannerCard } from "./RoutePlannerCard";
import { boundsCenterZoom, lineStringFeature } from "./routeMapUtils";
import { FOLLOW_ZOOM, useNavigationSession, type NavDestination } from "@/hooks/useNavigationSession";

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
  const [routePlan, setRoutePlan] = useState<RoutePlanResponse | null>(null);
  const [navDestination, setNavDestination] = useState<NavDestination | null>(null);

  const navigationActive = navDestination !== null;

  const onFollowCoordinate = useCallback((coord: [number, number]) => {
    cameraRef.current?.setCamera({
      centerCoordinate: coord,
      zoomLevel: FOLLOW_ZOOM,
      animationDuration: 550,
      animationMode: "easeTo",
    });
  }, []);

  useNavigationSession({
    active: navigationActive,
    destination: navDestination,
    onReplanned: setRoutePlan,
    onFollowCoordinate,
  });

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

  useEffect(() => {
    if (!routePlan || navigationActive) return;
    const coords = routePlan.recommended.geometry.coordinates as [number, number][];
    if (coords.length < 2) return;
    const { center, zoomLevel } = boundsCenterZoom(coords);
    cameraRef.current?.setCamera({
      centerCoordinate: center,
      zoomLevel,
      animationDuration: 900,
      animationMode: "easeTo",
    });
  }, [routePlan, navigationActive]);

  const routeCoords = routePlan?.recommended.geometry.coordinates as [number, number][] | undefined;
  const routeStart = routeCoords?.[0];
  const routeEnd = routeCoords && routeCoords.length > 1 ? routeCoords[routeCoords.length - 1] : undefined;

  /** Geo-anchored circles (not MarkerView) so pins stay fixed when zooming, like UserLocation. */
  const incidentsGeoJson = useMemo((): GeoJSON.FeatureCollection => {
    return {
      type: "FeatureCollection",
      features: incidents.map(incident => {
        const color = SEVERITY_COLOR[incident.severity ?? "medium"] ?? "#f59e0b";
        const id = String(incident.id ?? `${incident.lat}_${incident.lng}`);
        return {
          type: "Feature",
          id,
          geometry: {
            type: "Point",
            coordinates: [incident.lng, incident.lat],
          },
          properties: {
            id,
            title: incident.title ?? "",
            location: incident.location ?? "",
            severity: incident.severity ?? "",
            createdAt: incident.createdAt ?? new Date().toISOString(),
            color,
          },
        };
      }),
    };
  }, [incidents]);

  const onIncidentShapePress = (e: OnPressEvent) => {
    const f = e.features[0];
    const p = f?.properties as Record<string, string | number | undefined> | undefined;
    if (!p) return;
    const id = String(p.id ?? "");
    const color = String(p.color ?? "#f59e0b");
    setSelected({
      id,
      title: String(p.title ?? ""),
      location: String(p.location ?? ""),
      severity: String(p.severity ?? ""),
      createdAt: String(p.createdAt ?? new Date().toISOString()),
      color,
    });
  };

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

        {routePlan?.recommendedIsAlternative ? (
          <ShapeSource id="raasta_route_primary" shape={lineStringFeature(routePlan.primary.geometry)}>
            <LineLayer
              id="raasta_route_primary_line"
              style={{
                lineColor: "#94a3b8",
                lineWidth: 4,
                lineDasharray: [1, 2],
                lineOpacity: 0.75,
              }}
            />
          </ShapeSource>
        ) : null}

        {routePlan ? (
          <ShapeSource id="raasta_route_recommended" shape={lineStringFeature(routePlan.recommended.geometry)}>
            <LineLayer
              id="raasta_route_recommended_line"
              style={{
                lineColor: "#15803d",
                lineWidth: 5,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </ShapeSource>
        ) : null}

        {routeStart && routeEnd ? (
          <>
            <MarkerView coordinate={routeStart} allowOverlap>
              <View
                style={{
                  backgroundColor: "#15803d",
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>A</Text>
              </View>
            </MarkerView>
            <MarkerView coordinate={routeEnd} allowOverlap>
              <View
                style={{
                  backgroundColor: "#b91c1c",
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>B</Text>
              </View>
            </MarkerView>
          </>
        ) : null}

        {incidentsGeoJson.features.length > 0 ? (
          <ShapeSource id="raasta_incidents" shape={incidentsGeoJson} onPress={onIncidentShapePress}>
            <CircleLayer
              id="raasta_incidents_circles"
              style={{
                circleRadius: 5,
                circleColor: ["get", "color"],
                circleStrokeWidth: 2.5,
                circleStrokeColor: "rgba(255,255,255,0.95)",
                circlePitchAlignment: "map",
              }}
            />
          </ShapeSource>
        ) : null}
      </MapView>

      <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 }} pointerEvents="box-none">
        <MapScreenHeader subtitle="Islamabad live traffic · OpenStreetMap" />
      </View>

      <RoutePlannerCard
        topOffset={topPad + MAP_HEADER_OFFSET_BELOW_SAFE}
        onRoutePlanned={plan => {
          setRoutePlan(plan);
          if (!plan) setNavDestination(null);
        }}
        navigationActive={navigationActive}
        onStartNavigation={dest => setNavDestination(dest)}
        onStopNavigation={() => setNavDestination(null)}
      />

      <FeaturedOffersStrip bottom={insets.bottom + 152} />

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
