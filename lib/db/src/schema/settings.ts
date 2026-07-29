import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";

/**
 * Generic key-value store for admin-editable runtime settings
 * (e.g. the merchant UPI ID). Values are plain strings; each
 * consumer is responsible for validating its own setting.
 */
export const settingsTable = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Setting = typeof settingsTable.$inferSelect;
