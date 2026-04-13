import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlerts, ActiveAlert } from "@/context/AlertContext";
import { useColors } from "@/hooks/useColors";

const SEV_COLOR: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

const TYPE_ICON: Record<string, string> = {
  blockage: "slash",
  construction: "tool",
  vip_movement: "star",
  accident: "alert-circle",
  congestion: "truck",
};

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m / 100) * 100}m away`;
  return `${(m / 1000).toFixed(1)}km away`;
}

function SingleAlert({ alert }: { alert: ActiveAlert }) {
  const colors = useColors();
  const { dismissAlert, replayAlert } = useAlerts();
  const slideAnim = useRef(new Animated.Value(-120)).current;

  const color = SEV_COLOR[alert.severity] ?? "#f59e0b";
  const icon = (TYPE_ICON[alert.type] ?? "alert-triangle") as any;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -140,
      duration: 220,
      useNativeDriver: true,
    }).start(() => dismissAlert(alert.id));
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: color,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Severity bar on left */}
      <View style={[styles.leftBar, { backgroundColor: color }]} />

      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={[styles.iconBox, { backgroundColor: color + "25" }]}>
            <Feather name={icon} size={16} color={color} />
          </View>
          <View style={styles.titleBlock}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: color }]}>
                <Text style={styles.badgeText}>{alert.severity.toUpperCase()}</Text>
              </View>
              <Text style={[styles.dist, { color: colors.mutedForeground }]}>
                {formatDist(alert.distanceMeters)}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {alert.title}
            </Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Location row */}
        <View style={styles.locRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.locText, { color: colors.subtext }]} numberOfLines={1}>
            {" "}{alert.location}
          </Text>
        </View>

        {/* Duration */}
        {alert.estimatedDuration ? (
          <View style={styles.locRow}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.locText, { color: colors.subtext }]}>
              {" "}Duration: {alert.estimatedDuration}
            </Text>
          </View>
        ) : null}

        {/* Alternate routes */}
        {alert.alternateRoutes && alert.alternateRoutes.length > 0 && (
          <View style={[styles.routeBox, { backgroundColor: "#16a34a18", borderColor: "#16a34a44" }]}>
            <Feather name="corner-up-right" size={13} color="#16a34a" />
            <View style={styles.routeContent}>
              <Text style={[styles.routeLabel, { color: "#16a34a" }]}>Use alternate route:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {alert.alternateRoutes.map((r, i) => (
                  <View key={i} style={[styles.routeChip, { backgroundColor: "#16a34a22", borderColor: "#16a34a55" }]}>
                    <Text style={[styles.routeChipText, { color: "#16a34a" }]}>{r}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => replayAlert(alert)}
            style={[styles.replayBtn, { backgroundColor: color + "18", borderColor: color + "44" }]}
          >
            <Feather name="volume-2" size={13} color={color} />
            <Text style={[styles.replayText, { color: color }]}>Replay Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={dismiss}
            style={[styles.dismissBtn, { backgroundColor: colors.muted }]}
          >
            <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export function AlertBanner() {
  const { activeAlerts } = useAlerts();
  const insets = useSafeAreaInsets();

  if (activeAlerts.length === 0) return null;

  const topOffset = Platform.OS === "web" ? 67 : insets.top;

  // Sort: critical first
  const sorted = [...activeAlerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
  });

  return (
    <View style={[styles.container, { top: topOffset + 4 }]} pointerEvents="box-none">
      {/* Show max 2 banners at once to avoid clutter */}
      {sorted.slice(0, 2).map((alert) => (
        <SingleAlert key={alert.id} alert={alert} />
      ))}
      {sorted.length > 2 && (
        <View style={styles.moreTag}>
          <Feather name="alert-triangle" size={12} color="#f97316" />
          <Text style={styles.moreText}>+{sorted.length - 2} more alerts</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 10,
    right: 10,
    zIndex: 1000,
    gap: 8,
    pointerEvents: "box-none",
  } as any,
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  leftBar: { width: 4 },
  body: { flex: 1, padding: 12, gap: 8 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  titleBlock: { flex: 1 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" as const },
  dist: { fontSize: 11, fontWeight: "600" as const },
  title: { fontSize: 13, fontWeight: "700" as const, lineHeight: 18 },
  closeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  locRow: { flexDirection: "row", alignItems: "center" },
  locText: { fontSize: 11, flex: 1 },
  routeBox: { flexDirection: "row", alignItems: "flex-start", borderRadius: 10, borderWidth: 1, padding: 8, gap: 8 },
  routeContent: { flex: 1, gap: 5 },
  routeLabel: { fontSize: 11, fontWeight: "700" as const },
  routeChip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  routeChipText: { fontSize: 11, fontWeight: "600" as const },
  actions: { flexDirection: "row", gap: 8 },
  replayBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  replayText: { fontSize: 12, fontWeight: "600" as const },
  dismissBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  dismissText: { fontSize: 12, fontWeight: "500" as const },
  moreTag: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "center", backgroundColor: "#f9730022", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  moreText: { fontSize: 12, color: "#f97316", fontWeight: "600" as const },
});
