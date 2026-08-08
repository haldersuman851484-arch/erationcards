import { mysqlTable, text, int, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * Historical audit rows from the manual (screenshot) payment-verification
 * era. That process was removed once the Cashfree gateway became the only
 * payment path — nothing writes here anymore. The table is kept read-only
 * so the permanent-record archive export still includes the old records.
 * Do NOT generate a drop migration for it.
 */
export const paymentVerificationsTable = mysqlTable("payment_verifications", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  orderNumber: text("order_number").notNull(),
  action: mysqlEnum("action", ["confirmed", "rejected"]).notNull(),
  adminEmail: text("admin_email").notNull(),
  screenshotUrl: text("screenshot_url"),
  notes: text("notes"),
  verifiedAt: timestamp("verified_at").notNull().defaultNow(),
});

export type PaymentVerification = typeof paymentVerificationsTable.$inferSelect;
