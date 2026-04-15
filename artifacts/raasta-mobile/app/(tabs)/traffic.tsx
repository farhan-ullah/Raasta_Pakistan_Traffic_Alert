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

  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHero
        eyebrow="Road watch"
        title="Live traffic"
        subtitle={`${allIncidents.length} active in Islamabad`}
        right={<LivePillSm />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.chipsInner}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                filter === f.key ? styles.chipOn : styles.chipOff,
              ]}
            >
              <Text style={[styles.filterText, filter === f.key ? styles.chipTxtOn : styles.chipTxtOff]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScreenHero>

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
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <Feather name="check-circle" size={40} color={colors.primaryLight} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All clear</Text>
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
  filters: { marginTop: 4 },
  chipsInner: { gap: 8, paddingBottom: 2 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 999 },
  chipOn: { backgroundColor: "#fff" },
  chipOff: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  filterText: { fontSize: 13, fontWeight: "700" },
  chipTxtOn: { color: "#01411C" },
  chipTxtOff: { color: "#fff" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 56, gap: 10, paddingHorizontal: 24 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "800" },
  emptyDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
