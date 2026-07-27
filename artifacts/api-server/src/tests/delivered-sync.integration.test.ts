/**
 * Delivered/RTO auto-sync tests: syncDeliveredOrders (the 30-min background
 * job) and GET /orders/:id/tracking (the customer page load) must flip
 * dispatched Delhivery orders to "delivered" or "returned" based on scan
 * data, and leave everything else alone.
 *
 * All Delhivery HTTP calls are stubbed — no real API is hit.
 * Requires MYSQL_DATABASE_URL (same env var the api-server uses).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { db, ordersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { syncDeliveredOrders } from "../routes/orders";

const seededOrderNumbers: string[] = [];

// Unique AWBs per test — the module-level 5-min tracking cache in orders.ts
// persists across tests in this process, so reusing an AWB would serve stale
// scans instead of hitting the stubbed fetch.
let awbSeq = 0;
const nextAwb = () => `SYNCAWB${Date.now()}${awbSeq++}`;

const fakeLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

async function seedDispatchedOrder(overrides: Record<string, unknown> = {}) {
  const orderNumber = `SYNC-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  seededOrderNumbers.push(orderNumber);
  await db.insert(ordersTable).values({
    orderNumber,
    customerName: "Sync Test Customer",
    customerPhone: "9000012345",
    customerEmail: null,
    rationCardNumber: "RC00000042",
    address: "12 Test Lane",
    postOffice: "Barasat",
    district: "North 24 Parganas",
    state: "West Bengal",
    pincode: "700124",
    cardType: "PHH",
    quantity: 1,
    amount: "70.00",
    paymentStatus: "confirmed" as any,
    status: "dispatched" as any,
    courierName: "Delhivery",
    ...overrides,
  } as any);
  const [row] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber))
    .limit(1);
  return row!;
}

async function statusOf(id: number): Promise<string> {
  const [row] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  return String(row!.status);
}

type RawScan = { Scan: string; Instructions?: string; ScanDateTime?: string; ScannedLocation?: string };

/**
 * Stubs the Delhivery tracking API. Any waybill present in scansByAwb gets
 * its scans back; unknown waybills (e.g. other dispatched orders in the dev
 * DB swept up by the sync) are simply absent from the response, which the
 * sync treats as "no data — leave the order alone".
 */
function stubTracking(scansByAwb: Record<string, RawScan[]>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: any) => {
      const u = String(url);
      if (!u.includes("/api/v1/packages/json")) {
        throw new Error(`Unexpected fetch in test: ${u}`);
      }
      const waybills = (new URL(u).searchParams.get("waybill") ?? "").split(",");
      const ShipmentData = waybills
        .filter((w) => scansByAwb[w])
        .map((w) => ({
          Shipment: {
            AWB: w,
            Scans: scansByAwb[w]!.map((s) => ({
              ScanDetail: {
                ScanDateTime: s.ScanDateTime ?? "2026-07-27T10:00:00",
                ScannedLocation: s.ScannedLocation ?? "Kolkata_Hub",
                Scan: s.Scan,
                Instructions: s.Instructions ?? "",
              },
            })),
          },
        }));
      return new Response(JSON.stringify({ ShipmentData }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

beforeAll(() => {
  process.env["DELHIVERY_API_TOKEN"] ??= "test-token";
});

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  vi.unstubAllGlobals();
  if (seededOrderNumbers.length > 0) {
    await db.delete(ordersTable).where(inArray(ordersTable.orderNumber, seededOrderNumbers));
  }
});

describe("syncDeliveredOrders — background delivered/returned sync", () => {
  it("flips a dispatched order to delivered on a Delivered scan", async () => {
    const awb = nextAwb();
    const order = await seedDispatchedOrder({ trackingNumber: awb });
    stubTracking({
      [awb]: [
        { Scan: "In Transit", Instructions: "Shipment picked up" },
        { Scan: "Delivered", Instructions: "Delivered to consignee" },
      ],
    });

    await syncDeliveredOrders(fakeLog());
    expect(await statusOf(order.id)).toBe("delivered");
  });

  it("flips a dispatched order to returned on an RTO scan", async () => {
    const awb = nextAwb();
    const order = await seedDispatchedOrder({ trackingNumber: awb });
    stubTracking({
      [awb]: [
        { Scan: "In Transit", Instructions: "Shipment picked up" },
        { Scan: "RTO Initiated", Instructions: "Consignee refused delivery" },
      ],
    });

    await syncDeliveredOrders(fakeLog());
    expect(await statusOf(order.id)).toBe("returned");
  });

  it("leaves the order dispatched when scans show only transit/failed attempts", async () => {
    const awb = nextAwb();
    const order = await seedDispatchedOrder({ trackingNumber: awb });
    stubTracking({
      [awb]: [
        { Scan: "In Transit", Instructions: "Reached destination hub" },
        { Scan: "Dispatched", Instructions: "Out for delivery" },
        { Scan: "Undelivered", Instructions: "Consignee unavailable — failed delivery attempt" },
      ],
    });

    await syncDeliveredOrders(fakeLog());
    expect(await statusOf(order.id)).toBe("dispatched");
  });

  it("prefers delivered when a Delivered scan follows RTO wording (delivered on retry)", async () => {
    const awb = nextAwb();
    const order = await seedDispatchedOrder({ trackingNumber: awb });
    stubTracking({
      [awb]: [
        { Scan: "RTO Initiated", Instructions: "Returning to origin" },
        { Scan: "Delivered", Instructions: "Delivered to consignee on reattempt" },
      ],
    });

    await syncDeliveredOrders(fakeLog());
    expect(await statusOf(order.id)).toBe("delivered");
  });

  it("does not touch orders shipped with a non-Delhivery courier", async () => {
    const awb = nextAwb();
    const order = await seedDispatchedOrder({ trackingNumber: awb, courierName: "India Post" });
    stubTracking({ [awb]: [{ Scan: "Delivered", Instructions: "Delivered" }] });

    await syncDeliveredOrders(fakeLog());
    expect(await statusOf(order.id)).toBe("dispatched");
  });
});

describe("GET /api/orders/:id/tracking — customer page load also syncs", () => {
  it("returns scans and flips the order to delivered", async () => {
    const awb = nextAwb();
    const order = await seedDispatchedOrder({ trackingNumber: awb });
    stubTracking({ [awb]: [{ Scan: "Delivered", Instructions: "Delivered to consignee" }] });

    const res = await request(app).get(`/api/orders/${order.id}/tracking`);
    expect(res.status).toBe(200);
    expect(res.body.awb).toBe(awb);
    expect(res.body.scans.length).toBeGreaterThan(0);
    expect(await statusOf(order.id)).toBe("delivered");
  });
});
