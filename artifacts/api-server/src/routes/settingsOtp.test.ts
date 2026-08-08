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
  result: true,
}));
vi.mock("../lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/email")>();
  return {
    ...actual,
    sendSettingsOtpEmail: vi.fn(async (data: { to: string; code: string }) => {
      emailMock.sent.push({ to: data.to, code: data.code });
      return emailMock.result;
    }),
  };
});

process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "test-password";
process.env["SETTINGS_PARTNER_EMAILS"] = "partner1@test.com,partner2@test.com";
// Email sending is FAIL-CLOSED (real sends only under NODE_ENV=production).
// Opt in explicitly so these tests exercise the real send path against the
// mocked email module, regardless of the NODE_ENV vitest runs with.
process.env["SETTINGS_OTP_SEND_EMAILS"] = "true";

const { default: app } = await import("../app.js");

const TEST_SECRET = "test-secret-for-unit-tests";
const STATE_KEY = "settings_otp_pending";

function makeAdminToken(email = "admin@test.com", role = "admin"): string {
  return jwt.sign({ email, role }, TEST_SECRET, { expiresIn: "1h" });
}

function adminGet(path: string) {
  return request(app).get(path).set("Authorization", `Bearer ${makeAdminToken()}`);
}
function adminPost(path: string) {
  return request(app).post(path).set("Authorization", `Bearer ${makeAdminToken()}`);
}

/** Directly mutate the stored OTP state (e.g. simulate time passing). */
function tamperState(mutate: (s: { expiresAt: number; sentAt: number; attempts: number }) => void) {
  const raw = kvStore.get(STATE_KEY);
  expect(raw, "expected OTP state to exist").toBeTruthy();
  const s = JSON.parse(raw!);
  mutate(s);
  kvStore.set(STATE_KEY, JSON.stringify(s));
}

/** Runs the real send flow and returns the correct {email, code} pairs. */
async function sendAndGetCodes(): Promise<{ email: string; code: string }[]> {
  const res = await adminPost("/api/admin/settings/otp/send");
  expect(res.status).toBe(200);
  return emailMock.sent.map((e) => ({ email: e.to, code: e.code }));
}

function flipDigit(code: string): string {
  return code === "000000" ? "000001" : "000000";
}

beforeEach(() => {
  kvStore.clear();
  emailMock.sent.length = 0;
  emailMock.result = true;
  vi.clearAllMocks();
});

describe("GET /api/admin/settings/otp/config", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/admin/settings/otp/config");
    expect(res.status).toBe(401);
  });

  it("lists both partner emails with no codes pending initially", async () => {
    const res = await adminGet("/api/admin/settings/otp/config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      partnerEmails: ["partner1@test.com", "partner2@test.com"],
      otpPending: false,
      cooldownRemainingSeconds: 0,
    });
  });

  it("reports pending codes and an active cooldown after a send", async () => {
    await sendAndGetCodes();
    const res = await adminGet("/api/admin/settings/otp/config");
    expect(res.status).toBe(200);
    expect(res.body.otpPending).toBe(true);
    expect(res.body.cooldownRemainingSeconds).toBeGreaterThan(0);
  });
});

describe("POST /api/admin/settings/otp/send", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/admin/settings/otp/send");
    expect(res.status).toBe(401);
  });

  it("emails a distinct 6-digit code to each partner", async () => {
    const res = await adminPost("/api/admin/settings/otp/send");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sent: true,
      partnerEmails: ["partner1@test.com", "partner2@test.com"],
      expiresInSeconds: 600,
      cooldownSeconds: 60,
    });
    expect(emailMock.sent.map((e) => e.to)).toEqual(["partner1@test.com", "partner2@test.com"]);
    for (const e of emailMock.sent) expect(e.code).toMatch(/^\d{6}$/);
  });

  it("refuses an immediate resend with 429 during the cooldown", async () => {
    await sendAndGetCodes();
    const res = await adminPost("/api/admin/settings/otp/send");
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/wait/i);
    expect(res.body.secondsRemaining).toBeGreaterThan(0);
  });

  it("allows a resend once the cooldown has passed and invalidates old codes", async () => {
    const oldCodes = await sendAndGetCodes();
    tamperState((s) => {
      s.sentAt = Date.now() - 61_000;
    });
    emailMock.sent.length = 0;
    const newCodes = await sendAndGetCodes();
    // Old codes must no longer verify
    const res = await adminPost("/api/admin/settings/otp/verify").send({ codes: oldCodes });
    // (unless the regenerated code happens to collide, which flipDigit-style chance makes negligible)
    if (oldCodes.every((o, i) => o.code === newCodes[i].code)) return; // astronomically unlikely
    expect(res.status).toBe(400);
  });

  it("returns 502 and clears state when an email fails, so retry works immediately", async () => {
    emailMock.result = false;
    const res = await adminPost("/api/admin/settings/otp/send");
    expect(res.status).toBe(502);

    const cfg = await adminGet("/api/admin/settings/otp/config");
    expect(cfg.body.otpPending).toBe(false);
    expect(cfg.body.cooldownRemainingSeconds).toBe(0);

    emailMock.result = true;
    emailMock.sent.length = 0;
    const retry = await adminPost("/api/admin/settings/otp/send");
    expect(retry.status).toBe(200);
  });
});

describe("POST /api/admin/settings/otp/verify", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/admin/settings/otp/verify").send({ codes: [] });
    expect(res.status).toBe(401);
  });

  it("rejects a malformed body with 400", async () => {
    const res = await adminPost("/api/admin/settings/otp/verify").send({});
    expect(res.status).toBe(400);
  });

  it("says no codes are active when nothing was sent", async () => {
    const res = await adminPost("/api/admin/settings/otp/verify").send({
      codes: [
        { email: "partner1@test.com", code: "123456" },
        { email: "partner2@test.com", code: "123456" },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe("none");
  });

  it("rejects when only one of the two codes is right", async () => {
    const codes = await sendAndGetCodes();
    const oneWrong = [codes[0], { email: codes[1].email, code: flipDigit(codes[1].code) }];
    const res = await adminPost("/api/admin/settings/otp/verify").send({ codes: oneWrong });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe("wrong");
    expect(res.body.error).toMatch(/tries left/i);
  });

  it("returns an unlock token with the settings_unlock scope when both codes match", async () => {
    const codes = await sendAndGetCodes();
    const res = await adminPost("/api/admin/settings/otp/verify").send({ codes });
    expect(res.status).toBe(200);
    expect(res.body.expiresInSeconds).toBe(900);
    const decoded = jwt.verify(res.body.unlockToken, TEST_SECRET) as { scope?: string };
    expect(decoded.scope).toBe("settings_unlock");
  });

  it("accepts partner emails case-insensitively", async () => {
    const codes = await sendAndGetCodes();
    const messy = codes.map((c) => ({ email: c.email.toUpperCase(), code: c.code }));
    const res = await adminPost("/api/admin/settings/otp/verify").send({ codes: messy });
    expect(res.status).toBe(200);
  });

  it("rejects a code that is not exactly 6 digits at the validation boundary", async () => {
    const codes = await sendAndGetCodes();
    const padded = codes.map((c) => ({ email: c.email, code: ` ${c.code} ` }));
    const res = await adminPost("/api/admin/settings/otp/verify").send({ codes: padded });
    expect(res.status).toBe(400);
  });

  it("consumes codes on success — they cannot be replayed", async () => {
    const codes = await sendAndGetCodes();
    await adminPost("/api/admin/settings/otp/verify").send({ codes });
    const replay = await adminPost("/api/admin/settings/otp/verify").send({ codes });
    expect(replay.status).toBe(400);
    expect(replay.body.reason).toBe("none");
  });

  it("rejects expired codes", async () => {
    const codes = await sendAndGetCodes();
    tamperState((s) => {
      s.expiresAt = Date.now() - 1000;
    });
    const res = await adminPost("/api/admin/settings/otp/verify").send({ codes });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe("expired");
  });

  it("locks out after 5 wrong attempts and invalidates the codes", async () => {
    const codes = await sendAndGetCodes();
    const wrong = codes.map((c) => ({ email: c.email, code: flipDigit(c.code) }));

    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = await adminPost("/api/admin/settings/otp/verify").send({ codes: wrong });
      expect(res.status).toBe(400);
      expect(res.body.reason).toBe("wrong");
    }
    const fifth = await adminPost("/api/admin/settings/otp/verify").send({ codes: wrong });
    expect(fifth.status).toBe(400);
    expect(fifth.body.reason).toBe("locked");

    // Even the CORRECT codes are dead now — state was cleared.
    const correct = await adminPost("/api/admin/settings/otp/verify").send({ codes });
    expect(correct.status).toBe(400);
    expect(correct.body.reason).toBe("none");
  });

  it("parallel wrong attempts cannot bypass the 5-attempt lockout", async () => {
    const codes = await sendAndGetCodes();
    const wrong = codes.map((c) => ({ email: c.email, code: flipDigit(c.code) }));

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        adminPost("/api/admin/settings/otp/verify").send({ codes: wrong }),
      ),
    );
    expect(results.every((r) => r.status === 400)).toBe(true);
    const reasons = results.map((r) => r.body.reason);
    // Serialized verification: exactly 4 "wrong", then the lockout, then "none".
    expect(reasons.filter((r) => r === "wrong")).toHaveLength(4);
    expect(reasons.filter((r) => r === "locked")).toHaveLength(1);
    expect(reasons.filter((r) => r === "none")).toHaveLength(1);

    // The correct codes are dead — the lockout invalidated them.
    const correct = await adminPost("/api/admin/settings/otp/verify").send({ codes });
    expect(correct.status).toBe(400);
    expect(correct.body.reason).toBe("none");
  });
});

describe("unlock token gates the settings endpoints end-to-end", () => {
  it("locked without header → unlocked with a token earned through the real flow", async () => {
    const locked = await adminGet("/api/admin/settings/pricing");
    expect(locked.status).toBe(403);
    expect(locked.body.code).toBe("SETTINGS_LOCKED");

    const codes = await sendAndGetCodes();
    const verify = await adminPost("/api/admin/settings/otp/verify").send({ codes });
    expect(verify.status).toBe(200);

    const unlocked = await adminGet("/api/admin/settings/pricing").set(
      "x-settings-unlock",
      verify.body.unlockToken,
    );
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.source).toBe("default");
  });

  it("an admin login JWT cannot be smuggled into the unlock header (scope check)", async () => {
    const res = await adminGet("/api/admin/settings/pricing").set("x-settings-unlock", makeAdminToken());
    expect(res.status).toBe(403);
  });

  it("an expired unlock token is rejected", async () => {
    const expired = jwt.sign({ scope: "settings_unlock", email: "admin@test.com" }, TEST_SECRET, {
      expiresIn: -10,
    });
    const res = await adminGet("/api/admin/settings/pricing").set("x-settings-unlock", expired);
    expect(res.status).toBe(403);
  });
});
