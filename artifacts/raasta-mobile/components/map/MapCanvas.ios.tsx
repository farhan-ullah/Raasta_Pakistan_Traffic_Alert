import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useGetActiveMapIncidents } from "@workspace/api-client-react";
import type { RoutePlanResponse } from "@/api/routePlan";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import WebMapFallback from "./WebMapFallback";
import { nativeMapChromeStyles as styles } from "./nativeMapChromeStyles";
import { MapScreenHeader, MAP_HEADER_OFFSET_BELOW_SAFE } from "./MapScreenHeader";
import { FeaturedOffersStrip } from "@/components/FeaturedOffersStrip";
import { MapFloatingSearchPrompt } from "./MapFloatingSearchPrompt";
import { RoutePlannerCard } from "./RoutePlannerCard";
import { lineStringToIosLatLng } from "./routeMapUtils";
import {
  useNavigationSession,
  type NavDestination,
  type NavUserSample,
} from "@/hooks/useNavigationSession";
import { useSmoothedNavPose } from "@/hooks/useSmoothedNavPose";
import { NavigationVehiclePuck } from "./NavigationVehiclePuck";

function hasGoogleMapsNativeKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY?.trim());
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#16a34a",
};

const INCIDENT_FEATHER: Record<string, keyof typeof Feather.glyphMap> = {
  blockage: "slash",
  construction: "tool",
  vip_movement: "star",
  accident: "alert-triangle",
  congestion: "truck",
};

function featherForIncidentType(type?: string | null): keyof typeof Feather.glyphMap {
  const t = type ?? "blockage";
  return INCIDENT_FEATHER[t] ?? "alert-circle";
}

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
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [routePlan, setRoutePlan] = useState<RoutePlanResponse | null>(null);
  const [navDestination, setNavDestination] = useState<NavDestination | null>(null);
  const [navSample, setNavSample] = useState<NavUserSample | null>(null);
  const navigationActive = navDestination !== null;

  const onUserNavigationSample = useCallback((s: NavUserSample) => {
    setNavSample(s);
  }, []);

  useEffect(() => {
    if (!navigationActive) setNavSample(null);
  }, [navigationActive]);

  const smoothNavTarget =
    navigationActive && navSample
      ? {
          latitude: navSample.latitude,
          longitude: navSample.longitude,
          headingDeg: navSample.headingDeg,
        }
      : null;
  const smoothedNavPose = useSmoothedNavPose(navigationActive, smoothNavTarget);

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
    onUserNavigationSample: onUserNavigationSample,
  });

  const recenterOnUserOrCity = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      mapRef.current?.animateToRegion(ISLAMABAD, 800);
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        },
        900,
      );
    } catch {
      mapRef.current?.animateToRegion(ISLAMABAD, 800);
    }
  }, []);

  const { data: incidents = [], isLoading, refetch } = useGetActiveMapIncidents({
    query: { refetchInterval: 15_000 } as any,
  });

  const topPad = insets.top;
  const headerEndY = topPad + MAP_HEADER_OFFSET_BELOW_SAFE;
  const offersTop = headerEndY - 36;
  /** Featured strip sits under header curve — place search clearly below strip + green edge */
  const OFFERS_STRIP_BLOCK = 102;
  const searchTop = offersTop + OFFERS_STRIP_BLOCK + 5;
  const myLocTop = navigationActive ? headerEndY + 82 : searchTop + 58;

  useEffect(() => {
    if (!routePlan || navigationActive) return;
    const coords = lineStringToIosLatLng(routePlan.recommended.geometry.coordinates as [number, number][]);
    if (coords.length < 2) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 140, right: 36, bottom: 300, left: 36 },
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
  const rec = routePlan?.recommended;
  const navEtaMins = rec ? Math.max(1, Math.round(rec.durationSeconds / 60)) : null;
  const navDistanceKm = rec ? (rec.distanceMeters / 1000).toFixed(1) : null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={ISLAMABAD}
        showsUserLocation={!navigationActive}
        showsMyLocationButton={false}
      >
        {routePlan?.recommendedIsAlternative && primaryIos.length > 1 ? (
          <>
            <Polyline
              coordinates={primaryIos}
              strokeColor="rgba(148, 163, 184, 0.4)"
              strokeWidth={12}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={primaryIos}
              strokeColor="rgba(148, 163, 184, 0.9)"
              strokeWidth={4}
              lineDashPattern={[5, 7]}
              lineCap="round"
              lineJoin="round"
            />
          </>
        ) : null}
        {recIos.length > 1 ? (
          <>
            <Polyline
              coordinates={recIos}
              strokeColor="rgba(5, 46, 22, 0.45)"
              strokeWidth={18}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={recIos}
              strokeColor="rgba(190, 242, 190, 0.98)"
              strokeWidth={10}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={recIos}
              strokeColor="#15803d"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              coordinates={recIos}
              strokeColor="rgba(74, 222, 128, 0.95)"
              strokeWidth={2}
              lineCap="round"
              lineJoin="round"
            />
          </>
        ) : null}
        {navigationActive && smoothedNavPose ? (
          <Marker
            coordinate={{ latitude: smoothedNavPose.latitude, longitude: smoothedNavPose.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            centerOffset={{ x: 0, y: 0 }}
            flat
            tracksViewChanges={navigationActive}
          >
            <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center" }} collapsable={false}>
              <NavigationVehiclePuck headingDeg={smoothedNavPose.headingDeg} />
            </View>
          </Marker>
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
              <View style={{ alignItems: "center" }} collapsable={false}>
                <View
                  style={{
                    backgroundColor: color,
                    padding: 8,
                    borderRadius: 999,
                    borderWidth: 3,
                    borderColor: "rgba(255,255,255,0.88)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  <Feather name={featherForIncidentType(incident.type)} size={14} color="#fff" />
                </View>
                <View
                  style={{
                    marginTop: 4,
                    backgroundColor: "#fff",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    maxWidth: 140,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.12,
                    shadowRadius: 3,
                    elevation: 2,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "800", color }} numberOfLines={1}>
                    {(incident.title ?? incident.type ?? "Incident").slice(0, 18).toUpperCase()}
                  </Text>
                </View>
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
        <MapScreenHeader
          subtitle="Civic Vanguard · Islamabad live traffic"
          onRefreshPress={() => void refetch()}
          refreshing={isLoading}
        />
      </View>

      {!navigationActive && !routePlannerOpen ? <FeaturedOffersStrip top={offersTop} /> : null}

      {!navigationActive ? (
        <MapFloatingSearchPrompt
          top={searchTop}
          onPress={() => setRoutePlannerOpen(true)}
          onNavPress={() => setRoutePlannerOpen(true)}
        />
      ) : null}

      {navigationActive && rec ? (
        <View style={[modalStyles.navHud, { top: headerEndY + 6 }]}>
          <View style={modalStyles.navHudLeft}>
            <View style={modalStyles.navPulse} />
            <Text style={modalStyles.navHudTitle}>Navigation Active</Text>
          </View>
          <View style={modalStyles.navStats}>
            <Text style={modalStyles.navStatText}>{navEtaMins} min</Text>
            <Text style={modalStyles.navDot}>•</Text>
            <Text style={modalStyles.navStatText}>{navDistanceKm} km</Text>
          </View>
          <TouchableOpacity style={modalStyles.stopNavBtn} onPress={() => setNavDestination(null)}>
            <Text style={modalStyles.stopNavTxt}>Stop</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal
        visible={routePlannerOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setRoutePlannerOpen(false)}
      >
        <View style={modalStyles.overlay}>
          <Pressable style={modalStyles.scrim} onPress={() => setRoutePlannerOpen(false)} accessibilityLabel="Dismiss" />
          <KeyboardAvoidingView
            behavior="padding"
            style={{ width: "100%" }}
            keyboardVerticalOffset={Platform.OS === "ios" ? Math.max(insets.top, 6) : 0}
          >
            <View style={[modalStyles.sheetWrap, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
              <RoutePlannerCard
                layout="modalSheet"
                bottomOffset={0}
                onClosePress={() => setRoutePlannerOpen(false)}
                onRoutePlanned={plan => {
                  setRoutePlan(plan);
                  if (!plan) setNavDestination(null);
                }}
                navigationActive={navigationActive}
                onStartNavigation={dest => {
                  setNavDestination(dest);
                  setRoutePlannerOpen(false);
                }}
                onStopNavigation={() => setNavDestination(null)}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <TouchableOpacity
        style={[styles.myLocBtn, { top: myLocTop, bottom: undefined, right: navigationActive ? 18 : 14 }]}
        onPress={() => void recenterOnUserOrCity()}
        activeOpacity={0.9}
        accessibilityLabel="Center map on your location"
      >
        <LinearGradient
          colors={["#ecfccb", "#d9f99d", "#bbf7d0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["#4ade80", "#16a34a", "#14532d"]}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.9)",
          }}
        >
          <Feather name="crosshair" size={17} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  navHud: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 35,
    backgroundColor: "rgba(1,20,9,0.88)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  navHudLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  navPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ade80" },
  navHudTitle: { color: "#fff", fontSize: 12, fontWeight: "800" },
  navStats: { flexDirection: "row", alignItems: "center", marginLeft: "auto", gap: 6 },
  navDot: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "700" },
  navStatText: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "700" },
  stopNavBtn: { backgroundColor: "rgba(185,28,28,0.9)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  stopNavTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetWrap: {
    paddingHorizontal: 16,
    width: "100%",
    zIndex: 2,
    maxHeight: "90%",
  },
});

export default function MapCanvas() {
  if (!hasGoogleMapsNativeKey()) {
    return (
      <WebMapFallback mapsHint="Map is disabled until you add a Google Maps API key (see EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY) and rebuild." />
    );
  }
  return <IosGoogleMapScreen />;
}
