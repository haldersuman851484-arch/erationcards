import { mysqlTable, text, int, timestamp, decimal, json, mysqlEnum } from "drizzle-orm/mysql-core";
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

export const ordersTable = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
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
  familyCards: json("family_cards").$type<FamilyCard[]>().notNull().default([]),
  quantity: int("quantity").notNull().default(1),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: mysqlEnum("payment_status", ["pending", "paid", "failed", "refunded", "confirmed", "rejected"]).notNull().default("pending"),
  paymentMethod: text("payment_method"),
  paymentScreenshotUrl: text("payment_screenshot_url"),
  rationCardPdfs: json("ration_card_pdfs").$type<CardPdfEntry[]>().notNull().default([]),
  status: mysqlEnum("status", ["pending", "processing", "printed", "dispatched", "delivered", "cancelled"]).notNull().default("pending"),
  operatorId: int("operator_id"),
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
  courierName: true,
  notes: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
