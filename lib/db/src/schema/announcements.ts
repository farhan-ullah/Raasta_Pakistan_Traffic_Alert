import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("Holiday"),
  priority: text("priority").notNull().default("Medium"),
  city: text("city").notNull().default("Islamabad"),
  affectedAreas: text("affected_areas").array(),
  department: text("department").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  views: integer("views").notNull().default(0),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAnnouncementSchema = createInsertSchema(announcementsTable).omit({ id: true, createdAt: true, updatedAt: true, views: true });
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcementsTable.$inferSelect;
