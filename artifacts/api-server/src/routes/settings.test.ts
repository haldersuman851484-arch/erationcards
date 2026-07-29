import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ── DB mock must be declared before any import that pulls in @workspace/db ──
// (vi.mock is hoisted; factory runs before app.ts is evaluated.)
vi.mock("@workspace/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  const selectFn = vi.fn(() => selectChain);

  const onDuplicateKeyUpdateFn = vi.fn().mockResolvedValue(undefined);
  const valuesFn = vi.fn(() => ({ onDuplicateKeyUpdate: onDuplicateKeyUpdateFn }));
  const insertFn = vi.fn(() => ({ values: valuesFn }));

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  const updateFn = vi.fn(() => updateChain);

  return {
    db: {
      select: selectFn,
      insert: insertFn,
      update: updateFn,
    },
    settingsTable: {},
    ordersTable: {},
    paymentVerificationsTable: {},
    operatorsTable: {},
    FamilyCardsSchema: {
      safeParse: (v: unknown) => ({ success: true, data: v ?? [] }),
    },
    ALLOWED_CARD_TYPES: ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II", "ABHA", "E-SHRAM", "GENERAL"],
  };
});

// Set required env vars before app is loaded.
// MERCHANT_UPI_ID is read at request time — this fake value guarantees the
// tests never depend on (or expose) the real merchant UPI ID.
process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "test-password";
process.env["MERCHANT_UPI_ID"] = "envdefault@okbank";

// Import app after mocks are set up
const { default: app } = await import("../app.js");
const { db } = await import("@workspace/db");

const TEST_SECRET = "test-secret-for-unit-tests";

function makeAdminToken(email = "admin@test.com", role = "admin"): string {
  return jwt.sign({ email, role }, TEST_SECRET, { expiresIn: "1h" });
}

function makeOperatorToken(operatorId = 99): string {
  return jwt.sign({ operatorId }, TEST_SECRET, { expiresIn: "1h" });
}

/** The shared select chain from the mock factory (same object every call). */
function selectChain() {
  return (db as any).select() as { limit: ReturnType<typeof vi.fn> };
}

function upsertMocks() {
  const insertReturn = (db as any).insert() as { values: (...args: unknown[]) => unknown };
  const valuesFn = insertReturn.values as ReturnType<typeof vi.fn>;
  const onDupFn = (insertReturn.values(undefined) as { onDuplicateKeyUpdate: ReturnType<typeof vi.fn> })
    .onDuplicateKeyUpdate;
  return { valuesFn, onDupFn };
}

const SAVED_ROW = { key: "merchant_upi_id", value: "saved@upi", updatedAt: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/payments/upi-config — public payment config", () => {
  it("falls back to the MERCHANT_UPI_ID env var when no setting is saved", async () => {
    const res = await request(app).get("/api/payments/upi-config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ merchantUpiId: "envdefault@okbank" });
  });

  it("returns the admin-saved UPI ID when a setting row exists", async () => {
    selectChain().limit.mockResolvedValueOnce([SAVED_ROW]);
    const res = await request(app).get("/api/payments/upi-config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ merchantUpiId: "saved@upi" });
  });

  it("returns 500 (not a stale fallback) when the settings lookup fails", async () => {
    selectChain().limit.mockRejectedValueOnce(new Error("db down"));
    const res = await request(app).get("/api/payments/upi-config");
    expect(res.status).toBe(500);
  });
});

describe("GET /api/admin/settings/upi — authorization", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/admin/settings/upi");
    expect(res.status).toBe(401);
  });

  it("returns 401 for an operator token", async () => {
    const res = await request(app)
      .get("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeOperatorToken()}`);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/settings/upi — behavior", () => {
  it("reports source=default when nothing is saved", async () => {
    const res = await request(app)
      .get("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ merchantUpiId: "envdefault@okbank", source: "default" });
  });

  it("reports source=custom when an admin-saved row exists", async () => {
    selectChain().limit.mockResolvedValueOnce([SAVED_ROW]);
    const res = await request(app)
      .get("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ merchantUpiId: "saved@upi", source: "custom" });
  });
});

describe("PUT /api/admin/settings/upi — authorization", () => {
  it("returns 401 without a token and does not write", async () => {
    const { onDupFn } = upsertMocks();
    vi.clearAllMocks();
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .send({ merchantUpiId: "newstore@okaxis" });
    expect(res.status).toBe(401);
    expect(onDupFn).not.toHaveBeenCalled();
  });

  it("returns 401 for an operator token", async () => {
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeOperatorToken()}`)
      .send({ merchantUpiId: "newstore@okaxis" });
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/admin/settings/upi — validation", () => {
  it.each([
    ["missing @", "notaupi"],
    ["missing psp", "abc@"],
    ["missing handle", "@okaxis"],
    ["space inside", "ab cd@okaxis"],
    ["handle too short", "a@okaxis"],
    ["psp with symbols", "shop@ok-axis"],
  ])("rejects %s (%s) with 400 and does not write", async (_label, bad) => {
    const { onDupFn } = upsertMocks();
    vi.clearAllMocks();
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .send({ merchantUpiId: bad });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid UPI ID/i);
    expect(onDupFn).not.toHaveBeenCalled();
  });

  it("rejects a missing body with 400", async () => {
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/admin/settings/upi — happy path", () => {
  it("saves a valid UPI ID and reports source=custom", async () => {
    const { valuesFn } = upsertMocks();
    vi.clearAllMocks();
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .send({ merchantUpiId: "newstore@okaxis" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ merchantUpiId: "newstore@okaxis", source: "custom" });
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({ key: "merchant_upi_id", value: "newstore@okaxis" })
    );
  });

  it("trims surrounding whitespace before validating and saving", async () => {
    const { valuesFn } = upsertMocks();
    vi.clearAllMocks();
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .send({ merchantUpiId: "  9876543210@ybl  " });
    expect(res.status).toBe(200);
    expect(res.body.merchantUpiId).toBe("9876543210@ybl");
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({ value: "9876543210@ybl" })
    );
  });
});
