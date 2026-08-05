import { describe, it, expect } from "vitest";
import { UpdateOperatorBody } from "@workspace/api-zod";

/**
 * Validation contract for the admin "edit operator" endpoint
 * (PATCH /admin/operators/:id). Pure schema tests — no DB needed, so they
 * run cleanly even where the dev box cannot reach the Hostinger MySQL.
 */

const valid = {
  name: "Amit Saha",
  email: "amit@shop.in",
  phone: "9830012345",
  shopName: "Saha Prints",
  address: "College Para, Siliguri",
  state: "West Bengal",
  district: "Darjeeling",
  pincode: "734001",
  status: "active",
  walletBalance: 1250.5,
};

describe("UpdateOperatorBody (admin edit-operator validation)", () => {
  it("accepts a complete valid payload", () => {
    expect(UpdateOperatorBody.safeParse(valid).success).toBe(true);
  });

  it("accepts Bengali names and addresses", () => {
    const bengali = { ...valid, name: "অমিত সাহা", address: "কলেজ পাড়া, শিলিগুড়ি" };
    expect(UpdateOperatorBody.safeParse(bengali).success).toBe(true);
  });

  it("accepts a zero wallet balance and every valid status", () => {
    for (const status of ["pending", "active", "suspended"]) {
      expect(UpdateOperatorBody.safeParse({ ...valid, status, walletBalance: 0 }).success).toBe(true);
    }
  });

  it.each([
    ["a malformed email", { email: "not-an-email" }],
    ["a 1-character name", { name: "A" }],
    ["a phone not starting 6-9", { phone: "1234567890" }],
    ["a too-short phone", { phone: "98300" }],
    ["a phone with letters", { phone: "98300abc45" }],
    ["a PIN code starting 0", { pincode: "034001" }],
    ["a too-short PIN code", { pincode: "7340" }],
    ["an unknown status", { status: "banned" }],
    ["a negative wallet balance", { walletBalance: -5 }],
    ["a wallet balance above the cap", { walletBalance: 10_000_000 }],
    ["a too-short address", { address: "abc" }],
    ["a too-short shop name", { shopName: "X" }],
  ])("rejects %s", (_label, patch) => {
    expect(UpdateOperatorBody.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it("rejects a payload with a missing field", () => {
    const { email: _email, ...rest } = valid;
    expect(UpdateOperatorBody.safeParse(rest).success).toBe(false);
  });

  it("never carries password material", () => {
    // Even if a client sneaks passwordHash into the body, the parsed result
    // must not include it — the schema only passes through known fields.
    const parsed = UpdateOperatorBody.safeParse({ ...valid, passwordHash: "sneaky", password: "sneaky" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect("passwordHash" in parsed.data).toBe(false);
      expect("password" in parsed.data).toBe(false);
    }
  });
});
