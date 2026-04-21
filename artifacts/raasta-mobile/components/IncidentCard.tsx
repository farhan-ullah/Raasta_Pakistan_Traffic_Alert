import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

type FeatherName = React.ComponentProps<typeof Feather>["name"];
import { useColors } from "@/hooks/useColors";
import { cardShadow } from "@/components/ui/screenTokens";

interface Incident {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  location: string;
  severity: string;
  status: string;
  reportedBy?: string | null;
  officerName?: string | null;
  estimatedDuration?: string | null;
  alternateRoutes?: string[] | null;
  isVerifiedByPolice?: boolean;
  mediaUrls?: string[] | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  blockage: "slash",
  construction: "tool",
  vip_movement: "star",
  accident: "alert-circle",
  congestion: "truck",
};

const TYPE_LABEL: Record<string, string> = {
  blockage: "Road Blocked",
  construction: "Construction",
  vip_movement: "VIP Movement",
  accident: "Accident",
  congestion: "Congestion",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "CRITICAL",
  high: "MAJOR",
  medium: "MODERATE",
  low: "LOW",
};

const CIVIC_ICON_BG: Record<string, { bg: string; fg: string }> = {
  accident: { bg: "#ffdad6", fg: "#93000a" },
  blockage: { bg: "#b4f1bc", fg: "#01411c" },
  construction: { bg: "#e2e2e7", fg: "#414941" },
  congestion: { bg: "#82f98e", fg: "#007329" },
  vip_movement: { bg: "#95f8a7", fg: "#00290e" },
};

const CIVIC_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#ba1a1a", text: "#fff" },
  high: { bg: "#53b46a", text: "#fff" },
  medium: { bg: "#717970", text: "#fff" },
  low: { bg: "#717970", text: "#fff" },
};

const LEFT_BORDER: Record<string, string> = {
  critical: "#ba1a1a",
  high: "#f97316",
  medium: "#99d5a2",
  low: "#99d5a2",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

interface IncidentCardProps {
  incident: Incident;
  onVerify?: (id: string) => void;
  onResolve?: (id: string) => void;
  showActions?: boolean;
  /** Traffic feed cards — match civic HTML. */
  variant?: "default" | "civicFeed";
  /** Police queue — thick left accent by severity. */
  policeAccent?: boolean;
}

export function IncidentCard({ incident, onVerify, onResolve, showActions, variant = "default", policeAccent }: IncidentCardProps) {
  const colors = useColors();
  const isVerified = (incident as any).isVerifiedByPolice;

  const severityColor = {
    critical: colors.critical,
    high: colors.high,
    medium: colors.medium,
    low: colors.low,
  }[incident.severity] ?? colors.mutedForeground;

  const iconName = (TYPE_ICONS[incident.type] ?? "alert-triangle") as FeatherName;
  const typeTitle = TYPE_LABEL[incident.type] ?? incident.type.replace(/_/g, " ");

  const photos = ((incident as any).mediaUrls ?? []).filter(
    (u: string) => u.startsWith("data:image") || /\.(jpg|jpeg|png|webp|gif)/i.test(u)
  );

  const civicPalette = CIVIC_ICON_BG[incident.type] ?? { bg: "#e8e8ed", fg: "#414941" };
  const civicBadge = CIVIC_BADGE[incident.severity] ?? CIVIC_BADGE.medium;
  const leftBar = policeAccent ? LEFT_BORDER[incident.severity] ?? "#e2e2e7" : undefined;

  if (variant === "civicFeed") {
    return (
      <View
        style={[
          styles.civicCard,
          cardShadow as ViewStyle,
          {
            backgroundColor: "#ffffff",
            borderColor: "rgba(0,0,0,0.04)",
            ...(policeAccent && leftBar ? { borderLeftWidth: 8, borderLeftColor: leftBar } : {}),
          },
        ]}
      >
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.slice(0, 3).map((uri: string, i: number) => (
              <Image key={i} source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        )}
        <View style={styles.civicTop}>
          <View style={styles.civicLeft}>
            <View style={[styles.civicIconTile, { backgroundColor: civicPalette.bg }]}>
              <Feather name={iconName} size={22} color={civicPalette.fg} />
            </View>
            <View style={styles.civicText}>
              <Text style={styles.civicTypeTitle} numberOfLines={1}>
                {typeTitle}
              </Text>
              <Text style={styles.civicLoc} numberOfLines={2}>
                {incident.location}
              </Text>
            </View>
          </View>
          <View style={[styles.civicSevPill, { backgroundColor: civicBadge.bg }]}>
            <Text style={[styles.civicSevTxt, { color: civicBadge.text }]}>
              {SEVERITY_LABEL[incident.severity] ?? incident.severity.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.civicFooter}>
          <View style={styles.civicTimeRow}>
            <Feather name="clock" size={14} color="rgba(65,73,65,0.65)" />
            <Text style={styles.civicTime}>{timeAgo(incident.createdAt)}</Text>
          </View>
          {incident.reportedBy === "police" ? (
            <View style={styles.civicMini}>
              <Text style={styles.civicMiniTxt}>POLICE</Text>
            </View>
          ) : null}
        </View>
        {showActions ? (
          <View style={[styles.actions, { borderTopColor: "#e8e8ed" }]}>
            {onVerify && !isVerified && incident.reportedBy === "citizen" && (
              <TouchableOpacity
                style={[styles.actionBtnCivic, { backgroundColor: "#006E26" }]}
                onPress={() => onVerify(incident.id)}
              >
                <Feather name="check-circle" size={14} color="#fff" />
                <Text style={styles.actionTextCivic}>Verify</Text>
              </TouchableOpacity>
            )}
            {onResolve && (
              <TouchableOpacity
                style={[styles.actionBtnCivic, { backgroundColor: "#e8e8ed" }]}
                onPress={() => onResolve(incident.id)}
              >
                <Feather name="archive" size={14} color="#414941" />
                <Text style={[styles.actionTextCivic, { color: "#414941" }]}>Resolve</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        cardShadow as ViewStyle,
        { backgroundColor: colors.card, borderColor: colors.border },
        policeAccent && leftBar
          ? {
              borderLeftWidth: 8,
              borderLeftColor: leftBar,
            }
          : null,
      ]}
    >
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {photos.slice(0, 3).map((uri: string, i: number) => (
            <Image key={i} source={{ uri }} style={styles.photo} />
          ))}
        </ScrollView>
      )}

      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: severityColor + "22" }]}>
          <Feather name={iconName} size={18} color={severityColor} />
        </View>
        <View style={styles.content}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: severityColor }]}>
              <Text style={styles.badgeText}>{SEVERITY_LABEL[incident.severity] ?? incident.severity.toUpperCase()}</Text>
            </View>
            {incident.reportedBy === "police" && (
              <View style={[styles.badge, { backgroundColor: colors.primary + "cc" }]}>
                <Text style={styles.badgeText}>POLICE</Text>
              </View>
            )}
            {incident.reportedBy === "citizen" && (
              <View style={[styles.badge, { backgroundColor: isVerified ? "#1d4ed8cc" : "#78350fcc" }]}>
                <Text style={styles.badgeText}>{isVerified ? "✓ VERIFIED" : "CITIZEN"}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {incident.title}
          </Text>
          {incident.description ? (
            <Text style={[styles.desc, { color: colors.subtext }]} numberOfLines={2}>
              {incident.description}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {" "}
              {incident.location}
            </Text>
          </View>
          {incident.officerName ? (
            <View style={styles.meta}>
              <Feather name="user" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}> {incident.officerName}</Text>
            </View>
          ) : null}
          {incident.estimatedDuration ? (
            <View style={styles.meta}>
              <Feather name="clock" size={11} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}> {incident.estimatedDuration}</Text>
            </View>
          ) : null}
          <Text style={[styles.timeAgo, { color: colors.mutedForeground }]}>{timeAgo(incident.createdAt)}</Text>
        </View>
      </View>

      {incident.alternateRoutes && incident.alternateRoutes.length > 0 && (
        <View style={styles.routesRow}>
          <Text style={[styles.routesLabel, { color: colors.mutedForeground }]}>ALT ROUTES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {incident.alternateRoutes.map((r, i) => (
              <View key={i} style={[styles.routeChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.routeText, { color: colors.text }]}>{r}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {showActions && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {onVerify && !isVerified && incident.reportedBy === "citizen" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#1d4ed822", borderColor: "#1d4ed8" }]}
              onPress={() => onVerify(incident.id)}
            >
              <Feather name="shield" size={14} color="#60a5fa" />
              <Text style={[styles.actionText, { color: "#60a5fa" }]}>Verify</Text>
            </TouchableOpacity>
          )}
          {onResolve && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
              onPress={() => onResolve(incident.id)}
            >
              <Feather name="check-circle" size={14} color={colors.primaryLight} />
              <Text style={[styles.actionText, { color: colors.primaryLight }]}>Resolve</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const civicLift = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  civicCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 14,
    padding: 22,
    ...civicLift,
  },
  civicTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  civicLeft: { flexDirection: "row", gap: 12, flex: 1, minWidth: 0 },
  civicIconTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  civicText: { flex: 1, minWidth: 0 },
  civicTypeTitle: { fontSize: 18, fontWeight: "800", color: "#1a1c1f" },
  civicLoc: { fontSize: 14, fontWeight: "600", color: "#414941", marginTop: 4 },
  civicSevPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  civicSevTxt: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  civicFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  civicTimeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  civicTime: { fontSize: 12, color: "rgba(65,73,65,0.7)", fontWeight: "600" },
  civicMini: { backgroundColor: "#01411c", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  civicMiniTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },
  actionBtnCivic: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionTextCivic: { fontSize: 14, fontWeight: "800", color: "#fff" },
  photoRow: { height: 100 },
  photo: { width: 130, height: 100, marginRight: 2 },
  row: { flexDirection: "row", padding: 14, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  content: { flex: 1, gap: 4 },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: "800" as const, color: "#fff", letterSpacing: 0.5 },
  title: { fontSize: 14, fontWeight: "700" as const, lineHeight: 19 },
  desc: { fontSize: 12, lineHeight: 17 },
  meta: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11 },
  timeAgo: { fontSize: 11, marginTop: 2 },
  routesRow: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  routesLabel: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 1 },
  routeChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6 },
  routeText: { fontSize: 11, fontWeight: "500" as const },
  actions: { flexDirection: "row", gap: 10, paddingTop: 14, marginTop: 14, borderTopWidth: 1 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: "600" as const },
});
