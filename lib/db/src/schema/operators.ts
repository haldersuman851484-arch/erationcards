import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const operatorStatusEnum = pgEnum("operator_status", ["pending", "active", "suspended"]);

export const operatorsTable = pgTable("operators", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  shopName: text("shop_name").notNull(),
  address: text("address").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  pincode: text("pincode").notNull(),
  status: operatorStatusEnum("status").notNull().default("active"),
  walletBalance: numeric("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  totalOrdersHandled: integer("total_orders_handled").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOperatorSchema = createInsertSchema(operatorsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  walletBalance: true,
  totalOrdersHandled: true,
});

export type InsertOperator = z.infer<typeof insertOperatorSchema>;
export type Operator = typeof operatorsTable.$inferSelect;
