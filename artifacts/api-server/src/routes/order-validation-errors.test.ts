// POST /api/orders must tell the customer exactly which field is wrong when
// the Zod CreateOrderBody validation rejects the form, and unexpected server
// errors must be a 500 — never the old generic 400 "Invalid order data".
import { describe, it, expect } from "vitest";
import { CreateOrderBody } from "@workspace/api-zod";
import { formatOrderValidationError } from "./orders";

function issuesFor(body: Record<string, unknown>) {
  const result = CreateOrderBody.safeParse(body);
  expect(result.success).toBe(false);
  return result.success ? null! : result.error;
}

const validBody = {
  customerName: "Asha Devi",
  customerPhone: "9876543210",
  rationCardNumber: "WB1234567890",
  address: "12 Lake Road",
  state: "West Bengal",
  district: "Howrah",
  pincode: "711101",
  cardType: "AAY",
  quantity: 1,
  amount: 250,
};

describe("order validation error messages", () => {
  it("bad phone number → 'Phone number must be exactly 10 digits'", () => {
    const err = issuesFor({ ...validBody, customerPhone: "12345" });
    expect(formatOrderValidationError(err)).toContain("Phone number must be exactly 10 digits");
  });

  it("bad pincode → 'PIN code must be exactly 6 digits'", () => {
    const err = issuesFor({ ...validBody, pincode: "71110" });
    expect(formatOrderValidationError(err)).toContain("PIN code must be exactly 6 digits");
  });

  it("missing field → '<Label> is required'", () => {
    const { customerName: _drop, ...rest } = validBody;
    const err = issuesFor(rest);
    expect(formatOrderValidationError(err)).toContain("Name is required");
  });

  it("empty required string → '<Label> is required'", () => {
    const err = issuesFor({ ...validBody, address: "" });
    expect(formatOrderValidationError(err)).toContain("Address is required");
  });

  it("wrong type → '<Label> has an invalid value'", () => {
    const err = issuesFor({ ...validBody, quantity: "one" });
    expect(formatOrderValidationError(err)).toContain("Quantity has an invalid value");
  });

  it("multiple problems are joined, capped at 3", () => {
    const err = issuesFor({ ...validBody, customerPhone: "x", pincode: "y", customerName: "", address: "", district: "" });
    const msg = formatOrderValidationError(err);
    expect(msg.split(";").length).toBeLessThanOrEqual(3);
    expect(msg.length).toBeGreaterThan(0);
  });
});
