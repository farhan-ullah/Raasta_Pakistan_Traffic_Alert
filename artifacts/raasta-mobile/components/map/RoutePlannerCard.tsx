import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  ToastAndroid,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { currentLocationPlace, type GeocodePlace } from "@workspace/api-client-react";
import { planRoute, type RoutePlanResponse } from "@/api/routePlan";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nativeMapChromeStyles as styles } from "./nativeMapChromeStyles";
import { formatRouteDistance, formatRouteDuration } from "./routeMapUtils";

async function getCurrentPositionCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      const { status: s2 } = await Location.requestForegroundPermissionsAsync();
      if (s2 !== "granted") return null;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export type RoutePlannerCardProps = {
  /** Space above the tab bar / home indicator (only for `layout="mapOverlay"`). */
  bottomOffset: number;
  onRoutePlanned: (plan: RoutePlanResponse | null) => void;
  navigationActive?: boolean;
  onStartNavigation?: (destination: { lat: number; lng: number }) => void;
  onStopNavigation?: () => void;
  /** `mapOverlay` = fixed above tab bar on map; `modalSheet` = inside a modal (no absolute dock). */
  layout?: "mapOverlay" | "modalSheet";
  /** When set (e.g. modal), header shows a close control even without an active route. */
  onClosePress?: () => void;
};

function routeBadgeLabel(summary: RoutePlanResponse | null): string {
  if (!summary) return "Optimal";
  if (summary.recommendedIsAlternative) return "Safer";
  if (summary.recommended.conflicts.length === 0) return "Optimal";
  return "Caution";
}

export function RoutePlannerCard({
  bottomOffset,
  onRoutePlanned,
  navigationActive = false,
  onStartNavigation,
  onStopNavigation,
  layout = "mapOverlay",
  onClosePress,
}: RoutePlannerCardProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [fromPlace, setFromPlace] = useState<GeocodePlace | null>(null);
  const [toPlace, setToPlace] = useState<GeocodePlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RoutePlanResponse | null>(null);
  const [fromUserEdited, setFromUserEdited] = useState(false);
  const fromUserEditedRef = useRef(false);
  const [fromLocating, setFromLocating] = useState(true);

  useEffect(() => {
    fromUserEditedRef.current = fromUserEdited;
  }, [fromUserEdited]);

  const loadMyLocation = useCallback(async () => {
    setFromLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setFromLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (fromUserEditedRef.current) return;
      setFromPlace(currentLocationPlace(pos.coords.latitude, pos.coords.longitude));
      setFromText("Current location");
    } catch {
      /* keep fromPlace null until user searches */
    } finally {
      setFromLocating(false);
    }
  }, []);

  useEffect(() => {
    void loadMyLocation();
  }, [loadMyLocation]);

  const useMyLocationAgain = () => {
    setFromUserEdited(false);
    fromUserEditedRef.current = false;
    void loadMyLocation();
  };

  const clearRoute = () => {
    onStopNavigation?.();
    setSummary(null);
    setError(null);
    onRoutePlanned(null);
  };

  const runPlan = async () => {
    setError(null);
    if (!toPlace) {
      setError("Choose destination (point B) from the suggestions.");
      return;
    }
    setLoading(true);
    try {
      let start = fromPlace;
      if (!start) {
        if (fromUserEdited) {
          setError("Choose a start point (point A) from the suggestions.");
          return;
        }
        const pos = await getCurrentPositionCoords();
        if (!pos) {
          setError("Could not get your location. Allow access or search for a start point.");
          return;
        }
        start = currentLocationPlace(pos.lat, pos.lng);
        setFromPlace(start);
        setFromText("Current location");
      }
      const res = await planRoute({
        fromLat: start.lat,
        fromLng: start.lng,
        toLat: toPlace.lat,
        toLng: toPlace.lng,
      });
      setSummary(res);
      onRoutePlanned(res);
      const engineToast =
        res.routingBackend === "openrouteservice"
          ? "Recommended: OpenRouteService (avoid zones)"
          : res.orsFallbackReason
            ? res.orsFallbackReason.length > 220
              ? `${res.orsFallbackReason.slice(0, 217)}…`
              : res.orsFallbackReason
            : res.routingBackendNote
              ? res.routingBackendNote
              : "Recommended: OSRM (map roads only)";
      if (Platform.OS === "android") {
        ToastAndroid.show(engineToast, res.orsFallbackReason ? ToastAndroid.LONG : ToastAndroid.SHORT);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "Could not plan route.";
      setError(msg);
      onRoutePlanned(null);
    } finally {
      setLoading(false);
    }
  };

  const rec = summary?.recommended;
  const alt = summary?.recommendedIsAlternative;
  const canPlan = !!toPlace && !loading;
  const badge = routeBadgeLabel(summary);
  const fromLine =
    fromLocating && !fromUserEdited
      ? "Your Current Location (locating…)"
      : fromText
        ? fromText === "Current location"
          ? "Your Current Location (Islamabad)"
          : fromText
        : "Your Current Location (Islamabad)";
  const toLine = toText || "Set Destination…";

  const showTwoLegCards =
    summary &&
    (summary.recommendedIsAlternative ||
      Math.abs(summary.primary.durationSeconds - summary.recommended.durationSeconds) > 45);

  const wrapStyle =
    layout === "modalSheet"
      ? [
          styles.routePlannerWrap,
          styles.routePlannerWrapModal,
          {
            backgroundColor: "#ffffff",
            borderColor: "rgba(0,0,0,0.06)",
          },
        ]
      : [
          styles.routePlannerWrap,
          {
            bottom: bottomOffset,
            top: undefined,
            backgroundColor: "#ffffff",
            borderColor: "rgba(0,0,0,0.06)",
          },
        ];

  const plannerScrollInner = (
    <>
      {navigationActive ? (
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#006E26", marginBottom: 8 }}>Navigating</Text>
        ) : null}

        <View style={{ flexDirection: "row", gap: 14, marginBottom: 12 }}>
          <View style={{ alignItems: "center", paddingTop: 6 }}>
            <View style={local.dot} />
            <View style={local.dash} />
            <Feather name="map-pin" size={20} color="#ba1a1a" />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <View style={local.fieldBox}>
              <Text style={local.fieldLabel}>Starting from</Text>
              <Text style={local.fieldValue} numberOfLines={2}>
                {fromLine}
              </Text>
              <LocationAutocomplete
                value={fromText}
                onChange={(v) => {
                  setFromText(v);
                  setFromUserEdited(true);
                  fromUserEditedRef.current = true;
                  setFromPlace(null);
                }}
                selected={fromPlace}
                onSelect={(p) => {
                  setFromUserEdited(true);
                  fromUserEditedRef.current = true;
                  setFromPlace(p);
                  setFromText(p.label);
                }}
                placeholder={fromLocating ? "Locating…" : "Change start"}
              />
            </View>
            <View style={local.fieldBox}>
              <Text style={local.fieldLabel}>Destination</Text>
              <Text style={[local.fieldValue, !toText && { color: "#a1a1aa" }]} numberOfLines={2}>
                {toLine}
              </Text>
              <LocationAutocomplete
                value={toText}
                onChange={setToText}
                selected={toPlace}
                onSelect={(p) => {
                  setToPlace(p);
                  setToText(p.label);
                }}
                placeholder="Search destination"
              />
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          {summary && rec ? (
            showTwoLegCards ? (
              <>
                <View style={local.legPrimary}>
                  <Feather name="navigation" size={22} color="rgba(255,255,255,0.75)" />
                  <View style={{ marginTop: 14 }}>
                    <Text style={local.legMins}>{Math.round(summary.recommended.durationSeconds / 60)}</Text>
                    <Text style={local.legSubLight}>Mins via Expressway</Text>
                  </View>
                </View>
                <View style={local.legSecondary}>
                  <Feather name="repeat" size={22} color="#414941" />
                  <View style={{ marginTop: 14 }}>
                    <Text style={local.legMinsDark}>{Math.round(summary.primary.durationSeconds / 60)}</Text>
                    <Text style={local.legSubDark}>Mins via Jinnah Ave</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={[local.legRowSingle, { flex: 1 }]}>
                <Feather name="navigation" size={22} color="rgba(255,255,255,0.75)" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={local.legMins}>{Math.round(summary.recommended.durationSeconds / 60)}</Text>
                  <Text style={local.legSubLight}>Mins · best path</Text>
                </View>
              </View>
            )
          ) : (
            <>
              <View style={local.legPrimary}>
                <Feather name="navigation" size={22} color="rgba(255,255,255,0.75)" />
                <View style={{ marginTop: 14 }}>
                  <Text style={local.legMins}>12</Text>
                  <Text style={local.legSubLight}>Mins via Expressway</Text>
                </View>
              </View>
              <View style={local.legSecondary}>
                <Feather name="repeat" size={22} color="#414941" />
                <View style={{ marginTop: 14 }}>
                  <Text style={local.legMinsDark}>18</Text>
                  <Text style={local.legSubDark}>Mins via Jinnah Ave</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {fromUserEdited ? (
          <TouchableOpacity onPress={useMyLocationAgain} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Feather name="crosshair" size={14} color="#006E26" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#006E26" }}>Use my current location for A</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={{ fontSize: 11, color: colors.subtext, lineHeight: 16, marginBottom: 8 }}>
          Point A is your <Text style={{ fontWeight: "800", color: colors.text }}>current location</Text>. Search only if you want a
          different start.
        </Text>

        {error ? <Text style={{ color: "#b91c1c", fontSize: 12, marginBottom: 8 }}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.routePlannerGo, (loading || !canPlan) && { opacity: 0.5 }]}
          onPress={runPlan}
          disabled={loading || !canPlan}
          activeOpacity={0.9}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.routePlannerGoText}>Plan safe route</Text>}
        </TouchableOpacity>

        {rec && summary && toPlace ? (
          <>
            {navigationActive ? (
              <TouchableOpacity
                style={[styles.routePlannerGo, { backgroundColor: "#b91c1c", marginTop: 10 }]}
                onPress={onStopNavigation}
                activeOpacity={0.9}
              >
                <Text style={styles.routePlannerGoText}>Stop navigation</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.routePlannerGo, { marginTop: 10 }]}
                onPress={() => onStartNavigation?.({ lat: toPlace.lat, lng: toPlace.lng })}
                activeOpacity={0.9}
              >
                <Text style={styles.routePlannerGoText}>Start navigation</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.routePlannerHint, { color: colors.subtext, marginTop: 8, fontSize: 10, lineHeight: 14 }]}>
              Follows your position and refreshes the route from your current GPS to destination. Stays active in the background on
              Android while navigating.
            </Text>
          </>
        ) : null}

        {rec && summary ? (
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.routePlannerHint, { color: colors.text }]}>
              <Text style={{ fontWeight: "800" }}>Recommended: </Text>
              {formatRouteDistance(rec.distanceMeters)} · {formatRouteDuration(rec.durationSeconds)}
            </Text>
            <Text style={[styles.routePlannerHint, { color: colors.subtext, fontSize: 11 }]}>
              Engine:{" "}
              {summary.routingBackend === "openrouteservice"
                ? "OpenRouteService (hazard avoidance)"
                : "OSRM (best-effort detours)"}
            </Text>
            {summary.betweenEndpointsAlert ? (
              <Text style={[styles.routePlannerHint, { color: "#b45309", fontWeight: "600", marginTop: 4 }]}>
                {summary.betweenEndpointsAlert}
              </Text>
            ) : null}
            {alt ? (
              <Text style={[styles.routePlannerHint, { color: "#006E26" }]}>
                Safer alternative selected — your first path crossed active high-risk or restricted areas in Raasta.
              </Text>
            ) : rec.conflicts.length === 0 ? (
              <Text style={[styles.routePlannerHint, { color: colors.subtext }]}>
                No high-risk or restricted segments detected on this path.
              </Text>
            ) : (
              <Text style={[styles.routePlannerHint, { color: "#b45309" }]}>
                {rec.conflicts.length} sensitive area(s) still near this line — drive with caution.
              </Text>
            )}
            {summary.textSuggestions && summary.textSuggestions.length > 0 ? (
              <Text style={[styles.routePlannerHint, { color: colors.subtext }]}>
                {summary.textSuggestions.slice(0, 3).join(" · ")}
              </Text>
            ) : null}
          </View>
        ) : null}
    </>
  );

  return (
    <View style={wrapStyle}>
      <View style={[styles.routePlannerHeader, { paddingBottom: 12 }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.routePlannerTitle, { color: "#01411c" }]}>Route Planner</Text>
            <View style={local.badge}>
              <Text style={local.badgeText}>{badge}</Text>
            </View>
          </View>
        </View>
        {summary ? (
          <TouchableOpacity onPress={clearRoute} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear route">
            <Feather name="x" size={22} color="#717970" />
          </TouchableOpacity>
        ) : onClosePress ? (
          <TouchableOpacity onPress={onClosePress} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
            <Feather name="x" size={22} color="#717970" />
          </TouchableOpacity>
        ) : null}
      </View>

      {layout === "modalSheet" ? (
        <KeyboardAwareScrollViewCompat
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 380 }}
          contentContainerStyle={{
            paddingBottom: Math.max(22, insets.bottom + 12),
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
          bottomOffset={Math.max(insets.bottom, 12) + 18}
          extraKeyboardSpace={22}
        >
          {plannerScrollInner}
        </KeyboardAwareScrollViewCompat>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: 340 }}
          contentContainerStyle={{ paddingBottom: 22, paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {plannerScrollInner}
        </ScrollView>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  badge: {
    backgroundColor: "#b4f1bc",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#17512a",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  legPrimary: {
    flex: 1,
    backgroundColor: "#006E26",
    borderRadius: 16,
    padding: 16,
    minHeight: 112,
    justifyContent: "space-between",
  },
  legSecondary: {
    flex: 1,
    backgroundColor: "#e8e8ed",
    borderRadius: 16,
    padding: 16,
    minHeight: 112,
    justifyContent: "space-between",
  },
  legRowSingle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#006E26",
    borderRadius: 16,
    padding: 16,
  },
  legMins: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  legMinsDark: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1a1c1f",
    letterSpacing: -0.5,
  },
  legSubLight: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  legSubDark: {
    fontSize: 12,
    fontWeight: "600",
    color: "#414941",
    marginTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#006E26",
    backgroundColor: "#fff",
  },
  dash: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: "#e2e2e7",
    marginVertical: 4,
  },
  fieldBox: {
    backgroundColor: "#f3f3f8",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#414941",
    fontWeight: "600",
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1c1f",
  },
});
