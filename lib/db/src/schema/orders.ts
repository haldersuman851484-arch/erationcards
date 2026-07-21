import { pgTable, text, serial, timestamp, numeric, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type FamilyCard = {
  customerName: string;
  rationCardNumber: string;
  cardType: string;
};

export type CardPdfEntry = {
  cardIndex: number;
  pdfUrl: string;
  uploadedAt: string;
};

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
  "confirmed",
  "rejected",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  rationCardNumber: text("ration_card_number").notNull(),
  deliveryName: text("delivery_name"),
  address: text("address").notNull(),
  postOffice: text("post_office"),
  state: text("state").notNull(),
  district: text("district").notNull(),
  pincode: text("pincode").notNull(),
  cardType: text("card_type").notNull(),
  familyCards: jsonb("family_cards").$type<FamilyCard[]>().notNull().default([]),
  quantity: integer("quantity").notNull().default(1),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  paymentScreenshotUrl: text("payment_screenshot_url"),
  rationCardPdfs: jsonb("ration_card_pdfs").$type<CardPdfEntry[]>().notNull().default([]),
  status: orderStatusEnum("status").notNull().default("pending"),
  operatorId: integer("operator_id"),
  trackingNumber: text("tracking_number"),
  courierName: text("courier_name"),
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
