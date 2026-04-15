import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useListIncidents } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { usePoliceAuth } from "@/context/PoliceAuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IncidentCard } from "@/components/IncidentCard";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import type { GeocodePlace } from "@workspace/api-client-react";

import { getApiOrigin } from "@/constants/apiOrigin";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenHero, LivePillSm } from "@/components/ui/ScreenHero";
import { brandGradientColors, floatShadow } from "@/components/ui/screenTokens";

const BASE = getApiOrigin();

type Tab = "citizen" | "post" | "resolved";

const TYPES = [
  { value: "blockage", label: "Road Blockage", icon: "slash" as const },
  { value: "construction", label: "Construction", icon: "tool" as const },
  { value: "vip_movement", label: "VIP Movement", icon: "star" as const },
  { value: "accident", label: "Accident", icon: "alert-circle" as const },
  { value: "congestion", label: "Congestion", icon: "truck" as const },
];

const SEVERITIES = [
  { value: "low", color: "#16a34a" },
  { value: "medium", color: "#f59e0b" },
  { value: "high", color: "#f97316" },
  { value: "critical", color: "#dc2626" },
];

function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = usePoliceAuth();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogin = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await login(pin);
    if (!result.success) {
      setError(result.error ?? "Invalid access code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={[...brandGradientColors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingTop: topPad }}>
      <View style={styles.loginWrap}>
        <View style={styles.loginBrand}>
          <Image
            source={require("@/assets/images/police_icon.png")}
            style={{ width: 48, height: 48 }}
            resizeMode="contain"
            accessibilityLabel="Police"
          />
          <Text style={styles.loginHeroTitle}>Police Command</Text>
          <Text style={styles.loginHeroSub}>Raasta · Islamabad Traffic Control</Text>
        </View>

        <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }, floatShadow]}>
          <View style={styles.loginCardHeader}>
            <Feather name="lock" size={14} color={colors.primaryLight} />
            <Text style={[styles.loginCardTitle, { color: colors.text }]}>Officer Access Code Required</Text>
          </View>

          <View style={[styles.pinWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TextInput
              value={pin}
              onChangeText={(v) => { setPin(v); setError(""); }}
              placeholder="Enter access code"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPin}
              autoComplete="current-password"
              style={[styles.pinInput, { color: colors.text }]}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPin((v) => !v)} style={styles.pinEye}>
              <Feather name={showPin ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={[styles.errorRow, { backgroundColor: "#ef444422", borderColor: "#ef4444" }]}>
              <Feather name="alert-triangle" size={14} color="#ef4444" />
              <Text style={[styles.errorText, { color: "#ef4444" }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: loading || !pin.trim() ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={loading || !pin.trim()}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Image
                  source={require("@/assets/images/police_icon.png")}
                  style={{ width: 16, height: 16 }}
                  resizeMode="contain"
                />
                <Text style={styles.loginBtnText}>Enter Portal</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.loginDisclaimer, { color: colors.mutedForeground }]}>
            Access restricted to authorized Islamabad Traffic Police officers.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export default function PoliceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { token, isLoading: authLoading, logout } = usePoliceAuth();

  const [tab, setTab] = useState<Tab>("citizen");
  const [form, setForm] = useState({
    type: "blockage", title: "", description: "", severity: "medium", officerName: "", badge: "",
    affectedRoads: "", alternateRoutes: "", duration: "",
  });
  const [place, setPlace] = useState<GeocodePlace | null>(null);
  const [locQuery, setLocQuery] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [posting, setPosting] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const { data: allIncidents = [], isLoading, refetch } = useListIncidents(
    { status: "all" },
    { query: { refetchInterval: token ? 10_000 : false, enabled: !!token, queryKey: ["listIncidents", "all"] } }
  );

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primaryLight} size="large" />
      </View>
    );
  }

  if (!token) return <LoginScreen />;

  type IncidentItem = (typeof allIncidents)[0];
  const active = allIncidents.filter((i: IncidentItem) => i.status === "active");
  const resolved = allIncidents.filter((i: IncidentItem) => i.status === "resolved");
  const citizen = active.filter((i: IncidentItem) => i.reportedBy === "citizen");
  const police = active.filter((i: IncidentItem) => i.reportedBy !== "citizen");
  const unverified = citizen.filter((i: IncidentItem & { isVerifiedByPolice?: boolean }) => !i.isVerifiedByPolice);

  const policeHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

  const verifyReport = async (id: string) => {
    const res = await fetch(`${BASE}/api/incidents/${id}`, {
      method: "PATCH",
      headers: policeHeaders(),
      body: JSON.stringify({ isVerifiedByPolice: true, severity: "high" }),
    });
    if (res.ok) { await queryClient.invalidateQueries(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
  };

  const resolveIncident = async (id: string) => {
    const res = await fetch(`${BASE}/api/incidents/${id}`, {
      method: "PATCH",
      headers: policeHeaders(),
      body: JSON.stringify({ status: "resolved" }),
    });
    if (res.ok) { await queryClient.invalidateQueries(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
  };

  const postAlert = async () => {
    if (!form.title || !place) {
      Alert.alert("Missing Info", "Title and a searched location are required.");
      return;
    }
    const locationLine = [place.fullName, locationDetail.trim()].filter(Boolean).join(", ");
    setPosting(true);
    try {
      const res = await fetch(`${BASE}/api/incidents`, {
        method: "POST",
        headers: policeHeaders(),
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          description: form.description,
          location: locationLine,
          area: place.area ?? "",
          city: place.state ?? "Unknown",
          lat: place.lat,
          lng: place.lng,
          severity: form.severity,
          officerName: `${form.officerName}${form.badge ? ` (${form.badge})` : ""}`,
          reportedBy: "police",
          affectedRoads: form.affectedRoads.split("\n").filter(Boolean),
          alternateRoutes: form.alternateRoutes.split("\n").filter(Boolean),
          estimatedDuration: form.duration,
        }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries();
        setForm({ type: "blockage", title: "", description: "", severity: "medium", officerName: "", badge: "", affectedRoads: "", alternateRoutes: "", duration: "" });
        setPlace(null);
        setLocQuery("");
        setLocationDetail("");
        setTab("citizen");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Posted", "Alert is now live on the map.");
      }
    } catch {
      Alert.alert("Error", "Failed to post alert.");
    } finally {
      setPosting(false);
    }
  };

  const policeHeaderRight = (
    <View style={styles.headerRight}>
      <LivePillSm />
      <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
        <Feather name="log-out" size={18} color="rgba(255,255,255,0.9)" />
      </TouchableOpacity>
    </View>
  );

  const statsStrip = (
    <View style={styles.statsRow}>
      {[
        { label: "Active", value: active.length, color: "#ef4444" },
        { label: "Unverified", value: unverified.length, color: "#f59e0b" },
        { label: "Citizens", value: citizen.length, color: "#60a5fa" },
        { label: "Resolved", value: resolved.length, color: "#4ade80" },
      ].map((s) => (
        <View key={s.label} style={styles.statCard}>
          <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS === "web" ? <View style={{ height: topPad }} /> : null}
      <ScreenHero
        eyebrow="Operations"
        title="Police command"
        subtitle="Islamabad traffic control"
        right={policeHeaderRight}
      >
        {statsStrip}
      </ScreenHero>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {([
          { key: "citizen" as Tab, label: "Reports", count: citizen.length },
          { key: "post" as Tab, label: "Post Alert" },
          { key: "resolved" as Tab, label: "Resolved", count: resolved.length },
        ]).map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && { borderBottomColor: colors.primaryLight, borderBottomWidth: 2 }]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, { color: tab === t.key ? colors.primaryLight : colors.mutedForeground }]}>{t.label}</Text>
            {t.count !== undefined && t.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: tab === t.key ? colors.primary : colors.muted }]}>
                <Text style={[styles.tabBadgeText, { color: tab === t.key ? "#fff" : colors.mutedForeground }]}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {tab === "citizen" && (
        <FlatList
          data={[...citizen, ...police]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <IncidentCard
              incident={item as any}
              showActions
              onVerify={item.reportedBy === "citizen" ? verifyReport : undefined}
              onResolve={resolveIncident}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primaryLight} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No citizen reports right now</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {tab === "post" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.formTitle, { color: colors.text }]}>Post Official Alert</Text>

          <Text style={[styles.inputLabel, { color: colors.subtext }]}>Incident Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
            {TYPES.map((t) => (
              <TouchableOpacity key={t.value} onPress={() => setForm((f) => ({ ...f, type: t.value }))}
                style={[styles.typeChip, { backgroundColor: form.type === t.value ? colors.primary : colors.card, borderColor: form.type === t.value ? colors.primary : colors.border }]}>
                <Feather name={t.icon} size={14} color={form.type === t.value ? "#fff" : colors.text} />
                <Text style={[styles.typeChipText, { color: form.type === t.value ? "#fff" : colors.text }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.inputLabel, { color: colors.subtext }]}>Severity</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {SEVERITIES.map((s) => (
              <TouchableOpacity key={s.value} onPress={() => setForm((f) => ({ ...f, severity: s.value }))}
                style={[styles.severityChip, { backgroundColor: form.severity === s.value ? s.color : colors.card, borderColor: form.severity === s.value ? s.color : colors.border }]}>
                <Text style={[styles.severityText, { color: form.severity === s.value ? "#fff" : colors.text }]}>{s.value.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {[
            { key: "title", label: "Incident Title *", placeholder: "e.g. VIP Convoy on Constitution Ave" },
            { key: "officerName", label: "Officer Name", placeholder: "Your name" },
            { key: "badge", label: "Badge Number", placeholder: "Badge #" },
            { key: "duration", label: "Estimated Duration", placeholder: "e.g. 2 hours" },
          ].map((field) => (
            <View key={field.key}>
              <Text style={[styles.inputLabel, { color: colors.subtext }]}>{field.label}</Text>
              <TextInput
                value={(form as Record<string, string>)[field.key]}
                onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                placeholder={field.placeholder}
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              />
            </View>
          ))}

          <Text style={[styles.inputLabel, { color: colors.subtext }]}>Location * — search any place</Text>
          <LocationAutocomplete
            value={locQuery}
            onChange={(v) => {
              setLocQuery(v);
              if (place && v !== place.fullName) setPlace(null);
            }}
            selected={place}
            onSelect={(p) => {
              setPlace(p);
              setLocQuery(p.fullName);
            }}
            placeholder="e.g. Zero Point Islamabad, Mall Road…"
          />
          <Text style={[styles.inputLabel, { color: colors.subtext, marginTop: 8 }]}>Additional detail (optional)</Text>
          <TextInput
            value={locationDetail}
            onChangeText={(v) => setLocationDetail(v)}
            placeholder="e.g. near signal, flyover"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.subtext }]}>Description</Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Situation details..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.subtext }]}>Affected Roads (one per line)</Text>
          <TextInput
            value={form.affectedRoads}
            onChangeText={(v) => setForm((f) => ({ ...f, affectedRoads: v }))}
            placeholder="Constitution Avenue&#10;Margalla Road"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={2}
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.subtext }]}>Alternate Routes (one per line)</Text>
          <TextInput
            value={form.alternateRoutes}
            onChangeText={(v) => setForm((f) => ({ ...f, alternateRoutes: v }))}
            placeholder="Use Nazim-ud-Din Road&#10;Via F-6"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={2}
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          />

          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: colors.primary, opacity: posting || !form.title || !place ? 0.6 : 1 }]}
            onPress={postAlert}
            disabled={posting || !form.title || !place}
          >
            {posting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="radio" size={16} color="#fff" />
                <Text style={styles.postBtnText}>Post Live Alert</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {tab === "resolved" && (
        <FlatList
          data={resolved}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <IncidentCard incident={item as any} />}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="check-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No resolved incidents yet</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loginBrand: { alignItems: "center", gap: 6, marginBottom: 8 },
  loginHeroTitle: { fontSize: 28, fontWeight: "900" as const, color: "#fff", letterSpacing: -0.5 },
  loginHeroSub: { fontSize: 14, color: "rgba(255,255,255,0.88)", fontWeight: "600" as const },
  loginWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  loginIconBox: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  loginTitle: { fontSize: 26, fontWeight: "900" as const },
  loginSub: { fontSize: 13 },
  loginCard: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  loginCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  loginCardTitle: { fontSize: 14, fontWeight: "600" as const },
  pinWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  pinInput: { flex: 1, paddingVertical: 14, fontSize: 15 },
  pinEye: { padding: 8 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  errorText: { fontSize: 13, flex: 1 },
  loginBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 15 },
  loginBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" as const },
  loginDisclaimer: { fontSize: 11, textAlign: "center" },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: "900" as const, color: "#fff" },
  headerSub: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#ef444488", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800" as const },
  logoutBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 10, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800" as const },
  statLabel: { fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabText: { fontSize: 12, fontWeight: "600" as const },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  tabBadgeText: { fontSize: 10, fontWeight: "700" as const },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14 },
  formTitle: { fontSize: 16, fontWeight: "700" as const, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: "600" as const, marginBottom: 6 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 14 },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  typeChipText: { fontSize: 13, fontWeight: "500" as const },
  severityChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  severityText: { fontSize: 11, fontWeight: "700" as const },
  postBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  postBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" as const },
});
