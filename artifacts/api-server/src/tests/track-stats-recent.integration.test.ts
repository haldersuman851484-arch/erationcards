/**
 * Integration tests for:
 *   GET /api/orders/track
 *   GET /api/orders/stats
 *   GET /api/orders/recent
 *
 * Uses the real MySQL database. A unique RUN_ID prefix ensures seeded rows
 * never collide with production data and are cleaned up reliably after the run.
 *
 * Run:
 *   MYSQL_DATABASE_URL=... pnpm --filter @workspace/api-server test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db, ordersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import app from "../app";
import { createAdminToken } from "../lib/auth";

// ── Seed helpers ──────────────────────────────────────────────────────────────

const RUN_ID = `TS${Date.now()}`; // unique prefix — "TS" for track/stats

function orderNum(tag: string) {
  return `${RUN_ID}-${tag}`;
}

const BASE_ROW = {
  customerEmail: null as null,
  deliveryName: null as null,
  postOffice: null as null,
  address: "2 Test Street",
  state: "Karnataka",
  district: "Bengaluru",
  pincode: "560001",
  cardType: "PHH",
  quantity: 1,
  amount: "70.00",
  paymentStatus: "pending" as const,
  status: "pending" as const,
};

const seededOrderNumbers: string[] = [];

async function seed(rows: any[]) {
  await db.insert(ordersTable).values(rows as any);
  for (const r of rows) {
    seededOrderNumbers.push(r.orderNumber);
  }
}

// Rows used across tests
const TRACK_ORDER_NUMBER = orderNum("track-by-num");
const TRACK_RATION_NUMBER = `RCTRACK${RUN_ID.slice(-8)}`;
// Ration card with multiple orders (a family that reordered)
const MULTI_RATION_NUMBER = `RCMULTI${RUN_ID.slice(-8)}`;
const MULTI_OLD_ORDER = orderNum("multi-old");
const MULTI_NEW_ORDER = orderNum("multi-new");

beforeAll(async () => {
  await seed([
    // Row looked up by orderNumber
    {
      ...BASE_ROW,
      orderNumber: TRACK_ORDER_NUMBER,
      customerName: "Track By Number",
      customerPhone: "9100000001",
      rationCardNumber: `RC-TBN-${RUN_ID}`,
      status: "processing" as const,
      amount: "140.00",
    },
    // Row looked up by rationCardNumber
    {
      ...BASE_ROW,
      orderNumber: orderNum("track-by-rc"),
      customerName: "Track By RC",
      customerPhone: "9100000002",
      rationCardNumber: TRACK_RATION_NUMBER,
      status: "delivered" as const,
      amount: "70.00",
    },
    // Two orders under the same ration card (reorder scenario)
    {
      ...BASE_ROW,
      orderNumber: MULTI_OLD_ORDER,
      customerName: "Multi Order Family",
      customerPhone: "9100000003",
      rationCardNumber: MULTI_RATION_NUMBER,
      status: "returned" as const,
      createdAt: new Date("2026-01-01T10:00:00Z"),
    },
    {
      ...BASE_ROW,
      orderNumber: MULTI_NEW_ORDER,
      customerName: "Multi Order Family",
      customerPhone: "9100000003",
      rationCardNumber: MULTI_RATION_NUMBER,
      status: "processing" as const,
      createdAt: new Date("2026-06-01T10:00:00Z"),
    },
    // Extra rows so recent/stats have meaningful counts
    ...Array.from({ length: 8 }, (_, i) => ({
      ...BASE_ROW,
      orderNumber: orderNum(`extra-${i}`),
      customerName: `Extra User ${i}`,
      customerPhone: `920000000${i}`,
      rationCardNumber: `RC-EXTRA-${RUN_ID}-${i}`,
    })),
  ]);
});

afterAll(async () => {
  const chunkSize = 50;
  for (let i = 0; i < seededOrderNumbers.length; i += chunkSize) {
    await db
      .delete(ordersTable)
      .where(
        inArray(
          ordersTable.orderNumber,
          seededOrderNumbers.slice(i, i + chunkSize)
        )
      );
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────

// /stats and /recent are admin-only since the 2026-07 auth hardening; the
// header is harmless on the public /track endpoint, so attach it everywhere.
// (Unauthenticated 401 contracts are covered in order-auth.integration.test.ts.)
const ADMIN_AUTH = `Bearer ${createAdminToken("track-stats-tests@printpvccard.in", "admin")}`;

function get(path: string) {
  return request(app).get(path).set("Authorization", ADMIN_AUTH);
}

// ── GET /api/orders/track ─────────────────────────────────────────────────────

describe("GET /api/orders/track", () => {
  it("returns 400 when no query params are provided", async () => {
    const res = await get("/api/orders/track");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns the correct order when queried by orderNumber", async () => {
    const res = await get(
      `/api/orders/track?orderNumber=${encodeURIComponent(TRACK_ORDER_NUMBER)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.orderNumber).toBe(TRACK_ORDER_NUMBER);
    expect(res.body.customerName).toBe("Track By Number");
    expect(res.body.status).toBe("processing");
  });

  it("returns the correct order when queried by rationCardNumber", async () => {
    const res = await get(
      `/api/orders/track?rationCardNumber=${encodeURIComponent(TRACK_RATION_NUMBER)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.rationCardNumber).toBe(TRACK_RATION_NUMBER);
    expect(res.body.customerName).toBe("Track By RC");
    expect(res.body.status).toBe("delivered");
  });

  it("returns the newest order plus otherOrders summaries when a ration card has multiple orders", async () => {
    const res = await get(
      `/api/orders/track?rationCardNumber=${encodeURIComponent(MULTI_RATION_NUMBER)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.orderNumber).toBe(MULTI_NEW_ORDER);
    expect(Array.isArray(res.body.otherOrders)).toBe(true);
    expect(res.body.otherOrders).toHaveLength(2);
    // Newest first
    expect(res.body.otherOrders[0].orderNumber).toBe(MULTI_NEW_ORDER);
    expect(res.body.otherOrders[1].orderNumber).toBe(MULTI_OLD_ORDER);
    expect(res.body.otherOrders[1].status).toBe("returned");
    expect(typeof res.body.otherOrders[0].createdAt).toBe("string");
  });

  it("exact orderNumber hit returns that order, with otherOrders kept when the card param also matched several", async () => {
    const res = await get(
      `/api/orders/track?orderNumber=${encodeURIComponent(MULTI_OLD_ORDER)}&rationCardNumber=${encodeURIComponent(MULTI_RATION_NUMBER)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.orderNumber).toBe(MULTI_OLD_ORDER);
    expect(res.body.otherOrders).toHaveLength(2);
  });

  it("does not include otherOrders for a ration card with a single order", async () => {
    const res = await get(
      `/api/orders/track?rationCardNumber=${encodeURIComponent(TRACK_RATION_NUMBER)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.otherOrders).toBeUndefined();
  });

  it("returns every order for a card with more than 20 orders (no truncation)", async () => {
    const bigCard = `RCBIG${RUN_ID.slice(-8)}`;
    const rows = Array.from({ length: 25 }, (_, i) => ({
      ...BASE_ROW,
      orderNumber: orderNum(`big-${i}`),
      customerName: "Big Family",
      customerPhone: "9100000004",
      rationCardNumber: bigCard,
      createdAt: new Date(Date.UTC(2026, 0, 1 + i)),
    }));
    await seed(rows);

    const res = await get(
      `/api/orders/track?rationCardNumber=${encodeURIComponent(bigCard)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.orderNumber).toBe(orderNum("big-24")); // newest
    expect(res.body.otherOrders).toHaveLength(25);
    const numbers = res.body.otherOrders.map((o: any) => o.orderNumber);
    for (const r of rows) expect(numbers).toContain(r.orderNumber);
  });

  it("orderNumber-only search still jumps straight to that order without otherOrders", async () => {
    const res = await get(
      `/api/orders/track?orderNumber=${encodeURIComponent(MULTI_OLD_ORDER)}`
    );
    expect(res.status).toBe(200);
    expect(res.body.orderNumber).toBe(MULTI_OLD_ORDER);
    expect(res.body.otherOrders).toBeUndefined();
  });

  it("returns 404 for an orderNumber that does not exist", async () => {
    const res = await get(
      "/api/orders/track?orderNumber=NONEXISTENT-ORDER-99999"
    );
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("response includes expected order fields", async () => {
    const res = await get(
      `/api/orders/track?orderNumber=${encodeURIComponent(TRACK_ORDER_NUMBER)}`
    );
    expect(res.status).toBe(200);
    const o = res.body;
    expect(typeof o.id).toBe("number");
    expect(typeof o.orderNumber).toBe("string");
    expect(typeof o.customerName).toBe("string");
    expect(typeof o.status).toBe("string");
    expect(typeof o.amount).toBe("number");
    expect(typeof o.createdAt).toBe("string");
  });
});

// ── GET /api/orders/stats ─────────────────────────────────────────────────────

describe("GET /api/orders/stats", () => {
  it("returns 200 with a stats object", async () => {
    const res = await get("/api/orders/stats");
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it("totalOrders is a non-negative integer", async () => {
    const res = await get("/api/orders/stats");
    expect(res.status).toBe(200);
    expect(typeof res.body.totalOrders).toBe("number");
    expect(Number.isInteger(res.body.totalOrders)).toBe(true);
    expect(res.body.totalOrders).toBeGreaterThanOrEqual(0);
  });

  it("pendingOrders is a non-negative integer", async () => {
    const res = await get("/api/orders/stats");
    expect(res.status).toBe(200);
    expect(typeof res.body.pendingOrders).toBe("number");
    expect(Number.isInteger(res.body.pendingOrders)).toBe(true);
    expect(res.body.pendingOrders).toBeGreaterThanOrEqual(0);
  });

  it("totalRevenue is a non-negative number", async () => {
    const res = await get("/api/orders/stats");
    expect(res.status).toBe(200);
    expect(typeof res.body.totalRevenue).toBe("number");
    expect(res.body.totalRevenue).toBeGreaterThanOrEqual(0);
  });

  it("pendingOrders does not exceed totalOrders", async () => {
    const res = await get("/api/orders/stats");
    expect(res.status).toBe(200);
    expect(res.body.pendingOrders).toBeLessThanOrEqual(res.body.totalOrders);
  });

  it("totalOrders is at least as large as seeded rows", async () => {
    const res = await get("/api/orders/stats");
    expect(res.status).toBe(200);
    // We seeded 10 rows in this run
    expect(res.body.totalOrders).toBeGreaterThanOrEqual(10);
  });

  it("totalRevenue is at least as large as seeded revenue", async () => {
    // Seeded: 1 × 140 + 1 × 70 + 8 × 70 = 770
    const res = await get("/api/orders/stats");
    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBeGreaterThanOrEqual(770);
  });
});

// ── GET /api/orders/recent ────────────────────────────────────────────────────

describe("GET /api/orders/recent", () => {
  it("returns 200 with an array", async () => {
    const res = await get("/api/orders/recent");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns at most 10 orders", async () => {
    const res = await get("/api/orders/recent");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(10);
  });

  it("orders are in descending createdAt order", async () => {
    const res = await get("/api/orders/recent");
    expect(res.status).toBe(200);
    const dates: string[] = res.body.map((o: any) => o.createdAt);
    for (let i = 1; i < dates.length; i++) {
      expect(new Date(dates[i - 1]).getTime()).toBeGreaterThanOrEqual(
        new Date(dates[i]).getTime()
      );
    }
  });

  it("each order includes expected fields", async () => {
    const res = await get("/api/orders/recent");
    expect(res.status).toBe(200);
    for (const o of res.body) {
      expect(typeof o.id).toBe("number");
      expect(typeof o.orderNumber).toBe("string");
      expect(typeof o.customerName).toBe("string");
      expect(typeof o.status).toBe("string");
      expect(typeof o.amount).toBe("number");
      expect(typeof o.createdAt).toBe("string");
    }
  });
});
