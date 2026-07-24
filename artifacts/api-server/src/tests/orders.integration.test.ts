/**
 * Integration tests for GET /api/orders
 *
 * These tests exercise the real MySQL database via the express app instance.
 * A unique run-prefix is used so that seeded rows never collide with
 * production data and can be cleaned up reliably after each test.
 *
 * Run:
 *   MYSQL_DATABASE_URL=... pnpm --filter @workspace/api-server test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db, ordersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import app from "../app";

// ── Seed helpers ──────────────────────────────────────────────────────────────

const RUN_ID = `IT${Date.now()}`;  // unique prefix for this test run

function orderNum(tag: string) {
  return `${RUN_ID}-${tag}`;
}

const BASE_ROW = {
  customerEmail: null as null,
  deliveryName: null as null,
  postOffice: null as null,
  address: "1 Test Lane",
  state: "Maharashtra",
  district: "Pune",
  pincode: "411001",
  cardType: "PHH",
  quantity: 1,
  amount: "70.00",
  paymentStatus: "pending" as const,
  status: "pending" as const,
};

/** All order-numbers inserted by this run — used for cleanup. */
const seededOrderNumbers: string[] = [];

async function seed(rows: Parameters<typeof db.insert>[0] extends { values: (v: infer V) => any } ? V : never[]) {
  // drizzle mysql insert types are loose; cast through any
  await db.insert(ordersTable).values(rows as any);
  for (const r of rows as any[]) {
    seededOrderNumbers.push(r.orderNumber);
  }
}

// ── Seed data ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await seed([
    // name-searchable (FULLTEXT)
    {
      ...BASE_ROW,
      orderNumber: orderNum("name-a"),
      customerName: `Ramesh Uniquename ${RUN_ID}`,
      customerPhone: "9000000001",
      rationCardNumber: "RC00000001",
    },
    {
      ...BASE_ROW,
      orderNumber: orderNum("name-b"),
      customerName: `Ramesh Uniquename ${RUN_ID}`,
      customerPhone: "9000000002",
      rationCardNumber: "RC00000002",
    },
    // phone-searchable
    {
      ...BASE_ROW,
      orderNumber: orderNum("phone-a"),
      customerName: "Phone Test User",
      customerPhone: `88${RUN_ID.slice(-8)}`,  // unique phone, starts with 88
      rationCardNumber: "RC00000003",
    },
    // status = processing
    {
      ...BASE_ROW,
      orderNumber: orderNum("status-proc"),
      customerName: "Processing User",
      customerPhone: "9000000004",
      rationCardNumber: "RC00000004",
      status: "processing" as const,
    },
    // status = delivered
    {
      ...BASE_ROW,
      orderNumber: orderNum("status-deliv"),
      customerName: "Delivered User",
      customerPhone: "9000000005",
      rationCardNumber: "RC00000005",
      status: "delivered" as const,
    },
    // extra rows to test pagination (6–15)
    ...Array.from({ length: 10 }, (_, i) => ({
      ...BASE_ROW,
      orderNumber: orderNum(`page-${i}`),
      customerName: `Pagination User ${i}`,
      customerPhone: `700${RUN_ID.slice(-6)}${i}`,
      rationCardNumber: `RC0000010${i}`,
    })),
  ]);
});

afterAll(async () => {
  const chunkSize = 50;
  for (let i = 0; i < seededOrderNumbers.length; i += chunkSize) {
    await db
      .delete(ordersTable)
      .where(inArray(ordersTable.orderNumber, seededOrderNumbers.slice(i, i + chunkSize)));
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────

function get(path: string) {
  return request(app).get(path);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/orders", () => {
  it("returns a paginated list with orders, total, page, and limit fields", async () => {
    const res = await get("/api/orders?limit=5&page=1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      orders: expect.any(Array),
      total: expect.any(Number),
      page: 1,
      limit: 5,
    });
    expect(res.body.orders.length).toBeLessThanOrEqual(5);
  });

  // ── Search by name ──────────────────────────────────────────────────────────

  it("search by name (FULLTEXT ≥3 chars) finds seeded rows", async () => {
    const res = await get(`/api/orders?search=Uniquename&limit=50`);
    expect(res.status).toBe(200);
    const orderNumbers: string[] = res.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(orderNum("name-a"));
    expect(orderNumbers).toContain(orderNum("name-b"));
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it("name search returns each order with the expected shape", async () => {
    const res = await get(`/api/orders?search=Uniquename&limit=50`);
    expect(res.status).toBe(200);
    const order = res.body.orders.find((o: any) => o.orderNumber === orderNum("name-a"));
    expect(order).toBeDefined();
    expect(order).toMatchObject({
      orderNumber: orderNum("name-a"),
      customerName: expect.stringContaining("Ramesh Uniquename"),
      status: "pending",
      amount: expect.any(Number),
    });
  });

  // ── Search by phone ─────────────────────────────────────────────────────────

  it("search by full phone (FULLTEXT ≥3 chars) finds the seeded row", async () => {
    const phone = `88${RUN_ID.slice(-8)}`;
    const res = await get(`/api/orders?search=${encodeURIComponent(phone)}&limit=50`);
    expect(res.status).toBe(200);
    const orderNumbers: string[] = res.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(orderNum("phone-a"));
  });

  it("search by 2-char phone prefix (LIKE fallback) still returns results", async () => {
    // "88" is only 2 chars — triggers the LIKE path
    const res = await get(`/api/orders?search=88&limit=50`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toBeInstanceOf(Array);
    // Should find at least the phone-a row whose phone starts with "88"
    const orderNumbers: string[] = res.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(orderNum("phone-a"));
  });

  // ── Search by order number ──────────────────────────────────────────────────

  it("search by order number prefix finds the matching order", async () => {
    const target = orderNum("name-a");
    // Use a 6-char prefix that is unique to this run
    const prefix = target.slice(0, Math.min(target.length, 8));
    const res = await get(`/api/orders?search=${encodeURIComponent(prefix)}&limit=50`);
    expect(res.status).toBe(200);
    const orderNumbers: string[] = res.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(target);
  });

  it("exact order number search returns the exact row", async () => {
    const target = orderNum("status-proc");
    const res = await get(`/api/orders?search=${encodeURIComponent(target)}&limit=50`);
    expect(res.status).toBe(200);
    const orderNumbers: string[] = res.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(target);
  });

  // ── Empty-result handling ───────────────────────────────────────────────────

  it("search that matches nothing returns empty orders array and total=0", async () => {
    const res = await get("/api/orders?search=ZZZNOMATCH_XYZ_99999999");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.orders).toHaveLength(0);
  });

  it("status filter that matches nothing returns empty result", async () => {
    // "cancelled" orders were never seeded in this run; filter by an unlikely combination
    const res = await get(
      `/api/orders?search=${encodeURIComponent(orderNum("NOTEXIST"))}&status=cancelled`
    );
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  // ── Status filter ───────────────────────────────────────────────────────────

  it("status=processing filter returns only processing orders", async () => {
    const res = await get("/api/orders?status=processing&limit=100");
    expect(res.status).toBe(200);
    for (const order of res.body.orders) {
      expect(order.status).toBe("processing");
    }
    const orderNumbers: string[] = res.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(orderNum("status-proc"));
  });

  it("status=delivered filter returns only delivered orders", async () => {
    const res = await get("/api/orders?status=delivered&limit=100");
    expect(res.status).toBe(200);
    for (const order of res.body.orders) {
      expect(order.status).toBe("delivered");
    }
    const orderNumbers: string[] = res.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(orderNum("status-deliv"));
  });

  it("status filter combined with search narrows results correctly", async () => {
    // processing row should appear with status=processing
    const res = await get(
      `/api/orders?status=processing&search=${encodeURIComponent(orderNum("status-proc"))}&limit=50`
    );
    expect(res.status).toBe(200);
    const orderNumbers: string[] = res.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers).toContain(orderNum("status-proc"));

    // same order must NOT appear when filtering for delivered
    const res2 = await get(
      `/api/orders?status=delivered&search=${encodeURIComponent(orderNum("status-proc"))}&limit=50`
    );
    expect(res2.status).toBe(200);
    const orderNumbers2: string[] = res2.body.orders.map((o: any) => o.orderNumber);
    expect(orderNumbers2).not.toContain(orderNum("status-proc"));
  });

  // ── Pagination ──────────────────────────────────────────────────────────────

  it("page=1 and page=2 with limit=5 return different sets of orders", async () => {
    const res1 = await get("/api/orders?page=1&limit=5");
    const res2 = await get("/api/orders?page=2&limit=5");
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const ids1: number[] = res1.body.orders.map((o: any) => o.id);
    const ids2: number[] = res2.body.orders.map((o: any) => o.id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it("limit parameter caps the number of orders returned", async () => {
    const res = await get("/api/orders?limit=3&page=1");
    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeLessThanOrEqual(3);
    expect(res.body.limit).toBe(3);
  });

  it("page beyond total results returns empty orders array", async () => {
    // Fetch total first, then request a page guaranteed to be beyond it
    const totalRes = await get("/api/orders?limit=1&page=1");
    const total: number = totalRes.body.total;
    const beyondPage = total + 999;
    const res = await get(`/api/orders?limit=20&page=${beyondPage}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(0);
  });

  it("orders are returned in descending createdAt order", async () => {
    const res = await get("/api/orders?limit=20&page=1");
    expect(res.status).toBe(200);
    const dates: string[] = res.body.orders.map((o: any) => o.createdAt);
    for (let i = 1; i < dates.length; i++) {
      expect(new Date(dates[i - 1]).getTime()).toBeGreaterThanOrEqual(
        new Date(dates[i]).getTime()
      );
    }
  });

  it("total reflects the full count, not just current page", async () => {
    const res = await get("/api/orders?limit=1&page=1");
    expect(res.status).toBe(200);
    // We seeded 15 rows; total must be at least 15
    expect(res.body.total).toBeGreaterThanOrEqual(15);
    expect(res.body.orders).toHaveLength(1);
  });
});
