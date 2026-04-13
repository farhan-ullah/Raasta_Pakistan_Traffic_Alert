import React, { useState } from "react";
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
import { type GeocodePlace } from "@workspace/api-client-react";
import { planRoute, type RoutePlanResponse } from "@/api/routePlan";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { useColors } from "@/hooks/useColors";
import { nativeMapChromeStyles as styles } from "./nativeMapChromeStyles";
import { formatRouteDistance, formatRouteDuration } from "./routeMapUtils";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
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
    if (!fromPlace || !toPlace) {
      setError("Pick both places from the suggestions list.");
      return;
    }
    setLoading(true);
    try {
      const res = await planRoute({
        fromLat: fromPlace.lat,
        fromLng: fromPlace.lng,
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

  return (
    <View style={[styles.routePlannerWrap, { top: topOffset, backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.routePlannerHeader} onPress={toggle} activeOpacity={0.85}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="navigation-2" size={18} color="#15803d" />
          <Text style={[styles.routePlannerTitle, { color: colors.text }]}>Route (A → B)</Text>
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
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 260 }} contentContainerStyle={{ paddingBottom: 10 }}>
          <View style={{ paddingHorizontal: 12, gap: 8 }}>
            <LocationAutocomplete
              value={fromText}
              onChange={setFromText}
              selected={fromPlace}
              onSelect={(p) => {
                setFromPlace(p);
                setFromText(p.label);
              }}
              placeholder="From (Point A)"
            />
            <LocationAutocomplete
              value={toText}
              onChange={setToText}
              selected={toPlace}
              onSelect={(p) => {
                setToPlace(p);
                setToText(p.label);
              }}
              placeholder="To (Point B)"
            />
          </View>

          {error ? (
            <Text style={{ color: "#b91c1c", fontSize: 12, marginHorizontal: 12, marginTop: 4 }}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.routePlannerGo, loading && { opacity: 0.7 }]}
            onPress={runPlan}
            disabled={loading}
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
