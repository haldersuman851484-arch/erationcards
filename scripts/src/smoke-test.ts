import assert from "node:assert/strict";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const BASE = process.env["API_BASE_URL"] ?? "http://localhost:80/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function get(path: string, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  const body = await res.json();
  return { status: res.status, body };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function post(path: string, data: unknown, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, body };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function patch(path: string, data: unknown, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, body };
}

function pass(label: string) {
  console.log(`  ✅ ${label}`);
}

async function run() {
  const adminEmail = process.env["ADMIN_EMAIL"];
  const adminPassword = process.env["ADMIN_PASSWORD"];
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD env vars must be set to run the smoke test");
  }

  console.log(`\nMySQL smoke test against: ${BASE}\n`);

  // ── 0. Schema verification (confirm required tables exist in MySQL) ───────
  {
    const result = await db.execute(sql`SHOW TABLES`);
    // mysql2 returns [RowDataPacket[], FieldPacket[]] — rows are in index 0
    const [rawRows] = result as unknown as [Array<Record<string, string>>, unknown];
    const tableNames = rawRows.map((r) => Object.values(r)[0] as string);
    const required = ["orders", "operators", "payment_verifications"];
    for (const tbl of required) {
      assert.ok(tableNames.includes(tbl), `Schema check: table '${tbl}' missing from MySQL`);
    }
    pass(`Schema check: tables [${required.join(", ")}] all present in MySQL`);
  }

  // ── 1. Health check ───────────────────────────────────────────────────────
  {
    const { status, body } = await get("/healthz");
    assert.equal(status, 200);
    assert.equal(body.status, "ok");
    pass("GET /healthz → 200 {status:'ok'}");
  }

  // ── 2. Stats (read from MySQL) ────────────────────────────────────────────
  {
    const { status, body } = await get("/orders/stats");
    assert.equal(status, 200, "stats: expected 200");
    assert.ok(typeof body.totalOrders === "number", "stats: totalOrders missing");
    assert.ok(typeof body.totalRevenue === "number", "stats: totalRevenue missing");
    pass(`GET /orders/stats → 200 (totalOrders=${body.totalOrders}, revenue=${body.totalRevenue})`);
  }

  // ── 3. Admin login — valid credentials ───────────────────────────────────
  let adminToken = "";
  {
    const { status, body } = await post("/admin/login", { email: adminEmail, password: adminPassword });
    assert.equal(status, 200, `admin login: got ${status} — ${JSON.stringify(body)}`);
    assert.ok(body.token, "admin login: expected JWT token");
    adminToken = body.token as string;
    pass("POST /admin/login → 200 (token issued)");
  }

  // ── 4. Admin login — invalid credentials ─────────────────────────────────
  {
    const { status } = await post("/admin/login", { email: adminEmail, password: "wrong-password" });
    assert.equal(status, 401, "bad admin login: expected 401");
    pass("POST /admin/login (bad creds) → 401");
  }

  // ── 5. Operator: register ─────────────────────────────────────────────────
  const opEmail = `smoke-op-${Date.now()}@test.com`;
  const opPassword = "TestPass123";
  let operatorId: number;
  let operatorToken = "";
  {
    const { status, body } = await post("/operators", {
      name: "Smoke Test Operator",
      email: opEmail,
      phone: "9876543210",
      password: opPassword,
      shopName: "Smoke Shop",
      address: "123 Test Street",
      state: "Maharashtra",
      district: "Pune",
      pincode: "411001",
    });
    assert.equal(status, 201, `operator register: got ${status} — ${JSON.stringify(body)}`);
    assert.ok(body.operator?.id, "operator register: expected operator.id");
    operatorId = body.operator.id as number;
    pass(`POST /operators → 201 (id=${operatorId}, status=pending)`);
  }

  // ── 6. Admin approves operator ────────────────────────────────────────────
  {
    const { status, body } = await patch(
      `/admin/operators/${operatorId}/status`,
      { status: "active" },
      adminToken
    );
    assert.equal(status, 200, `operator approve: got ${status} — ${JSON.stringify(body)}`);
    pass(`PATCH /admin/operators/${operatorId}/status → 200 (active)`);
  }

  // ── 7. Operator login ─────────────────────────────────────────────────────
  {
    const { status, body } = await post("/operators/login", { email: opEmail, password: opPassword });
    assert.equal(status, 200, `operator login: got ${status} — ${JSON.stringify(body)}`);
    assert.ok(body.token, "operator login: expected token");
    operatorToken = body.token as string;
    pass("POST /operators/login → 200 (token issued)");
  }

  // ── 8. Operator login — wrong password ────────────────────────────────────
  {
    const { status } = await post("/operators/login", { email: opEmail, password: "wrong" });
    assert.equal(status, 401, "bad operator login: expected 401");
    pass("POST /operators/login (bad creds) → 401");
  }

  // ── 9. Create order (write to MySQL) ─────────────────────────────────────
  const rationCardNumber = `RC-SMOKE-${Date.now()}`;
  let orderId: number;
  {
    const { status, body } = await post(
      "/orders",
      {
        customerName: "Smoke Test User",
        customerPhone: "9876543210",
        customerEmail: "smoke@test.com",
        rationCardNumber,
        deliveryName: "Smoke Test User",
        address: "123 Test Street",
        postOffice: "Test PO",
        state: "Maharashtra",
        district: "Pune",
        pincode: "411001",
        cardType: "AAY",
        familyCards: [],
        quantity: 1,
        amount: 70,
        paymentMethod: "upi",
      },
      operatorToken
    );
    assert.equal(status, 201, `create order: got ${status} — ${JSON.stringify(body)}`);
    assert.ok(body.id, "create order: expected id");
    orderId = body.id as number;
    pass(`POST /orders → 201 (id=${orderId})`);
  }

  // ── 10. Track order (read back from MySQL) ────────────────────────────────
  {
    const { status, body } = await get(`/orders/track?rationCardNumber=${rationCardNumber}`);
    assert.equal(status, 200, "track: expected 200");
    const order = body.order ?? body;
    assert.ok(order.id, "track: expected order with id");
    pass(`GET /orders/track?rationCardNumber=... → 200 (id=${order.id})`);
  }

  // ── 11. List orders ───────────────────────────────────────────────────────
  {
    const { status, body } = await get("/orders", adminToken);
    assert.equal(status, 200, "list orders: expected 200");
    const orders: unknown[] = Array.isArray(body) ? body : (body.orders ?? body.data ?? []);
    assert.ok(orders.length > 0, "list orders: expected at least one order");
    pass(`GET /orders → 200 (${orders.length} orders)`);
  }

  // ── 12. Update payment status (write to MySQL) ────────────────────────────
  {
    const { status, body } = await patch(
      `/orders/${orderId}/payment-status`,
      { paymentStatus: "confirmed" },
      adminToken
    );
    assert.equal(status, 200, `payment-status: got ${JSON.stringify(body)}`);
    pass(`PATCH /orders/${orderId}/payment-status → 200 (confirmed)`);
  }

  // ── 13. Update order status (write to MySQL) ──────────────────────────────
  {
    const { status, body } = await patch(
      `/orders/${orderId}`,
      { status: "processing" },
      adminToken
    );
    assert.equal(status, 200, `order status: got ${JSON.stringify(body)}`);
    pass(`PATCH /orders/${orderId} → 200 (processing)`);
  }

  // ── 14. Final stats reflect new data ─────────────────────────────────────
  {
    const { status, body } = await get("/orders/stats");
    assert.equal(status, 200, "final stats: expected 200");
    assert.ok(body.totalOrders >= 1);
    pass(`GET /orders/stats → 200 (totalOrders=${body.totalOrders}, revenue=${body.totalRevenue})`);
  }

  console.log("\n🎉 All MySQL smoke tests passed!\n");
}

run().catch((err) => {
  console.error("\n❌ Smoke test FAILED:", err.message);
  process.exit(1);
});
