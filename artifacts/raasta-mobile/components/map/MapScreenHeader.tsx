import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Height from safe-area top to bottom of header — positions route card below title. */
export const MAP_HEADER_OFFSET_BELOW_SAFE = 102;

type Props = {
  subtitle: string;
};

export function MapScreenHeader({ subtitle }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#012814", "#01411C", "#087a3d"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradient,
        {
          paddingTop: insets.top + 10,
          paddingBottom: 14,
          paddingHorizontal: 18,
        },
        Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
          },
          android: { elevation: 14 },
          default: {},
        }),
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <Text style={styles.brand}>Raasta</Text>
          <Text style={styles.byline}>by Averox</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>
        <View style={styles.liveOuter}>
          <View style={styles.liveInner}>
            <View style={styles.pulse} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  brand: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
  },
  byline: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    marginTop: -2,
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
    marginTop: 6,
    fontWeight: "600",
    lineHeight: 16,
  },
  liveOuter: {
    borderRadius: 999,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  liveInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  liveText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});
