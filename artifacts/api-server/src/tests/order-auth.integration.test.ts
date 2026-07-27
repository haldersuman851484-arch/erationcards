/**
 * Auth-guard regression tests for the order routes locked down during the
 * full order-to-delivery process check: order detail, recent list, stats,
 * status PATCH and operator assignment must not be publicly readable or
 * writable (they carry/alter full customer PII and order state).
 *
 * Requires MYSQL_DATABASE_URL (same env var the api-server uses).
 */
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { createAdminToken, createOperatorToken } from "../lib/auth";
import { db, ordersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const ADMIN = () => `Bearer ${createAdminToken("auth-tests@printpvccard.in", "admin")}`;

const seededOrderNumbers: string[] = [];

async function seedOrder(overrides: Record<string, unknown> = {}) {
  const orderNumber = `AUTH-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  seededOrderNumbers.push(orderNumber);
  await db.insert(ordersTable).values({
    orderNumber,
    customerName: "Auth Test Customer",
    customerPhone: "9000012345",
    rationCardNumber: "RC00000042",
    address: "12 Test Lane",
    district: "North 24 Parganas",
    state: "West Bengal",
    pincode: "700124",
    cardType: "PHH",
    quantity: 1,
    amount: "70.00",
    paymentStatus: "confirmed" as any,
    status: "pending" as any,
    ...overrides,
  } as any);
  const [row] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber))
    .limit(1);
  return row!;
}

afterAll(async () => {
  if (seededOrderNumbers.length > 0) {
    await db.delete(ordersTable).where(inArray(ordersTable.orderNumber, seededOrderNumbers));
  }
});

describe("order route auth guards", () => {
  it("rejects unauthenticated reads of recent orders, stats and order detail", async () => {
    const order = await seedOrder();
    expect((await request(app).get("/api/orders/recent")).status).toBe(401);
    expect((await request(app).get("/api/orders/stats")).status).toBe(401);
    expect((await request(app).get(`/api/orders/${order.id}`)).status).toBe(401);
  });

  it("rejects unauthenticated status updates and assignment", async () => {
    const order = await seedOrder();
    const patch = await request(app)
      .patch(`/api/orders/${order.id}`)
      .send({ status: "delivered" });
    expect(patch.status).toBe(401);

    const assign = await request(app)
      .patch(`/api/orders/${order.id}/assign`)
      .send({ operatorId: 1 });
    expect(assign.status).toBe(401);

    // Order untouched
    const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id));
    expect(String(row!.status)).toBe("pending");
    expect(row!.operatorId ?? null).toBeNull();
  });

  it("forbids an operator from touching an order not assigned to them", async () => {
    const order = await seedOrder(); // operatorId null — belongs to no operator
    const foreignOperator = `Bearer ${createOperatorToken(999_999_999)}`;

    const read = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", foreignOperator);
    expect(read.status).toBe(403);

    // PATCH is now admin-only: any operator token is rejected up front (401)
    const patch = await request(app)
      .patch(`/api/orders/${order.id}`)
      .set("Authorization", foreignOperator)
      .send({ status: "processing" });
    expect(patch.status).toBe(401);
  });

  it("lets an admin read and update, but rejects invalid status values", async () => {
    const order = await seedOrder();

    const read = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", ADMIN());
    expect(read.status).toBe(200);
    expect(read.body.orderNumber).toBe(order.orderNumber);

    const bad = await request(app)
      .patch(`/api/orders/${order.id}`)
      .set("Authorization", ADMIN())
      .send({ status: "banana" });
    expect(bad.status).toBe(400);

    const good = await request(app)
      .patch(`/api/orders/${order.id}`)
      .set("Authorization", ADMIN())
      .send({ status: "processing" });
    expect(good.status).toBe(200);
    expect(good.body.status).toBe("processing");
  });

  it("lets the assigned operator read their own order, but blocks their status updates (admin-only)", async () => {
    const operatorId = 987_654_321; // plain int column, no FK — token id just has to match
    const order = await seedOrder({ operatorId });
    const ownOperator = `Bearer ${createOperatorToken(operatorId)}`;

    const read = await request(app)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", ownOperator);
    expect(read.status).toBe(200);
    expect(read.body.orderNumber).toBe(order.orderNumber);

    // Even the operator the order is assigned to cannot change status anymore.
    const patch = await request(app)
      .patch(`/api/orders/${order.id}`)
      .set("Authorization", ownOperator)
      .send({ status: "processing" });
    expect(patch.status).toBe(401);

    // And the order must be untouched in the database.
    const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id));
    expect(String(row!.status)).toBe("pending");
  });
});
