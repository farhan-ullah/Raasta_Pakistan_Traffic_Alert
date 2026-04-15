import Constants from "expo-constants";

/**
 * `true` when running inside the **Expo Go** app (not a dev / production build).
 * MapLibre and some native modules are unavailable in Expo Go on Android.
 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}
