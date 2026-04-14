const fs = require("fs");
const path = require("path");

/** Minimal .env loader (no dependency on dotenv). */
function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) {
    return out;
  }
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const envPath = path.join(__dirname, "artifacts/api-server/.env");

module.exports = {
  apps: [
    {
      name: "raasta-api",
      script: path.join(__dirname, "artifacts/api-server/dist/index.mjs"),
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        ...loadEnvFile(envPath),
        NODE_ENV: "production",
      },
    },
  ],
};
