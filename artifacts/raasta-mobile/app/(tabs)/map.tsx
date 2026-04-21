import React from "react";
import { Platform } from "react-native";

import { isExpoGo } from "@/constants/expoRuntime";
import WebMapFallback from "@/components/map/WebMapFallback";

const EXPO_GO_ANDROID_MAP_HINT =
  "The live map uses MapLibre and only works in a development or release build (not in Expo Go on Android). Run: npx expo run:android — then hot reload works against that binary.";

export default function MapScreen() {
  if (Platform.OS === "web") {
    return <WebMapFallback />;
  }

  /** Avoid loading MapLibre JS in Expo Go — native MapView is not registered → MLRNCamera crash. */
  if (Platform.OS === "android" && isExpoGo()) {
    return <WebMapFallback mapsHint={EXPO_GO_ANDROID_MAP_HINT} />;
  }

  const MapCanvas = require("@/components/map/MapCanvas").default as React.ComponentType;
  return <MapCanvas />;
}
