import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** Tracks which traffic alerts/incidents a user has opened. */
export const alertReadsTable = pgTable(
  "alert_reads",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    alertId: text("alert_id").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userAlertUnique: uniqueIndex("alert_reads_user_alert_unique").on(
      table.userId,
      table.alertId,
    ),
  }),
);

export type AlertRead = typeof alertReadsTable.$inferSelect;
