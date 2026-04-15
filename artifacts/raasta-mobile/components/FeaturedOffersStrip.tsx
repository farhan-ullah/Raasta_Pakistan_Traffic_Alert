import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { type Href, router } from "expo-router";
import {
  getGetFeaturedOffersQueryKey,
  useGetFeaturedOffers,
  useListOffers,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Props = {
  /** Distance from bottom of safe area (points). */
  bottom: number;
};

/**
 * Horizontal featured offers — parity with web home strip; taps open native offer detail.
 */
export function FeaturedOffersStrip({ bottom }: Props) {
  const colors = useColors();
  const { data: featuredRaw, isLoading: loadF } = useGetFeaturedOffers({
    query: { refetchInterval: 60_000, queryKey: getGetFeaturedOffersQueryKey() } as any,
  });
  const { data: listRaw, isLoading: loadL } = useListOffers(undefined, {
    query: { refetchInterval: 120_000 } as any,
  });

  const offers = useMemo(() => {
    const featured = Array.isArray(featuredRaw) ? featuredRaw : [];
    const list = Array.isArray(listRaw) ? listRaw : [];
    const src = featured.length > 0 ? featured : list;
    return src.slice(0, 8);
  }, [featuredRaw, listRaw]);

  const loading = loadF || loadL;

  if (loading && offers.length === 0) {
    return (
      <View
        style={[styles.wrap, styles.shadow, { bottom, backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <ActivityIndicator size="small" color="#15803d" />
      </View>
    );
  }

  if (offers.length === 0) return null;

  return (
    <View
      style={[styles.wrap, styles.shadow, { bottom, backgroundColor: colors.card, borderColor: colors.border }]}
      pointerEvents="box-none"
    >
      <View style={styles.rowTitle}>
        <View style={styles.titleRow}>
          <View style={[styles.spark, { backgroundColor: colors.accent }]}>
            <Feather name="tag" size={14} color="#15803d" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Featured offers</Text>
        </View>
        <Pressable
          onPress={() => router.push("/offers" as Href)}
          hitSlop={8}
        >
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {offers.map(offer => (
          <Pressable
            key={offer.id}
            style={[styles.card, styles.cardShadow, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => router.push(`/offers/${offer.id}` as Href)}
          >
            <View style={styles.cardTop}>
              {offer.discountPercent != null ? (
                <Text style={styles.pct}>{Math.round(offer.discountPercent)}%</Text>
              ) : (
                <Text style={styles.pctSm}>Deal</Text>
              )}
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {offer.title}
            </Text>
            <Text style={[styles.merchant, { color: colors.mutedForeground }]} numberOfLines={1}>
              {offer.merchantName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  android: { elevation: 7 },
  default: {},
});

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxHeight: 138,
    zIndex: 40,
  },
  shadow,
  rowTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  spark: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13, fontWeight: "800" },
  seeAll: { fontSize: 12, fontWeight: "700", color: "#15803d" },
  scroll: { gap: 10, paddingRight: 8 },
  card: {
    width: 130,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  cardShadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  }),
  cardTop: {
    minHeight: 28,
    justifyContent: "center",
  },
  pct: { fontSize: 20, fontWeight: "900", color: "#15803d" },
  pctSm: { fontSize: 12, fontWeight: "800", color: "#15803d" },
  cardTitle: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  merchant: { fontSize: 10, marginTop: 2 },
});
