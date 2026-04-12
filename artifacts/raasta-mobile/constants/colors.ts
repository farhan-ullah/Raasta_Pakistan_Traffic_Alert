type ColorPalette = {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  primaryLight: string;
  subtext: string;
  surface: string;
  overlay: string;
  critical: string;
  high: string;
  medium: string;
  low: string;
};

const colors: { light: ColorPalette; dark: ColorPalette; radius: number } = {
  light: {
    text: "#0a0a0a",
    tint: "#01411C",
    background: "#f2f2f7",
    foreground: "#0a0a0a",
    card: "#ffffff",
    cardForeground: "#0a0a0a",
    primary: "#01411C",
    primaryForeground: "#ffffff",
    secondary: "#f0f0f0",
    secondaryForeground: "#1a1a1a",
    muted: "#f0f0f0",
    mutedForeground: "#737373",
    accent: "#e8f5e9",
    accentForeground: "#01411C",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#e5e5e5",
    input: "#e5e5e5",
    primaryLight: "#25a244",
    subtext: "#6b7280",
    surface: "#ffffff",
    overlay: "rgba(0,0,0,0.5)",
    critical: "#dc2626",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#16a34a",
  },
  dark: {
    text: "#ffffff",
    tint: "#25a244",
    background: "#0C0C0C",
    foreground: "#ffffff",
    card: "#161616",
    cardForeground: "#ffffff",
    primary: "#01411C",
    primaryForeground: "#ffffff",
    secondary: "#1e1e1e",
    secondaryForeground: "#ffffff",
    muted: "#1e1e1e",
    mutedForeground: "#888888",
    accent: "#0d2a14",
    accentForeground: "#25a244",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    border: "#2a2a2a",
    input: "#2a2a2a",
    primaryLight: "#25a244",
    subtext: "#888888",
    surface: "#161616",
    overlay: "rgba(0,0,0,0.7)",
    critical: "#ef4444",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#22c55e",
  },
  radius: 12,
};

export default colors;
