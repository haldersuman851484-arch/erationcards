/**
 * Regression tests for task: two customers ordering at the same moment must
 * both succeed.
 *
 * The old generateOrderNumber() was Date.now().slice(-10), so two orders in
 * the same millisecond drew the same number and the second insert died on the
 * unique constraint (customer saw "Invalid order data"). Now the number is
 * 7 timestamp digits + 3 random digits, and POST /orders retries with a
 * fresh number if the unique constraint still fires.
 *
 * Runs against the real MySQL database:
 *   MYSQL_DATABASE_URL=... pnpm --filter @workspace/api-server test
 */
import { describe, it, expect, afterAll, vi } from "vitest";
import request from "supertest";
import { db, ordersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

// Mockable seam for the retry test: the route module captures the mocked
// generateOrderNumber at import time via vi.mock below.
vi.mock("../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/auth")>();
  return {
    ...actual,
    generateOrderNumber: vi.fn(actual.generateOrderNumber),
  };
});

import { generateOrderNumber } from "../lib/auth";
import app from "../app";
import { isDuplicateKeyError } from "./orders";

const createdOrderNumbers: string[] = [];

afterAll(async () => {
  if (createdOrderNumbers.length > 0) {
    await db.delete(ordersTable).where(inArray(ordersTable.orderNumber, createdOrderNumbers));
  }
});

function orderBody(i: number) {
  return {
    customerName: `Collision Test ${i}`,
    customerPhone: `9${String(700000000 + i)}`,
    rationCardNumber: `COLL${String(i).padStart(6, "0")}`,
    address: `${i} Collision Lane`,
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700001",
    cardType: "PHH",
    familyCards: [],
    quantity: 1,
    amount: 0,
    paymentStatus: "pending",
    paymentMethod: "upi",
    paymentScreenshotUrl: "/api/uploads/collision-test.jpg",
  };
}

describe("generateOrderNumber", () => {
  it("is 10 digits, digits-only (customer-friendly for phone support)", () => {
    const n = generateOrderNumber();
    expect(n).toMatch(/^\d{10}$/);
  });

  it("same-millisecond draws are no longer deterministic duplicates", () => {
    // Old scheme: every draw within one millisecond returned the SAME number,
    // so a tight burst produced exactly one unique value per millisecond.
    // New scheme: the 3 random digits give up to 1000 distinct values per ms.
    // Birthday coincidences within a millisecond are still possible (the
    // DB-level retry below absorbs them), so assert the structural property:
    // far more unique numbers than distinct millisecond time-parts, and a low
    // overall duplicate rate.
    const numbers = Array.from({ length: 2000 }, () => generateOrderNumber());
    const unique = new Set(numbers);
    const distinctTimeParts = new Set(numbers.map((n) => n.slice(0, 7)));
    expect(unique.size).toBeGreaterThan(distinctTimeParts.size * 5);
    const duplicateRate = (numbers.length - unique.size) / numbers.length;
    expect(duplicateRate).toBeLessThan(0.3);
  });
});

describe("isDuplicateKeyError", () => {
  it("recognizes MySQL ER_DUP_ENTRY by code, errno, and nested cause", () => {
    expect(isDuplicateKeyError(Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" }))).toBe(true);
    expect(isDuplicateKeyError(Object.assign(new Error("dup"), { errno: 1062 }))).toBe(true);
    expect(
      isDuplicateKeyError(new Error("wrapped", { cause: Object.assign(new Error("dup"), { errno: 1062 }) })),
    ).toBe(true);
    expect(isDuplicateKeyError(new Error("something else"))).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
  });
});

describe("POST /orders under concurrency", () => {
  it("accepts many simultaneous orders with zero failures and unique order numbers", async () => {
    const N = 30;
    const responses = await Promise.all(
      Array.from({ length: N }, (_, i) => request(app).post("/api/orders").send(orderBody(i))),
    );

    const failures = responses.filter((r) => r.status !== 201);
    expect(failures.map((r) => ({ status: r.status, body: r.body }))).toEqual([]);

    const numbers = responses.map((r) => r.body.orderNumber as string);
    createdOrderNumbers.push(...numbers);
    expect(new Set(numbers).size).toBe(N);
    for (const n of numbers) expect(n).toMatch(/^\d{10}$/);
  }, 30_000);

  it("retries with a fresh number when the insert hits a duplicate (belt-and-braces)", async () => {
    // Create a first order normally, then force the generator to return that
    // same (now taken) number on the next draw. The route must retry with a
    // fresh number and still answer 201 — never the old 400 "Invalid order data".
    const first = await request(app).post("/api/orders").send(orderBody(9001));
    expect(first.status).toBe(201);
    const takenNumber = first.body.orderNumber as string;
    createdOrderNumbers.push(takenNumber);

    const mocked = vi.mocked(generateOrderNumber);
    mocked.mockImplementationOnce(() => takenNumber);

    const second = await request(app).post("/api/orders").send(orderBody(9002));
    expect(second.status).toBe(201);
    expect(second.body.orderNumber).not.toBe(takenNumber);
    createdOrderNumbers.push(second.body.orderNumber);
  }, 30_000);
});
