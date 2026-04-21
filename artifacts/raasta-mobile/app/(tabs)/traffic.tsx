import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from "react-native";
import { useListIncidents } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IncidentCard } from "@/components/IncidentCard";
import { Feather } from "@expo/vector-icons";
import { ScreenHero, LivePillSm } from "@/components/ui/ScreenHero";

type FilterType = "all" | "blockage" | "construction" | "vip_movement" | "accident" | "congestion";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "blockage", label: "Blocked" },
  { key: "accident", label: "Accident" },
  { key: "construction", label: "Construction" },
  { key: "congestion", label: "Congestion" },
  { key: "vip_movement", label: "VIP" },
];

const AVATAR_URI =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCn5u0xon8LsVWCgcj7REYtd3wSrd2pk2a_32WAGCz36uvX1nE2pyZYyCpwqOWbxykJkL0FE6Tz4M9UJo2t9k34t-_9oVOvndGQec4gvQpth-6-z_NAb2OgUa8mJsOH-3vhp-FZ4d0WUcs3TEgaaxPAQwEg2x7sxxcd5DYQsONxls-vqPfDzRG8rElSyY3ALTDKAvg1Qt05Qthd68KiqLDW23eiLZrfuiuqwPAcqb-DdOhGqtwbEyLk78AyNeiJqQsN_RQLmhdsvH2G";

export default function TrafficScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: allIncidents = [], isLoading, refetch } = useListIncidents(
    { status: "active" },
    { query: { refetchInterval: 15_000, queryKey: ["listIncidents", "active"] } }
  );

  type IncidentItem = (typeof allIncidents)[0];
  const incidents = filter === "all"
    ? allIncidents
    : allIncidents.filter((i: IncidentItem) => i.type === filter);

  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 100;

  return (
    <View style={[styles.container, { backgroundColor: "#f9f9fe" }]}>
      <ScreenHero
        tall
        toolbar={
          <View style={styles.toolbar}>
            <View style={styles.avatarRing}>
              <Image source={{ uri: AVATAR_URI }} style={styles.avatar} accessibilityIgnoresInvertColors />
            </View>
          </View>
        }
        preTitleRow={
          <View style={styles.roadRow}>
            <Text style={styles.roadWatch}>ROAD WATCH</Text>
            <LivePillSm />
          </View>
        }
        title="Live Traffic"
        subtitle={`${allIncidents.length} active incidents in Islamabad`}
      />

      <View style={[styles.chipsWrap, { marginTop: -24 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsInner}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key ? styles.chipOn : styles.chipOff]}
            >
              <Text style={[styles.filterText, filter === f.key ? styles.chipTxtOn : styles.chipTxtOff]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IncidentCard incident={item as any} variant="civicFeed" />}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: bottomPad }}
        scrollEnabled={incidents.length > 0}
        numColumns={1}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#006E26" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: "#e8e8ed" }]}>
                <Feather name="check-circle" size={40} color="#53b46a" />
              </View>
              <Text style={[styles.emptyTitle, { color: "#1a1c1f" }]}>All clear</Text>
              <Text style={[styles.emptyDesc, { color: "#414941" }]}>
                No active incidents in {filter === "all" ? "Islamabad" : FILTERS.find((f) => f.key === filter)?.label ?? filter}
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 8,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#ededf2",
  },
  avatar: { width: "100%", height: "100%", resizeMode: "cover" },
  roadRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  roadWatch: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.4,
  },
  chipsWrap: {
    paddingHorizontal: 22,
    zIndex: 2,
  },
  chipsInner: { gap: 10, paddingBottom: 6 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999 },
  chipOn: { backgroundColor: "#b4f1bc", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  chipOff: { backgroundColor: "#e8e8ed" },
  filterText: { fontSize: 13, fontWeight: "700" },
  chipTxtOn: { color: "#00210b" },
  chipTxtOff: { color: "#414941", fontWeight: "600" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 56, gap: 10, paddingHorizontal: 24 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "800" },
  emptyDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
