import { Router, type IRouter } from "express";
import { eq, gte, desc } from "drizzle-orm";
import { db, incidentsTable, merchantsTable, offersTable, redemptionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allIncidents = await db.select().from(incidentsTable);
  const activeIncidents = allIncidents.filter(i => i.status === "active");
  const resolvedToday = allIncidents.filter(i => i.status === "resolved" && new Date(i.updatedAt) >= today);
  const criticalAlerts = activeIncidents.filter(i => i.severity === "critical");

  const affectedRoadsSet = new Set<string>();
  for (const incident of activeIncidents) {
    if (incident.affectedRoads) {
      for (const road of incident.affectedRoads) {
        affectedRoadsSet.add(road);
      }
    }
  }

  const totalMerchants = await db.select().from(merchantsTable);
  const activeOffers = await db.select().from(offersTable).where(eq(offersTable.isActive, true));

  const todayRedemptions = await db.select().from(redemptionsTable).where(gte(redemptionsTable.redeemedAt, today));

  const byType: Record<string, number> = {};
  for (const incident of activeIncidents) {
    byType[incident.type] = (byType[incident.type] || 0) + 1;
  }
  const incidentsByType = Object.entries(byType).map(([category, count]) => ({
    category,
    count,
    label: category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
  }));

  const hourlyCounts: Record<string, number> = {};
  for (const incident of allIncidents.filter(inc => new Date(inc.createdAt) >= today)) {
    const hour = `${new Date(incident.createdAt).getHours()}:00`;
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
  }
  const hourlyIncidents = Object.entries(hourlyCounts).map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour.localeCompare(b.hour));

  res.json({
    activeIncidents: activeIncidents.length,
    resolvedToday: resolvedToday.length,
    totalMerchants: totalMerchants.length,
    activeOffers: activeOffers.length,
    totalRedemptionsToday: todayRedemptions.length,
    criticalAlerts: criticalAlerts.length,
    affectedRoads: affectedRoadsSet.size,
    officersOnDuty: 24,
    incidentsByType,
    hourlyIncidents,
  });
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const incidents = await db.select().from(incidentsTable).orderBy(desc(incidentsTable.createdAt)).limit(5);
  const offers = await db.select().from(offersTable).orderBy(desc(offersTable.createdAt)).limit(3);
  const merchants = await db.select().from(merchantsTable).orderBy(desc(merchantsTable.createdAt)).limit(2);

  const activities = [
    ...incidents.map(i => ({
      id: `incident-${i.id}`,
      type: i.status === "resolved" ? "incident_resolved" : "incident_created",
      title: i.status === "resolved" ? `Resolved: ${i.title}` : `New ${i.type.replace(/_/g, " ")}: ${i.title}`,
      description: i.description || i.location,
      timestamp: (i.status === "resolved" ? i.updatedAt : i.createdAt).toISOString(),
      severity: i.severity,
      location: i.location,
    })),
    ...offers.map(o => ({
      id: `offer-${o.id}`,
      type: "offer_created",
      title: `New offer: ${o.title}`,
      description: `${o.discountPercent ? o.discountPercent + "% off" : "Special deal"} - ${o.description}`,
      timestamp: o.createdAt.toISOString(),
      severity: "low",
      location: "",
    })),
    ...merchants.map(m => ({
      id: `merchant-${m.id}`,
      type: "merchant_registered",
      title: `New merchant: ${m.name}`,
      description: `${m.category} in ${m.area || m.city}`,
      timestamp: m.createdAt.toISOString(),
      severity: "low",
      location: m.address,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  res.json(activities);
});

router.get("/routes/alternate", async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  if (!from || !to) {
    res.status(400).json({ error: "from and to are required" });
    return;
  }

  const routes = [
    {
      id: "route-1",
      name: "Margalla Road via Sector F-7",
      description: `Alternative route from ${from} avoiding main blockage`,
      estimatedTime: "12 min",
      distance: "8.2 km",
      via: ["F-7 Markaz", "Margalla Road", "Blue Area"],
      congestionLevel: "low",
    },
    {
      id: "route-2",
      name: "Constitution Avenue (Expressway)",
      description: "Fast route via main expressway",
      estimatedTime: "18 min",
      distance: "11.5 km",
      via: ["Zero Point", "Constitution Avenue", "Diplomatic Enclave"],
      congestionLevel: "medium",
    },
    {
      id: "route-3",
      name: "Srinagar Highway Bypass",
      description: "Longer but clear highway route",
      estimatedTime: "25 min",
      distance: "15.8 km",
      via: ["Faizabad", "Srinagar Highway", "Rawat"],
      congestionLevel: "low",
    },
  ];

  res.json(routes);
});

export default router;
