import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ── DB mock must be declared before any import that pulls in @workspace/db ──
// (vi.mock is hoisted; factory runs before app.ts is evaluated.)
vi.mock("@workspace/db", () => {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
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
    settingsChangeHistoryTable: {},
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

// Settings endpoints additionally require a two-partner OTP unlock token
// (see settingsOtp.test.ts for the flow that earns one).
const UNLOCK_HEADER = "x-settings-unlock";

function makeUnlockToken(): string {
  return jwt.sign({ scope: "settings_unlock", email: "admin@test.com" }, TEST_SECRET, { expiresIn: "15m" });
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
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, makeUnlockToken());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ merchantUpiId: "envdefault@okbank", source: "default" });
  });

  it("reports source=custom when an admin-saved row exists", async () => {
    selectChain().limit.mockResolvedValueOnce([SAVED_ROW]);
    const res = await request(app)
      .get("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, makeUnlockToken());
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
      .set(UNLOCK_HEADER, makeUnlockToken())
      .send({ merchantUpiId: bad });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid UPI ID/i);
    expect(onDupFn).not.toHaveBeenCalled();
  });

  it("rejects a missing body with 400", async () => {
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, makeUnlockToken())
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
      .set(UNLOCK_HEADER, makeUnlockToken())
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
      .set(UNLOCK_HEADER, makeUnlockToken())
      .send({ merchantUpiId: "  9876543210@ybl  " });
    expect(res.status).toBe(200);
    expect(res.body.merchantUpiId).toBe("9876543210@ybl");
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({ value: "9876543210@ybl" })
    );
  });
});

describe("settings lock — OTP unlock header required", () => {
  it("GET upi returns 403 SETTINGS_LOCKED for an admin without the unlock header", async () => {
    const res = await request(app)
      .get("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SETTINGS_LOCKED");
  });

  it("PUT upi returns 403 without the unlock header and does not write", async () => {
    const { onDupFn } = upsertMocks();
    vi.clearAllMocks();
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .send({ merchantUpiId: "newstore@okaxis" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SETTINGS_LOCKED");
    expect(onDupFn).not.toHaveBeenCalled();
  });

  it("rejects a garbage unlock token", async () => {
    const res = await request(app)
      .get("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, "not-a-jwt");
    expect(res.status).toBe(403);
  });

  it("rejects a well-formed but expired unlock token", async () => {
    const expired = jwt.sign({ scope: "settings_unlock", email: "admin@test.com" }, TEST_SECRET, {
      expiresIn: -3600,
    });
    const res = await request(app)
      .get("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, expired);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SETTINGS_LOCKED");
  });

  it("GET pricing is also locked without the unlock header", async () => {
    const res = await request(app)
      .get("/api/admin/settings/pricing")
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SETTINGS_LOCKED");
  });

  it("PUT pricing is also locked without the unlock header", async () => {
    const res = await request(app)
      .put("/api/admin/settings/pricing")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SETTINGS_LOCKED");
  });
});

// ── Change history (audit trail) ─────────────────────────────────────────────

const VALID_PRICING = {
  ration: { single: { public: 100, operator: 80 }, multi: { public: 90, operator: 70 } },
  special: { single: { public: 120, operator: 100 }, multi: { public: 110, operator: 90 } },
};

describe("settings change history — written on every successful save", () => {
  it("PUT upi writes a history row with the old (env default) and new value", async () => {
    const { valuesFn } = upsertMocks();
    vi.clearAllMocks();
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, makeUnlockToken())
      .send({ merchantUpiId: "newstore@okaxis" });
    expect(res.status).toBe(200);
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        field: "merchant_upi_id",
        oldValue: "envdefault@okbank",
        newValue: "newstore@okaxis",
        changedBy: "admin@test.com",
      })
    );
  });

  it("PUT upi records the previously saved UPI ID as the old value", async () => {
    vi.clearAllMocks();
    // getMerchantUpiId select resolves to the saved row
    selectChain().limit.mockResolvedValueOnce([SAVED_ROW]);
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, makeUnlockToken())
      .send({ merchantUpiId: "changed@okaxis" });
    expect(res.status).toBe(200);
    const { valuesFn } = upsertMocks();
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({ oldValue: "saved@upi", newValue: "changed@okaxis" })
    );
  });

  it("PUT pricing writes a history row with old/new matrices as JSON", async () => {
    const { valuesFn } = upsertMocks();
    vi.clearAllMocks();
    const res = await request(app)
      .put("/api/admin/settings/pricing")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, makeUnlockToken())
      .send({ pricing: VALID_PRICING });
    expect(res.status).toBe(200);
    const historyCall = valuesFn.mock.calls.find((c) => (c[0] as any)?.field === "pricing_matrix");
    expect(historyCall).toBeDefined();
    const row = historyCall![0] as any;
    expect(JSON.parse(row.newValue)).toEqual(VALID_PRICING);
    expect(JSON.parse(row.oldValue)).toHaveProperty("ration");
    expect(row.changedBy).toBe("admin@test.com");
  });

  it("a rejected UPI ID writes no history row", async () => {
    const { valuesFn } = upsertMocks();
    vi.clearAllMocks();
    const res = await request(app)
      .put("/api/admin/settings/upi")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, makeUnlockToken())
      .send({ merchantUpiId: "not a upi id" });
    expect(res.status).toBe(400);
    expect(valuesFn).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/settings/history — read-only audit list", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/admin/settings/history");
    expect(res.status).toBe(401);
  });

  it("returns 403 SETTINGS_LOCKED without the unlock header", async () => {
    const res = await request(app)
      .get("/api/admin/settings/history")
      .set("Authorization", `Bearer ${makeAdminToken()}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SETTINGS_LOCKED");
  });

  it("maps rows to the API shape (upi/pricing field labels, ISO timestamps)", async () => {
    const changedAt = new Date("2026-07-29T10:00:00.000Z");
    selectChain().limit.mockResolvedValueOnce([
      { id: 2, field: "pricing_matrix", oldValue: "{}", newValue: "{}", changedBy: "admin@test.com", changedAt },
      { id: 1, field: "merchant_upi_id", oldValue: "a@b", newValue: "c@d", changedBy: "admin@test.com", changedAt },
    ]);
    const res = await request(app)
      .get("/api/admin/settings/history")
      .set("Authorization", `Bearer ${makeAdminToken()}`)
      .set(UNLOCK_HEADER, makeUnlockToken());
    expect(res.status).toBe(200);
    expect(res.body.changes).toHaveLength(2);
    expect(res.body.changes[0]).toEqual({
      id: 2, field: "pricing", oldValue: "{}", newValue: "{}",
      changedBy: "admin@test.com", changedAt: changedAt.toISOString(),
    });
    expect(res.body.changes[1].field).toBe("upi");
  });
});
