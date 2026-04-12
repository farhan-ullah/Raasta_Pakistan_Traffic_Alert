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
} from "react-native";
import { useListIncidents } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IncidentCard } from "@/components/IncidentCard";
import { Feather } from "@expo/vector-icons";

type FilterType = "all" | "blockage" | "construction" | "vip_movement" | "accident" | "congestion";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "blockage", label: "Blocked" },
  { key: "accident", label: "Accident" },
  { key: "construction", label: "Construction" },
  { key: "congestion", label: "Congestion" },
  { key: "vip_movement", label: "VIP" },
];

export default function TrafficScreen() {
  const colors = useColors();
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Live Traffic</Text>
            <Text style={styles.headerSub}>{allIncidents.length} active incidents · Islamabad</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                filter === f.key
                  ? { backgroundColor: "#fff" }
                  : { backgroundColor: "rgba(255,255,255,0.15)" },
              ]}
            >
              <Text style={[
                styles.filterText,
                { color: filter === f.key ? colors.primary : "#fff" },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <IncidentCard incident={item as any} />}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
        scrollEnabled={incidents.length > 0}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#25a244" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="check-circle" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
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
  header: { paddingBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: "900" as const, color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ef444488", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800" as const },
  filters: { marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterText: { fontSize: 13, fontWeight: "600" as const },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const },
  emptyDesc: { fontSize: 14, textAlign: "center" },
});
