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

  return {
    db: {
      insert: insertFn,
      select: selectFn,
    },
    ordersTable: {},
    FamilyCardsSchema: {
      safeParse: (v: unknown) => ({ success: true, data: v ?? [] }),
    },
    ALLOWED_CARD_TYPES: ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II"],
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
