import { mysqlTable, text, int, timestamp, decimal, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const operatorsTable = mysqlTable("operators", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  shopName: text("shop_name").notNull(),
  address: text("address").notNull(),
  state: text("state").notNull(),
  district: text("district").notNull(),
  pincode: text("pincode").notNull(),
  status: mysqlEnum("status", ["pending", "active", "suspended"]).notNull().default("active"),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  totalOrdersHandled: int("total_orders_handled").notNull().default(0),
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
