import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

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

const SEVERITY_LABEL: Record<string, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
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
}

export function IncidentCard({ incident, onVerify, onResolve, showActions }: IncidentCardProps) {
  const colors = useColors();
  const isVerified = (incident as any).isVerifiedByPolice;

  const severityColor = {
    critical: colors.critical,
    high: colors.high,
    medium: colors.medium,
    low: colors.low,
  }[incident.severity] ?? colors.mutedForeground;

  const iconName = (TYPE_ICONS[incident.type] ?? "alert-triangle") as any;

  const photos = ((incident as any).mediaUrls ?? []).filter(
    (u: string) => u.startsWith("data:image") || /\.(jpg|jpeg|png|webp|gif)/i.test(u)
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{incident.title}</Text>
          {incident.description ? (
            <Text style={[styles.desc, { color: colors.subtext }]} numberOfLines={2}>{incident.description}</Text>
          ) : null}
          <View style={styles.meta}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {" "}{incident.location}
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
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
  actions: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, justifyContent: "flex-end" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: "600" as const },
});
