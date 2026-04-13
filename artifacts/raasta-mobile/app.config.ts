import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Build-time config: merges with app.json.
 *
 * Production Android/iOS builds MUST set before `eas build` or `expo run:android --variant release`:
 * - EXPO_PUBLIC_API_ORIGIN — full API base, e.g. https://api.example.com (no trailing slash)
 *   OR EXPO_PUBLIC_DOMAIN — hostname only; API base becomes https://<domain>
 *
 * Optional: EXPO_PUBLIC_WEB_ORIGIN — public HTTPS URL of the **web** app (for expo-router), e.g. https://app.example.com
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const webOriginRaw = process.env.EXPO_PUBLIC_WEB_ORIGIN?.trim();
  const webOrigin = webOriginRaw
    ? webOriginRaw.endsWith("/")
      ? webOriginRaw
      : `${webOriginRaw}/`
    : "https://your-web-app.example.com/";

  const plugins = (config.plugins ?? []).map((entry) => {
    if (Array.isArray(entry) && entry[0] === "expo-router") {
      return ["expo-router", { origin: webOrigin }] as [string, Record<string, string>];
    }
    return entry;
  });

  return { ...config, plugins };
};
