import { Platform } from "react-native";

/** Brand gradient — match map / dashboard */
export const brandGradientColors = ["#012814", "#01411C", "#0a5c36"] as const;

export const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: { elevation: 5 },
  default: {},
});

export const floatShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  android: { elevation: 8 },
  default: {},
});
