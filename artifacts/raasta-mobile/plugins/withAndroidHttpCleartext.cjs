/**
 * Ensures plain HTTP to EXPO_PUBLIC_API_ORIGIN works on release builds.
 * Merges manifest + res/xml/network_security_config.xml at prebuild time.
 * @see https://developer.android.com/privacy-and-security/security-config
 */
const fs = require("fs");
const path = require("path");
const { withDangerousMod, withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

const NETWORK_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

module.exports = function withAndroidHttpCleartext(config) {
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const androidRoot = path.join(cfg.modRequest.projectRoot, "android");
      const dest = path.join(androidRoot, "app/src/main/res/xml/network_security_config.xml");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, NETWORK_XML);
      return cfg;
    },
  ]);

  return withAndroidManifest(config, async (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$["android:usesCleartextTraffic"] = "true";
    app.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    return cfg;
  });
};
