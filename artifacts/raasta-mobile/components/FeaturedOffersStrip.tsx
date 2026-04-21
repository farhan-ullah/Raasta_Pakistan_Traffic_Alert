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
  /** Distance from top of screen (below header overlap). */
  top: number;
};

/**
 * Horizontal featured offers — parity with web home strip; taps open native offer detail.
 */
export function FeaturedOffersStrip({ top }: Props) {
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
      <View style={[styles.loaderWrap, { top }]}>
        <ActivityIndicator size="small" color="#006E26" />
      </View>
    );
  }

  if (offers.length === 0) return null;

  return (
    <View style={[styles.strip, { top }]} pointerEvents="box-none">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {offers.map((offer, idx) => (
          <Pressable
            key={offer.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            onPress={() => router.push(`/offers/${offer.id}` as Href)}
          >
            <View
              style={[
                styles.iconTile,
                { backgroundColor: idx % 2 === 0 ? "#b4f1bc" : "#82f98e" },
              ]}
            >
              <Feather
                name={idx % 2 === 0 ? "droplet" : "award"}
                size={20}
                color={idx % 2 === 0 ? "#01411c" : "#007329"}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.kicker} numberOfLines={1}>
                {offer.merchantName ?? "Partner"}
              </Text>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {offer.title}
              </Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push("/offers" as Href)} hitSlop={8} style={styles.seeAllChip}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 22,
    paddingHorizontal: 24,
  },
  loaderWrap: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 22,
    paddingVertical: 12,
    alignItems: "center",
  },
  scroll: {
    gap: 12,
    paddingRight: 8,
    paddingBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 220,
    maxWidth: 280,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    ...cardShadow,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    fontSize: 11,
    fontWeight: "600",
    color: "#414941",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  seeAllChip: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(1,65,28,0.12)",
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#006E26",
  },
});
