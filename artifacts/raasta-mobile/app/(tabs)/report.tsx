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
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { getApiOrigin } from "@/constants/apiOrigin";

const BASE = getApiOrigin();

const TYPES = [
  { value: "blockage", label: "Road Blocked", icon: "slash" as const },
  { value: "accident", label: "Accident", icon: "alert-circle" as const },
  { value: "construction", label: "Construction", icon: "tool" as const },
  { value: "congestion", label: "Traffic Jam", icon: "truck" as const },
  { value: "vip_movement", label: "VIP Movement", icon: "star" as const },
];

const AREAS = [
  "Blue Area", "F-6", "F-7", "F-8", "F-10", "G-9", "G-10", "G-11",
  "I-8", "I-10", "Faizabad", "Zero Point", "Constitution Avenue",
  "Margalla Hills", "Pir Wadhai", "PWD",
];

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [type, setType] = useState("blockage");
  const [area, setArea] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

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
    const finalArea = customArea.trim() || area;
    if (!finalArea || !location.trim()) {
      Alert.alert("Missing Info", "Please enter the area and street/landmark.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: `${TYPES.find((t) => t.value === type)?.label} — ${finalArea}`,
          description,
          location: `${finalArea}, ${location}`,
          area: finalArea,
          city: "Islamabad",
          lat: 33.6844 + (Math.random() - 0.5) * 0.05,
          lng: 73.0479 + (Math.random() - 0.5) * 0.05,
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
    setArea("");
    setCustomArea("");
    setLocation("");
    setDescription("");
    setPhone("");
    setPhotos([]);
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.successWrap}>
          <View style={[styles.successIcon, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={40} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Report Submitted!</Text>
          <Text style={[styles.successDesc, { color: colors.subtext }]}>
            Your incident is now live on the map. Police will verify and update your report shortly.
          </Text>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={reset}>
            <Text style={styles.submitBtnText}>Report Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Report Incident</Text>
        <Text style={styles.headerSub}>Help your community — reports go live instantly</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Type */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>What happened?</Text>
        <View style={styles.typeGrid}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => { setType(t.value); Haptics.selectionAsync(); }}
              style={[
                styles.typeCard,
                {
                  backgroundColor: type === t.value ? colors.primary : colors.card,
                  borderColor: type === t.value ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather name={t.icon} size={20} color={type === t.value ? "#fff" : colors.primary} />
              <Text style={[styles.typeLabel, { color: type === t.value ? "#fff" : colors.text }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photos */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Photos (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 10 }}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}>
                <Feather name="x" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 4 && (
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={[styles.addPhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => pickImage(true)}
              >
                <Feather name="camera" size={22} color={colors.primary} />
                <Text style={[styles.addPhotoText, { color: colors.subtext }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addPhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => pickImage(false)}
              >
                <Feather name="image" size={22} color={colors.primary} />
                <Text style={[styles.addPhotoText, { color: colors.subtext }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Location */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Location</Text>

        {/* Area picker */}
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowAreaPicker(!showAreaPicker)}
        >
          <Text style={{ color: area ? colors.text : colors.mutedForeground, fontSize: 14 }}>
            {area || "Select area / sector..."}
          </Text>
          <Feather name={showAreaPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        {showAreaPicker && (
          <View style={[styles.areaPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {AREAS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.areaItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setArea(a); setCustomArea(""); setShowAreaPicker(false); }}
                >
                  <Text style={[styles.areaItemText, { color: a === area ? colors.primary : colors.text }]}>{a}</Text>
                  {a === area && <Feather name="check" size={14} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.dividerRow]}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or type manually</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TextInput
          value={customArea}
          onChangeText={(v) => { setCustomArea(v); if (v) setArea(""); }}
          placeholder="e.g. New Islamabad, Koral, Tarlai..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />

        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Specific street / landmark *"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />

        {/* Description */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the situation..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
          style={[styles.textInput, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />

        {/* Phone */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Your phone (optional)</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="For police follow-up only"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "900" as const, color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  sectionLabel: { fontSize: 14, fontWeight: "700" as const, marginBottom: 10, marginTop: 4 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  typeCard: {
    flexBasis: "46%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  typeLabel: { fontSize: 13, fontWeight: "600" as const },
  photoWrap: { position: "relative" },
  photo: { width: 100, height: 100, borderRadius: 12 },
  removePhoto: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 3 },
  addPhotoBtn: { width: 100, height: 45, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  addPhotoText: { fontSize: 12 },
  input: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10 },
  areaPicker: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  areaItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  areaItemText: { fontSize: 14 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: "600" as const },
  textInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, marginBottom: 12 },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" as const },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontWeight: "800" as const },
  successDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
