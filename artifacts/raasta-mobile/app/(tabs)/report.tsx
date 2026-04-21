import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { GeocodePlace } from "@workspace/api-client-react";

import { getApiOrigin } from "@/constants/apiOrigin";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { ScreenHero } from "@/components/ui/ScreenHero";
import { floatShadow } from "@/components/ui/screenTokens";

const BASE = getApiOrigin();

/** Matches floating pill tab bar in `_layout.tsx` so the footer clears it (was hidden behind tabs). */
const TAB_BAR_FLOAT_HEIGHT = 76;

const AVATAR_URI =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAjPwch7Zvt9BRQtT00GaBMzhQuV4TExTG6tOiTpkFf1UzmWCOm2OcgtgugappXr7EEeIviNQGs4cw6_KmtZhzMq3ltEIvnXX9XyJhFV6e8tpNlvS8ggiKqN9hXCRMk3xqeWqBPy3rR12bCfOgkok3akN_l2tk7tzoa6QFvyxBizVbzQdXfGmdonnxbSa0Jj19w_D-YxXov3UdIbx5b_WqKj49WzsalgavLyhprqmrUaw2ymUrjxjgwn3HfIHHgW_1Qr-hdJNDyEnQP";

const TYPES = [
  { value: "blockage", label: "Road Blocked", icon: "slash" as const },
  { value: "accident", label: "Accident", icon: "alert-circle" as const },
  { value: "construction", label: "Construction", icon: "tool" as const },
  { value: "congestion", label: "Traffic Jam", icon: "truck" as const },
  { value: "vip_movement", label: "VIP Movement", icon: "star" as const },
];

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [type, setType] = useState("blockage");
  const [place, setPlace] = useState<GeocodePlace | null>(null);
  const [locQuery, setLocQuery] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarLift = Math.max(insets.bottom, 12) + TAB_BAR_FLOAT_HEIGHT + 8;
  const bottomPad = Platform.OS === "web" ? 100 : insets.bottom + 100;

  const pickImage = async (fromCamera: boolean) => {
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });

    if (!res.canceled && res.assets) {
      const newPhotos = res.assets
        .slice(0, 4 - photos.length)
        .map((a) => (a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri))
        .filter(Boolean) as string[];
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 4));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSubmit = async () => {
    if (!place) {
      Alert.alert("Missing Info", "Search and pick a location from the suggestions.");
      return;
    }
    const headline = place.area ?? place.fullName.split(",")[0]?.trim() ?? "Location";
    const locationStr = [place.fullName, locationDetail.trim()].filter(Boolean).join(", ");
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: `${TYPES.find((t) => t.value === type)?.label} — ${headline}`,
          description,
          location: locationStr,
          area: place.area ?? "",
          city: place.state ?? "Unknown",
          lat: place.lat,
          lng: place.lng,
          severity: "medium",
          reportedBy: "citizen",
          reporterPhone: phone || undefined,
          mediaUrls: photos,
          isVerifiedByPolice: false,
        }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries();
        setSubmitted(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error();
      }
    } catch {
      Alert.alert("Error", "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setType("blockage");
    setPlace(null);
    setLocQuery("");
    setLocationDetail("");
    setDescription("");
    setPhone("");
    setPhotos([]);
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: "#f9f9fe", paddingTop: topPad }]}>
        <View style={[styles.successCard, floatShadow, styles.successCardBorder]}>
          <View style={styles.successIconWrap}>
            <Feather name="check-circle" size={48} color="#006E26" />
          </View>
          <Text style={styles.successTitle}>Report submitted</Text>
          <Text style={styles.successDesc}>
            Your incident report is now live. Local police authorities may contact you to verify details if necessary.
          </Text>
          <TouchableOpacity style={styles.submitBtnWide} onPress={reset}>
            <Text style={styles.submitBtnText}>Report another</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/")} style={{ marginTop: 12 }}>
            <Text style={styles.backDash}>Back to map</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const mainTypes = TYPES.slice(0, 4);
  const vipType = TYPES[4];

  return (
    <View style={[styles.container, { backgroundColor: "#f9f9fe" }]}>
      {Platform.OS === "web" ? <View style={{ height: topPad }} /> : null}
      <ScreenHero
        tall
        toolbar={
          <View style={styles.reportToolbar}>
            <TouchableOpacity
              style={styles.iconGhost}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.avatarRing}>
              <Image source={{ uri: AVATAR_URI }} style={styles.avatar} accessibilityIgnoresInvertColors />
            </View>
          </View>
        }
        eyebrow="Community"
        title="Report incident"
        subtitle="Help others — verified reports appear on the map"
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: bottomPad + tabBarLift + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionH2}>What happened?</Text>
        <View style={styles.typePanel}>
          <View style={styles.typeGrid}>
            {mainTypes.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => {
                  setType(t.value);
                  Haptics.selectionAsync();
                }}
                style={[styles.typeTile, type === t.value ? styles.typeTileOn : styles.typeTileOff]}
              >
                <Feather name={t.icon} size={28} color={type === t.value ? "#fff" : "#01411c"} />
                <Text style={[styles.typeTileLabel, type === t.value && { color: "#fff" }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => {
              setType(vipType.value);
              Haptics.selectionAsync();
            }}
            style={[styles.typeTileFull, type === vipType.value ? styles.typeTileOn : styles.typeTileOff]}
          >
            <Feather name={vipType.icon} size={28} color={type === vipType.value ? "#fff" : "#01411c"} />
            <Text style={[styles.typeTileLabel, type === vipType.value && { color: "#fff" }]}>{vipType.label}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionH2}>Photos (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow} style={{ marginBottom: 8 }}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}>
                <Feather name="x" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 4 && (
            <>
              <TouchableOpacity style={styles.addPhoto} onPress={() => pickImage(true)}>
                <Feather name="camera" size={28} color="#717970" />
                <Text style={styles.addPhotoTxt}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addPhoto} onPress={() => pickImage(false)}>
                <Feather name="image" size={28} color="#717970" />
                <Text style={styles.addPhotoTxt}>Gallery</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <Text style={styles.sectionH2}>Location</Text>
        <Text style={styles.helper}>Search any place — region is set automatically.</Text>
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
          placeholder="e.g. DHA Lahore, F-7 Islamabad…"
        />
        <TextInput
          value={locationDetail}
          onChangeText={setLocationDetail}
          placeholder="Extra detail (optional)"
          placeholderTextColor="#717970"
          style={styles.inputMuted}
        />

        <Text style={styles.sectionH2}>Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add more details about what you're seeing..."
          placeholderTextColor="#717970"
          multiline
          numberOfLines={4}
          style={[styles.inputMuted, styles.textArea]}
        />

        <View style={styles.phoneHeader}>
          <Text style={styles.sectionH2}>Your phone (optional)</Text>
          <Text style={styles.phoneHint}>For verification only</Text>
        </View>
        <View style={styles.phoneRow}>
          <View style={styles.cc}>
            <Text style={styles.ccText}>+92</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="300 1234567"
            placeholderTextColor="#717970"
            keyboardType="phone-pad"
            style={[styles.inputMuted, { flex: 1, marginBottom: 0 }]}
          />
        </View>
      </ScrollView>

      <View style={[styles.footerBar, { bottom: tabBarLift }]}>
        <TouchableOpacity
          style={[styles.footerSubmit, { opacity: submitting ? 0.75 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.footerSubmitText}>Submit Report</Text>
              <Feather name="send" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  reportToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 4,
  },
  iconGhost: { padding: 8, borderRadius: 999 },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatar: { width: "100%", height: "100%", resizeMode: "cover" },
  sectionH2: {
    fontSize: 18,
    fontWeight: "800",
    color: "#01411c",
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  helper: { fontSize: 12, color: "#414941", marginBottom: 10, marginTop: -6 },
  typePanel: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeTile: {
    width: "47%",
    minHeight: 100,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },
  typeTileFull: {
    width: "100%",
    minHeight: 88,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexDirection: "row",
    marginTop: 10,
    paddingVertical: 18,
  },
  typeTileOn: { backgroundColor: "#01411c" },
  typeTileOff: { backgroundColor: "#f3f3f8" },
  typeTileLabel: { fontSize: 14, fontWeight: "700", color: "#01411c", textAlign: "center" },
  photoRow: { gap: 12, paddingVertical: 4 },
  photoWrap: { position: "relative" },
  photo: { width: 120, height: 120, borderRadius: 14 },
  removePhoto: { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 12, padding: 4 },
  addPhoto: {
    width: 120,
    height: 120,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#c0c9be",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addPhotoTxt: { fontSize: 12, fontWeight: "600", color: "#717970" },
  inputMuted: {
    backgroundColor: "#e8e8ed",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: "#1a1c1f",
    marginBottom: 12,
    borderWidth: 0,
  },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  phoneHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 },
  phoneHint: { fontSize: 11, color: "#717970", fontWeight: "600", marginBottom: 12 },
  phoneRow: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  cc: {
    backgroundColor: "#e8e8ed",
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: "center",
    marginBottom: 12,
  },
  ccText: { fontSize: 16, fontWeight: "800", color: "#01411c" },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  footerSubmit: {
    backgroundColor: "#006E26",
    borderRadius: 999,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#006E26",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  footerSubmitText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  successCardBorder: {
    borderWidth: 1,
    borderColor: "rgba(192, 201, 190, 0.35)",
  },
  successCard: {
    maxWidth: 400,
    width: "100%",
    marginHorizontal: 22,
    alignSelf: "center",
    borderRadius: 22,
    padding: 32,
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    marginTop: 24,
  },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#82f98e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 26, fontWeight: "900", color: "#1a1c1f", textAlign: "center" },
  successDesc: { fontSize: 16, color: "#414941", textAlign: "center", lineHeight: 24 },
  submitBtnWide: {
    width: "100%",
    backgroundColor: "#006E26",
    borderRadius: 999,
    paddingVertical: 16,
    marginTop: 8,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  backDash: { fontSize: 14, fontWeight: "700", color: "#717970" },
});
