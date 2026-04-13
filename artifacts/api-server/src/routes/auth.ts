import { Router } from "express";
import { createPoliceToken, verifyPoliceToken } from "../middleware/policeAuth";

const router = Router();

/** Prefer env; in development only, default matches Replit / docs so local API works without extra env. */
const POLICE_PIN =
  process.env["POLICE_PIN"] ??
  (process.env["NODE_ENV"] === "development" ? "raasta2024" : undefined);

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

export default router;
