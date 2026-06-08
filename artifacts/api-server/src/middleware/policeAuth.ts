import { type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";

const SESSION_SECRET = process.env["SESSION_SECRET"] || "fallback-secret";
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function createPoliceToken(): string {
  const timestamp = Date.now().toString();
  const hmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`police:${timestamp}`)
    .digest("hex");
  return `${timestamp}.${hmac}`;
}

export function verifyPoliceToken(token: string): boolean {
  try {
    const [timestamp, hmac] = token.split(".");
    if (!timestamp || !hmac) return false;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > TOKEN_TTL_MS || age < 0) return false;

    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`police:${timestamp}`)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function createAdminToken(): string {
  const timestamp = Date.now().toString();
  const hmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`admin:${timestamp}`)
    .digest("hex");
  return `${timestamp}.${hmac}`;
}

export function verifyAdminToken(token: string): boolean {
  try {
    const [timestamp, hmac] = token.split(".");
    if (!timestamp || !hmac) return false;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > TOKEN_TTL_MS || age < 0) return false;

    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`admin:${timestamp}`)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

function bearerToken(req: Request): string | null {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function requirePoliceAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Police authentication required" });
    return;
  }
  if (!verifyPoliceToken(token)) {
    res.status(401).json({ error: "Invalid or expired police session" });
    return;
  }
  next();
}

/** Police or city/super admin — for announcements and similar staff actions. */
export function requireStaffAuth(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Staff authentication required" });
    return;
  }
  if (!verifyPoliceToken(token) && !verifyAdminToken(token)) {
    res.status(401).json({ error: "Invalid or expired staff session" });
    return;
  }
  next();
}
