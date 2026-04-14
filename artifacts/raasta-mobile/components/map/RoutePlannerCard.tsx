import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { currentLocationPlace, type GeocodePlace } from "@workspace/api-client-react";
import { planRoute, type RoutePlanResponse } from "@/api/routePlan";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { useColors } from "@/hooks/useColors";
import { nativeMapChromeStyles as styles } from "./nativeMapChromeStyles";
import { formatRouteDistance, formatRouteDuration } from "./routeMapUtils";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  /** Distance from top of screen (e.g. below header). */
  topOffset: number;
  onRoutePlanned: (plan: RoutePlanResponse | null) => void;
};

export function RoutePlannerCard({ topOffset, onRoutePlanned }: RoutePlannerCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
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

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const clearRoute = () => {
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

  return (
    <View style={[styles.routePlannerWrap, { top: topOffset, backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.routePlannerHeader} onPress={toggle} activeOpacity={0.85}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="navigation-2" size={18} color="#15803d" />
          <Text style={[styles.routePlannerTitle, { color: colors.text }]}>Route (you → B)</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {summary ? (
            <TouchableOpacity onPress={clearRoute} hitSlop={8}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>

      {expanded ? (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }} contentContainerStyle={{ paddingBottom: 10 }}>
          <Text style={{ fontSize: 11, color: colors.subtext, marginHorizontal: 12, marginBottom: 8, lineHeight: 16 }}>
            Point A is your <Text style={{ fontWeight: "800", color: colors.text }}>current location</Text>. Search only if you want a
            different start.
          </Text>
          <View style={{ paddingHorizontal: 12, gap: 8 }}>
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
              placeholder={fromLocating ? "Locating you…" : "Current location (search to change)"}
            />
            {fromUserEdited ? (
              <TouchableOpacity onPress={useMyLocationAgain} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="crosshair" size={14} color="#15803d" />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#15803d" }}>Use my current location for A</Text>
              </TouchableOpacity>
            ) : null}
            <LocationAutocomplete
              value={toText}
              onChange={setToText}
              selected={toPlace}
              onSelect={(p) => {
                setToPlace(p);
                setToText(p.label);
              }}
              placeholder="To (point B) — search destination"
            />
          </View>

          {error ? (
            <Text style={{ color: "#b91c1c", fontSize: 12, marginHorizontal: 12, marginTop: 4 }}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.routePlannerGo, (loading || !canPlan) && { opacity: 0.5 }]}
            onPress={runPlan}
            disabled={loading || !canPlan}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.routePlannerGoText}>Plan safe route</Text>
            )}
          </TouchableOpacity>

          {rec && summary ? (
            <View style={{ paddingHorizontal: 12 }}>
              <Text style={[styles.routePlannerHint, { color: colors.text }]}>
                <Text style={{ fontWeight: "800" }}>Recommended: </Text>
                {formatRouteDistance(rec.distanceMeters)} · {formatRouteDuration(rec.durationSeconds)}
              </Text>
              {alt ? (
                <Text style={[styles.routePlannerHint, { color: "#15803d" }]}>
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
        </ScrollView>
      ) : summary && rec ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
          <Text style={{ fontSize: 12, color: colors.subtext }} numberOfLines={1}>
            {formatRouteDistance(rec.distanceMeters)} · {formatRouteDuration(rec.durationSeconds)}
            {alt ? " · safer alt" : ""}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
