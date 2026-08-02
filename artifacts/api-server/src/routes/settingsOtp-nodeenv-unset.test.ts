/**
 * Regression test for the "NODE_ENV unset" misconfiguration (a host
 * launching dist/index.mjs directly, bypassing the npm start script):
 *  1. The OTP send route must NEVER log plaintext unlock codes unless
 *     NODE_ENV is explicitly "development".
 *  2. Email sending is FAIL-CLOSED: with NODE_ENV unset, real partner
 *     emails must be SUPPRESSED. Only NODE_ENV=production — which the
 *     Hostinger bundle pins in its start script AND at the top of
 *     dist/index.mjs — or an explicit SETTINGS_OTP_SEND_EMAILS=true sends.
 *     (The old fail-open gate let vitest runs, NODE_ENV=test, email the
 *     real partners on every test run — 1-2 Aug 2026.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ── DB mock must be declared before any import that pulls in @workspace/db ──
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
  return {
    db: { select: selectFn, insert: insertFn, update: vi.fn(() => updateChain) },
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

// ── In-memory settings KV so OTP state behaves like a real DB row ──
const kvStore = vi.hoisted(() => new Map<string, string>());
vi.mock("../lib/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/settings")>();
  return {
    ...actual,
    getSettingValue: vi.fn(async (key: string) => kvStore.get(key) ?? null),
    setSettingValue: vi.fn(async (key: string, value: string) => {
      kvStore.set(key, value);
    }),
  };
});

// ── Email mock: captures the plaintext codes instead of hitting Resend ──
const emailMock = vi.hoisted(() => ({
  sent: [] as { to: string; code: string }[],
}));
vi.mock("../lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/email")>();
  return {
    ...actual,
    sendSettingsOtpEmail: vi.fn(async (data: { to: string; code: string }) => {
      emailMock.sent.push({ to: data.to, code: data.code });
      return true;
    }),
  };
});

// ── Logger mock: capture every log line the app emits as JSON strings ──
const logCapture = vi.hoisted(() => ({ lines: [] as string[] }));
vi.mock("../lib/logger", async () => {
  const { default: pino } = await import("pino");
  const logger = pino(
    { level: "trace" },
    {
      write(line: string) {
        logCapture.lines.push(line);
      },
    },
  );
  return { logger };
});

process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "test-password";
process.env["MERCHANT_UPI_ID"] = "envdefault@okbank";
process.env["SETTINGS_PARTNER_EMAILS"] = "partner1@test.com,partner2@test.com";

// ★ The scenario under test: NODE_ENV is completely UNSET (misconfigured
// production host). NODE_ENV is read per-request inside the route, so
// deleting it here (before/after app import) covers the runtime path.
delete process.env.NODE_ENV;

const { default: app } = await import("../app.js");

const TEST_SECRET = "test-secret-for-unit-tests";

function adminPost(path: string) {
  const token = jwt.sign({ email: "admin@test.com", role: "admin" }, TEST_SECRET, {
    expiresIn: "1h",
  });
  return request(app).post(path).set("Authorization", `Bearer ${token}`);
}

beforeEach(() => {
  kvStore.clear();
  emailMock.sent.length = 0;
  logCapture.lines.length = 0;
  delete process.env.NODE_ENV;
});

describe("POST /api/admin/settings/otp/send with NODE_ENV unset", () => {
  it("suppresses partner emails (fail-closed) and never logs the plaintext codes", async () => {
    const res = await adminPost("/api/admin/settings/otp/send");
    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(true);

    // FAIL-CLOSED: NODE_ENV is not "production", so no real email may leave.
    expect(emailMock.sent).toHaveLength(0);

    const allLogs = logCapture.lines.join("\n");
    // The dev-only plaintext-code log line must also stay absent…
    expect(allLogs).not.toContain("DEV ONLY");
    // …while the suppression itself is visible for diagnosis.
    expect(allLogs).toContain("non-production: emails suppressed");
  });

  it("still logs the codes when NODE_ENV is explicitly development", async () => {
    process.env.NODE_ENV = "development";
    process.env["SETTINGS_OTP_SEND_EMAILS"] = "true";
    try {
      const res = await adminPost("/api/admin/settings/otp/send");
      expect(res.status).toBe(200);
      const allLogs = logCapture.lines.join("\n");
      expect(allLogs).toContain("DEV ONLY");
    } finally {
      delete process.env.NODE_ENV;
      delete process.env["SETTINGS_OTP_SEND_EMAILS"];
    }
  });
});
