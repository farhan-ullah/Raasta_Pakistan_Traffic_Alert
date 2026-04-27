import { pgTable, text, serial, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const incidentsTable = pgTable("incidents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  area: text("area"),
  city: text("city").notNull().default("Islamabad"),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("active"),
  reportedBy: text("reported_by"),
  officerName: text("officer_name"),
  affectedRoads: text("affected_roads").array(),
  alternateRoutes: text("alternate_routes").array(),
  estimatedDuration: text("estimated_duration"),
  mediaUrls: text("media_urls").array(),
  reporterPhone: text("reporter_phone"),
  isVerifiedByPolice: boolean("is_verified_by_police").default(false),
  startTime: timestamp("start_time", { withTimezone: true }).defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertIncidentSchema = createInsertSchema(incidentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidentsTable.$inferSelect;
