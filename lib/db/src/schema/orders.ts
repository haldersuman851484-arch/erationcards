import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "printed",
  "dispatched",
  "delivered",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const cardTypeEnum = pgEnum("card_type", ["APL", "BPL", "AAY"]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  rationCardNumber: text("ration_card_number").notNull(),
  address: text("address").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  pincode: text("pincode").notNull(),
  cardType: cardTypeEnum("card_type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  status: orderStatusEnum("status").notNull().default("pending"),
  operatorId: integer("operator_id"),
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
  operatorId: true,
  trackingNumber: true,
  notes: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
