import { describe, it, expect } from "vitest";
import {
  ALLOWED_CARD_TYPES,
  computeOrderAmount,
  perCardPrice,
  priceBreakdown,
} from "@workspace/pricing";

// These are the exact pricing rules the business runs on — see
// lib/pricing/src/index.ts. POST /orders uses computeOrderAmount directly,
// so these tests pin the amounts customers are charged.

describe("shared pricing — card types", () => {
  it("includes the 5 ration categories and the 3 special products", () => {
    expect([...ALLOWED_CARD_TYPES]).toEqual([
      "AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II", "ABHA", "E-SHRAM", "GENERAL",
      "AYUSHMAN BHARAT", "AADHAAR", "VOTER ID", "PAN", "APAAR ID",
      "DRIVING LICENCE", "BJP MEMBERSHIP CARD", "CUSTOM ID CARD",
    ]);
  });
});

describe("computeOrderAmount — public orders", () => {
  it("single ration card is ₹70", () => {
    expect(computeOrderAmount(["PHH"], false)).toBe(70);
  });
  it("multiple ration cards are ₹50 each", () => {
    expect(computeOrderAmount(["PHH", "AAY"], false)).toBe(100);
    expect(computeOrderAmount(["PHH", "AAY", "SPHH"], false)).toBe(150);
  });
  it("single ABHA is ₹100", () => {
    expect(computeOrderAmount(["ABHA"], false)).toBe(100);
  });
  it("two ABHA are ₹75 each = ₹150", () => {
    expect(computeOrderAmount(["ABHA", "ABHA"], false)).toBe(150);
  });
  it("mixed order 1 PHH + 1 ABHA = ₹50 + ₹75 = ₹125", () => {
    expect(computeOrderAmount(["PHH", "ABHA"], false)).toBe(125);
  });
  it("new special types price like ABHA: single AADHAAR ₹100, VOTER ID + PAN ₹75 each", () => {
    expect(computeOrderAmount(["AADHAAR"], false)).toBe(100);
    expect(computeOrderAmount(["VOTER ID", "PAN"], false)).toBe(150);
  });
});

describe("computeOrderAmount — operator orders", () => {
  it("single ration card is ₹70", () => {
    expect(computeOrderAmount(["AAY"], true)).toBe(70);
  });
  it("multiple ration cards are ₹40 each", () => {
    expect(computeOrderAmount(["AAY", "PHH"], true)).toBe(80);
  });
  it("single ABHA is ₹85", () => {
    expect(computeOrderAmount(["ABHA"], true)).toBe(85);
  });
  it("two E-SHRAM are ₹70 each = ₹140", () => {
    expect(computeOrderAmount(["E-SHRAM", "E-SHRAM"], true)).toBe(140);
  });
  it("mixed order 1 RKSY-I + 1 GENERAL = ₹40 + ₹70 = ₹110", () => {
    expect(computeOrderAmount(["RKSY-I", "GENERAL"], true)).toBe(110);
  });
  it("new special types use operator rates: single VOTER ID ₹85, DL + CUSTOM ₹70 each", () => {
    expect(computeOrderAmount(["VOTER ID"], true)).toBe(85);
    expect(computeOrderAmount(["DRIVING LICENCE", "CUSTOM ID CARD"], true)).toBe(140);
  });
});

describe("perCardPrice / priceBreakdown", () => {
  it("unknown legacy card types price as ration cards", () => {
    expect(perCardPrice("LEGACY", 1, false)).toBe(70);
  });
  it("splits a mixed public order into ration + special lines", () => {
    expect(priceBreakdown(["PHH", "ABHA"], false)).toEqual([
      { group: "ration", label: "Ration Card", count: 1, unitPrice: 50, subtotal: 50 },
      { group: "special", label: "Other PVC Cards", count: 1, unitPrice: 75, subtotal: 75 },
    ]);
  });
  it("yields a single line when only one group is present", () => {
    expect(priceBreakdown(["ABHA", "GENERAL"], false)).toEqual([
      { group: "special", label: "Other PVC Cards", count: 2, unitPrice: 75, subtotal: 150 },
    ]);
  });
});
