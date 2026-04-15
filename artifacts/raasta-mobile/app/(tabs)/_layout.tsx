import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { AlertBanner } from "@/components/AlertBanner";

function NativeTabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "map", selected: "map.fill" }} />
          <Label>Map</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="traffic">
          <Icon sf={{ default: "exclamationmark.triangle", selected: "exclamationmark.triangle.fill" }} />
          <Label>Traffic</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="report">
          <Icon sf={{ default: "camera.circle", selected: "camera.circle.fill" }} />
          <Label>Report</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="police">
          <Icon sf={{ default: "shield", selected: "shield.fill" }} />
          <Label>Police</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="dashboard">
          <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
          <Label>Dash</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <AlertBanner />
    </View>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const tabBarFloat = {
    position: "absolute" as const,
    left: 14,
    right: 14,
    bottom: Math.max(insets.bottom, 10),
    height: isWeb ? 72 : 64,
    paddingBottom: 0,
    paddingTop: 6,
    borderRadius: 26,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(1,65,28,0.1)",
    backgroundColor: isIOS ? "transparent" : isDark ? "rgba(22,22,24,0.92)" : colors.card,
    ...(isIOS
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
        }
      : {}),
    ...(!isIOS
      ? {
          elevation: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isWeb ? 0.1 : 0.14,
          shadowRadius: 18,
        }
      : {}),
  };

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#15803d",
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.15,
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarStyle: tabBarFloat,
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={88}
              tint={isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, { borderRadius: 26, overflow: "hidden" }]}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 26,
                  overflow: "hidden",
                  backgroundColor: isWeb ? (isDark ? "rgba(22,22,24,0.95)" : "rgba(255,255,255,0.95)") : undefined,
                },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="map.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="map-pin" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="traffic"
        options={{
          title: "Traffic",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="exclamationmark.triangle.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="alert-triangle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="camera.circle.fill" tintColor={focused ? "#fff" : color} size={28} />
            ) : (
              <Feather name="camera" size={24} color={focused ? "#fff" : color} />
            ),
          tabBarItemStyle: { flex: 1 },
          tabBarIconStyle: {
            backgroundColor: "#01411C",
            borderRadius: 20,
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
            marginTop: -12,
          },
          tabBarLabelStyle: { color: "#25a244", fontWeight: "600", fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="police"
        options={{
          title: "Police",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shield.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="shield" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dash",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
    <AlertBanner />
    </View>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
