import React from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Distance from safe-area top to the bottom edge of the header chrome —
 * positions floating layers (offers, search) below the title block.
 */
export const MAP_HEADER_OFFSET_BELOW_SAFE = 138;

const AVATAR_URI =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBV12XLaialV4wLtub3NnZs0VeO2vBHojUFpe3I-7N16Kph4SHrzGpX3F1IqzWVCIOQwDS75WUw_EHg7ByLm8HSKlltRw9vwT9u3N92uL_WMgglbxN8nc0JTuiAbq9w_yE3FuU4yaby_BOJC1xtYjhCtLBSNTVz0iSeHfNJdgBwrYxdLJ1aWv74YLkuweuyjS4pdMb-w5sv_VPiguQLG_GnG8yqF3gtNATYkks8AmjQTGV1s8y7fCpHysvQxqhCV3G9AX74VaWc4h19";

type Props = {
  subtitle: string;
  onRefreshPress?: () => void;
  refreshing?: boolean;
};

export function MapScreenHeader({ subtitle, onRefreshPress, refreshing = false }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#01411C", "#00290F"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        styles.gradient,
        {
          paddingTop: insets.top + 12,
          paddingBottom: 28,
          paddingHorizontal: 24,
          marginBottom: -36,
        },
        Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
          },
          android: { elevation: 12 },
          default: {},
        }),
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftAccent}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>LIVE</Text>
          <View style={styles.divider} />
          <Feather name="map-pin" size={16} color="rgba(255,255,255,0.95)" />
          <Text style={styles.cityPill}>Islamabad</Text>
        </View>
        <View style={styles.rightTools}>
          {onRefreshPress ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onRefreshPress}
              disabled={refreshing}
              accessibilityRole="button"
              accessibilityLabel="Refresh incidents"
            >
              {refreshing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="refresh-cw" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ) : null}
          <View style={styles.avatarRing}>
            <Image source={{ uri: AVATAR_URI }} style={styles.avatar} accessibilityIgnoresInvertColors />
          </View>
        </View>
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.brand}>Raasta Pakistan</Text>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
    overflow: "hidden",
    zIndex: 40,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  leftAccent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#82f98e",
  },
  liveLabel: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  divider: { width: 1, height: 14, backgroundColor: "rgba(255,255,255,0.25)" },
  cityPill: { color: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: "800" },
  rightTools: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  iconBtn: {
    padding: 8,
    borderRadius: 999,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  titleBlock: {
    marginTop: 14,
  },
  brand: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
    lineHeight: 38,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  sub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    marginTop: 8,
    fontWeight: "600",
    lineHeight: 18,
  },
});
