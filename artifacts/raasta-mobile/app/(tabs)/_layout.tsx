import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlertBanner } from "@/components/AlertBanner";

const INACTIVE = "#a1a1aa";
const BRAND = "#006E26";
const BRAND_SOFT = "#53B46A";

function NativeTabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="traffic">
          <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
          <Label>Updates</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="report">
          <Icon sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }} />
          <Label>Report</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="map">
          <Icon sf={{ default: "map", selected: "map.fill" }} />
          <Label>Map</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf={{ default: "person", selected: "person.fill" }} />
          <Label>Profile</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <AlertBanner />
    </View>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const tabBarFloat = {
    position: "absolute" as const,
    left: 22,
    right: 22,
    bottom: Math.max(insets.bottom, 12),
    height: isWeb ? 76 : 72,
    paddingBottom: 0,
    paddingTop: 8,
    borderRadius: 999,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    backgroundColor: isIOS ? "transparent" : isDark ? "rgba(24,24,27,0.88)" : "rgba(255,255,255,0.88)",
    ...(isIOS
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.06,
          shadowRadius: 32,
        }
      : {}),
    ...(!isIOS
      ? {
          elevation: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isWeb ? 0.08 : 0.1,
          shadowRadius: 20,
        }
      : {}),
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: isDark ? BRAND_SOFT : BRAND,
          tabBarInactiveTintColor: isDark ? "#71717a" : INACTIVE,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 0.1,
            marginTop: 2,
            transform: [{ scale: 0.92 }],
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarStyle: tabBarFloat,
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={90}
                tint={isDark ? "dark" : "light"}
                style={[StyleSheet.absoluteFill, { borderRadius: 999, overflow: "hidden" }]}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderRadius: 999,
                    overflow: "hidden",
                    backgroundColor: isWeb ? (isDark ? "rgba(24,24,27,0.92)" : "rgba(255,255,255,0.92)") : undefined,
                  },
                ]}
              />
            ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="house.fill" tintColor={color} size={22} />
              ) : (
                <Feather name="home" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="traffic"
          options={{
            title: "Updates",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="chart.bar.fill" tintColor={color} size={22} />
              ) : (
                <Feather name="bar-chart-2" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            title: "Report",
            tabBarIcon: ({ focused }) =>
              isIOS ? (
                <SymbolView name="plus.circle.fill" tintColor="#fff" size={30} />
              ) : (
                <Feather name="plus-circle" size={30} color="#fff" />
              ),
            tabBarItemStyle: {
              marginTop: -20,
              zIndex: 20,
            },
            tabBarIconStyle: {
              backgroundColor: BRAND,
              borderRadius: 32,
              width: 56,
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 2,
              shadowColor: BRAND,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 10,
            },
            tabBarLabelStyle: {
              color: isDark ? BRAND_SOFT : BRAND,
              fontWeight: "800",
              fontSize: 12,
              marginTop: 6,
            },
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="map.fill" tintColor={color} size={24} />
              ) : (
                <Feather name="compass" size={24} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="person.fill" tintColor={color} size={22} />
              ) : (
                <Feather name="user" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen name="police" options={{ href: null }} />
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
