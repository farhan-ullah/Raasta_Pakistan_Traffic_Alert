import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, incidentsTable } from "@workspace/db";
import {
  CreateIncidentBody,
  UpdateIncidentBody,
  GetIncidentParams,
  UpdateIncidentParams,
  ListIncidentsQueryParams,
} from "@workspace/api-zod";
import { requirePoliceAuth } from "../middleware/policeAuth";
import { catchAsync } from "../lib/dbError";

const router: IRouter = Router();

router.get("/incidents/summary", catchAsync(async (_req, res): Promise<void> => {
  const allIncidents = await db.select().from(incidentsTable);
  const active = allIncidents.filter(i => i.status === "active");
  const resolved = allIncidents.filter(i => i.status === "resolved");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = allIncidents.filter(i => new Date(i.createdAt) >= today).length;

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const incident of allIncidents) {
    byType[incident.type] = (byType[incident.type] || 0) + 1;
    bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
  }

  res.json({
    total: allIncidents.length,
    active: active.length,
    resolved: resolved.length,
    byType,
    bySeverity,
    todayCount,
  });
}));

router.get("/incidents/active-map", catchAsync(async (_req, res): Promise<void> => {
  const incidents = await db
    .select({
      id: incidentsTable.id,
      type: incidentsTable.type,
      title: incidentsTable.title,
      lat: incidentsTable.lat,
      lng: incidentsTable.lng,
      severity: incidentsTable.severity,
      status: incidentsTable.status,
      location: incidentsTable.location,
      createdAt: incidentsTable.createdAt,
    })
    .from(incidentsTable)
    .where(eq(incidentsTable.status, "active"))
    .orderBy(desc(incidentsTable.createdAt));
  res.json(incidents.map(i => ({ ...i, id: String(i.id) })));
}));

router.get("/incidents", catchAsync(async (req, res): Promise<void> => {
  const params = ListIncidentsQueryParams.safeParse(req.query);
  let query = db.select().from(incidentsTable).$dynamic();

  const conditions = [];
  if (params.success) {
    if (params.data.status && params.data.status !== "all") {
      conditions.push(eq(incidentsTable.status, params.data.status));
    }
    if (params.data.type && params.data.type !== "all") {
      conditions.push(eq(incidentsTable.type, params.data.type));
    }
    if (params.data.city) {
      conditions.push(eq(incidentsTable.city, params.data.city));
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const incidents = await query.orderBy(desc(incidentsTable.createdAt));
  res.json(incidents.map(i => ({
    ...i,
    id: String(i.id),
  })));
}));

router.post("/incidents", (req, res, next): void => {
  const body = req.body as { reportedBy?: string };
  if (body.reportedBy === "police") {
    requirePoliceAuth(req, res, next);
    return;
  }
  next();
}, catchAsync(async (req, res): Promise<void> => {
  const parsed = CreateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [incident] = await db
    .insert(incidentsTable)
    .values({
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      area: parsed.data.area,
      city: parsed.data.city || "Islamabad",
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      severity: parsed.data.severity,
      reportedBy: parsed.data.reportedBy,
      officerName: parsed.data.officerName,
      affectedRoads: parsed.data.affectedRoads as string[] | undefined,
      alternateRoutes: parsed.data.alternateRoutes as string[] | undefined,
      estimatedDuration: parsed.data.estimatedDuration,
      mediaUrls: (parsed.data as any).mediaUrls as string[] | undefined,
      reporterPhone: (parsed.data as any).reporterPhone as string | undefined,
      isVerifiedByPolice: (parsed.data as any).isVerifiedByPolice ?? false,
    })
    .returning();

  res.status(201).json({ ...incident, id: String(incident.id) });
}));

router.get("/incidents/:id", catchAsync(async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [incident] = await db
    .select()
    .from(incidentsTable)
    .where(eq(incidentsTable.id, id));

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json({ ...incident, id: String(incident.id) });
}));

router.patch("/incidents/:id", requirePoliceAuth, catchAsync(async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.severity !== undefined) updateData.severity = parsed.data.severity;
  if (parsed.data.estimatedDuration !== undefined) updateData.estimatedDuration = parsed.data.estimatedDuration;
  if (parsed.data.endTime !== undefined) updateData.endTime = new Date(parsed.data.endTime);
  if (parsed.data.alternateRoutes !== undefined) updateData.alternateRoutes = parsed.data.alternateRoutes;

  const [incident] = await db
    .update(incidentsTable)
    .set(updateData)
    .where(eq(incidentsTable.id, id))
    .returning();

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json({ ...incident, id: String(incident.id) });
}));

export default router;
