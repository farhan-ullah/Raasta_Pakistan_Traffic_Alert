import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brandGradientColors } from "./screenTokens";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Trailing control (e.g. LIVE, Owner) */
  right?: React.ReactNode;
  /** Filters, search row — rendered below title */
  children?: React.ReactNode;
};

/** Gradient masthead aligned with map / dashboard analytics */
export function ScreenHero({ eyebrow, title, subtitle, right, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[...brandGradientColors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 12,
          paddingBottom: children ? 14 : 18,
        },
        Platform.select({
          ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
          android: { elevation: 12 },
          default: {},
        }),
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.textCol}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {children}
    </LinearGradient>
  );
}

/** Compact LIVE indicator — same language as map header */
export function LivePillSm() {
  return (
    <View style={styles.liveOuter}>
      <View style={styles.liveInner}>
        <View style={styles.liveDot} />
        <Text style={styles.liveTxt}>LIVE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  textCol: { flex: 1 },
  right: { alignItems: "flex-end", justifyContent: "flex-start" },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
  },
  sub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    marginTop: 6,
    fontWeight: "600",
    lineHeight: 18,
  },
  liveOuter: { borderRadius: 999, padding: 2, backgroundColor: "rgba(255,255,255,0.12)" },
  liveInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239,68,68,0.35)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  liveTxt: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
});
