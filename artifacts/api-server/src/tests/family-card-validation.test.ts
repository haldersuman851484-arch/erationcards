/**
 * Unit tests for familyCards validation on POST /api/orders.
 *
 * Moved from the portal Playwright suite (tests/family-card-validation.spec.ts),
 * which called the real API server and therefore depended on a running
 * database. Here the DB client is mocked but the REAL Zod schemas
 * (FamilyCardsSchema, ALLOWED_CARD_TYPES) from @workspace/db/schema are used,
 * so the validation gate itself is exercised end-to-end at the route level.
 */
import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Mock only the DB client; keep the real schemas/zod validators.
vi.mock("@workspace/db", async () => {
  const schema = await vi.importActual<Record<string, unknown>>(
    "@workspace/db/schema",
  );

  const insertChain = { values: vi.fn().mockResolvedValue(undefined) };

  const fakeOrderRow = {
    id: 1,
    orderNumber: "TEST000001",
    customerName: "Rajesh Kumar",
    customerPhone: "9876543210",
    customerEmail: null,
    rationCardNumber: "WB01234567890",
    deliveryName: null,
    address: "12 Park Street",
    postOffice: null,
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700001",
    cardType: "AAY",
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
    limit: vi.fn().mockResolvedValue([fakeOrderRow]),
  };

  return {
    ...schema,
    db: {
      insert: vi.fn(() => insertChain),
      select: vi.fn(() => selectChain),
    },
  };
});

process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "test-password";

const { default: app } = await import("../app.js");

/** Minimal valid order body. quantity/amount are required by CreateOrderBody. */
function validOrderBody(overrides: Record<string, unknown> = {}) {
  return {
    customerName: "Rajesh Kumar",
    customerPhone: "9876543210",
    rationCardNumber: "WB01234567890",
    address: "12 Park Street",
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700001",
    cardType: "AAY",
    quantity: 1,
    amount: 70,
    paymentMethod: "upi",
    paymentScreenshotUrl: "https://example.com/screenshot.jpg",
    ...overrides,
  };
}

describe("POST /api/orders — familyCards validation", () => {
  // ── Happy paths ──────────────────────────────────────────────────────────

  it("accepts a valid order with no family cards (quantity 1)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(validOrderBody({ familyCards: [] }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      cardType: "AAY",
      quantity: 1,
    });
  });

  it("accepts a valid order with one well-formed family card", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(
        validOrderBody({
          familyCards: [
            {
              customerName: "Priya Kumar",
              rationCardNumber: "WB09876543210",
              cardType: "PHH",
            },
          ],
          quantity: 2,
          amount: 100,
        }),
      );
    expect(res.status).toBe(201);
  });

  // ── Rejection cases ──────────────────────────────────────────────────────

  it("rejects familyCards entry with customerName shorter than 2 characters", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(
        validOrderBody({
          familyCards: [
            {
              customerName: "X", // too short (< 2 chars)
              rationCardNumber: "WB09876543210",
              cardType: "AAY",
            },
          ],
          quantity: 2,
          amount: 100,
        }),
      );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid familyCards");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("rejects familyCards entry with rationCardNumber shorter than 5 characters", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(
        validOrderBody({
          familyCards: [
            {
              customerName: "Priya Kumar",
              rationCardNumber: "WB0", // too short (< 5 chars)
              cardType: "AAY",
            },
          ],
          quantity: 2,
          amount: 100,
        }),
      );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid familyCards");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("rejects familyCards entry with an invalid cardType", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(
        validOrderBody({
          familyCards: [
            {
              customerName: "Priya Kumar",
              rationCardNumber: "WB09876543210",
              cardType: "INVALID_TYPE", // not in ALLOWED_CARD_TYPES
            },
          ],
          quantity: 2,
          amount: 100,
        }),
      );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid familyCards");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("rejects familyCards with multiple invalid entries and reports all issues", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(
        validOrderBody({
          familyCards: [
            {
              customerName: "A", // too short
              rationCardNumber: "WB0", // too short
              cardType: "BAD", // invalid
            },
            {
              customerName: "Valid Name",
              rationCardNumber: "WB09876543210",
              cardType: "PHH",
            },
          ],
          quantity: 3,
          amount: 150,
        }),
      );
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid familyCards");
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it("rejects order when top-level cardType is not in the allowed list", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send(validOrderBody({ cardType: "INVALID_CARD_TYPE" }));
    expect(res.status).toBe(400);
    // This error comes from the explicit cardType check, not FamilyCardsSchema
    expect(typeof res.body.error).toBe("string");
    expect(res.body.error).toMatch(/Invalid card category/i);
  });
});
