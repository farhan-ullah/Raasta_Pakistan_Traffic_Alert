import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useGetActiveMapIncidents } from "@workspace/api-client-react";
import type { RoutePlanResponse } from "@/api/routePlan";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import WebMapFallback from "./WebMapFallback";
import { nativeMapChromeStyles as styles } from "./nativeMapChromeStyles";
import { MapScreenHeader, MAP_HEADER_OFFSET_BELOW_SAFE } from "./MapScreenHeader";
import { FeaturedOffersStrip } from "@/components/FeaturedOffersStrip";
import { RoutePlannerCard } from "./RoutePlannerCard";
import { lineStringToIosLatLng } from "./routeMapUtils";
import { useNavigationSession, type NavDestination } from "@/hooks/useNavigationSession";

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
  const Polyline = maps.Polyline;
  const PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const [_selected, setSelected] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlanResponse | null>(null);
  const [navDestination, setNavDestination] = useState<NavDestination | null>(null);
  const navigationActive = navDestination !== null;

  const onFollowRegion = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      500,
    );
  }, []);

  useNavigationSession({
    active: navigationActive,
    destination: navDestination,
    onReplanned: setRoutePlan,
    onFollowRegion,
  });

  const { data: incidents = [], isLoading, refetch } = useGetActiveMapIncidents({
    query: { refetchInterval: 15_000 } as any,
  });

  const topPad = insets.top;
  const activeCount = incidents.filter((i) => i.status === "active").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical").length;

  useEffect(() => {
    if (!routePlan || navigationActive) return;
    const coords = lineStringToIosLatLng(routePlan.recommended.geometry.coordinates as [number, number][]);
    if (coords.length < 2) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 140, right: 36, bottom: 200, left: 36 },
      animated: true,
    });
  }, [routePlan, navigationActive]);

  const primaryIos = routePlan?.recommendedIsAlternative
    ? lineStringToIosLatLng(routePlan.primary.geometry.coordinates as [number, number][])
    : [];
  const recIos = routePlan
    ? lineStringToIosLatLng(routePlan.recommended.geometry.coordinates as [number, number][])
    : [];
  const abCoords = recIos.length > 0 ? { a: recIos[0]!, b: recIos[recIos.length - 1]! } : null;

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
        {routePlan?.recommendedIsAlternative && primaryIos.length > 1 ? (
          <Polyline
            coordinates={primaryIos}
            strokeColor="rgba(148, 163, 184, 0.85)"
            strokeWidth={4}
            lineDashPattern={[4, 6]}
          />
        ) : null}
        {recIos.length > 1 ? (
          <Polyline coordinates={recIos} strokeColor="#15803d" strokeWidth={5} lineCap="round" lineJoin="round" />
        ) : null}
        {abCoords ? (
          <>
            <Marker coordinate={abCoords.a} pinColor="green" title="A" description="Start" />
            <Marker coordinate={abCoords.b} pinColor="red" title="B" description="End" />
          </>
        ) : null}
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

      <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 }} pointerEvents="box-none">
        <MapScreenHeader subtitle="Islamabad live traffic overview" />
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
