import { mysqlTable, text, int, timestamp, decimal, json, mysqlEnum, index } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Card categories (and their pricing) live in @workspace/pricing so the
// frontend and API server share one source of truth; re-exported here so
// existing @workspace/db consumers keep working.
import { ALLOWED_CARD_TYPES } from "@workspace/pricing";
export { ALLOWED_CARD_TYPES, RATION_CARD_TYPES, SPECIAL_CARD_TYPES } from "@workspace/pricing";

export const FamilyCardSchema = z.object({
  customerName: z.string().min(2, "customerName must be at least 2 characters"),
  rationCardNumber: z.string().min(5, "rationCardNumber must be at least 5 characters"),
  cardType: z.enum(ALLOWED_CARD_TYPES, { error: `cardType must be one of ${ALLOWED_CARD_TYPES.join(", ")}` }),
});

export const CardPdfEntrySchema = z.object({
  cardIndex: z.number().int().nonnegative(),
  pdfUrl: z.string().min(1, "pdfUrl is required"),
  uploadedAt: z.string().min(1, "uploadedAt is required"),
  downloaded: z.boolean().optional().default(false),
  downloadedAt: z.string().nullable().optional(),
  // Customer's original filename (sanitized). Optional: entries uploaded
  // before this field existed don't have it.
  originalFilename: z.string().optional(),
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
  // Latest Cashfree order_id for this order (our order number, plus a -R<n>
  // suffix after retried attempts). Nullable: legacy UPI-screenshot orders
  // and orders that never reached the payment step have none. The column is
  // created on existing databases by the boot self-heal in the API server
  // (dev boxes cannot reach the Hostinger MySQL instance to run a push).
  cfOrderId: text("cf_order_id"),
  rationCardPdfs: json("ration_card_pdfs").$type<CardPdfEntry[]>().notNull().default([]),
  status: mysqlEnum("status", ["pending", "processing", "printed", "dispatched", "delivered", "returned", "cancelled"]).notNull().default("pending"),
  operatorId: int("operator_id"),
  trackingNumber: text("tracking_number"),
  courierName: text("courier_name"),
  notes: text("notes"),
  welcomeLetterUrl: text("welcome_letter_url"),
  // Set once when the customer finishes the order wizard (final Submit after
  // PDF uploads). Acts as the idempotency guard: the confirmation email is
  // attempted at most once per order, no matter how often submit is replayed.
  submittedAt: timestamp("submitted_at"),
  // Set only when the confirmation email actually went out, so replayed
  // submits can report an accurate emailSent flag.
  confirmationEmailSentAt: timestamp("confirmation_email_sent_at"),
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
  // Server-managed submit tracking — never client-settable.
  submittedAt: true,
  confirmationEmailSentAt: true,
  // Server-managed Cashfree order reference — never client-settable.
  cfOrderId: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
