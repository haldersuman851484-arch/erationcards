import { mysqlTable, text, int, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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

export const insertPaymentVerificationSchema = createInsertSchema(paymentVerificationsTable).omit({
  id: true,
  verifiedAt: true,
});

export type InsertPaymentVerification = z.infer<typeof insertPaymentVerificationSchema>;
export type PaymentVerification = typeof paymentVerificationsTable.$inferSelect;
