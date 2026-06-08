import { Router, type IRouter } from "express";
import { eq, count, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  incidentsTable,
  redemptionsTable,
  alertReadsTable,
} from "@workspace/db";
import { catchAsync } from "../lib/dbError";

const router: IRouter = Router();

function resolveUserId(req: { query: Record<string, unknown>; body?: Record<string, unknown> }): string | null {
  const fromQuery = req.query.userId;
  if (typeof fromQuery === "string" && fromQuery.trim()) {
    return fromQuery.trim();
  }
  const fromBody = req.body?.userId;
  if (typeof fromBody === "string" && fromBody.trim()) {
    return fromBody.trim();
  }
  return null;
}

function resolvePhone(req: { query: Record<string, unknown> }): string | null {
  const phone = req.query.phone;
  if (typeof phone === "string" && phone.trim() && phone.trim() !== "0000") {
    return phone.trim();
  }
  return null;
}

router.get("/users/me/activity-stats", catchAsync(async (req, res): Promise<void> => {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(400).json({ error: "userId query parameter is required" });
    return;
  }

  const phone = resolvePhone(req);

  const reportConditions = [eq(incidentsTable.reporterUserId, userId)];
  if (phone) {
    reportConditions.push(eq(incidentsTable.reporterPhone, phone));
  }

  const [[redemptionsRow], [reportsRow], [readsRow]] = await Promise.all([
    db
      .select({ count: count() })
      .from(redemptionsTable)
      .where(eq(redemptionsTable.userId, userId)),
    db
      .select({ count: count() })
      .from(incidentsTable)
      .where(or(...reportConditions)),
    db
      .select({ count: count() })
      .from(alertReadsTable)
      .where(eq(alertReadsTable.userId, userId)),
  ]);

  res.json({
    alertsRead: readsRow?.count ?? 0,
    reportsSubmitted: reportsRow?.count ?? 0,
    offersRedeemed: redemptionsRow?.count ?? 0,
  });
}));

router.post("/users/me/alert-reads", catchAsync(async (req, res): Promise<void> => {
  const userId = resolveUserId(req);
  const alertId = typeof req.body?.alertId === "string" ? req.body.alertId.trim() : "";

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  if (!alertId) {
    res.status(400).json({ error: "alertId is required" });
    return;
  }

  await db
    .insert(alertReadsTable)
    .values({ userId, alertId })
    .onConflictDoNothing({
      target: [alertReadsTable.userId, alertReadsTable.alertId],
    });

  res.status(201).json({ ok: true });
}));

export default router;
