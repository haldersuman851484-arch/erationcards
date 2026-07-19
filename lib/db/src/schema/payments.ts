import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const verificationActionEnum = pgEnum("verification_action", [
  "confirmed",
  "rejected",
]);

export const paymentVerificationsTable = pgTable("payment_verifications", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  orderNumber: text("order_number").notNull(),
  action: verificationActionEnum("action").notNull(),
  adminEmail: text("admin_email").notNull(),
  screenshotUrl: text("screenshot_url"),
  notes: text("notes"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentVerificationSchema = createInsertSchema(paymentVerificationsTable).omit({
  id: true,
  verifiedAt: true,
});

export type InsertPaymentVerification = z.infer<typeof insertPaymentVerificationSchema>;
export type PaymentVerification = typeof paymentVerificationsTable.$inferSelect;
