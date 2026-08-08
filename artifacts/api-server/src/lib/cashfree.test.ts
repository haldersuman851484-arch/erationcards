import { describe, it, expect } from "vitest";
import {
  getCashfreeConfig,
  mapCashfreeOrderStatus,
  computeCashfreeSignature,
  verifyCashfreeWebhookSignature,
  cfOrderIdToOrderNumber,
  isOrderAlreadyExistsError,
  evaluateWebhookSuccess,
  CashfreeApiError,
} from "./cashfree";

// Pure-function tests — no DB, no network. The integration behavior
// (session route, webhook route) is covered by the route handlers; these
// lock down the config inference and crypto that everything rests on.

function env(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return overrides as NodeJS.ProcessEnv;
}

describe("getCashfreeConfig", () => {
  it("is unconfigured when keys are missing", () => {
    const cfg = getCashfreeConfig(env({}));
    expect(cfg.configured).toBe(false);
    if (!cfg.configured) expect(cfg.reason).toMatch(/not set/i);
  });

  it("infers sandbox from a TEST-prefixed app id when CASHFREE_ENV is unset", () => {
    const cfg = getCashfreeConfig(
      env({ CASHFREE_APP_ID: "TEST12345", CASHFREE_SECRET_KEY: "cfsk_test_x" }),
    );
    expect(cfg).toMatchObject({
      configured: true,
      mode: "sandbox",
      baseUrl: "https://sandbox.cashfree.com/pg",
    });
  });

  it("REFUSES production-looking keys when CASHFREE_ENV is unset", () => {
    const cfg = getCashfreeConfig(
      env({ CASHFREE_APP_ID: "9871234abcd", CASHFREE_SECRET_KEY: "cfsk_prod_x" }),
    );
    expect(cfg.configured).toBe(false);
    if (!cfg.configured) expect(cfg.reason).toMatch(/production/i);
  });

  it("uses production only when CASHFREE_ENV=production", () => {
    const cfg = getCashfreeConfig(
      env({
        CASHFREE_APP_ID: "9871234abcd",
        CASHFREE_SECRET_KEY: "cfsk_prod_x",
        CASHFREE_ENV: "production",
      }),
    );
    expect(cfg).toMatchObject({
      configured: true,
      mode: "production",
      baseUrl: "https://api.cashfree.com/pg",
    });
  });

  it("CASHFREE_ENV=sandbox forces sandbox even with production-looking keys", () => {
    const cfg = getCashfreeConfig(
      env({
        CASHFREE_APP_ID: "9871234abcd",
        CASHFREE_SECRET_KEY: "cfsk_prod_x",
        CASHFREE_ENV: "sandbox",
      }),
    );
    expect(cfg).toMatchObject({ configured: true, mode: "sandbox" });
  });

  it("rejects an unknown CASHFREE_ENV value instead of guessing", () => {
    const cfg = getCashfreeConfig(
      env({
        CASHFREE_APP_ID: "TEST1",
        CASHFREE_SECRET_KEY: "x",
        CASHFREE_ENV: "live",
      }),
    );
    expect(cfg.configured).toBe(false);
    if (!cfg.configured) expect(cfg.reason).toContain("live");
  });
});

describe("mapCashfreeOrderStatus", () => {
  it("maps terminal gateway states onto our enum", () => {
    expect(mapCashfreeOrderStatus("PAID")).toBe("paid");
    expect(mapCashfreeOrderStatus("EXPIRED")).toBe("failed");
    expect(mapCashfreeOrderStatus("TERMINATED")).toBe("failed");
  });

  it("returns null (no change) for non-terminal or unknown states", () => {
    expect(mapCashfreeOrderStatus("ACTIVE")).toBeNull();
    expect(mapCashfreeOrderStatus("TERMINATION_REQUESTED")).toBeNull();
    expect(mapCashfreeOrderStatus("SOMETHING_NEW")).toBeNull();
  });
});

describe("webhook signature", () => {
  const secret = "test-secret-key";
  const body = Buffer.from(JSON.stringify({ data: { order: { order_id: "PVC1-R1" } } }));
  const ts = "1754640000";

  it("round-trips: a signature we compute verifies", () => {
    const sig = computeCashfreeSignature(body, ts, secret);
    expect(verifyCashfreeWebhookSignature(body, sig, ts, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = computeCashfreeSignature(body, ts, secret);
    const tampered = Buffer.from(body.toString("utf8").replace("PVC1", "PVC2"));
    expect(verifyCashfreeWebhookSignature(tampered, sig, ts, secret)).toBe(false);
  });

  it("rejects a shifted timestamp", () => {
    const sig = computeCashfreeSignature(body, ts, secret);
    expect(verifyCashfreeWebhookSignature(body, sig, "1754640001", secret)).toBe(false);
  });

  it("rejects empty signature or timestamp", () => {
    const sig = computeCashfreeSignature(body, ts, secret);
    expect(verifyCashfreeWebhookSignature(body, "", ts, secret)).toBe(false);
    expect(verifyCashfreeWebhookSignature(body, sig, "", secret)).toBe(false);
  });

  it("rejects a signature of a different length without throwing", () => {
    expect(verifyCashfreeWebhookSignature(body, "short", ts, secret)).toBe(false);
  });

  it("accepts string bodies identically to buffers", () => {
    const sig = computeCashfreeSignature(body.toString("utf8"), ts, secret);
    expect(verifyCashfreeWebhookSignature(body, sig, ts, secret)).toBe(true);
  });
});

describe("cfOrderIdToOrderNumber", () => {
  it("strips a retry suffix", () => {
    expect(cfOrderIdToOrderNumber("PVC20260808001-R2")).toBe("PVC20260808001");
  });

  it("leaves an unsuffixed id alone", () => {
    expect(cfOrderIdToOrderNumber("PVC20260808001")).toBe("PVC20260808001");
  });

  it("only strips the trailing suffix", () => {
    expect(cfOrderIdToOrderNumber("PVC1-R1-R2")).toBe("PVC1-R1");
  });
});

describe("isOrderAlreadyExistsError", () => {
  it("matches by code or 409 status", () => {
    expect(
      isOrderAlreadyExistsError(new CashfreeApiError(400, "order_already_exists", "dup")),
    ).toBe(true);
    expect(isOrderAlreadyExistsError(new CashfreeApiError(409, null, "conflict"))).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isOrderAlreadyExistsError(new CashfreeApiError(400, "bad_request", "x"))).toBe(false);
    expect(isOrderAlreadyExistsError(new Error("nope"))).toBe(false);
  });
});

describe("evaluateWebhookSuccess", () => {
  const base = {
    payloadCfOrderId: "PVC1-R2",
    payloadAmount: 149,
    recordedCfOrderId: "PVC1-R2",
    orderAmount: "149",
  };

  it("accepts a success bound to the current attempt with a matching amount", () => {
    expect(evaluateWebhookSuccess(base)).toEqual({ accept: true });
    expect(evaluateWebhookSuccess({ ...base, payloadAmount: 149.0, orderAmount: 149 })).toEqual({
      accept: true,
    });
  });

  it("rejects a success for a stale or different payment attempt", () => {
    expect(
      evaluateWebhookSuccess({ ...base, recordedCfOrderId: "PVC1-R3" }).accept,
    ).toBe(false);
    expect(
      evaluateWebhookSuccess({ ...base, payloadCfOrderId: "PVC1" }).accept,
    ).toBe(false);
  });

  it("rejects when no attempt was ever recorded", () => {
    const r = evaluateWebhookSuccess({ ...base, recordedCfOrderId: null });
    expect(r).toEqual({ accept: false, reason: "attempt-mismatch" });
  });

  it("rejects a tampered or wrong amount", () => {
    expect(evaluateWebhookSuccess({ ...base, payloadAmount: 1 })).toEqual({
      accept: false,
      reason: "amount-mismatch",
    });
    expect(evaluateWebhookSuccess({ ...base, payloadAmount: 148.5 })).toEqual({
      accept: false,
      reason: "amount-mismatch",
    });
  });

  it("rejects a missing or non-numeric amount instead of guessing", () => {
    expect(evaluateWebhookSuccess({ ...base, payloadAmount: undefined })).toEqual({
      accept: false,
      reason: "amount-missing",
    });
    expect(evaluateWebhookSuccess({ ...base, payloadAmount: "not-a-number" })).toEqual({
      accept: false,
      reason: "amount-missing",
    });
  });

  it("tolerates paise-level float noise only", () => {
    expect(evaluateWebhookSuccess({ ...base, payloadAmount: 149.004 })).toEqual({ accept: true });
    expect(evaluateWebhookSuccess({ ...base, payloadAmount: 149.02 }).accept).toBe(false);
  });
});
