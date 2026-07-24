import { mysqlTable, text, int, timestamp, decimal, json, mysqlEnum, index } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ALLOWED_CARD_TYPES = ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II"] as const;

export const FamilyCardSchema = z.object({
  customerName: z.string().min(2, "customerName must be at least 2 characters"),
  rationCardNumber: z.string().min(5, "rationCardNumber must be at least 5 characters"),
  cardType: z.enum(ALLOWED_CARD_TYPES, { error: `cardType must be one of ${ALLOWED_CARD_TYPES.join(", ")}` }),
});

export const CardPdfEntrySchema = z.object({
  cardIndex: z.number().int().nonnegative(),
  pdfUrl: z.string().min(1, "pdfUrl is required"),
  uploadedAt: z.string().min(1, "uploadedAt is required"),
});

export const FamilyCardsSchema = z.array(FamilyCardSchema);
export const RationCardPdfsSchema = z.array(CardPdfEntrySchema);

export type FamilyCard = z.infer<typeof FamilyCardSchema>;
export type CardPdfEntry = z.infer<typeof CardPdfEntrySchema>;

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
}, (table) => [
  // B-tree index on created_at speeds up the ORDER BY desc(created_at) on every listing query.
  // The search columns (customer_name, customer_phone, order_number) are covered by a FULLTEXT
  // index defined in 0002_orders_search_indexes.sql; drizzle-orm does not yet expose a
  // fulltext() builder for MySQL, so those indexes are managed via raw SQL migrations only.
  index("orders_created_at_idx").on(table.createdAt),
]);

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
