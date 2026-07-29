import { mysqlTable, int, varchar, text, timestamp } from "drizzle-orm/mysql-core";

/**
 * Append-only audit trail for money-affecting settings (UPI ID, card prices).
 * A row is written on every successful save: which field, the effective value
 * before and after, and which admin's unlock session made the change.
 * Read-only by design — the API exposes no update/delete for this table.
 */
export const settingsChangeHistoryTable = mysqlTable("settings_change_history", {
  id: int("id").autoincrement().primaryKey(),
  /** Setting key that changed, e.g. "merchant_upi_id" or "pricing_matrix". */
  field: varchar("field", { length: 100 }).notNull(),
  /** Effective value before the save (env/built-in default included). */
  oldValue: text("old_value").notNull(),
  /** Value after the save. */
  newValue: text("new_value").notNull(),
  /** Admin email from the unlock session that made the change. */
  changedBy: varchar("changed_by", { length: 255 }).notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export type SettingsChangeHistoryRow = typeof settingsChangeHistoryTable.$inferSelect;
