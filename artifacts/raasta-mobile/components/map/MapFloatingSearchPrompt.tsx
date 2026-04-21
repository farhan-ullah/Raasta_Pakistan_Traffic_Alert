import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  top: number;
  onPress?: () => void;
  onNavPress?: () => void;
};

/** Floating search row — placed below green header; opens route planner when tapped. */
export function MapFloatingSearchPrompt({ top, onPress, onNavPress }: Props) {
  const SearchInner = onPress ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.searchTap, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Search routes in Islamabad"
    >
      <Feather name="search" size={20} color="#414941" />
      <Text style={styles.placeholder} numberOfLines={1}>
        Where are you going in Islamabad?
      </Text>
    </Pressable>
  ) : (
    <View style={styles.searchTap}>
      <Feather name="search" size={20} color="#414941" />
      <Text style={styles.placeholder} numberOfLines={1}>
        Where are you going in Islamabad?
      </Text>
    </View>
  );

  return (
    <View style={[styles.wrap, { top }]}>
      {SearchInner}
      {onNavPress ? (
        <Pressable
          onPress={onNavPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open route planner"
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Feather name="navigation" size={20} color="#006E26" />
        </Pressable>
      ) : null}
      <Feather name="mic" size={20} color="#414941" />
    </View>
  );
}

const lift = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 25,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    gap: 4,
    ...lift,
  },
  searchTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  pressed: { opacity: 0.88 },
  placeholder: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1c1f",
  },
  navBtn: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,110,38,0.1)",
  },
});
