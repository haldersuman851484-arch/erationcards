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

  // ── 2. Stats are staff-only ───────────────────────────────────────────────
  // Order counts and revenue must never be readable without a staff login.
  // (The authenticated read happens in step 14, after admin login.)
  {
    const { status } = await get("/orders/stats");
    assert.equal(status, 401, "stats without login: expected 401");
    pass("GET /orders/stats (no login) → 401 (staff-only)");
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
        // amount/quantity are required by the API schema but recomputed
        // server-side; paymentMethod is server-managed (always cashfree).
        quantity: 1,
        amount: 70,
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

  // ── 12. Manual payment verification stays removed ─────────────────────────
  // Payments are confirmed by the Cashfree gateway only. The old staff
  // endpoint must not exist in the deployed build — if it answers anything
  // but 404, an old build is running.
  {
    const { status } = await patch(
      `/orders/${orderId}/payment-status`,
      { paymentStatus: "confirmed" },
      adminToken
    );
    assert.equal(status, 404, `payment-status endpoint should be gone: got ${status}`);
    pass(`PATCH /orders/${orderId}/payment-status → 404 (manual verification removed)`);
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

  // ── 14. Final stats reflect new data (admin sees revenue) ────────────────
  {
    const { status, body } = await get("/orders/stats", adminToken);
    assert.equal(status, 200, "final stats: expected 200");
    assert.ok(body.totalOrders >= 1, "final stats: totalOrders missing");
    assert.ok(typeof body.totalRevenue === "number", "final stats: totalRevenue missing for admin");
    pass(`GET /orders/stats (admin) → 200 (totalOrders=${body.totalOrders}, revenue=${body.totalRevenue})`);
  }

  // ── 15. Homepage SEO prices (post-deploy check) ───────────────────────────
  // The built index.html keeps %%PRICE_*%% tokens; the server injects live
  // prices at serve time. The served homepage must show real prices to Google
  // with no leftover tokens.
  {
    // Only meaningful against a deployed server (API_BASE_URL set): in dev,
    // "/" is served by the Vite portal with the raw (tokenised) index.html.
    const homeBase = BASE.replace(/\/api\/?$/, "") || BASE;
    if (!process.env["API_BASE_URL"]) {
      console.log("  ⚠️  Homepage SEO price check skipped — set API_BASE_URL to run it against a deployed server");
    } else {
      const res = await fetch(`${homeBase}/`, { headers: { Accept: "text/html" } });
      assert.equal(res.status, 200, `homepage: expected 200, got ${res.status}`);
      const html = await res.text();
      assert.ok(!html.includes("%%PRICE_"), "homepage: leftover %%PRICE_ tokens — SEO prices not injected");
      assert.ok(/"priceRange":\s*"₹\d+–₹\d+"/.test(html), "homepage: JSON-LD priceRange missing or not numeric");
      assert.ok(/name="description" content="[^"]*₹\d+/.test(html), "homepage: meta description missing a real ₹ price");
      pass(`GET ${homeBase}/ → 200 (live prices injected, no %%PRICE_ tokens)`);
    }
  }

  // ── 16. IndexNow key file (Bing ownership proof) ─────────────────────────
  // IndexNow silently ignores every ping unless the key file is reachable at
  // the site root and its body equals the key exactly.
  {
    const INDEXNOW_KEY = "752cb444e5d015f3e8ec9d4cf01e0dbb";
    const homeBase = BASE.replace(/\/api\/?$/, "") || BASE;
    if (!process.env["API_BASE_URL"]) {
      console.log("  ⚠️  IndexNow key file check skipped — set API_BASE_URL to run it against a deployed server");
    } else {
      const keyUrl = `${homeBase}/${INDEXNOW_KEY}.txt`;
      const res = await fetch(keyUrl);
      assert.equal(
        res.status,
        200,
        `IndexNow key file: expected 200 at ${keyUrl}, got ${res.status} — Bing/IndexNow is silently IGNORING all pings until this file is reachable on the live site`
      );
      const body = (await res.text()).trim();
      assert.equal(
        body,
        INDEXNOW_KEY,
        `IndexNow key file: body at ${keyUrl} does not equal the key (got "${body.slice(0, 60)}") — Bing/IndexNow is silently IGNORING all pings until the file serves exactly the key`
      );
      pass(`GET /${INDEXNOW_KEY}.txt → 200 (body matches key — IndexNow ownership proven)`);
    }
  }

  console.log("\n🎉 All MySQL smoke tests passed!\n");
}

run().catch((err) => {
  console.error("\n❌ Smoke test FAILED:", err.message);
  process.exit(1);
});
