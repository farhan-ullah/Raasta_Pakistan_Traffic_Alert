import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brandGradientColors } from "./screenTokens";

type Props = {
  eyebrow?: string;
  preTitleRow?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Full-width row under safe area (menu, avatar, etc.). */
  toolbar?: React.ReactNode;
  children?: React.ReactNode;
  tall?: boolean;
};

export function ScreenHero({ eyebrow, preTitleRow, title, subtitle, right, toolbar, children, tall }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[...brandGradientColors]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 10,
          paddingBottom: children ? 16 : tall ? 44 : 22,
          minHeight: tall ? 200 : undefined,
        },
        Platform.select({
          ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
          android: { elevation: 14 },
          default: {},
        }),
      ]}
    >
      {toolbar}
      <View style={styles.topRow}>
        <View style={styles.textCol}>
          {preTitleRow ? <View style={styles.preTitle}>{preTitleRow}</View> : null}
          {eyebrow && !preTitleRow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={[styles.title, tall && styles.titleTall]}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {children}
    </LinearGradient>
  );
}

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
    paddingHorizontal: 24,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
  },
  topRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginTop: 4 },
  textCol: { flex: 1 },
  preTitle: { marginBottom: 6 },
  right: { alignItems: "flex-end", justifyContent: "flex-end", paddingBottom: 2 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  titleTall: {
    fontSize: 34,
    lineHeight: 38,
  },
  sub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    marginTop: 8,
    fontWeight: "600",
    lineHeight: 20,
  },
  liveOuter: { borderRadius: 999, padding: 2, backgroundColor: "rgba(255,255,255,0.12)" },
  liveInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(185, 28, 28, 0.45)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveTxt: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
});
