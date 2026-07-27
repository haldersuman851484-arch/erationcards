/**
 * Smoke-test: GET /orders?search=... must respond in < 500 ms.
 *
 * Run against the local dev server:
 *   BASE_URL=http://localhost:$PORT pnpm --filter @workspace/api-server test:smoke
 *
 * The test seeds 500 rows so the optimizer has a realistic dataset,
 * then confirms the search endpoint responds quickly and returns results.
 * It cleans up after itself regardless of pass/fail.
 *
 * Requires MYSQL_DATABASE_URL (same env var the api-server uses) and
 * SESSION_SECRET (must match the target server's — GET /orders is admin-only).
 */

import { db, ordersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { createAdminToken } from "../lib/auth";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080/api";
const SEED_COUNT = 10_000;
const LATENCY_THRESHOLD_MS = 500;

function uniqueOrderNumber(i: number) {
  return `SMOKE-${Date.now()}-${i}`;
}

async function seedOrders(count: number): Promise<string[]> {
  const orderNumbers: string[] = [];
  // Insert in batches of 50 to avoid oversized INSERT statements
  const batchSize = 50;
  for (let batch = 0; batch < count; batch += batchSize) {
    const rows = [];
    for (let i = batch; i < Math.min(batch + batchSize, count); i++) {
      const orderNumber = uniqueOrderNumber(i);
      orderNumbers.push(orderNumber);
      rows.push({
        orderNumber,
        customerName: i % 5 === 0 ? `Ramesh Kumar ${i}` : `Test Customer ${i}`,
        customerPhone: `90000${String(i).padStart(5, "0")}`,
        customerEmail: null as null,
        rationCardNumber: `RC${String(i).padStart(8, "0")}`,
        address: "123 Test Street",
        state: "Maharashtra",
        district: "Pune",
        pincode: "411001",
        cardType: "PHH",
        quantity: 1,
        amount: "70.00",
        paymentStatus: "pending" as const,
        status: "pending" as const,
      });
    }
    await db.insert(ordersTable).values(rows);
  }
  return orderNumbers;
}

async function cleanupOrders(orderNumbers: string[]) {
  const chunkSize = 50;
  for (let i = 0; i < orderNumbers.length; i += chunkSize) {
    await db
      .delete(ordersTable)
      .where(inArray(ordersTable.orderNumber, orderNumbers.slice(i, i + chunkSize)));
  }
}

async function measureSearch(search: string): Promise<{ elapsed: number; total: number }> {
  const url = `${BASE_URL}/orders?search=${encodeURIComponent(search)}&limit=20`;
  const start = performance.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${createAdminToken("smoke-test@printpvccard.in", "admin")}` },
  });
  const elapsed = performance.now() - start;
  if (!res.ok) throw new Error(`HTTP ${res.status} for search="${search}": ${await res.text()}`);
  const data = (await res.json()) as { total: number };
  return { elapsed, total: data.total };
}

async function runTest() {
  console.log(`Seeding ${SEED_COUNT} test orders…`);
  const orderNumbers = await seedOrders(SEED_COUNT);

  try {
    const cases = [
      { label: "name search (FULLTEXT)", term: "Ramesh" },
      { label: "phone prefix (short-term fallback)", term: "90" },
      { label: "no results", term: "ZZZNOMATCH999" },
    ];

    let allPassed = true;

    for (const { label, term } of cases) {
      const { elapsed, total } = await measureSearch(term);
      const pass = elapsed < LATENCY_THRESHOLD_MS;
      console.log(
        `  [${pass ? "✓" : "✗"}] ${label}: ${elapsed.toFixed(1)} ms  (${total} results)`
      );
      if (!pass) {
        console.error(`    FAIL: ${elapsed.toFixed(1)} ms exceeds ${LATENCY_THRESHOLD_MS} ms threshold`);
        allPassed = false;
      }
    }

    // Sanity-check that the FULLTEXT search actually returns seeded rows
    const { total: nameHits } = await measureSearch("Ramesh");
    if (nameHits === 0) {
      console.error("  ✗ FAIL: FULLTEXT search for 'Ramesh' returned 0 results — seeded rows not found");
      allPassed = false;
    }

    if (!allPassed) {
      process.exit(1);
    }
    console.log("✓ PASS: all search queries responded in < 500 ms");
  } finally {
    console.log("Cleaning up test orders…");
    await cleanupOrders(orderNumbers);
    console.log("Done.");
  }
}

runTest().catch((err) => {
  console.error("✗ FAIL:", err.message);
  process.exit(1);
});
