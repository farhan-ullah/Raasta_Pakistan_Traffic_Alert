import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  /** Degrees clockwise from north; arrow stroke points **up** when rotation 0. */
  headingDeg: number;
  size?: "md" | "sm";
};

/**
 * Navigation “vehicle” puck — green gradient disc + chevron aligned to GPS heading.
 */
export function NavigationVehiclePuck({ headingDeg, size = "md" }: Props) {
  const dim = size === "md" ? 46 : 40;
  const icon = size === "md" ? 23 : 20;
  return (
    <View style={[styles.wrap, { width: dim + 8, height: dim + 8 }]}>
      <View style={[styles.ring, { width: dim + 8, height: dim + 8, borderRadius: (dim + 8) / 2 }]} />
      <LinearGradient
        colors={["#22c55e", "#15803d", "#052e16"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.disc, { width: dim, height: dim, borderRadius: dim / 2 }]}
      >
        <View
          style={[
            styles.arrowBox,
            Platform.OS === "ios"
              ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.35, shadowRadius: 2 }
              : { elevation: 2 },
          ]}
        >
          <View style={{ transform: [{ rotate: `${headingDeg}deg` }] }}>
            <Ionicons name="navigate" size={icon} color="#ffffff" />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.95)",
    backgroundColor: "rgba(1,65,28,0.08)",
  },
  disc: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  arrowBox: {
    alignItems: "center",
    justifyContent: "center",
  },
});
