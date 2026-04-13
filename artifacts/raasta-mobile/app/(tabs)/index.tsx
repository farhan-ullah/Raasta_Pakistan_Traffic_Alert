import React from "react";
import { Platform } from "react-native";
import MapCanvas from "@/components/map/MapCanvas";
import WebMapFallback from "@/components/map/WebMapFallback";

export default function MapScreen() {
  if (Platform.OS === "web") {
    return <WebMapFallback />;
  }
  return <MapCanvas />;
}
