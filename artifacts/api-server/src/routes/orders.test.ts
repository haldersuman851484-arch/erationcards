import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ── DB mock must be declared before any import that pulls in @workspace/db ──
// vi.mock is hoisted to the top of the compiled module by vitest's transformer,
// so the factory runs before app.ts is evaluated.
vi.mock("@workspace/db", () => {
  const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
  const insertFn = vi.fn(() => insertChain);

  const fakeOrder = {
    id: 1,
    orderNumber: "TEST000001",
    customerName: "Test Customer",
    customerPhone: "9999999999",
    customerEmail: null,
    rationCardNumber: "RC12345",
    deliveryName: null,
    address: "123 Main St",
    postOffice: null,
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700001",
    cardType: "PHH",
    familyCards: [],
    rationCardPdfs: [],
    quantity: 1,
    amount: "70.00",
    paymentStatus: "pending",
    paymentMethod: "upi",
    paymentScreenshotUrl: "https://example.com/screenshot.jpg",
    status: "pending",
    operatorId: null,
    trackingNumber: null,
    courierName: null,
    notes: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([fakeOrder]),
  };
  const selectFn = vi.fn(() => selectChain);

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  const updateFn = vi.fn(() => updateChain);

  return {
    db: {
      insert: insertFn,
      select: selectFn,
      update: updateFn,
    },
    ordersTable: {},
    // settings lookups (pricing matrix) go through the same select chain;
    // the fake row has no `value`, so getPricingMatrix falls back to defaults.
    settingsTable: { key: {}, value: {} },
    FamilyCardsSchema: {
      safeParse: (v: unknown) => ({ success: true, data: v ?? [] }),
    },
    ALLOWED_CARD_TYPES: ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II", "ABHA", "E-SHRAM", "GENERAL"],
  };
});

// Set required env vars before app is loaded
process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "test-password";

// Import app after mocks are set up
const { default: app } = await import("../app.js");

// ── Minimal valid order payload (all required fields per CreateOrderBody) ──
// quantity and amount are required by the Zod schema even though the server
// recalculates them — omitting them causes a parse error before the guard runs.
const VALID_PAYLOAD = {
  customerName: "Test Customer",
  customerPhone: "9999999999",
  rationCardNumber: "RC12345",
  address: "123 Main St",
  state: "West Bengal",
  district: "Kolkata",
  pincode: "700001",
  cardType: "PHH",
  quantity: 1,
  amount: 70,
  paymentScreenshotUrl: "https://example.com/screenshot.jpg",
};

const TEST_SECRET = "test-secret-for-unit-tests";

function makeOperatorToken(operatorId = 99): string {
  return jwt.sign({ operatorId }, TEST_SECRET, { expiresIn: "1h" });
}

function makeAdminToken(email = "admin@test.com", role = "admin"): string {
  return jwt.sign({ email, role }, TEST_SECRET, { expiresIn: "1h" });
}

describe("POST /api/orders/:id/dispatch — authorization", () => {
  it("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).post("/api/orders/1/dispatch");
    expect(res.status).toBe(401);
  });

  it("returns 401 when an operator token is used (privilege escalation blocked)", async () => {
    const res = await request(app)
      .post("/api/orders/1/dispatch")
      .set("Authorization", `Bearer ${makeOperatorToken()}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 when a JWT has role != admin (e.g. role=operator)", async () => {
    const badRoleToken = jwt.sign({ email: "op@test.com", role: "operator" }, TEST_SECRET, { expiresIn: "1h" });
    const res = await request(app)
      .post("/api/orders/1/dispatch")
      .set("Authorization", `Bearer ${badRoleToken}`);
    expect(res.status).toBe(401);
  });

  it("passes auth and reaches business logic when a valid admin token is sent", async () => {
    // fakeOrder has status="pending", so dispatch returns 400 (wrong status) — auth passed
    const res = await request(app)
      .post("/api/orders/1/dispatch")
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    // Must NOT be 401/403 — auth gate is open; business-logic 400 is expected
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/printed/i);
  });
});

describe("POST /api/orders — screenshot guard", () => {
  it("returns 400 with a descriptive error when paymentScreenshotUrl is missing", async () => {
    const { paymentScreenshotUrl: _omitted, ...payloadWithoutScreenshot } = VALID_PAYLOAD;

    const res = await request(app)
      .post("/api/orders")
      .send(payloadWithoutScreenshot)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: expect.stringContaining("Payment screenshot is required"),
    });
  });

  it("returns 400 with a descriptive error when paymentScreenshotUrl is an empty string", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ ...VALID_PAYLOAD, paymentScreenshotUrl: "   " })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: expect.stringContaining("Payment screenshot is required"),
    });
  });

  it("returns 201 when a valid payload including a screenshot URL is submitted", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(VALID_PAYLOAD)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      orderNumber: expect.any(String),
      customerName: "Test Customer",
      paymentScreenshotUrl: expect.any(String),
    });
  });
});

describe("POST /api/orders — server-side group pricing (client amount ignored)", () => {
  /** The amount the route passed to db.insert(...).values(...) for the most recent POST. */
  async function lastInsertedAmount(): Promise<string> {
    const { db } = await import("@workspace/db");
    // The mock's insert() always returns the same chain object, so calling it
    // here hands us the shared `values` spy without touching real code paths.
    const insertMock = db.insert as unknown as (
      table: unknown,
    ) => { values: { mock: { calls: Array<[{ amount: string }]> } } };
    const lastCall = insertMock({}).values.mock.calls.at(-1);
    if (!lastCall) throw new Error("no insert call captured");
    return lastCall[0].amount;
  }

  it("public mixed order (1 PHH + 1 ABHA) stores ₹125 — 50 + 75, tier from total count", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        ...VALID_PAYLOAD,
        cardType: "PHH",
        familyCards: [{ customerName: "Family Member", rationCardNumber: "RC99999", cardType: "ABHA" }],
        amount: 1, // deliberately wrong — server must ignore it
      })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(await lastInsertedAmount()).toBe("125");
  });

  it("operator single ABHA stores ₹85 (operator special single rate)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ ...VALID_PAYLOAD, cardType: "ABHA", amount: 1 })
      .set("Authorization", `Bearer ${makeOperatorToken()}`)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(await lastInsertedAmount()).toBe("85");
  });

  it("operator 2 E-SHRAM stores ₹140 (2 × 70 operator special multi rate)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        ...VALID_PAYLOAD,
        cardType: "E-SHRAM",
        familyCards: [{ customerName: "Family Member", rationCardNumber: "RC88888", cardType: "E-SHRAM" }],
        amount: 1,
      })
      .set("Authorization", `Bearer ${makeOperatorToken()}`)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(await lastInsertedAmount()).toBe("140");
  });

  it("public 2-ration order still stores ₹100 (regression: 2 × 50)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        ...VALID_PAYLOAD,
        cardType: "PHH",
        familyCards: [{ customerName: "Family Member", rationCardNumber: "RC77777", cardType: "PHH" }],
        amount: 1,
      })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(await lastInsertedAmount()).toBe("100");
  });
});

describe("PATCH /api/orders/:id — admin only (operators cannot modify status)", () => {
  it("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).patch("/api/orders/1").send({ status: "processing" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for an operator token — rejected before any order lookup, so even the assigned operator is blocked", async () => {
    const res = await request(app)
      .patch("/api/orders/1")
      .send({ status: "processing" })
      .set("Authorization", `Bearer ${makeOperatorToken()}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a JWT with role != admin (privilege escalation blocked)", async () => {
    const badRoleToken = jwt.sign({ email: "op@test.com", role: "operator" }, TEST_SECRET, { expiresIn: "1h" });
    const res = await request(app)
      .patch("/api/orders/1")
      .send({ status: "processing" })
      .set("Authorization", `Bearer ${badRoleToken}`);
    expect(res.status).toBe(401);
  });

  it("still lets an admin update an order (200 with the order body)", async () => {
    const res = await request(app)
      .patch("/api/orders/1")
      .send({ status: "processing" })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ orderNumber: "TEST000001" });
  });
});

describe("PATCH /api/orders/:id/customer-info — admin corrects customer details", () => {
  const VALID_CUSTOMER_INFO = {
    customerName: "Corrected Name",
    customerPhone: "9876543210",
    address: "45 New Street",
    postOffice: "Baruipur",
    district: "South 24 Parganas",
    pincode: "743329",
    state: "West Bengal",
  };

  /** The payload the route passed to db.update(...).set(...) most recently. */
  async function lastUpdatePayload(): Promise<Record<string, unknown>> {
    const { db } = await import("@workspace/db");
    const updateMock = db.update as unknown as (
      table: unknown,
    ) => { set: { mock: { calls: Array<[Record<string, unknown>]> } } };
    const lastCall = updateMock({}).set.mock.calls.at(-1);
    if (!lastCall) throw new Error("no update call captured");
    return lastCall[0];
  }

  it("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app)
      .patch("/api/orders/1/customer-info")
      .send(VALID_CUSTOMER_INFO);
    expect(res.status).toBe(401);
  });

  it("returns 401 for an operator token (couriers use admin auth; operators are blocked)", async () => {
    const res = await request(app)
      .patch("/api/orders/1/customer-info")
      .send(VALID_CUSTOMER_INFO)
      .set("Authorization", `Bearer ${makeOperatorToken()}`);
    expect(res.status).toBe(401);
  });

  it("lets an admin update customer details (200) and writes the corrected values", async () => {
    const res = await request(app)
      .patch("/api/orders/1/customer-info")
      .send(VALID_CUSTOMER_INFO)
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ orderNumber: "TEST000001" });
    const payload = await lastUpdatePayload();
    expect(payload.customerName).toBe("Corrected Name");
    expect(payload.customerPhone).toBe("9876543210");
    expect(payload.address).toBe("45 New Street");
    expect(payload.pincode).toBe("743329");
  });

  it("rejects a mobile number that is not exactly 10 digits", async () => {
    const res = await request(app)
      .patch("/api/orders/1/customer-info")
      .send({ ...VALID_CUSTOMER_INFO, customerPhone: "12345" })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/10 digits/);
  });

  it("rejects a PIN code that is not exactly 6 digits", async () => {
    const res = await request(app)
      .patch("/api/orders/1/customer-info")
      .send({ ...VALID_CUSTOMER_INFO, pincode: "74332" })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 digits/);
  });

  it("rejects a whitespace-only customer name (trimmed before validation)", async () => {
    const res = await request(app)
      .patch("/api/orders/1/customer-info")
      .send({ ...VALID_CUSTOMER_INFO, customerName: "   " })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be empty/i);
  });

  it("ignores non-whitelisted fields — status/payment/tracking cannot be smuggled in", async () => {
    const res = await request(app)
      .patch("/api/orders/1/customer-info")
      .send({
        ...VALID_CUSTOMER_INFO,
        status: "delivered",
        paymentStatus: "confirmed",
        trackingNumber: "HACK123",
        amount: 1,
      })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(200);
    const payload = await lastUpdatePayload();
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("paymentStatus");
    expect(payload).not.toHaveProperty("trackingNumber");
    expect(payload).not.toHaveProperty("amount");
  });

  it("stores an empty post office as null (field is optional)", async () => {
    const res = await request(app)
      .patch("/api/orders/1/customer-info")
      .send({ ...VALID_CUSTOMER_INFO, postOffice: "   " })
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(200);
    const payload = await lastUpdatePayload();
    expect(payload.postOffice).toBeNull();
  });

  it("returns 404 when the order does not exist", async () => {
    const { db } = await import("@workspace/db");
    const selectChain = (db.select as unknown as () => { limit: { mockResolvedValueOnce: (v: unknown[]) => void } })();
    selectChain.limit.mockResolvedValueOnce([]);
    const res = await request(app)
      .patch("/api/orders/999/customer-info")
      .send(VALID_CUSTOMER_INFO)
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(404);
  });
});
