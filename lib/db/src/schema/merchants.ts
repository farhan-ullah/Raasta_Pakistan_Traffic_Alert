import { pgTable, text, serial, timestamp, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const merchantsTable = pgTable("merchants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  phone: text("phone"),
  email: text("email"),
  address: text("address").notNull(),
  city: text("city").notNull().default("Islamabad"),
  area: text("area"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  rating: real("rating").default(4.0),
  reviewCount: integer("review_count").default(0),
  isVerified: boolean("is_verified").default(false),
  isOpen: boolean("is_open").default(true),
  openHours: text("open_hours"),
  /** Secret key for merchant portal — create/manage offers. Shown once when merchant is created. */
  portalAccessKey: text("portal_access_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMerchantSchema = createInsertSchema(merchantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchantsTable.$inferSelect;
