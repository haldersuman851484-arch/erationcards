/**
 * Dispatch payload test: POST /orders/:id/dispatch must send the customer's
 * full street address (street + post office) to Delhivery in the `add` field,
 * while city/state/pin stay in their dedicated fields.
 *
 * The Delhivery HTTP call is stubbed — no real shipment is ever created.
 * Requires MYSQL_DATABASE_URL (same env var the api-server uses).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { createAdminToken } from "../lib/auth";
import { db, ordersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const AUTH = () => `Bearer ${createAdminToken("dispatch-tests@printpvccard.in", "admin")}`;

const seededOrderNumbers: string[] = [];

async function seedPrintedOrder(overrides: Record<string, unknown> = {}) {
  const orderNumber = `DSP-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  seededOrderNumbers.push(orderNumber);
  await db.insert(ordersTable).values({
    orderNumber,
    customerName: "Dispatch Test Customer",
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
    paymentStatus: "verified" as any,
    status: "printed" as any,
    ...overrides,
  } as any);
  const [row] = await db
    .select()
    .from(ordersTable)
    .where(inArray(ordersTable.orderNumber, [orderNumber]))
    .limit(1);
  return row!;
}

/** Capture the JSON payload the route sends to Delhivery's CMU endpoint. */
function stubDelhivery(waybill: string) {
  const calls: any[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: any, init: any) => {
      const params = new URLSearchParams(String(init?.body ?? ""));
      calls.push(JSON.parse(params.get("data") ?? "{}"));
      return new Response(
        JSON.stringify({ packages: [{ status: "Success", waybill }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }),
  );
  return calls;
}

beforeAll(() => {
  // Self-contained: satisfy the route's config check without real secrets.
  // ??= keeps real workspace values when they exist.
  process.env["DELHIVERY_API_TOKEN"] ??= "test-token";
  process.env["DELHIVERY_PICKUP_LOCATION"] ??= "TEST-PICKUP";
  process.env["DELHIVERY_RETURN_NAME"] ??= "Test Returns";
  process.env["DELHIVERY_RETURN_PHONE"] ??= "9000000000";
  process.env["DELHIVERY_RETURN_ADD"] ??= "1 Return Street";
  process.env["DELHIVERY_RETURN_PIN"] ??= "700001";
  process.env["DELHIVERY_RETURN_CITY"] ??= "Kolkata";
  process.env["DELHIVERY_RETURN_STATE"] ??= "West Bengal";
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

describe("POST /api/orders/:id/dispatch — Delhivery payload address", () => {
  it("sends street + post office in `add`, with city/state/pin in their own fields", async () => {
    const order = await seedPrintedOrder();
    const calls = stubDelhivery("TESTAWB0001");

    const res = await request(app)
      .post(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(200);
    expect(res.body.awb).toBe("TESTAWB0001");
    expect(calls).toHaveLength(1);

    const shipment = calls[0].shipments[0];
    expect(shipment.add).toBe("12 Test Lane, Barasat");
    expect(shipment.city).toBe("North 24 Parganas");
    expect(shipment.state).toBe("West Bengal");
    expect(shipment.pin).toBe("700124");
    expect(shipment.name).toBe("Dispatch Test Customer");
  });

  it("omits the post office cleanly when the order has none (no stray commas)", async () => {
    const order = await seedPrintedOrder({ postOffice: null });
    const calls = stubDelhivery("TESTAWB0002");

    const res = await request(app)
      .post(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].shipments[0].add).toBe("12 Test Lane");
  });

  it("treats a whitespace-only post office as absent (no stray commas)", async () => {
    const order = await seedPrintedOrder({ postOffice: "   " });
    const calls = stubDelhivery("TESTAWB0003");

    const res = await request(app)
      .post(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(200);
    expect(calls[0].shipments[0].add).toBe("12 Test Lane");
  });
});

/** Delhivery's edit (cancel) endpoint answers with a raw body — JSON or XML. */
function stubDelhiveryRaw(body: string, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));
}

describe("DELETE /api/orders/:id/dispatch — cancel response parsing", () => {
  it("accepts Delhivery's XML success response and resets the order", async () => {
    const order = await seedPrintedOrder({ status: "dispatched", trackingNumber: "TESTAWB7777" });
    stubDelhiveryRaw(
      `<?xml version="1.0" encoding="utf-8"?>\n<root><status>True</status><waybill>TESTAWB7777</waybill><order_id>${order.orderNumber}</order_id><remark>Shipment has been cancelled.</remark></root>`,
    );

    const res = await request(app)
      .delete(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.cancelledAwb).toBe("TESTAWB7777");
    expect(res.body.order.status).toBe("printed");
    expect(res.body.order.trackingNumber).toBeNull();
  });

  it("surfaces Delhivery's XML rejection remark as a clear error", async () => {
    const order = await seedPrintedOrder({ status: "dispatched", trackingNumber: "TESTAWB8888" });
    stubDelhiveryRaw(`<root><status>False</status><remark>Shipment already picked up</remark></root>`);

    const res = await request(app)
      .delete(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("Shipment already picked up");
  });

  it("still accepts a JSON success response", async () => {
    const order = await seedPrintedOrder({ status: "dispatched", trackingNumber: "TESTAWB9999" });
    stubDelhiveryRaw(JSON.stringify({ status: true }));

    const res = await request(app)
      .delete(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("printed");
  });

  it("accepts a JSON string-boolean success status ('true')", async () => {
    const order = await seedPrintedOrder({ status: "dispatched", trackingNumber: "TESTAWB6666" });
    stubDelhiveryRaw(JSON.stringify({ status: "true" }));

    const res = await request(app)
      .delete(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("printed");
  });

  it("rejects a JSON string 'False' status WITHOUT resetting the order", async () => {
    const order = await seedPrintedOrder({ status: "dispatched", trackingNumber: "TESTAWB5555" });
    stubDelhiveryRaw(JSON.stringify({ status: "False", remark: "Cannot cancel manifested shipment" }));

    const res = await request(app)
      .delete(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("Cannot cancel manifested shipment");

    const check = await request(app)
      .get("/api/orders/track")
      .query({ orderNumber: order.orderNumber });
    expect(check.body.status).toBe("dispatched");
    expect(check.body.trackingNumber).toBe("TESTAWB5555");
  });

  it("treats ambiguous JSON (missing status) as failure — never resets on uncertainty", async () => {
    const order = await seedPrintedOrder({ status: "dispatched", trackingNumber: "TESTAWB4444" });
    stubDelhiveryRaw(JSON.stringify({ some: "thing" }));

    const res = await request(app)
      .delete(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(502);

    const check = await request(app)
      .get("/api/orders/track")
      .query({ orderNumber: order.orderNumber });
    expect(check.body.status).toBe("dispatched");
    expect(check.body.trackingNumber).toBe("TESTAWB4444");
  });

  it("parses XML with attributes and CDATA-wrapped values", async () => {
    const order = await seedPrintedOrder({ status: "dispatched", trackingNumber: "TESTAWB3333" });
    stubDelhiveryRaw(
      `<root><status type="bool"><![CDATA[True]]></status><remark><![CDATA[Shipment has been cancelled.]]></remark></root>`,
    );

    const res = await request(app)
      .delete(`/api/orders/${order.id}/dispatch`)
      .set("Authorization", AUTH());

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("printed");
  });
});
