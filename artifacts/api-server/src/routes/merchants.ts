import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, merchantsTable, offersTable } from "@workspace/db";
import {
  CreateMerchantBody,
  UpdateMerchantBody,
  ListMerchantsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/merchants/by-category", async (_req, res): Promise<void> => {
  const merchants = await db.select().from(merchantsTable);
  const grouped: Record<string, number> = {};
  for (const m of merchants) {
    grouped[m.category] = (grouped[m.category] || 0) + 1;
  }
  const result = Object.entries(grouped).map(([category, count]) => ({
    category,
    count,
    label: category.charAt(0).toUpperCase() + category.slice(1),
  }));
  res.json(result);
});

router.get("/merchants", async (req, res): Promise<void> => {
  const params = ListMerchantsQueryParams.safeParse(req.query);
  const conditions = [];

  if (params.success) {
    if (params.data.category) {
      conditions.push(eq(merchantsTable.category, params.data.category));
    }
    if (params.data.city) {
      conditions.push(eq(merchantsTable.city, params.data.city));
    }
  }

  let merchants;
  if (conditions.length > 0) {
    merchants = await db.select().from(merchantsTable).where(and(...conditions)).orderBy(desc(merchantsTable.createdAt));
  } else {
    merchants = await db.select().from(merchantsTable).orderBy(desc(merchantsTable.createdAt));
  }

  const allOffers = await db.select().from(offersTable).where(eq(offersTable.isActive, true));

  const result = merchants.map(m => {
    const mOffers = allOffers.filter(o => o.merchantId === m.id);
    return {
      ...m,
      id: String(m.id),
      activeOffersCount: mOffers.length,
      totalRedemptions: mOffers.reduce((sum, o) => sum + (o.currentRedemptions || 0), 0),
    };
  });

  res.json(result);
});

router.post("/merchants", async (req, res): Promise<void> => {
  const parsed = CreateMerchantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [merchant] = await db.insert(merchantsTable).values({
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description,
    phone: parsed.data.phone,
    email: parsed.data.email,
    address: parsed.data.address,
    city: parsed.data.city || "Islamabad",
    area: parsed.data.area,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    logoUrl: parsed.data.logoUrl,
    coverUrl: parsed.data.coverUrl,
    openHours: parsed.data.openHours,
  }).returning();

  res.status(201).json({ ...merchant, id: String(merchant.id), activeOffersCount: 0, totalRedemptions: 0 });
});

router.get("/merchants/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, id));
  if (!merchant) {
    res.status(404).json({ error: "Merchant not found" });
    return;
  }

  const offers = await db.select().from(offersTable).where(and(eq(offersTable.merchantId, id), eq(offersTable.isActive, true)));

  res.json({
    ...merchant,
    id: String(merchant.id),
    activeOffersCount: offers.length,
    totalRedemptions: offers.reduce((sum, o) => sum + (o.currentRedemptions || 0), 0),
  });
});

router.patch("/merchants/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = UpdateMerchantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.address !== undefined) updateData.address = parsed.data.address;
  if (parsed.data.logoUrl !== undefined) updateData.logoUrl = parsed.data.logoUrl;
  if (parsed.data.coverUrl !== undefined) updateData.coverUrl = parsed.data.coverUrl;
  if (parsed.data.isOpen !== undefined) updateData.isOpen = parsed.data.isOpen;
  if (parsed.data.openHours !== undefined) updateData.openHours = parsed.data.openHours;

  const [merchant] = await db.update(merchantsTable).set(updateData).where(eq(merchantsTable.id, id)).returning();
  if (!merchant) {
    res.status(404).json({ error: "Merchant not found" });
    return;
  }

  const offers = await db.select().from(offersTable).where(and(eq(offersTable.merchantId, id), eq(offersTable.isActive, true)));
  res.json({
    ...merchant,
    id: String(merchant.id),
    activeOffersCount: offers.length,
    totalRedemptions: offers.reduce((sum, o) => sum + (o.currentRedemptions || 0), 0),
  });
});

router.get("/merchants/:id/offers", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [merchant] = await db.select().from(merchantsTable).where(eq(merchantsTable.id, id));
  if (!merchant) {
    res.status(404).json({ error: "Merchant not found" });
    return;
  }

  const offers = await db.select().from(offersTable).where(eq(offersTable.merchantId, id)).orderBy(desc(offersTable.createdAt));

  res.json(offers.map(o => ({
    ...o,
    id: String(o.id),
    merchantId: String(o.merchantId),
    merchantName: merchant.name,
    merchantCategory: merchant.category,
    lat: merchant.lat,
    lng: merchant.lng,
    address: merchant.address,
    city: merchant.city,
  })));
});

export default router;
