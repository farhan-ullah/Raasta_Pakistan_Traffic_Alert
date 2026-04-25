import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { incidentsTable } from "@workspace/db/src/schema/incidents";
import { offersTable } from "@workspace/db/src/schema/offers";
import { catchAsync } from "../lib/dbError";

const router: IRouter = Router();

// Mock endpoint for user activity stats since we don't have a fully authenticated user session flow
router.get("/users/me/activity-stats", catchAsync(async (req, res): Promise<void> => {
  // We'll simulate stats. In a real app we would use `req.user.id` to filter.
  // We can query the number of incidents reported by 'user'
  const [reportsCount] = await db
    .select({ count: count() })
    .from(incidentsTable)
    .where(eq(incidentsTable.reportedBy, 'user'));

  // And some random numbers for Alerts Read and Offers Redeemed since they aren't fully tracked yet
  res.json({
    alertsRead: 12,
    reportsSubmitted: reportsCount.count || 0,
    offersRedeemed: 3,
  });
}));

export default router;
