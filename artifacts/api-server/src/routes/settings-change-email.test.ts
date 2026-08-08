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

  return {
    db: { select: selectFn, insert: insertFn, update: vi.fn(() => updateChain) },
    settingsTable: {},
    settingsChangeHistoryTable: {},
    ordersTable: {},
    paymentVerificationsTable: {},
    operatorsTable: {},
    FamilyCardsSchema: {
      safeParse: (v: unknown) => ({ success: true, data: v ?? [] }),
    },
    ALLOWED_CARD_TYPES: ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II", "ABHA", "E-SHRAM", "GENERAL", "AYUSHMAN BHARAT", "AADHAAR", "VOTER ID", "PAN", "APAAR ID", "DRIVING LICENCE", "BJP MEMBERSHIP CARD", "CUSTOM ID CARD"],
  };
});

// Set required env vars before app is loaded. RESEND_API_KEY forces the email
// module onto the direct-fetch transport so we can stub global fetch (the
// real transport) rather than the email module itself — this proves the
// route survives genuine transport failures, not just a friendly mock.
process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "test-password";
process.env["MERCHANT_UPI_ID"] = "envdefault@okbank";
process.env["RESEND_API_KEY"] = "re_test_key_never_used";
process.env["SETTINGS_PARTNER_EMAILS"] = "partner1@test.com,partner2@test.com";
// Email sending is FAIL-CLOSED (real sends only under NODE_ENV=production).
// Opt in explicitly so these tests exercise the real send path against the
// stubbed transport, regardless of the NODE_ENV vitest uses.
process.env["SETTINGS_OTP_SEND_EMAILS"] = "true";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// Import app after mocks are set up
const { default: app } = await import("../app.js");
const { db } = await import("@workspace/db");

const TEST_SECRET = "test-secret-for-unit-tests";
const UNLOCK_HEADER = "x-settings-unlock";

function makeAdminToken(email = "admin@test.com"): string {
  return jwt.sign({ email, role: "admin" }, TEST_SECRET, { expiresIn: "1h" });
}

function makeUnlockToken(): string {
  return jwt.sign({ scope: "settings_unlock", email: "admin@test.com" }, TEST_SECRET, { expiresIn: "15m" });
}

/** The shared insert().values() mock (settings upsert + history rows share it). */
function valuesFn() {
  const insertReturn = (db as any).insert() as { values: ReturnType<typeof vi.fn> };
  return insertReturn.values;
}

const VALID_PRICING = {
  ration: { single: { public: 100, operator: 80 }, multi: { public: 90, operator: 70 } },
  special: { single: { public: 120, operator: 100 }, multi: { public: 110, operator: 90 } },
};

function putPricing() {
  return request(app)
    .put("/api/admin/settings/pricing")
    .set("Authorization", `Bearer ${makeAdminToken()}`)
    .set(UNLOCK_HEADER, makeUnlockToken())
    .send({ pricing: VALID_PRICING });
}

/** Asserts the setting upsert and the audit-trail history row were both written. */
function expectPricingPersisted() {
  expect(valuesFn()).toHaveBeenCalledWith(
    expect.objectContaining({ key: "pricing_matrix", value: JSON.stringify(VALID_PRICING) })
  );
  const historyCall = valuesFn().mock.calls.find((c) => (c[0] as any)?.field === "pricing_matrix");
  expect(historyCall).toBeDefined();
  expect(JSON.parse((historyCall![0] as any).newValue)).toEqual(VALID_PRICING);
}

/** Waits for the fire-and-forget email sends to have hit the transport. */
async function waitForEmailAttempts(count: number) {
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(count));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PUT /api/admin/settings/pricing — email transport failure never blocks the save", () => {
  it("still saves and writes history when the transport rejects", async () => {
    fetchMock.mockRejectedValue(new Error("socket hang up"));
    // The email is genuinely attempted (once per partner) and fails silently.
    const res = await putPricing();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pricing: VALID_PRICING, source: "custom" });
    expectPricingPersisted();
    await waitForEmailAttempts(2);
  });

  it("still saves and writes history when Resend returns a non-OK response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "invalid api key" }), { status: 401 })
    );
    const res = await putPricing();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pricing: VALID_PRICING, source: "custom" });
    expectPricingPersisted();
    await waitForEmailAttempts(2);
  });
});

describe("settings change email — happy path notifies both partners", () => {
  function sentPayloads(): any[] {
    return fetchMock.mock.calls
      .filter(([url]) => String(url).includes("api.resend.com/emails"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));
  }

  it("pricing save emails both partners with the readable old/new price matrices", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "email_ok" }), { status: 200 }));
    const res = await putPricing();
    expect(res.status).toBe(200);
    await waitForEmailAttempts(2);

    const payloads = sentPayloads();
    const recipients = payloads.flatMap((p) => p.to).sort();
    expect(recipients).toEqual(["partner1@test.com", "partner2@test.com"]);

    for (const p of payloads) {
      expect(p.subject).toBe("Card prices changed - PVC Card Portal settings");
      // New matrix rendered human-readably (₹ per tier), not raw JSON.
      expect(p.text).toContain("Ration single: ₹100 public / ₹80 operator");
      expect(p.text).toContain("Special multi: ₹110 public / ₹90 operator");
      expect(p.text).toContain("Saved by: admin@test.com");
      expect(p.text).toMatch(/When: .+IST/);
    }
  });
});
