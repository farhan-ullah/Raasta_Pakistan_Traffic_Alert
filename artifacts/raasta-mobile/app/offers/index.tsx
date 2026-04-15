import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Href, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { useListOffers } from "@workspace/api-client-react";
import type { Offer } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { getApiOrigin } from "@/constants/apiOrigin";
import { ScreenHero } from "@/components/ui/ScreenHero";
import { cardShadow } from "@/components/ui/screenTokens";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "restaurant", label: "Restaurants" },
  { value: "cafe", label: "Cafes" },
  { value: "pharmacy", label: "Pharmacies" },
  { value: "beauty", label: "Beauty" },
  { value: "shop", label: "Shops" },
  { value: "takeaway", label: "Takeaway" },
  { value: "grocery", label: "Grocery" },
  { value: "massage", label: "Wellness" },
];

export default function OffersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const params = category ? { category } : undefined;
  const { data: raw, isLoading } = useListOffers(params, {
    query: { refetchInterval: 45_000 } as any,
  });

  const offers = useMemo(() => (Array.isArray(raw) ? raw : []), [raw]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter(
      o =>
        o.title.toLowerCase().includes(q) ||
        (o.merchantName && o.merchantName.toLowerCase().includes(q)),
    );
  }, [offers, search]);

  const openMerchantPortal = () => {
    const base = getApiOrigin().replace(/\/+$/, "");
    void WebBrowser.openBrowserAsync(`${base}/merchant-portal`);
  };

  const renderItem = ({ item }: { item: Offer }) => (
    <Pressable
      style={[styles.card, cardShadow, { borderColor: colors.border, backgroundColor: colors.background }]}
      onPress={() => router.push(`/offers/${item.id}` as Href)}
    >
      <View style={styles.cardHero}>
        {item.discountPercent != null ? (
          <Text style={styles.heroPct}>{Math.round(item.discountPercent)}%</Text>
        ) : (
          <Text style={styles.heroOff}>OFF</Text>
        )}
        <Text style={styles.heroSub}>OFF</Text>
        {item.merchantCategory ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.merchantCategory}</Text>
          </View>
        ) : null}
        {item.code ? (
          <View style={styles.codePill}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.merchantName}
            </Text>
          </View>
          {item.validUntil ? (
            <Text style={styles.ends}>
              {new Date(item.validUntil) > new Date()
                ? `Ends ${new Date(item.validUntil).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}`
                : "Expired"}
            </Text>
          ) : null}
        </View>
        {item.offerPrice != null ? (
          <View style={styles.priceRow}>
            <Text style={styles.price}>Rs. {item.offerPrice}</Text>
            {item.originalPrice != null ? (
              <Text style={styles.was}>Rs. {item.originalPrice}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  const ownerBtn = (
    <Pressable style={styles.ownerBtn} onPress={openMerchantPortal}>
      <Feather name="briefcase" size={14} color="#fff" />
      <Text style={styles.ownerText}>Owner</Text>
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHero eyebrow="Deals" title="Offers" subtitle="Shops & savings in Islamabad" right={ownerBtn}>
        <View style={styles.searchWrap}>
          <Feather name="search" size={18} color="rgba(255,255,255,0.65)" style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search offers or shops..."
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={styles.searchInput}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map(cat => {
            const on = category === cat.value;
            return (
              <Pressable
                key={cat.value || "all"}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                onPress={() => setCategory(cat.value)}
              >
                <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{cat.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScreenHero>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#15803d" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 28 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIco, { backgroundColor: colors.muted }]}>
                <Feather name="tag" size={36} color={colors.primaryLight} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No offers found</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Try another category or search term
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ownerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  ownerText: { color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    marginBottom: 10,
  },
  searchIcon: { marginLeft: 12 },
  searchInput: {
    flex: 1,
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  chips: { gap: 8, paddingBottom: 2 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipOn: { backgroundColor: "#fff" },
  chipOff: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  chipLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.95)" },
  chipLabelOn: { color: "#01411C" },
  list: { padding: 16, gap: 14 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHero: {
    backgroundColor: "#01411C",
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroPct: { fontSize: 40, fontWeight: "900", color: "#fff" },
  heroOff: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: -4 },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  codePill: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: { color: "#78350f", fontSize: 11, fontWeight: "800" },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  desc: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  metaLeft: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  metaText: { fontSize: 12, flex: 1 },
  ends: { fontSize: 12, fontWeight: "600", color: "#ea580c" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 8 },
  price: { fontSize: 20, fontWeight: "900", color: "#15803d" },
  was: { fontSize: 14, color: "#9ca3af", textDecorationLine: "line-through" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyIco: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
});
