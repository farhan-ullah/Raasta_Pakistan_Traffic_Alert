import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetOffer, useRedeemOffer, getGetOfferQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { brandGradientColors, cardShadow, floatShadow } from "@/components/ui/screenTokens";

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const offerId = typeof id === "string" ? id : id?.[0] ?? "";

  const { data: offer, isLoading } = useGetOffer(offerId, {
    query: {
      enabled: !!offerId,
      queryKey: offerId ? getGetOfferQueryKey(offerId) : (["offers", "disabled"] as const),
    } as any,
  });

  const redeemMutation = useRedeemOffer();
  const [redeemedToken, setRedeemedToken] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);

  const handleRedeem = async () => {
    try {
      const result = await redeemMutation.mutateAsync({
        id: offerId,
        data: { userId: `user-${Date.now()}`, userName: "Customer" },
      });
      setRedeemedToken(result.token);
      setQrData(result.qrData ?? result.token);
    } catch {
      /* toast optional */
    }
  };

  if (isLoading || !offerId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Loading offer…</Text>
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Offer not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isExpired = offer.validUntil ? new Date(offer.validUntil) < new Date() : false;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <LinearGradient
        colors={[...brandGradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.heroGradient,
          { paddingTop: insets.top + 10 },
          Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
            },
            android: { elevation: 12 },
            default: {},
          }),
        ]}
      >
        <Pressable style={styles.backRound} onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.heroEyebrow}>Raasta · Offers</Text>
        <Text style={styles.heroNavTitle}>Offer details</Text>
        <View style={styles.heroCenter}>
          {offer.discountPercent != null ? (
            <Text style={styles.heroPct}>{Math.round(offer.discountPercent)}%</Text>
          ) : offer.discountAmount != null ? (
            <Text style={styles.heroPct}>Rs.{offer.discountAmount}</Text>
          ) : null}
          <Text style={styles.heroOff}>OFF</Text>
          <View style={styles.badges}>
            {offer.merchantCategory ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{offer.merchantCategory}</Text>
              </View>
            ) : null}
            {!isExpired && offer.isActive ? (
              <View style={[styles.badge, styles.badgeActive]}>
                <Text style={styles.badgeTxt}>Active</Text>
              </View>
            ) : null}
            {isExpired ? (
              <View style={[styles.badge, styles.badgeExp]}>
                <Text style={styles.badgeTxt}>Expired</Text>
              </View>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      <View
        style={[
          styles.card,
          cardShadow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>{offer.title}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{offer.description}</Text>
        {(offer.offerPrice != null || offer.originalPrice != null) && (
          <View style={styles.priceBox}>
            {offer.offerPrice != null ? <Text style={styles.priceBig}>Rs. {offer.offerPrice}</Text> : null}
            {offer.originalPrice != null ? (
              <Text style={styles.was}>Rs. {offer.originalPrice}</Text>
            ) : null}
            {offer.discountPercent != null ? (
              <View style={styles.pctTag}>
                <Text style={styles.pctTagTxt}>-{Math.round(offer.discountPercent)}%</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View
        style={[
          styles.card,
          cardShadow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Merchant</Text>
        <View style={styles.row}>
          <Feather name="map-pin" size={18} color="#15803d" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.mName, { color: colors.text }]}>{offer.merchantName}</Text>
            <Text style={[styles.addr, { color: colors.mutedForeground }]}>{offer.address}</Text>
          </View>
        </View>
        {offer.validUntil ? (
          <View style={styles.row}>
            <Feather name="clock" size={18} color="#15803d" />
            <Text style={{ color: colors.mutedForeground, flex: 1 }}>
              Valid until:{" "}
              {new Date(offer.validUntil).toLocaleDateString("en-PK", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        ) : null}
        {offer.maxRedemptions != null ? (
          <View style={styles.row}>
            <Feather name="star" size={18} color="#15803d" />
            <Text style={{ color: colors.mutedForeground }}>
              {offer.currentRedemptions ?? 0} of {offer.maxRedemptions} redeemed
            </Text>
          </View>
        ) : null}
        {offer.code ? (
          <View style={styles.codeBox}>
            <Feather name="tag" size={18} color="#92400e" />
            <Text style={styles.codeMono}>{offer.code}</Text>
          </View>
        ) : null}
      </View>

      {redeemedToken && qrData ? (
        <View
          style={[
            styles.card,
            floatShadow,
            { backgroundColor: "#ecfdf5", borderColor: "#15803d" },
          ]}
        >
          <View style={styles.okRow}>
            <Feather name="check-circle" size={22} color="#15803d" />
            <Text style={styles.okTitle}>Offer redeemed</Text>
          </View>
          <Text style={styles.okHint}>Show this code at the counter.</Text>
          <View style={styles.qrPlaceholder}>
            <Feather name="grid" size={48} color="#15803d" />
          </View>
          <Text style={styles.tokenMono} numberOfLines={2}>
            {qrData}
          </Text>
        </View>
      ) : (
        <Pressable
          style={[
            styles.redeemBtn,
            floatShadow,
            (isExpired || !offer.isActive || redeemMutation.isPending) && styles.redeemDisabled,
          ]}
          onPress={handleRedeem}
          disabled={isExpired || !offer.isActive || redeemMutation.isPending}
        >
          <Feather name="maximize" size={20} color="#fff" />
          <Text style={styles.redeemTxt}>
            {redeemMutation.isPending
              ? "Working…"
              : isExpired
                ? "Offer expired"
                : "Redeem offer — get code"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroGradient: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
  },
  backRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  heroNavTitle: { color: "rgba(255,255,255,0.98)", fontWeight: "800", fontSize: 18, marginBottom: 6 },
  heroCenter: { alignItems: "center", paddingTop: 8 },
  heroPct: { fontSize: 56, fontWeight: "900", color: "#fff" },
  heroOff: { fontSize: 18, color: "rgba(255,255,255,0.9)", marginTop: -4 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeActive: { backgroundColor: "rgba(74,222,128,0.35)" },
  badgeExp: { backgroundColor: "rgba(248,113,113,0.35)" },
  badgeTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: "800" },
  body: { marginTop: 10, fontSize: 15, lineHeight: 22 },
  priceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 12,
    backgroundColor: "rgba(21,128,61,0.08)",
    borderRadius: 12,
  },
  priceBig: { fontSize: 26, fontWeight: "900", color: "#15803d" },
  was: { fontSize: 14, color: "#9ca3af", textDecorationLine: "line-through" },
  pctTag: { marginLeft: "auto", backgroundColor: "#01411C", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  pctTagTxt: { color: "#fff", fontWeight: "800" },
  sectionTitle: { fontWeight: "800", fontSize: 17, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  mName: { fontWeight: "700", fontSize: 16 },
  addr: { fontSize: 14, marginTop: 2 },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  codeMono: { fontFamily: "monospace", fontWeight: "800", color: "#92400e", flex: 1 },
  redeemBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#01411C",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  redeemDisabled: { opacity: 0.5 },
  redeemTxt: { color: "#fff", fontSize: 17, fontWeight: "800" },
  okRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  okTitle: { fontSize: 18, fontWeight: "800", color: "#15803d" },
  okHint: { color: "#64748b", marginBottom: 12 },
  qrPlaceholder: {
    height: 160,
    borderWidth: 3,
    borderColor: "#15803d",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  tokenMono: { fontFamily: "monospace", fontSize: 11, color: "#334155", marginTop: 10, textAlign: "center" },
  backBtn: { marginTop: 16, padding: 12 },
  backBtnText: { color: "#15803d", fontWeight: "700" },
});
