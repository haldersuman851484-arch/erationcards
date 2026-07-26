/**
 * Integration tests for GET /api/orders/:id/tracking auto-mark-delivered logic.
 *
 * Delhivery's tracking API is mocked via vi.stubGlobal("fetch", ...) so no
 * network calls are made; the real MySQL database is used for order rows.
 *
 * Covers:
 *  - a Delivered scan flips dispatched → delivered exactly once
 *  - a cache-hit repeat call does not re-flip or un-flip the status
 *  - RTO / return scans never flip the status
 *  - non-dispatched orders are untouched even with a Delivered scan
 *  - a Delhivery fetch failure returns an error without corrupting the order
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import { db, ordersTable } from "@workspace/db";
import { inArray, eq } from "drizzle-orm";
import app from "../app";

const RUN_ID = `TRK${Date.now()}`;
const seededOrderNumbers: string[] = [];

const BASE_ROW = {
  customerEmail: null as null,
  deliveryName: null as null,
  postOffice: null as null,
  customerName: "Tracking Test User",
  customerPhone: "9111111111",
  rationCardNumber: "RCTRACK001",
  address: "1 Track Lane",
  state: "Maharashtra",
  district: "Pune",
  pincode: "411001",
  cardType: "PHH",
  quantity: 1,
  amount: "70.00",
  paymentStatus: "paid" as const,
  courierName: "Delhivery",
};

async function seedOrder(tag: string, status: string, trackingNumber: string | null) {
  const orderNumber = `${RUN_ID}-${tag}`;
  await db.insert(ordersTable).values({
    ...BASE_ROW,
    orderNumber,
    status: status as any,
    trackingNumber,
  } as any);
  seededOrderNumbers.push(orderNumber);
  const [row] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber))
    .limit(1);
  return row!;
}

async function getStatus(id: number): Promise<string> {
  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  return row!.status as string;
}

// ── Delhivery mock helpers ────────────────────────────────────────────────────

function delhiveryPayload(scans: Array<{ scan: string; instructions?: string }>) {
  return {
    ShipmentData: [
      {
        Shipment: {
          Scans: scans.map((s, i) => ({
            ScanDetail: {
              ScanDateTime: `2026-07-2${(i % 9) + 1}T10:00:00`,
              ScannedLocation: "Pune_Hub",
              Scan: s.scan,
              Instructions: s.instructions ?? "",
            },
          })),
        },
      },
    ],
  };
}

/** Stubs global fetch to return the given Delhivery payload; returns the spy. */
function mockDelhivery(payload: unknown, ok = true) {
  const spy = vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  })) as any;
  vi.stubGlobal("fetch", spy);
  return spy;
}

const originalToken = process.env["DELHIVERY_API_TOKEN"];

beforeAll(() => {
  // The tracking route requires a token; fetch is mocked so any value works.
  if (!process.env["DELHIVERY_API_TOKEN"]) {
    process.env["DELHIVERY_API_TOKEN"] = "test-token";
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  if (originalToken === undefined) delete process.env["DELHIVERY_API_TOKEN"];
  if (seededOrderNumbers.length > 0) {
    await db.delete(ordersTable).where(inArray(ordersTable.orderNumber, seededOrderNumbers));
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/orders/:id/tracking auto-mark delivered", () => {
  it("flips a dispatched order to delivered when a Delivered scan appears", async () => {
    const order = await seedOrder("flip", "dispatched", `${RUN_ID}AWB1`);
    mockDelhivery(delhiveryPayload([
      { scan: "In Transit" },
      { scan: "Delivered", instructions: "Delivered to consignee" },
    ]));

    const res = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res.status).toBe(200);
    expect(res.body.awb).toBe(`${RUN_ID}AWB1`);
    expect(res.body.scans.length).toBe(2);
    expect(await getStatus(order.id)).toBe("delivered");
  });

  it("flips exactly once and never un-flips on a repeat (cache-hit) call", async () => {
    const order = await seedOrder("once", "dispatched", `${RUN_ID}AWB2`);
    const spy = mockDelhivery(delhiveryPayload([{ scan: "Delivered" }]));

    const res1 = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res1.status).toBe(200);
    expect(await getStatus(order.id)).toBe("delivered");

    // Second call hits the 5-min tracking cache: Delhivery must not be called
    // again, and the status must remain delivered (no double update, no revert).
    const res2 = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res2.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await getStatus(order.id)).toBe("delivered");
  });

  it("does not un-flip a delivered order even if later scans lack a Delivered scan", async () => {
    const order = await seedOrder("noflipback", "delivered", `${RUN_ID}AWB3`);
    mockDelhivery(delhiveryPayload([{ scan: "In Transit" }]));

    const res = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res.status).toBe(200);
    expect(await getStatus(order.id)).toBe("delivered");
  });

  it("does not flip on RTO scans", async () => {
    const order = await seedOrder("rto", "dispatched", `${RUN_ID}AWB4`);
    mockDelhivery(delhiveryPayload([
      { scan: "RTO Delivered" },
      { scan: "Delivered", instructions: "RTO - returned to shipper" },
    ]));

    const res = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res.status).toBe(200);
    expect(await getStatus(order.id)).toBe("dispatched");
  });

  it("does not touch a non-dispatched order even with a Delivered scan", async () => {
    // A printed order with a tracking number (edge case) must not be flipped.
    const order = await seedOrder("printed", "printed", `${RUN_ID}AWB5`);
    mockDelhivery(delhiveryPayload([{ scan: "Delivered" }]));

    const res = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res.status).toBe(200);
    expect(await getStatus(order.id)).toBe("printed");
  });

  it("returns 502 and leaves the order untouched when Delhivery responds non-OK", async () => {
    const order = await seedOrder("apierr", "dispatched", `${RUN_ID}AWB6`);
    mockDelhivery({ error: "upstream boom" }, false);

    const res = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
    expect(await getStatus(order.id)).toBe("dispatched");
  });

  it("returns 500 and leaves the order untouched when the fetch itself throws", async () => {
    const order = await seedOrder("neterr", "dispatched", `${RUN_ID}AWB7`);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));

    const res = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    expect(await getStatus(order.id)).toBe("dispatched");
  });

  it("returns 404 when the order has no tracking number", async () => {
    const order = await seedOrder("noawb", "dispatched", null);
    mockDelhivery(delhiveryPayload([{ scan: "Delivered" }]));

    const res = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res.status).toBe(404);
    expect(await getStatus(order.id)).toBe("dispatched");
  });
});
