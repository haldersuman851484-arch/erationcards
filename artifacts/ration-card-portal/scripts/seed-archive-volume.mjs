// Repeatable volume seeder for the Data & Storage clean-up flow.
//
// Creates COUNT throwaway finished orders for TODAY through the real public
// API (screenshot upload → order create → admin status change), so every
// order has a genuine uploaded file in object storage, plus a card PDF on
// every PDF_EVERY-th order and a few in-progress orders that must survive
// the clean-up untouched.
//
// Usage (api-server workflow must be running):
//   node scripts/seed-archive-volume.mjs
//   COUNT=300 IN_PROGRESS=15 PDF_EVERY=10 CONCURRENCY=10 node scripts/seed-archive-volume.mjs
//
// Requires ADMIN_EMAIL / ADMIN_PASSWORD in the environment (already set in
// the workspace). Writes a summary to .e2e-delete-flow/seed-summary.json.
import fs from "node:fs";
import crypto from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:80";
const COUNT = Number(process.env.COUNT ?? 300);
const IN_PROGRESS = Number(process.env.IN_PROGRESS ?? 15);
const PDF_EVERY = Number(process.env.PDF_EVERY ?? 10);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);

// ── Safety rail: local dev targets only ─────────────────────────────────────
// This script creates real orders, and its companion delete e2e destroys the
// WHOLE day's finished orders. Never point it at anything but a local dev
// server unless you very explicitly opt in.
const targetHost = new URL(BASE).hostname;
if (!["localhost", "127.0.0.1"].includes(targetHost) && process.env.ALLOW_REMOTE_TARGET !== "true") {
  console.error(`Refusing to seed against non-local target ${BASE}. Set ALLOW_REMOTE_TARGET=true only if you are certain this is a disposable environment.`);
  process.exit(1);
}

const OUT = "/home/runner/workspace/.e2e-delete-flow";
fs.mkdirSync(OUT, { recursive: true });

// ── tiny but real-looking fixture files ─────────────────────────────────────
// ~3 KB JPEG: valid SOI/EOI markers around random payload so storage,
// mimetype checks and byte counting all see a plausible image.
function makeJpeg() {
  const payload = crypto.randomBytes(3 * 1024);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.from("JFIF\0", "latin1"),
    payload,
    Buffer.from([0xff, 0xd9]),
  ]);
}
// ~1 KB PDF with the %PDF header the server verifies.
function makePdf(n) {
  return Buffer.from(
    `%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n% bulk seed order ${n} ${"x".repeat(900)}\n%%EOF\n`,
    "latin1",
  );
}

const CARD_TYPES = ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II", "ABHA", "E-SHRAM", "GENERAL"];
// Finished statuses the clean-up may delete; weighted towards delivered.
const FINISHED = ["delivered", "delivered", "delivered", "delivered", "delivered", "delivered", "delivered", "returned", "cancelled", "cancelled"];

async function jsonOrThrow(res, what) {
  if (!res.ok) throw new Error(`${what} failed: HTTP ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

async function adminLogin() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  const body = await jsonOrThrow(res, "admin login");
  if (!body.token) throw new Error("admin login returned no token");
  return body.token;
}

async function uploadScreenshot(i) {
  const fd = new FormData();
  fd.append("screenshot", new Blob([makeJpeg()], { type: "image/jpeg" }), `bulk-${i}.jpg`);
  const res = await fetch(`${BASE}/api/payments/upload-screenshot`, { method: "POST", body: fd });
  const body = await jsonOrThrow(res, `screenshot upload #${i}`);
  return body.url;
}

async function createOrder(i, screenshotUrl) {
  const cardType = CARD_TYPES[i % CARD_TYPES.length];
  // Every 7th order carries family cards so family-cards.csv has volume too.
  const familyCards =
    i % 7 === 0
      ? [{ customerName: `Family Member ${i}`, rationCardNumber: `FC${String(i).padStart(6, "0")}`, cardType: "PHH" }]
      : [];
  const res = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: `Bulk Test ${String(i).padStart(3, "0")}`,
      customerPhone: `9${String(100000000 + i).slice(0, 9)}`,
      rationCardNumber: `BULK${String(i).padStart(6, "0")}`,
      address: `${i} Volume Test Lane`,
      postOffice: "Test PO",
      state: "West Bengal",
      district: "Kolkata",
      pincode: "700001",
      cardType,
      familyCards,
      quantity: 1 + familyCards.length,
      amount: 0, // ignored by the server; pricing is computed there
      paymentStatus: "confirmed",
      paymentMethod: "upi",
      paymentScreenshotUrl: screenshotUrl,
    }),
  });
  return jsonOrThrow(res, `order create #${i}`);
}

async function uploadCardPdf(orderNumber, i) {
  const fd = new FormData();
  fd.append("cardIndex", "0");
  fd.append("pdf", new Blob([makePdf(i)], { type: "application/pdf" }), `bulk-card-${i}.pdf`);
  const res = await fetch(`${BASE}/api/orders/${orderNumber}/upload-card-pdf`, { method: "POST", body: fd });
  await jsonOrThrow(res, `card pdf upload #${i}`);
}

async function setStatus(token, id, status) {
  const res = await fetch(`${BASE}/api/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  await jsonOrThrow(res, `status patch order ${id} → ${status}`);
}

const t0 = Date.now();
const token = await adminLogin();

// ── Safety rail: don't mix seeds into a day holding real-looking orders ────
// The delete e2e wipes every finished order in today's range, not just the
// seeded ones. Best-effort spot check (first 100 of today's orders): abort if
// any order does not match the seeder's "Bulk Test" naming pattern.
{
  const today = new Date().toLocaleDateString("en-CA");
  const res = await fetch(`${BASE}/api/orders?fromDate=${today}&toDate=${today}&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  const existing = Array.isArray(body) ? body : (body?.orders ?? []);
  const nonSeed = existing.filter((o) => !/^Bulk Test /.test(o.customerName ?? ""));
  if (nonSeed.length > 0 && process.env.SEED_EVEN_IF_MIXED !== "true") {
    console.error(
      `Refusing: today already has ${nonSeed.length} order(s) not created by this seeder ` +
        `(first: ${nonSeed[0].orderNumber ?? "?"} "${nonSeed[0].customerName ?? "?"}"). ` +
        `The delete e2e would destroy them. Set SEED_EVEN_IF_MIXED=true to override.`,
    );
    process.exit(1);
  }
}

console.log(`Seeding ${COUNT} finished + ${IN_PROGRESS} in-progress orders → ${BASE}`);

const summary = { seededAt: new Date().toISOString(), finished: [], inProgress: [], pdfCount: 0, byStatus: {} };
let nextIndex = 0;
let failures = 0;
const TOTAL = COUNT + IN_PROGRESS;

async function seedOne(i) {
  const finished = i < COUNT;
  const status = finished ? FINISHED[i % FINISHED.length] : "processing";
  const screenshotUrl = await uploadScreenshot(i);
  const order = await createOrder(i, screenshotUrl);
  if (finished && i % PDF_EVERY === 0) {
    await uploadCardPdf(order.orderNumber, i);
    summary.pdfCount += 1;
  }
  await setStatus(token, order.id, status);
  summary.byStatus[status] = (summary.byStatus[status] ?? 0) + 1;
  (finished ? summary.finished : summary.inProgress).push(order.orderNumber);
}

async function worker() {
  for (;;) {
    const i = nextIndex++;
    if (i >= TOTAL) return;
    try {
      await seedOne(i);
    } catch (err) {
      failures += 1;
      console.error(`  order #${i}: ${err.message}`);
    }
    const done = summary.finished.length + summary.inProgress.length;
    if (done > 0 && done % 50 === 0) console.log(`  ${done}/${TOTAL} seeded…`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Report THIS run's numbers before merging in previous runs' history.
const runStats = {
  finished: summary.finished.length,
  inProgress: summary.inProgress.length,
  pdfs: summary.pdfCount,
  byStatus: { ...summary.byStatus },
};

// Merge with any previous run's summary so repeated (top-up) runs never lose
// track of earlier seeded orders.
const summaryPath = `${OUT}/seed-summary.json`;
if (fs.existsSync(summaryPath)) {
  try {
    const prev = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    summary.finished = [...(prev.finished ?? []), ...summary.finished];
    summary.inProgress = [...(prev.inProgress ?? []), ...summary.inProgress];
    summary.pdfCount += prev.pdfCount ?? 0;
    for (const [k, v] of Object.entries(prev.byStatus ?? {})) summary.byStatus[k] = (summary.byStatus[k] ?? 0) + v;
  } catch { /* unreadable previous summary — start fresh */ }
}
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(
  `Done in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${runStats.finished} finished, ` +
    `${runStats.inProgress} in-progress, ${runStats.pdfs} card PDFs, ${failures} failures` +
    (summary.finished.length !== runStats.finished ? ` (summary file now tracks ${summary.finished.length} finished across runs)` : ""),
);
console.log(`byStatus (this run): ${JSON.stringify(runStats.byStatus)}`);
if (failures > 0) process.exitCode = 1;
