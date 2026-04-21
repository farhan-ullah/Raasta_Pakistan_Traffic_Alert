import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

const AVATAR_URI =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBV12XLaialV4wLtub3NnZs0VeO2vBHojUFpe3I-7N16Kph4SHrzGpX3F1IqzWVCIOQwDS75WUw_EHg7ByLm8HSKlltRw9vwT9u3N92uL_WMgglbxN8nc0JTuiAbq9w_yE3FuU4yaby_BOJC1xtYjhCtLBSNTVz0iSeHfNJdgBwrYxdLJ1aWv74YLkuweuyjS4pdMb-w5sv_VPiguQLG_GnG8yqF3gtNATYkks8AmjQTGV1s8y7fCpHysvQxqhCV3G9AX74VaWc4h19";

export default function ProfileTabScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const row = (icon: React.ComponentProps<typeof Feather>["name"], label: string, href: Href) => (
    <Pressable key={label} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={() => router.push(href)}>
      <Feather name={icon} size={22} color="#52525b" />
      <Text style={styles.rowText}>{label}</Text>
      <Feather name="chevron-right" size={20} color="#a1a1aa" style={{ marginLeft: "auto" }} />
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top + 12 }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <View style={styles.card}>
        <Image source={{ uri: AVATAR_URI }} style={styles.avatar} accessibilityIgnoresInvertColors />
        <View>
          <Text style={styles.name}>Islamabad Citizen</Text>
          <Text style={styles.role}>Verified Resident</Text>
        </View>
      </View>

      <View style={styles.list}>
        {row("shield", "Police & safety", "/(tabs)/police")}
        {row("alert-triangle", "Traffic updates", "/(tabs)/traffic")}
        {row("camera", "Report incident", "/(tabs)/report")}
      </View>

      <Text style={styles.footer}>Raasta Pakistan · v2.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9f9fe" },
  card: {
    marginHorizontal: 24,
    marginTop: 8,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  avatar: { width: 64, height: 64, borderRadius: 18, backgroundColor: "#b4f1bc" },
  name: { fontSize: 20, fontWeight: "900", color: "#01411C" },
  role: { fontSize: 14, fontWeight: "600", color: "#71717a", marginTop: 4 },
  list: { marginTop: 24, marginHorizontal: 16, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  rowText: { fontSize: 16, fontWeight: "700", color: "#1a1c1f" },
  footer: {
    marginTop: 32,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#a1a1aa",
    letterSpacing: 1,
  },
});
