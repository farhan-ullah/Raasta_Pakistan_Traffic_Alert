import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const PROVIDER_DEFAULT = "default";
export const PROVIDER_GOOGLE = "google";

export function Marker({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function Callout({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export default function MapView({ children, style }: { children?: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.text}>Map (native only)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f0f0f0" },
  text: { color: "#999", fontSize: 14 },
});
