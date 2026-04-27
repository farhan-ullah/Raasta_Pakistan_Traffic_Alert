import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db";
import { requirePoliceAuth } from "../middleware/policeAuth";
import { catchAsync } from "../lib/dbError";

const router: IRouter = Router();

const CreateAnnouncementBody = z.object({
  title: z.string(),
  body: z.string(),
  category: z.string().optional(),
  priority: z.string().optional(),
  city: z.string().optional(),
  affectedAreas: z.array(z.string()).optional(),
  department: z.string(),
  isPinned: z.boolean().optional(),
});

router.get("/announcements", catchAsync(async (req, res): Promise<void> => {
  const category = req.query.category as string | undefined;

  let query = db.select().from(announcementsTable).$dynamic();
  
  if (category && category !== "All") {
    query = query.where(eq(announcementsTable.category, category));
  }

  const announcements = await query.orderBy(desc(announcementsTable.createdAt));
  res.json(announcements.map(a => ({
    ...a,
    id: String(a.id),
  })));
}));

router.post("/announcements", requirePoliceAuth, catchAsync(async (req, res): Promise<void> => {
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [announcement] = await db
    .insert(announcementsTable)
    .values({
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category || "General",
      priority: parsed.data.priority || "Medium",
      city: parsed.data.city || "Islamabad",
      affectedAreas: parsed.data.affectedAreas || [],
      department: parsed.data.department,
      isPinned: parsed.data.isPinned ?? false,
    })
    .returning();

  res.status(201).json({ ...announcement, id: String(announcement.id) });
}));

export default router;
