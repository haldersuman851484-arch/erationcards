import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ── DB mock must be declared before any import that pulls in @workspace/db ──
// (vi.mock is hoisted; factory runs before app.ts is evaluated.)
// The select chain is awaitable at any depth and resolves to [] — every
// staff-guarded endpoint therefore passes auth and then 404s ("order not
// found") or lists nothing, which is all these authorization tests need.
vi.mock("@workspace/db", () => {
  const makeChain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ["from", "where", "orderBy", "limit", "offset", "leftJoin", "innerJoin", "groupBy", "set", "values"]) {
      c[m] = vi.fn(() => c);
    }
    c["then"] = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve([]).then(resolve, reject);
    return c;
  };
  const chain = makeChain();
  return {
    db: {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
    },
    settingsTable: {},
    settingsChangeHistoryTable: {},
    ordersTable: {},
    paymentVerificationsTable: {},
    operatorsTable: {},
    reviewsTable: {},
    FamilyCardsSchema: {
      safeParse: (v: unknown) => ({ success: true, data: v ?? [] }),
    },
    ALLOWED_CARD_TYPES: ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II", "ABHA", "E-SHRAM", "GENERAL"],
  };
});

// Set required env vars before app is loaded. All values are test fakes.
process.env["SESSION_SECRET"] = "test-secret-for-unit-tests";
process.env["MYSQL_DATABASE_URL"] = "mysql://unused:unused@localhost/unused";
process.env["ADMIN_EMAIL"] = "admin@test.com";
process.env["ADMIN_PASSWORD"] = "admin-test-password";
process.env["PROCESSING_EMAIL"] = "admin@test.com"; // same email as admin — password decides the role
process.env["PROCESSING_PASSWORD"] = "processing-test-password";

// Import app after mocks are set up
const { default: app } = await import("../app.js");

const TEST_SECRET = "test-secret-for-unit-tests";

function makeToken(role: string, email = "admin@test.com"): string {
  return jwt.sign({ email, role }, TEST_SECRET, { expiresIn: "1h" });
}

function makeOperatorToken(operatorId = 99): string {
  return jwt.sign({ operatorId }, TEST_SECRET, { expiresIn: "1h" });
}

const adminToken = makeToken("admin");
const processingToken = makeToken("processing");

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Login: one page, two passwords, two roles ───────────────────────────────

describe("POST /api/admin/login — role routing", () => {
  it("admin password → role=admin with an admin JWT", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@test.com", password: "admin-test-password" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
    expect(res.body.email).toBe("admin@test.com");
    const claims = jwt.verify(res.body.token, TEST_SECRET) as { role: string };
    expect(claims.role).toBe("admin");
  });

  it("processing password (same email) → role=processing with a processing JWT", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@test.com", password: "processing-test-password" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("processing");
    const claims = jwt.verify(res.body.token, TEST_SECRET) as { role: string };
    expect(claims.role).toBe("processing");
  });

  it("wrong password → same generic 401 (no hint which account exists)", async () => {
    const res = await request(app)
      .post("/api/admin/login")
      .send({ email: "admin@test.com", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid admin credentials");
  });

  it("processing login is unavailable (plain 401) when PROCESSING_* env vars are unset", async () => {
    const savedEmail = process.env["PROCESSING_EMAIL"];
    const savedPassword = process.env["PROCESSING_PASSWORD"];
    delete process.env["PROCESSING_EMAIL"];
    delete process.env["PROCESSING_PASSWORD"];
    try {
      const res = await request(app)
        .post("/api/admin/login")
        .send({ email: "admin@test.com", password: "processing-test-password" });
      expect(res.status).toBe(401);
      // Admin login must still work with processing creds unset
      const adminRes = await request(app)
        .post("/api/admin/login")
        .send({ email: "admin@test.com", password: "admin-test-password" });
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.role).toBe("admin");
    } finally {
      process.env["PROCESSING_EMAIL"] = savedEmail;
      process.env["PROCESSING_PASSWORD"] = savedPassword;
    }
  });
});

// ── Session endpoint serves both roles ──────────────────────────────────────

describe("GET /api/admin/me — staff session", () => {
  it("returns role=processing for a processing token", async () => {
    const res = await request(app).get("/api/admin/me").set("Authorization", `Bearer ${processingToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: "processing", email: "admin@test.com" });
  });

  it("returns role=admin for an admin token", async () => {
    const res = await request(app).get("/api/admin/me").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
  });

  it("still rejects operator tokens with 401", async () => {
    const res = await request(app).get("/api/admin/me").set("Authorization", `Bearer ${makeOperatorToken()}`);
    expect(res.status).toBe(401);
  });
});

// ── Order/courier endpoints open to BOTH roles ──────────────────────────────

const STAFF_ENDPOINTS: Array<{ label: string; call: (token: string) => request.Test }> = [
  { label: "GET /api/orders", call: (t) => request(app).get("/api/orders").set("Authorization", `Bearer ${t}`) },
  { label: "GET /api/orders/stats", call: (t) => request(app).get("/api/orders/stats").set("Authorization", `Bearer ${t}`) },
  { label: "GET /api/orders/recent", call: (t) => request(app).get("/api/orders/recent").set("Authorization", `Bearer ${t}`) },
  { label: "GET /api/orders/:id", call: (t) => request(app).get("/api/orders/12345").set("Authorization", `Bearer ${t}`) },
  { label: "PATCH /api/orders/:id (status)", call: (t) => request(app).patch("/api/orders/12345").send({ status: "printed" }).set("Authorization", `Bearer ${t}`) },
  { label: "PATCH /api/orders/:id/customer-info", call: (t) => request(app).patch("/api/orders/12345/customer-info").send({ customerName: "X" }).set("Authorization", `Bearer ${t}`) },
  { label: "PATCH /api/orders/:id/pdfs/:cardIndex/downloaded", call: (t) => request(app).patch("/api/orders/12345/pdfs/0/downloaded").send({ downloaded: true }).set("Authorization", `Bearer ${t}`) },
  { label: "POST /api/orders/:id/dispatch", call: (t) => request(app).post("/api/orders/12345/dispatch").send({}).set("Authorization", `Bearer ${t}`) },
  { label: "DELETE /api/orders/:id/dispatch", call: (t) => request(app).delete("/api/orders/12345/dispatch").set("Authorization", `Bearer ${t}`) },
  { label: "PATCH /api/orders/:id/assign", call: (t) => request(app).patch("/api/orders/12345/assign").send({ operatorId: 1 }).set("Authorization", `Bearer ${t}`) },
  { label: "PATCH /api/orders/:id/payment-status", call: (t) => request(app).patch("/api/orders/12345/payment-status").send({ paymentStatus: "confirmed" }).set("Authorization", `Bearer ${t}`) },
];

describe("staff endpoints — processing token passes the auth gate", () => {
  for (const { label, call } of STAFF_ENDPOINTS) {
    it(`${label} does not 401/403 a processing token`, async () => {
      const res = await call(processingToken);
      expect([401, 403]).not.toContain(res.status);
    });
  }

  it("GET /api/orders still rejects operator tokens with 401", async () => {
    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${makeOperatorToken()}`);
    expect(res.status).toBe(401);
  });

  it("GET /api/orders still rejects missing tokens with 401", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });
});

// ── Admin-only endpoints must 403 a processing token ────────────────────────

const ADMIN_ONLY_ENDPOINTS: Array<{ label: string; call: (token: string) => request.Test }> = [
  { label: "GET /api/admin/verifications", call: (t) => request(app).get("/api/admin/verifications").set("Authorization", `Bearer ${t}`) },
  { label: "PATCH /api/admin/operators/:id/status", call: (t) => request(app).patch("/api/admin/operators/5/status").send({ status: "active" }).set("Authorization", `Bearer ${t}`) },
  { label: "GET /api/admin/settings/upi", call: (t) => request(app).get("/api/admin/settings/upi").set("Authorization", `Bearer ${t}`) },
  { label: "PUT /api/admin/settings/upi", call: (t) => request(app).put("/api/admin/settings/upi").send({ merchantUpiId: "x@bank" }).set("Authorization", `Bearer ${t}`) },
  { label: "GET /api/admin/settings/pricing", call: (t) => request(app).get("/api/admin/settings/pricing").set("Authorization", `Bearer ${t}`) },
  { label: "PUT /api/admin/settings/pricing", call: (t) => request(app).put("/api/admin/settings/pricing").send({}).set("Authorization", `Bearer ${t}`) },
  { label: "GET /api/admin/settings/history", call: (t) => request(app).get("/api/admin/settings/history").set("Authorization", `Bearer ${t}`) },
  { label: "GET /api/admin/settings/otp/config", call: (t) => request(app).get("/api/admin/settings/otp/config").set("Authorization", `Bearer ${t}`) },
  { label: "POST /api/admin/settings/otp/send", call: (t) => request(app).post("/api/admin/settings/otp/send").set("Authorization", `Bearer ${t}`) },
  { label: "POST /api/admin/settings/otp/verify", call: (t) => request(app).post("/api/admin/settings/otp/verify").send({ codes: [] }).set("Authorization", `Bearer ${t}`) },
  { label: "GET /api/admin/reviews", call: (t) => request(app).get("/api/admin/reviews").set("Authorization", `Bearer ${t}`) },
  { label: "PATCH /api/admin/reviews/:id", call: (t) => request(app).patch("/api/admin/reviews/1").send({ status: "approved" }).set("Authorization", `Bearer ${t}`) },
  { label: "DELETE /api/admin/reviews/:id", call: (t) => request(app).delete("/api/admin/reviews/1").set("Authorization", `Bearer ${t}`) },
];

describe("admin-only endpoints — processing token is forbidden (403)", () => {
  for (const { label, call } of ADMIN_ONLY_ENDPOINTS) {
    it(`${label} returns 403 for a processing token`, async () => {
      const res = await call(processingToken);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Admin access required");
    });
  }

  for (const { label, call } of ADMIN_ONLY_ENDPOINTS) {
    it(`${label} returns 401 (not 403) when no token is sent at all`, async () => {
      const res = await call("");
      expect(res.status).toBe(401);
    });
  }

  it("admin token still passes the gate on GET /api/admin/verifications", async () => {
    const res = await call401Check();
    expect([401, 403]).not.toContain(res.status);
  });

  function call401Check() {
    return request(app).get("/api/admin/verifications").set("Authorization", `Bearer ${adminToken}`);
  }
});

// ── Operator roster (GET /api/operators) — staff-scoped ─────────────────────
// The roster carries emails, phones, addresses and wallet balances, so it must
// never be publicly readable. Processing staff may see only the active roster;
// pending/suspended applications are admin-only.

describe("GET /api/operators — staff-scoped roster", () => {
  it("returns 401 with no token (roster is not public)", async () => {
    const res = await request(app).get("/api/operators");
    expect(res.status).toBe(401);
  });

  it("returns 401 with an operator token (operators cannot list each other)", async () => {
    const res = await request(app)
      .get("/api/operators")
      .set("Authorization", `Bearer ${makeOperatorToken()}`);
    expect(res.status).toBe(401);
  });

  it("returns 200 for processing staff without a filter (active roster only)", async () => {
    const res = await request(app)
      .get("/api/operators")
      .set("Authorization", `Bearer ${processingToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns 200 for processing staff explicitly asking for status=active", async () => {
    const res = await request(app)
      .get("/api/operators?status=active")
      .set("Authorization", `Bearer ${processingToken}`);
    expect(res.status).toBe(200);
  });

  it("returns 403 for processing staff asking for pending applications", async () => {
    const res = await request(app)
      .get("/api/operators?status=pending")
      .set("Authorization", `Bearer ${processingToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Admin access required");
  });

  it("returns 403 for processing staff asking for suspended operators", async () => {
    const res = await request(app)
      .get("/api/operators?status=suspended")
      .set("Authorization", `Bearer ${processingToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 200 for admin asking for pending applications", async () => {
    const res = await request(app)
      .get("/api/operators?status=pending")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it("returns 200 for admin without a filter (full roster)", async () => {
    const res = await request(app)
      .get("/api/operators")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
