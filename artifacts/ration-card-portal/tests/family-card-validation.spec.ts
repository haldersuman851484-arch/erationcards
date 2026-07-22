/**
 * API-level tests for familyCards validation on POST /api/orders.
 *
 * These tests call the real API server (no mocking) to confirm that:
 *  - malformed familyCards entries are rejected with 400 before any DB write
 *  - valid orders (no family cards, or with properly-shaped family cards) are
 *    accepted with 201
 *
 * Coverage added by Task #37 to prevent regressions on the Zod validation
 * gate introduced in Task #34.
 */
import { test, expect } from "@playwright/test";

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
    ...overrides,
  };
}

test.describe("POST /api/orders — familyCards validation", () => {
  // ── Happy paths ──────────────────────────────────────────────────────────

  test("accepts a valid order with no family cards (quantity 1)", async ({
    request,
  }) => {
    const res = await request.post("/api/orders", {
      data: validOrderBody({ familyCards: [] }),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      customerName: "Rajesh Kumar",
      cardType: "AAY",
      quantity: 1,
    });
  });

  test("accepts a valid order with one well-formed family card", async ({
    request,
  }) => {
    const res = await request.post("/api/orders", {
      data: validOrderBody({
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
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.quantity).toBe(2);
  });

  // ── Rejection cases ──────────────────────────────────────────────────────

  test("rejects familyCards entry with customerName shorter than 2 characters", async ({
    request,
  }) => {
    const res = await request.post("/api/orders", {
      data: validOrderBody({
        familyCards: [
          {
            customerName: "X",                 // too short (< 2 chars)
            rationCardNumber: "WB09876543210",
            cardType: "AAY",
          },
        ],
        quantity: 2,
        amount: 100,
      }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid familyCards");
    expect(Array.isArray(body.details)).toBe(true);
  });

  test("rejects familyCards entry with rationCardNumber shorter than 5 characters", async ({
    request,
  }) => {
    const res = await request.post("/api/orders", {
      data: validOrderBody({
        familyCards: [
          {
            customerName: "Priya Kumar",
            rationCardNumber: "WB0",           // too short (< 5 chars)
            cardType: "AAY",
          },
        ],
        quantity: 2,
        amount: 100,
      }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid familyCards");
    expect(Array.isArray(body.details)).toBe(true);
  });

  test("rejects familyCards entry with an invalid cardType", async ({
    request,
  }) => {
    const res = await request.post("/api/orders", {
      data: validOrderBody({
        familyCards: [
          {
            customerName: "Priya Kumar",
            rationCardNumber: "WB09876543210",
            cardType: "INVALID_TYPE",          // not in ALLOWED_CARD_TYPES
          },
        ],
        quantity: 2,
        amount: 100,
      }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid familyCards");
    expect(Array.isArray(body.details)).toBe(true);
  });

  test("rejects familyCards with multiple invalid entries and reports all issues", async ({
    request,
  }) => {
    const res = await request.post("/api/orders", {
      data: validOrderBody({
        familyCards: [
          {
            customerName: "A",                 // too short
            rationCardNumber: "WB0",           // too short
            cardType: "BAD",                   // invalid
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
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid familyCards");
    // At least the first entry's issues should be present
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  test("rejects order when top-level cardType is not in the allowed list", async ({
    request,
  }) => {
    const res = await request.post("/api/orders", {
      data: validOrderBody({ cardType: "INVALID_CARD_TYPE" }),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    // This error comes from the explicit cardType check, not FamilyCardsSchema
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/Invalid card category/i);
  });
});
