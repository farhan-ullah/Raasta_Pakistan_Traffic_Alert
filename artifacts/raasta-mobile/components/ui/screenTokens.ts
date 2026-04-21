import { Platform } from "react-native";

/** Brand gradient — civic mock (#01411C → #00290F) */
export const brandGradientColors = ["#01411C", "#00290F"] as const;

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
