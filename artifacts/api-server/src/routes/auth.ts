import { Router } from "express";
import {
  createAdminToken,
  createPoliceToken,
  verifyAdminToken,
  verifyPoliceToken,
} from "../middleware/policeAuth";

const router = Router();

const isDev = process.env["NODE_ENV"] === "development";

/** Prefer env; in development only, default matches Replit / docs so local API works without extra env. */
const POLICE_PIN =
  process.env["POLICE_PIN"] ?? (isDev ? "raasta2024" : undefined);

const SUPER_ADMIN_PIN =
  process.env["SUPER_ADMIN_PIN"] ?? (isDev ? "admin123" : undefined);

const CITY_ADMIN_PIN =
  process.env["CITY_ADMIN_PIN"] ?? (isDev ? "city123" : undefined);

router.post("/auth/police/login", (req, res) => {
  if (!POLICE_PIN) {
    res.status(503).json({ error: "Police auth not configured" });
    return;
  }

  const { pin } = req.body as { pin?: string };

  if (!pin || pin !== POLICE_PIN) {
    res.status(401).json({ error: "Invalid access code" });
    return;
  }

  const token = createPoliceToken();
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;

  res.json({ token, expiresAt });
});

router.post("/auth/police/verify", (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ valid: false });
    return;
  }
  res.json({ valid: verifyPoliceToken(token) });
});

router.post("/auth/admin/login", (req, res) => {
  const { pin, role } = req.body as { pin?: string; role?: string };

  if (!pin) {
    res.status(400).json({ error: "Access code is required" });
    return;
  }

  const wantsSuper = role === "super_admin" || role === "superAdmin";
  const wantsCity = role === "city_admin" || role === "cityAdmin";

  let ok = false;
  if (wantsSuper) {
    ok = Boolean(SUPER_ADMIN_PIN && pin === SUPER_ADMIN_PIN);
  } else if (wantsCity) {
    ok = Boolean(CITY_ADMIN_PIN && pin === CITY_ADMIN_PIN);
  } else {
    ok =
      Boolean(SUPER_ADMIN_PIN && pin === SUPER_ADMIN_PIN) ||
      Boolean(CITY_ADMIN_PIN && pin === CITY_ADMIN_PIN);
  }

  if (!ok) {
    res.status(401).json({ error: "Invalid admin access code" });
    return;
  }

  const token = createAdminToken();
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  res.json({ token, expiresAt });
});

router.post("/auth/admin/verify", (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ valid: false });
    return;
  }
  res.json({ valid: verifyAdminToken(token) });
});

export default router;
