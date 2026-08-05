/**
 * Order archive & cleanup helpers — pure logic shared by the
 * /admin/orders/archive endpoints and unit-tested directly.
 *
 * The flow they support: the admin filters orders by creation date + source,
 * downloads everything as one ZIP (spreadsheets + uploaded files), and only
 * then may delete the finished orders in that exact filter. The "export
 * receipt" (a short-lived signed token issued with the download) is what ties
 * the two steps together so nothing can be deleted that wasn't archived.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { gte, lte, isNull, isNotNull, type SQL } from "drizzle-orm";
import { ordersTable, type Order, type PaymentVerification, type CardPdfEntry, type FamilyCard } from "@workspace/db";

// ── Filter ──────────────────────────────────────────────────────────────────

export const ARCHIVE_SOURCES = ["both", "public", "operator"] as const;
export type ArchiveSource = (typeof ARCHIVE_SOURCES)[number];

export interface ArchiveFilter {
  fromDate: string; // YYYY-MM-DD (inclusive)
  toDate: string;   // YYYY-MM-DD (inclusive)
  source: ArchiveSource;
}

/** Only orders that are fully finished may ever be deleted. */
export const DELETABLE_STATUSES = ["delivered", "returned", "cancelled"] as const;
const DELETABLE_SET: ReadonlySet<string> = new Set(DELETABLE_STATUSES);
export function isDeletableStatus(status: string): boolean {
  return DELETABLE_SET.has(status);
}

/** settings_change_history.field value for cleanup audit rows. */
export const ORDERS_CLEANUP_HISTORY_FIELD = "orders_cleanup";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseArchiveFilter(
  q: Record<string, unknown>
): { ok: true; filter: ArchiveFilter } | { ok: false; error: string } {
  const fromDate = typeof q.fromDate === "string" ? q.fromDate.trim() : "";
  const toDate = typeof q.toDate === "string" ? q.toDate.trim() : "";
  const sourceRaw = typeof q.source === "string" && q.source.trim() ? q.source.trim() : "both";
  if (!DATE_RE.test(fromDate) || isNaN(new Date(fromDate + "T00:00:00").getTime())) {
    return { ok: false, error: "Pick a valid from-date (YYYY-MM-DD)" };
  }
  if (!DATE_RE.test(toDate) || isNaN(new Date(toDate + "T23:59:59").getTime())) {
    return { ok: false, error: "Pick a valid to-date (YYYY-MM-DD)" };
  }
  if (fromDate > toDate) {
    return { ok: false, error: "The from-date must be on or before the to-date" };
  }
  if (!ARCHIVE_SOURCES.includes(sourceRaw as ArchiveSource)) {
    return { ok: false, error: "source must be public, operator or both" };
  }
  return { ok: true, filter: { fromDate, toDate, source: sourceRaw as ArchiveSource } };
}

/**
 * Drizzle conditions for a filter. Date semantics deliberately mirror the
 * existing GET /orders list endpoint (local-time day bounds, inclusive) so
 * the archive always matches what the admin sees in the order lists.
 */
export function archiveFilterConditions(f: ArchiveFilter): SQL[] {
  const conds: SQL[] = [
    gte(ordersTable.createdAt, new Date(f.fromDate + "T00:00:00")),
    lte(ordersTable.createdAt, new Date(f.toDate + "T23:59:59")),
  ];
  if (f.source === "public") conds.push(isNull(ordersTable.operatorId) as unknown as SQL);
  if (f.source === "operator") conds.push(isNotNull(ordersTable.operatorId) as unknown as SQL);
  return conds;
}

export function filterKey(f: ArchiveFilter): string {
  return `${f.fromDate}|${f.toDate}|${f.source}`;
}

export function sourceLabel(s: ArchiveSource): string {
  return s === "both" ? "public + operator orders" : s === "public" ? "public orders only" : "operator orders only";
}

// ── Export receipt (download-before-delete proof) ───────────────────────────

export const ARCHIVE_RECEIPT_TTL_SECONDS = 30 * 60;
const RECEIPT_SCOPE = "orders_archive_receipt";

function getJwtSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

/**
 * Fingerprint of the exact deletable set: any order added, removed or even
 * touched (updatedAt) between download and delete changes the hash and voids
 * the receipt, forcing a fresh download.
 */
export function deletableFingerprint(rows: Array<Pick<Order, "id" | "updatedAt">>): string {
  const parts = rows
    .map((r) => `${r.id}:${r.updatedAt instanceof Date ? r.updatedAt.getTime() : String(r.updatedAt)}`)
    .sort();
  return crypto.createHash("sha256").update(parts.join("\n")).digest("hex");
}

export function createArchiveReceipt(filter: ArchiveFilter, fingerprint: string, count: number): string {
  return jwt.sign(
    { scope: RECEIPT_SCOPE, fk: filterKey(filter), fp: fingerprint, n: count },
    getJwtSecret(),
    { expiresIn: ARCHIVE_RECEIPT_TTL_SECONDS }
  );
}

export type ReceiptCheck =
  | { ok: true; fingerprint: string; count: number }
  | { ok: false; code: "RECEIPT_EXPIRED" | "RECEIPT_INVALID" | "RECEIPT_FILTER_MISMATCH"; error: string };

export function verifyArchiveReceipt(token: string, filter: ArchiveFilter): ReceiptCheck {
  let decoded: { scope?: string; fk?: string; fp?: string; n?: number };
  try {
    decoded = jwt.verify(token, getJwtSecret()) as typeof decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return {
        ok: false,
        code: "RECEIPT_EXPIRED",
        error: "The download is too old. Download a fresh archive, then delete straight after.",
      };
    }
    return { ok: false, code: "RECEIPT_INVALID", error: "Download the archive first — then deleting becomes available." };
  }
  if (decoded.scope !== RECEIPT_SCOPE || typeof decoded.fp !== "string" || typeof decoded.fk !== "string") {
    return { ok: false, code: "RECEIPT_INVALID", error: "Download the archive first — then deleting becomes available." };
  }
  if (decoded.fk !== filterKey(filter)) {
    return {
      ok: false,
      code: "RECEIPT_FILTER_MISMATCH",
      error: "These dates don't match the archive you downloaded. Download an archive for this exact selection first.",
    };
  }
  return { ok: true, fingerprint: decoded.fp, count: typeof decoded.n === "number" ? decoded.n : 0 };
}

// ── Stored-file references ──────────────────────────────────────────────────

export interface OrderFileRef {
  /** Storage key as used by uploadToStorage/serveFromStorage. */
  key: string;
  /** Path inside the ZIP. */
  zipPath: string;
}

/**
 * Map an /api/uploads/... URL (the only shape the app ever stores) back to
 * its storage key. Returns null for anything else — external URLs, malformed
 * values — so bad data can never make us touch an unrelated object.
 */
export function storageKeyFromUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const PREFIX = "/api/uploads/";
  if (!url.startsWith(PREFIX)) return null;
  const raw = url.slice(PREFIX.length);
  if (!raw) return null;
  const parts = raw.split("/").map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });
  if (parts.some((p) => !p || p === "." || p === ".." || p.includes("\\") || p.includes("/"))) return null;
  return parts.join("/");
}

/** Keep Bengali & other unicode, replace only path-hostile characters. */
function safePathPart(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[/\\:*?"<>|\u0000-\u001f]/g, "_").trim();
  return cleaned || "file";
}

function lastSegment(key: string): string {
  const seg = key.split("/").pop();
  return seg || key;
}

export function orderFileRefs(
  order: Pick<Order, "orderNumber" | "paymentScreenshotUrl" | "rationCardPdfs" | "welcomeLetterUrl">
): OrderFileRef[] {
  const refs: OrderFileRef[] = [];
  const seen = new Set<string>();
  const folder = safePathPart(order.orderNumber);
  const push = (key: string | null, zipPath: string) => {
    if (key && !seen.has(key)) {
      seen.add(key);
      refs.push({ key, zipPath });
    }
  };

  push(
    storageKeyFromUploadUrl(order.paymentScreenshotUrl),
    `orders/${folder}/payment-${safePathPart(lastSegment(order.paymentScreenshotUrl ?? ""))}`
  );

  const pdfs: CardPdfEntry[] = Array.isArray(order.rationCardPdfs) ? order.rationCardPdfs : [];
  for (const p of pdfs) {
    const key = storageKeyFromUploadUrl(p.pdfUrl);
    push(key, `orders/${folder}/card-${p.cardIndex + 1}-${safePathPart(lastSegment(key ?? ""))}`);
  }

  push(
    storageKeyFromUploadUrl(order.welcomeLetterUrl),
    `orders/${folder}/welcome-letter-${safePathPart(lastSegment(order.welcomeLetterUrl ?? ""))}`
  );

  return refs;
}

// ── Spreadsheets (CSV with UTF-8 BOM so Excel renders Bengali correctly) ────

function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Formula-injection guard: Excel executes cells starting with = + - @ TAB.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsvBuffer(header: string[], rows: unknown[][]): Buffer {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return Buffer.concat([Buffer.from("\uFEFF", "utf8"), Buffer.from(lines.join("\r\n") + "\r\n", "utf8")]);
}

export function iso(d: Date | string | null | undefined): string {
  if (!d) return "";
  return d instanceof Date ? d.toISOString() : String(d);
}

export function istReadable(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export function buildOrdersCsv(orders: Order[]): Buffer {
  const header = [
    "Order #", "Created (IST)", "Created (ISO)", "Status", "Deletable", "Source", "Operator ID",
    "Payment status", "Amount (Rs)", "Quantity", "Card type",
    "Customer name", "Phone", "Email", "Ration card #",
    "Delivery name", "Address", "Post office", "District", "State", "PIN",
    "Payment method", "Tracking #", "Courier", "Notes",
    "Family cards", "Card PDFs uploaded", "Payment screenshot", "Welcome letter",
    "Submitted (ISO)", "Updated (ISO)",
  ];
  const rows = orders.map((o) => {
    const pdfs: CardPdfEntry[] = Array.isArray(o.rationCardPdfs) ? o.rationCardPdfs : [];
    const cards: FamilyCard[] = Array.isArray(o.familyCards) ? o.familyCards : [];
    return [
      o.orderNumber, istReadable(o.createdAt), iso(o.createdAt), o.status,
      isDeletableStatus(o.status) ? "yes" : "no",
      o.operatorId == null ? "public" : "operator", o.operatorId ?? "",
      o.paymentStatus, o.amount, o.quantity, o.cardType,
      o.customerName, o.customerPhone, o.customerEmail ?? "", o.rationCardNumber,
      o.deliveryName ?? "", o.address, o.postOffice ?? "", o.district, o.state, o.pincode,
      o.paymentMethod ?? "", o.trackingNumber ?? "", o.courierName ?? "", o.notes ?? "",
      cards.length, pdfs.length,
      o.paymentScreenshotUrl ? lastSegment(storageKeyFromUploadUrl(o.paymentScreenshotUrl) ?? "") : "",
      o.welcomeLetterUrl ? lastSegment(storageKeyFromUploadUrl(o.welcomeLetterUrl) ?? "") : "",
      iso(o.submittedAt), iso(o.updatedAt),
    ];
  });
  return toCsvBuffer(header, rows);
}

export function buildFamilyCardsCsv(orders: Order[]): Buffer {
  const header = ["Order #", "Card position", "Member name", "Ration card #", "Card type", "PDF filename", "PDF downloaded"];
  const rows: unknown[][] = [];
  for (const o of orders) {
    const cards: FamilyCard[] = Array.isArray(o.familyCards) ? o.familyCards : [];
    const pdfs: CardPdfEntry[] = Array.isArray(o.rationCardPdfs) ? o.rationCardPdfs : [];
    const pdfByIndex = new Map(pdfs.map((p) => [p.cardIndex, p]));
    cards.forEach((c, i) => {
      const pdf = pdfByIndex.get(i);
      rows.push([
        o.orderNumber, i + 1, c.customerName, c.rationCardNumber, c.cardType,
        pdf ? (pdf.originalFilename ?? lastSegment(storageKeyFromUploadUrl(pdf.pdfUrl) ?? "")) : "",
        pdf ? (pdf.downloaded ? "yes" : "no") : "",
      ]);
      pdfByIndex.delete(i);
    });
    // PDFs whose index has no matching family-card entry (single-card orders
    // keep the member on the order itself) still get a row.
    for (const p of pdfByIndex.values()) {
      rows.push([
        o.orderNumber, p.cardIndex + 1, o.customerName, o.rationCardNumber, o.cardType,
        p.originalFilename ?? lastSegment(storageKeyFromUploadUrl(p.pdfUrl) ?? ""),
        p.downloaded ? "yes" : "no",
      ]);
    }
  }
  return toCsvBuffer(header, rows);
}

export function buildVerificationsCsv(rows: PaymentVerification[]): Buffer {
  const header = ["ID", "Order #", "Order ID", "Action", "By (admin email)", "Notes", "Screenshot", "Verified (IST)", "Verified (ISO)"];
  return toCsvBuffer(
    header,
    rows.map((v) => [
      v.id, v.orderNumber, v.orderId, v.action, v.adminEmail, v.notes ?? "",
      v.screenshotUrl ? lastSegment(storageKeyFromUploadUrl(v.screenshotUrl) ?? "") : "",
      istReadable(v.verifiedAt), iso(v.verifiedAt),
    ])
  );
}

// ── Misc ────────────────────────────────────────────────────────────────────

export function countByStatus(rows: Array<Pick<Order, "status">>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = (out[r.status] ?? 0) + 1;
  return out;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
