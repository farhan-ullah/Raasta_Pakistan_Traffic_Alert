import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

const DRAWER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAf9VQ5aBKxsswKvDThEt-Fzi_BJIyFLXEnIXJVuzwpzTUAytAgBIJ_srOS6xxDmU78s7HWrLtGy1voq_G_cZ0PwwydhV7Uu1Oe-s1lLcmnRu4dvCANU_Q0Df5PEcKFi_8vrp3B8B8ZCm6uwjTqQGdsMw463Rfqx1UT3WM4ivlXP8k8a7W2v6gdm4nHAiowpvs9qIIXpoudWI_pNMVZL_eHUyZFxKmzHPYhARrjGX4zBmPUeOzfQAXcFLy8DcgqnSk2t5WLdJ6PkYKB";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function MapHomeDrawer({ visible, onClose }: Props) {
  const router = useRouter();

  const go = (href: Href | "/(tabs)" | "/(tabs)/index") => {
    onClose();
    router.push(href as Href);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.aside} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.profileRow}>
              <View style={styles.avatarTile}>
                <Image source={{ uri: DRAWER_AVATAR }} style={styles.avatarImg} accessibilityIgnoresInvertColors />
              </View>
              <View>
                <Text style={styles.citizenTitle}>Islamabad Citizen</Text>
                <Text style={styles.citizenSub}>Verified Resident</Text>
              </View>
            </View>

            <Pressable style={styles.navRowActive} onPress={() => {}}>
              <Feather name="alert-circle" size={22} color="#01411C" />
              <Text style={styles.navRowActiveText}>Emergency Contacts</Text>
            </Pressable>
            <Pressable style={styles.navRow} onPress={() => go("/(tabs)/traffic")}>
              <Feather name="navigation" size={22} color="#52525b" />
              <Text style={styles.navRowText}>Saved Routes</Text>
            </Pressable>
            <Pressable style={styles.navRow} onPress={() => go("/(tabs)")}>
              <Feather name="file-text" size={22} color="#52525b" />
              <Text style={styles.navRowText}>Challan History</Text>
            </Pressable>
            <Pressable style={styles.navRow} onPress={() => {}}>
              <Feather name="settings" size={22} color="#52525b" />
              <Text style={styles.navRowText}>App Settings</Text>
            </Pressable>
          </ScrollView>
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>Raasta Pakistan</Text>
            <Text style={styles.footerVer}>v2.1.0</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.4)",
    ...Platform.select({
      default: {},
      web: { backdropFilter: "blur(8px)" as const },
    }),
  },
  aside: {
    width: 300,
    maxWidth: "88%",
    height: "100%",
    backgroundColor: "#fafafa",
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 22,
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  scroll: { gap: 8, paddingBottom: 16 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 28 },
  avatarTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#b4f1bc",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", resizeMode: "cover" },
  citizenTitle: { fontSize: 22, fontWeight: "900", color: "#01411C" },
  citizenSub: { fontSize: 14, fontWeight: "600", color: "#71717a", marginTop: 2 },
  navRowActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#b4f1bc",
  },
  navRowActiveText: { fontSize: 17, fontWeight: "700", color: "#01411C" },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
  },
  navRowText: { fontSize: 17, fontWeight: "600", color: "#52525b" },
  footer: {
    marginTop: "auto",
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e4e4e7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBrand: { fontSize: 11, fontWeight: "800", color: "#a1a1aa", letterSpacing: 1.2 },
  footerVer: { fontSize: 11, fontWeight: "800", color: "#a1a1aa", letterSpacing: 1.2 },
});
