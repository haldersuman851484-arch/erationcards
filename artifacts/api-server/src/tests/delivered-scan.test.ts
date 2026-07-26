import { describe, it, expect } from "vitest";
import { hasDeliveredScan } from "../routes/orders";

const scan = (status: string, activity = "") => ({
  date: "2026-07-26T10:00:00",
  location: "Delhi_Hub",
  status,
  activity,
});

describe("hasDeliveredScan", () => {
  it("matches 'Delivered'", () => {
    expect(hasDeliveredScan([scan("Delivered")])).toBe(true);
  });

  it("matches 'Delivered to consignee'", () => {
    expect(hasDeliveredScan([scan("Delivered to consignee")])).toBe(true);
  });

  it("matches DL status code in activity", () => {
    expect(hasDeliveredScan([scan("Dispatched", "DL")])).toBe(true);
  });

  it("does NOT match 'Undelivered'", () => {
    expect(hasDeliveredScan([scan("Undelivered")])).toBe(false);
  });

  it("does NOT match 'Not delivered'", () => {
    expect(hasDeliveredScan([scan("Not delivered")])).toBe(false);
  });

  it("does NOT match 'Failed delivery'", () => {
    expect(hasDeliveredScan([scan("Failed delivery attempt")])).toBe(false);
  });

  it("does NOT match RTO scans", () => {
    expect(hasDeliveredScan([scan("RTO Delivered")])).toBe(false);
    expect(hasDeliveredScan([scan("Delivered", "RTO - returned to shipper")])).toBe(false);
  });

  it("does NOT match returned scans", () => {
    expect(hasDeliveredScan([scan("Returned to origin")])).toBe(false);
  });

  it("handles empty scan list", () => {
    expect(hasDeliveredScan([])).toBe(false);
  });

  it("finds a delivered scan among mixed scans", () => {
    expect(
      hasDeliveredScan([
        scan("Undelivered"),
        scan("In Transit"),
        scan("Delivered"),
      ])
    ).toBe(true);
  });
});
