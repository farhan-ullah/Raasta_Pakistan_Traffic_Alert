import { pgTable, text, serial, timestamp, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const offersTable = pgTable("offers", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  discountPercent: real("discount_percent"),
  discountAmount: real("discount_amount"),
  originalPrice: real("original_price"),
  offerPrice: real("offer_price"),
  code: text("code"),
  imageUrl: text("image_url"),
  radiusKm: real("radius_km").default(2.0),
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
  isActive: boolean("is_active").default(true),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const redemptionsTable = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  token: text("token").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const insertOfferSchema = createInsertSchema(offersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offersTable.$inferSelect;
export type Redemption = typeof redemptionsTable.$inferSelect;
