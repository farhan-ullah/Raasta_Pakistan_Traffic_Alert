import { Router, type IRouter } from "express";
import { eq, and, desc, gte } from "drizzle-orm";
import { db, offersTable, merchantsTable, redemptionsTable } from "@workspace/db";
import {
  CreateOfferBody,
  UpdateOfferBody,
  RedeemOfferBody,
  ListOffersQueryParams,
} from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

async function enrichOffer(offer: typeof offersTable.$inferSelect) {
  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, offer.merchantId));
  if (!merchant) return null;
  return {
    ...offer,
    id: String(offer.id),
    merchantId: String(offer.merchantId),
    merchantName: merchant.name,
    merchantCategory: merchant.category,
    lat: merchant.lat,
    lng: merchant.lng,
    address: merchant.address,
    city: merchant.city,
  };
}

router.get("/offers/featured", async (_req, res): Promise<void> => {
  const offers = await db
    .select()
    .from(offersTable)
    .where(eq(offersTable.isActive, true))
    .orderBy(desc(offersTable.currentRedemptions))
    .limit(10);

  const enriched = await Promise.all(offers.map(enrichOffer));
  res.json(enriched.filter(Boolean));
});

router.get("/offers/stats", async (_req, res): Promise<void> => {
  const allOffers = await db.select().from(offersTable);
  const activeOffers = allOffers.filter(o => o.isActive);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayRedemptions = await db.select().from(redemptionsTable).where(gte(redemptionsTable.redeemedAt, today));

  const totalRedemptions = allOffers.reduce((sum, o) => sum + (o.currentRedemptions || 0), 0);

  const categoryMap: Record<string, number> = {};
  for (const offer of activeOffers) {
    const [merchant] = await db.select({ category: merchantsTable.category }).from(merchantsTable).where(eq(merchantsTable.id, offer.merchantId));
    if (merchant) {
      categoryMap[merchant.category] = (categoryMap[merchant.category] || 0) + 1;
    }
  }

  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count, label: category.charAt(0).toUpperCase() + category.slice(1) }));

  res.json({
    totalOffers: allOffers.length,
    activeOffers: activeOffers.length,
    totalRedemptions,
    todayRedemptions: todayRedemptions.length,
    topCategories,
    redemptionsByDay: [],
  });
});

router.get("/offers", async (req, res): Promise<void> => {
  const params = ListOffersQueryParams.safeParse(req.query);

  const conditions = [eq(offersTable.isActive, true)];

  if (params.success && params.data.merchantId) {
    const merchantIdNum = parseInt(params.data.merchantId, 10);
    if (!isNaN(merchantIdNum)) {
      conditions.push(eq(offersTable.merchantId, merchantIdNum));
    }
  }

  const offers = await db.select().from(offersTable).where(and(...conditions)).orderBy(desc(offersTable.createdAt));

  const enriched = await Promise.all(offers.map(enrichOffer));
  let filtered = enriched.filter(Boolean) as NonNullable<Awaited<ReturnType<typeof enrichOffer>>>[];

  if (params.success && params.data.category) {
    filtered = filtered.filter(o => o.merchantCategory === params.data.category);
  }

  if (params.success && params.data.lat && params.data.lng) {
    const lat = Number(params.data.lat);
    const lng = Number(params.data.lng);
    filtered = filtered.filter(o => {
      const dist = Math.sqrt(Math.pow(o.lat - lat, 2) + Math.pow(o.lng - lng, 2)) * 111;
      return dist <= (o.radiusKm || 5);
    });
  }

  res.json(filtered);
});

router.post("/offers", async (req, res): Promise<void> => {
  const raw = req.body as Record<string, unknown>;
  const portalAccessKey = typeof raw["portalAccessKey"] === "string" ? raw["portalAccessKey"].trim() : "";
  const body = { ...raw };
  delete body["portalAccessKey"];

  const parsed = CreateOfferBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const merchantId = parseInt(parsed.data.merchantId, 10);
  if (isNaN(merchantId)) {
    res.status(400).json({ error: "Invalid merchantId" });
    return;
  }

  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, merchantId));
  if (!merchant?.portalAccessKey || merchant.portalAccessKey !== portalAccessKey) {
    res.status(403).json({ error: "Valid portalAccessKey required for this merchant" });
    return;
  }

  const [offer] = await db.insert(offersTable).values({
    merchantId,
    title: parsed.data.title,
    description: parsed.data.description,
    discountPercent: parsed.data.discountPercent,
    discountAmount: parsed.data.discountAmount,
    originalPrice: parsed.data.originalPrice,
    offerPrice: parsed.data.offerPrice,
    code: parsed.data.code,
    imageUrl: parsed.data.imageUrl,
    radiusKm: parsed.data.radiusKm || 2.0,
    validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : new Date(),
    validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
    maxRedemptions: parsed.data.maxRedemptions,
    tags: parsed.data.tags as string[] | undefined,
  }).returning();

  const enriched = await enrichOffer(offer);
  res.status(201).json(enriched);
});

router.get("/offers/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, id));
  if (!offer) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  const enriched = await enrichOffer(offer);
  res.json(enriched);
});

router.patch("/offers/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const raw = req.body as Record<string, unknown>;
  const portalAccessKey = typeof raw["portalAccessKey"] === "string" ? raw["portalAccessKey"].trim() : "";
  const body = { ...raw };
  delete body["portalAccessKey"];

  const parsed = UpdateOfferBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(offersTable).where(eq(offersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }
  const [m] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, existing.merchantId));
  if (!m?.portalAccessKey || m.portalAccessKey !== portalAccessKey) {
    res.status(403).json({ error: "Valid portalAccessKey required for this merchant" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.discountPercent !== undefined) updateData.discountPercent = parsed.data.discountPercent;
  if (parsed.data.discountAmount !== undefined) updateData.discountAmount = parsed.data.discountAmount;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
  if (parsed.data.validUntil !== undefined) updateData.validUntil = new Date(parsed.data.validUntil);
  if (parsed.data.maxRedemptions !== undefined) updateData.maxRedemptions = parsed.data.maxRedemptions;

  const [offer] = await db.update(offersTable).set(updateData).where(eq(offersTable.id, id)).returning();
  if (!offer) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  const enriched = await enrichOffer(offer);
  res.json(enriched);
});

router.delete("/offers/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(offersTable).where(eq(offersTable.id, id));
  res.sendStatus(204);
});

router.post("/offers/:id/redeem", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = RedeemOfferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, id));
  if (!offer || !offer.isActive) {
    res.status(404).json({ error: "Offer not found or inactive" });
    return;
  }

  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.insert(redemptionsTable).values({
    offerId: id,
    userId: parsed.data.userId,
    userName: parsed.data.userName,
    token,
    expiresAt,
  });

  await db.update(offersTable).set({ currentRedemptions: (offer.currentRedemptions || 0) + 1 }).where(eq(offersTable.id, id));

  res.json({
    token,
    offerId: String(id),
    expiresAt: expiresAt.toISOString(),
    qrData: `RAASTA:${token}:${id}:${parsed.data.userId}`,
  });
});

export default router;
