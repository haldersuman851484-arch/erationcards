import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { ordersTable, FamilyCardsSchema, ALLOWED_CARD_TYPES } from "@workspace/db";
import { eq, and, desc, gte, lte, sql, or, like, isNull, isNotNull } from "drizzle-orm";
import {
  CreateOrderBody,
  UpdateOrderStatusBody,
  UpdateOrderCustomerInfoBody,
  AssignOrderToOperatorBody,
  ListOrdersQueryParams,
  TrackOrderQueryParams,
} from "@workspace/api-zod";
import { generateOrderNumber, parseOperatorToken, parseAdminToken } from "../lib/auth";
import { computeOrderAmount } from "@workspace/pricing";
import { sendOrderConfirmationEmail } from "../lib/email";

// ── Delhivery tracking in-memory cache ──────────────────────────────────────
interface DelhiveryScan {
  date: string;
  location: string;
  status: string;
  activity: string;
}
const trackingCache = new Map<string, { scans: DelhiveryScan[]; expiresAt: number }>();
const TRACKING_TTL_MS = 5 * 60 * 1000; // 5 minutes

// A Delhivery shipment is delivered when a scan's status is the word
// "Delivered" (e.g. "Delivered", "Delivered to consignee") or the status code
// is "DL". Strict word matching plus explicit exclusions prevent false
// positives from "Undelivered", "Not delivered", "Failed delivery", or
// RTO/return scans.
export function hasDeliveredScan(scans: DelhiveryScan[]): boolean {
  return scans.some((s) => {
    const status = s.status.toLowerCase();
    const activity = s.activity.toLowerCase();
    const combined = `${status} ${activity}`;
    const excluded =
      /\bundelivered\b/.test(combined) ||
      /\bnot\s+delivered\b/.test(combined) ||
      /\bfailed\b/.test(combined) ||
      /\brto\b/.test(combined) ||
      /\breturn(ed|ing)?\b/.test(combined);
    if (excluded) return false;
    // "delivered" as a standalone word (not part of "undelivered" — \b treats
    // the "un" prefix as the same word, so the regex won't match it).
    return /\bdelivered\b/.test(status) || activity === "dl";
  });
}

// A Delhivery shipment is returned to sender when a scan mentions RTO or
// return wording (e.g. "RTO Initiated", "RTO Delivered", "Returned to
// origin"). These are exactly the scans hasDeliveredScan() excludes, so a
// returned shipment would otherwise stay "dispatched" forever.
export function hasRtoScan(scans: DelhiveryScan[]): boolean {
  return scans.some((s) => {
    const combined = `${s.status.toLowerCase()} ${s.activity.toLowerCase()}`;
    return /\brto\b/.test(combined) || /\breturn(ed|ing)?\b/.test(combined);
  });
}

function getDelhiveryBaseUrl(): string {
  return (process.env["DELHIVERY_ENV"] ?? "staging") === "production"
    ? "https://track.delhivery.com"
    : "https://staging-express.delhivery.com";
}

// Normalizes the reply of Delhivery's edit (cancel) endpoint, which answers in
// JSON on some deployments and XML on others (observed 2026-07-27: staging
// answers a successful cancel with
// <root><status>True</status>...<remark>Shipment has been cancelled.</remark></root>).
// Delhivery uses string booleans ("True"/"False"), so ONLY an explicit positive
// status counts as success — an ambiguous reply must never reset the order,
// because wrongly clearing the AWB would let the same order be dispatched twice
// while the first shipment is still live. Exported for tests.
export function parseDelhiveryCancelResponse(
  rawText: string,
): { kind: "success" | "rejected" | "invalid"; remark?: string } {
  const xmlStatus = rawText.match(
    /<(?:\w+:)?status\b[^>]*>\s*(?:<!\[CDATA\[)?\s*(true|false)\s*(?:\]\]>)?\s*<\/(?:\w+:)?status>/i,
  );
  if (xmlStatus) {
    const remark = rawText
      .match(/<(?:\w+:)?remark\b[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/(?:\w+:)?remark>/i)?.[1]
      ?.trim();
    return { kind: xmlStatus[1]!.toLowerCase() === "true" ? "success" : "rejected", remark };
  }

  let dData: any;
  try { dData = JSON.parse(rawText); } catch {
    return { kind: "invalid" };
  }
  const errMsg = dData?.error ?? dData?.rmk ?? dData?.remark;
  const remark = typeof errMsg === "string" ? errMsg : undefined;
  const s = dData?.status;
  if (s === true || (typeof s === "string" && s.trim().toLowerCase() === "true")) {
    return { kind: "success", remark };
  }
  if (s === false || (typeof s === "string" && s.trim().toLowerCase() === "false")) {
    return { kind: "rejected", remark };
  }
  // Unknown shape / missing status — refuse to guess.
  return { kind: "invalid", remark };
}

// Maps a raw Delhivery scan entry to our normalized shape.
function mapShipmentScans(shipment: any): DelhiveryScan[] {
  const shipmentScans: any[] = shipment?.Scans ?? [];
  return shipmentScans
    .map((s: any) => ({
      date:     s.ScanDetail?.ScanDateTime ?? s.ScanDetail?.StatusDateTime ?? "",
      location: s.ScanDetail?.ScannedLocation ?? "",
      status:   s.ScanDetail?.Scan ?? "",
      activity: s.ScanDetail?.Instructions ?? s.ScanDetail?.StatusCode ?? "",
    }))
    .filter((s: DelhiveryScan) => s.date)
    .reverse(); // most recent first
}

// Minimal logger contract shared by pino (req.log) and the app logger, so
// helpers can be used from both request handlers and the background job.
type Log = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

const router = Router();

// GET /orders - list all orders
// Courier/admin only — rows carry full customer contact details (name, phone,
// address, ration-card number), so unauthenticated access would leak PII.
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const params = ListOrdersQueryParams.parse(req.query);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const page = params.page ?? 1;
    // quickSearch: searches rationCardNumber (prefix) OR order id (exact) — capped at 5 results
    const quickSearch = typeof req.query.quickSearch === "string" ? req.query.quickSearch.trim() : undefined;
    const limit = quickSearch ? 5 : (params.limit ?? 20);
    const offset = (page - 1) * limit;

    const source = typeof req.query.source === "string" ? req.query.source : undefined;
    const paymentStatusFilter = typeof req.query.paymentStatus === "string" ? req.query.paymentStatus : undefined;
    const cardTypeFilter = typeof req.query.cardType === "string" ? req.query.cardType : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const rationCardSearch = typeof req.query.rationCardSearch === "string" ? req.query.rationCardSearch.trim() : undefined;
    const phoneSearch = typeof req.query.phoneSearch === "string" ? req.query.phoneSearch.trim() : undefined;

    const conditions = [];
    if (params.status) conditions.push(eq(ordersTable.status, params.status as any));
    if (params.operatorId) conditions.push(eq(ordersTable.operatorId, params.operatorId));
    if (source === "public") conditions.push(isNull(ordersTable.operatorId));
    if (source === "operator") conditions.push(isNotNull(ordersTable.operatorId));
    if (paymentStatusFilter) conditions.push(eq(ordersTable.paymentStatus, paymentStatusFilter as any));
    if (cardTypeFilter) conditions.push(eq(ordersTable.cardType, cardTypeFilter));
    if (fromDate) {
      const from = new Date(fromDate + "T00:00:00");
      if (!isNaN(from.getTime())) conditions.push(gte(ordersTable.createdAt, from));
    }
    if (toDate) {
      const to = new Date(toDate + "T23:59:59");
      if (!isNaN(to.getTime())) conditions.push(lte(ordersTable.createdAt, to));
    }
    if (rationCardSearch && rationCardSearch.length > 0) {
      conditions.push(like(ordersTable.rationCardNumber, `${rationCardSearch}%`));
    }
    if (phoneSearch && phoneSearch.length > 0) {
      conditions.push(eq(ordersTable.customerPhone, phoneSearch));
    }
    if (quickSearch && quickSearch.length > 0) {
      const numericId = parseInt(quickSearch);
      const rcMatch = like(ordersTable.rationCardNumber, `${quickSearch}%`);
      const onMatch = like(ordersTable.orderNumber, `${quickSearch}%`);
      const idMatch = !isNaN(numericId) ? eq(ordersTable.id, numericId) : undefined;
      conditions.push(idMatch ? or(rcMatch, onMatch, idMatch)! : or(rcMatch, onMatch)!);
    }
    if (search) {
      // Sanitize the term for FULLTEXT boolean mode: strip special operators
      // so user input cannot accidentally trigger boolean syntax errors.
      const sanitized = search.replace(/[+\-><()~*"@.]/g, " ").trim();

      if (sanitized.length >= 3) {
        // Use the FULLTEXT index (orders_search_ft) for searches long enough
        // to exceed MySQL's default minimum word length (ft_min_word_len = 3).
        // The trailing * enables prefix matching (e.g. "Ram" matches "Ramesh").
        conditions.push(
          sql`MATCH(customer_name, customer_phone, order_number) AGAINST (${sanitized + "*"} IN BOOLEAN MODE)`
        );
      } else {
        // Short terms (<3 chars) are below the FULLTEXT minimum word length;
        // fall back to LIKE for exact phone-digit prefix or order-number prefix.
        const term = `${search}%`;
        conditions.push(
          or(
            like(ordersTable.customerPhone, term),
            like(ordersTable.orderNumber, term)
          )!
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orders = await db
      .select()
      .from(ordersTable)
      .where(whereClause)
      // id tie-break: batch-created orders share a createdAt second; without a
      // deterministic order, paginated pages can repeat or skip tied rows.
      .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(whereClause);

    res.json({ orders: orders.map(formatOrder), total: Number(count), page, limit });
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Failed to list orders" });
  }
});

// POST /orders - create order
router.post("/orders", async (req: Request, res: Response) => {
  try {
    const body = CreateOrderBody.parse(req.body);
    const orderNumber = generateOrderNumber();

    if (!(ALLOWED_CARD_TYPES as readonly string[]).includes(body.cardType)) {
      res.status(400).json({ error: `Invalid card category. Must be one of: ${ALLOWED_CARD_TYPES.join(", ")}` });
      return;
    }

    if (!body.paymentScreenshotUrl || body.paymentScreenshotUrl.trim() === "") {
      res.status(400).json({ error: "Payment screenshot is required. Please upload your UPI payment screenshot before submitting." });
      return;
    }

    const familyCardsResult = FamilyCardsSchema.safeParse(body.familyCards ?? []);
    if (!familyCardsResult.success) {
      res.status(400).json({ error: "Invalid familyCards", details: familyCardsResult.error.issues });
      return;
    }
    const familyCards = familyCardsResult.data;
    const quantity = 1 + familyCards.length;
    const operatorId = parseOperatorToken(req);
    const isOperator = operatorId !== null;
    // Group-aware pricing from @workspace/pricing: ration categories vs
    // ABHA/E-SHRAM/GENERAL have different rates, and the single/multi tier is
    // decided by the order's total card count. Client-sent amount is ignored.
    const amount = computeOrderAmount(
      [body.cardType, ...familyCards.map((c) => c.cardType)],
      isOperator,
    );

    await db
      .insert(ordersTable)
      .values({
        orderNumber,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail ?? null,
        rationCardNumber: body.rationCardNumber,
        deliveryName: body.deliveryName ?? null,
        address: body.address,
        postOffice: body.postOffice ?? null,
        state: body.state,
        district: body.district,
        pincode: body.pincode,
        cardType: body.cardType,
        familyCards: familyCards as any,
        quantity,
        amount: String(amount),
        paymentStatus: (body.paymentStatus ?? "pending") as any,
        paymentMethod: body.paymentMethod ?? "upi",
        paymentScreenshotUrl: body.paymentScreenshotUrl ?? null,
        operatorId: operatorId ?? null,
      });

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderNumber, orderNumber)).limit(1);
    if (!order) { res.status(500).json({ error: "Failed to create order" }); return; }

    res.status(201).json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    res.status(400).json({ error: "Invalid order data" });
  }
});

// POST /orders/:orderNumber/submit — final step of the order wizard: the
// customer has uploaded their card PDFs and pressed Submit, so email them
// their order number. Public by design — the order number itself is the
// capability, same as the card-PDF upload endpoint. Email failure never
// blocks the submission: the order already exists and must not be lost.
router.post("/orders/:orderNumber/submit", async (req: Request, res: Response) => {
  try {
    const orderNumber = String(req.params.orderNumber);
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, orderNumber))
      .limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    // Idempotency guard: atomically claim the submission. Only the first
    // submit for an order sends the email — replays (double-clicks, network
    // retries, or abuse of this public endpoint) report the stored outcome
    // without re-sending anything.
    const [claim] = await db
      .update(ordersTable)
      .set({ submittedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(ordersTable.id, order.id), isNull(ordersTable.submittedAt)));
    if (claim.affectedRows === 0) {
      res.json({ success: true, emailSent: order.confirmationEmailSentAt != null });
      return;
    }

    let emailSent = false;
    if (order.customerEmail) {
      emailSent = await sendOrderConfirmationEmail(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          amount: String(order.amount),
          quantity: order.quantity,
        },
        req.log,
      );
      if (emailSent) {
        await db
          .update(ordersTable)
          .set({ confirmationEmailSentAt: new Date() })
          .where(eq(ordersTable.id, order.id));
      }
    } else {
      req.log.warn({ orderNumber }, "Order submitted without customerEmail; skipping email");
    }

    res.json({ success: true, emailSent });
  } catch (err) {
    req.log.error({ err }, "Failed to submit order");
    res.status(500).json({ error: "Failed to submit order" });
  }
});

// GET /orders/track - must be before /orders/:id
router.get("/orders/track", async (req: Request, res: Response) => {
  try {
    const params = TrackOrderQueryParams.parse(req.query);
    const conditions: ReturnType<typeof eq>[] = [];
    if (params.orderNumber) conditions.push(eq(ordersTable.orderNumber, params.orderNumber));
    if (params.rationCardNumber) conditions.push(eq(ordersTable.rationCardNumber, params.rationCardNumber));

    if (conditions.length === 0) {
      res.status(400).json({ error: "Provide orderNumber or rationCardNumber" });
      return;
    }

    // Fetch all matches (newest first) instead of just one: a family that
    // reordered has several orders under the same ration card number, and a
    // limit-1 query made the older ones unreachable from the one-box search.
    const matches = await db
      .select()
      .from(ordersTable)
      .where(or(...conditions))
      .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id));

    if (matches.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // An exact order-number hit always wins and jumps straight to that order.
    const byOrderNumber = params.orderNumber
      ? matches.find((m) => m.orderNumber === params.orderNumber)
      : undefined;

    // Otherwise it's a ration-card match: show the newest order. Either way,
    // when the query matched multiple orders (a family that reordered),
    // attach lightweight summaries of all of them so clients can offer a
    // pick list instead of silently hiding older orders. (The public track
    // page deliberately ignores otherOrders and keeps its newest-only view.)
    const selected = byOrderNumber ?? matches[0]!;
    const payload = formatOrder(selected) as Record<string, unknown>;
    if (matches.length > 1) {
      payload.otherOrders = matches.map((m) => ({
        orderNumber: m.orderNumber,
        status: m.status,
        cardType: m.cardType,
        quantity: m.quantity,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
      }));
    }
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "Failed to track order");
    res.status(500).json({ error: "Failed to track order" });
  }
});

// GET /orders/stats
router.get("/orders/stats", async (req: Request, res: Response) => {
  try {
    // Admin only — exposes revenue and order volume
    if (!parseAdminToken(req)) { res.status(401).json({ error: "Not authenticated" }); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allStats] = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        pendingOrders: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
        processingOrders: sql<number>`sum(case when status = 'processing' then 1 else 0 end)`,
        printedOrders: sql<number>`sum(case when status = 'printed' then 1 else 0 end)`,
        dispatchedOrders: sql<number>`sum(case when status = 'dispatched' then 1 else 0 end)`,
        deliveredOrders: sql<number>`sum(case when status = 'delivered' then 1 else 0 end)`,
        returnedOrders: sql<number>`sum(case when status = 'returned' then 1 else 0 end)`,
        totalRevenue: sql<number>`coalesce(sum(amount), 0)`,
      })
      .from(ordersTable);

    const [todayStats] = await db
      .select({
        todayOrders: sql<number>`count(*)`,
        todayRevenue: sql<number>`coalesce(sum(amount), 0)`,
      })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, today));

    res.json({
      totalOrders: Number(allStats.totalOrders),
      pendingOrders: Number(allStats.pendingOrders),
      processingOrders: Number(allStats.processingOrders),
      printedOrders: Number(allStats.printedOrders),
      dispatchedOrders: Number(allStats.dispatchedOrders),
      deliveredOrders: Number(allStats.deliveredOrders),
      returnedOrders: Number(allStats.returnedOrders),
      totalRevenue: Number(allStats.totalRevenue),
      todayOrders: Number(todayStats.todayOrders),
      todayRevenue: Number(todayStats.todayRevenue),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get order stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// GET /orders/recent
router.get("/orders/recent", async (req: Request, res: Response) => {
  try {
    // Admin only — rows carry full customer contact details
    if (!parseAdminToken(req)) { res.status(401).json({ error: "Not authenticated" }); return; }

    const orders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
      .limit(10);
    res.json(orders.map(formatOrder));
  } catch (err) {
    req.log.error({ err }, "Failed to list recent orders");
    res.status(500).json({ error: "Failed to list recent orders" });
  }
});

// GET /orders/:id
router.get("/orders/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    // Admin, or the operator the order is assigned to — full customer PII
    const admin = parseAdminToken(req);
    const operatorId = parseOperatorToken(req);
    if (!admin && operatorId === null) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (!admin && order.operatorId !== operatorId) { res.status(403).json({ error: "Not authorized" }); return; }

    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Failed to get order" });
  }
});

// Valid order statuses — mirrors the mysqlEnum in the @workspace/db orders schema
const ALLOWED_ORDER_STATUSES = new Set([
  "pending", "processing", "printed", "dispatched", "delivered", "returned", "cancelled",
]);

// PATCH /orders/:id — admin only. Operators must not modify orders (status
// changes are the admin's job), so operator tokens are rejected like any
// other non-admin credential.
router.patch("/orders/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const body = UpdateOrderStatusBody.parse(req.body);
    if (body.status && !ALLOWED_ORDER_STATUSES.has(body.status)) {
      res.status(400).json({ error: `Invalid status: ${body.status}` }); return;
    }
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.status) updates.status = body.status;
    if (body.trackingNumber) updates.trackingNumber = body.trackingNumber;
    if (body.courierName) updates.courierName = body.courierName;
    if (body.notes) updates.notes = body.notes;

    await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to update order");
    res.status(400).json({ error: "Failed to update order" });
  }
});

// ── PATCH /orders/:id/customer-info ─────────────────────────────────────────
// Admin corrects the customer's contact & delivery details after the customer
// filled them in wrong. Strict whitelist: status, payment, and card fields can
// never be changed through this endpoint (the zod schema strips unknown keys
// and the update below only sets the seven customer columns).

const CUSTOMER_INFO_FIELDS = [
  "customerName", "customerPhone", "address", "postOffice", "district", "pincode", "state",
] as const;

const CUSTOMER_INFO_FRIENDLY_ERRORS: Record<string, string> = {
  customerName: "Customer name cannot be empty",
  customerPhone: "Mobile number must be exactly 10 digits",
  address: "Street address cannot be empty",
  postOffice: "Post office name is too long",
  district: "Town/District cannot be empty",
  pincode: "PIN code must be exactly 6 digits",
  state: "State cannot be empty",
};

router.patch("/orders/:id/customer-info", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    // Trim before validation so "   " fails the same way "" does.
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const trimmed: Record<string, unknown> = { ...raw };
    for (const key of CUSTOMER_INFO_FIELDS) {
      if (typeof trimmed[key] === "string") trimmed[key] = (trimmed[key] as string).trim();
    }

    const parsed = UpdateOrderCustomerInfoBody.safeParse(trimmed);
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? "");
      res.status(400).json({ error: CUSTOMER_INFO_FRIENDLY_ERRORS[field] ?? "Invalid customer details" });
      return;
    }
    const body = parsed.data;

    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    await db
      .update(ordersTable)
      .set({
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        address: body.address,
        postOffice: body.postOffice && body.postOffice.length > 0 ? body.postOffice : null,
        district: body.district,
        pincode: body.pincode,
        state: body.state,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, id));

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to update customer info");
    res.status(500).json({ error: "Failed to update customer details" });
  }
});

// PATCH /orders/:id/pdfs/:cardIndex/downloaded — marks a specific card PDF as downloaded
// Requires a valid admin token (couriers log in as admin via the same auth flow).
router.patch("/orders/:id/pdfs/:cardIndex/downloaded", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const id        = parseInt(String(req.params.id));
    const cardIndex = parseInt(String(req.params.cardIndex));
    if (isNaN(id) || isNaN(cardIndex)) {
      res.status(400).json({ error: "Invalid order ID or card index" }); return;
    }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    const pdfs: any[] = order.rationCardPdfs ?? [];
    const entryExists = pdfs.some(p => p.cardIndex === cardIndex);
    if (!entryExists) {
      res.status(404).json({ error: `No PDF found for cardIndex ${cardIndex}` }); return;
    }

    const updatedPdfs = pdfs.map(p =>
      p.cardIndex === cardIndex
        ? { ...p, downloaded: true, downloadedAt: new Date().toISOString() }
        : p
    );

    await db.update(ordersTable)
      .set({ rationCardPdfs: updatedPdfs as any, updatedAt: new Date() })
      .where(eq(ordersTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark PDF as downloaded");
    res.status(500).json({ error: "Failed to mark PDF as downloaded" });
  }
});

// POST /orders/:id/dispatch  — admin only, creates Delhivery shipment
router.post("/orders/:id/dispatch", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    if (order.status !== "printed") {
      res.status(400).json({ error: "Order must be in 'printed' status to dispatch" }); return;
    }
    if (order.trackingNumber) {
      res.status(400).json({ error: "Order already dispatched", trackingNumber: order.trackingNumber }); return;
    }

    // Check required env vars
    const apiToken       = process.env["DELHIVERY_API_TOKEN"];
    const pickupLocation = process.env["DELHIVERY_PICKUP_LOCATION"];
    const returnName     = process.env["DELHIVERY_RETURN_NAME"];
    const returnPhone    = process.env["DELHIVERY_RETURN_PHONE"];
    const returnAdd      = process.env["DELHIVERY_RETURN_ADD"];
    const returnPin      = process.env["DELHIVERY_RETURN_PIN"];
    const returnCity     = process.env["DELHIVERY_RETURN_CITY"];
    const returnState    = process.env["DELHIVERY_RETURN_STATE"];

    const missing = [
      !apiToken       && "DELHIVERY_API_TOKEN",
      !pickupLocation && "DELHIVERY_PICKUP_LOCATION",
      !returnName     && "DELHIVERY_RETURN_NAME",
      !returnPhone    && "DELHIVERY_RETURN_PHONE",
      !returnAdd      && "DELHIVERY_RETURN_ADD",
      !returnPin      && "DELHIVERY_RETURN_PIN",
      !returnCity     && "DELHIVERY_RETURN_CITY",
      !returnState    && "DELHIVERY_RETURN_STATE",
    ].filter(Boolean);
    if (missing.length > 0) {
      res.status(503).json({ error: `Delhivery not configured. Missing secrets: ${missing.join(", ")}` });
      return;
    }

    const weightG = parseInt(process.env["DELHIVERY_WEIGHT_G"] ?? "200");
    const orderDate = new Date().toISOString().slice(0, 10);

    const shipmentPayload = {
      shipments: [{
        name:         order.customerName,
        // Full street address incl. post office — city/state/pin have their own
        // fields. Trim first so whitespace-only parts can't leave stray commas.
        add:          [order.address, order.postOffice]
                        .map((v) => String(v ?? "").trim())
                        .filter(Boolean)
                        .join(", "),
        pin:          order.pincode,
        city:         order.district,
        state:        order.state,
        country:      "India",
        phone:        order.customerPhone,
        order:        order.orderNumber,
        payment_mode: "Pre-paid",
        return_pin:   returnPin,
        return_city:  returnCity,
        return_phone: returnPhone,
        return_name:  returnName,
        return_add:   returnAdd,
        return_state: returnState,
        return_email: "",
        products_desc:     "PVC Ration Card",
        hsn_code:          "",
        cod_amount:        "0",
        order_date:        orderDate,
        total_amount:      String(order.amount),
        seller_add:        returnAdd,
        seller_name:       returnName,
        seller_inv:        order.orderNumber,
        quantity:          String(order.quantity),
        waybill:           "",
        shipment_width:    15,
        shipment_height:   1,
        weight:            weightG,
        shipment_length:   10,
        pickup_location:   { name: pickupLocation },
      }],
    };

    const baseUrl = getDelhiveryBaseUrl();
    // Delhivery's CMU endpoint expects application/x-www-form-urlencoded
    // with two fields: format=json and data=<JSON-stringified payload>.
    const formBody = new URLSearchParams({
      format: "json",
      data: JSON.stringify(shipmentPayload),
    });
    // Abort the Delhivery request after 15s so a hung upstream can't leave
    // the courier's UI spinning forever or exhaust server connection slots.
    const DELHIVERY_TIMEOUT_MS = 15_000;
    let dResponse: globalThis.Response;
    try {
      dResponse = await fetch(`${baseUrl}/api/cmu/create.json`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
        signal: AbortSignal.timeout(DELHIVERY_TIMEOUT_MS),
      });
    } catch (fetchErr: any) {
      if (fetchErr?.name === "TimeoutError" || fetchErr?.name === "AbortError") {
        req.log.error({ orderId: id }, "Delhivery API timed out during dispatch");
        res.status(504).json({ error: "Delhivery is taking too long to respond. The shipment was not created — please try again in a few minutes." });
        return;
      }
      req.log.error({ err: fetchErr, orderId: id }, "Delhivery API unreachable during dispatch");
      res.status(504).json({ error: "Could not reach Delhivery. The shipment was not created — please check the connection and try again." });
      return;
    }

    const rawText = await dResponse.text();
    let dData: any;
    try { dData = JSON.parse(rawText); } catch {
      req.log.error({ status: dResponse.status, body: rawText }, "Delhivery non-JSON response");
      res.status(502).json({ error: "Delhivery API returned an invalid response" }); return;
    }

    if (!dResponse.ok || !Array.isArray(dData?.packages) || dData.packages.length === 0) {
      req.log.error({ status: dResponse.status, body: dData }, "Delhivery API error");
      res.status(502).json({ error: dData?.rmk ?? "Delhivery API error" }); return;
    }

    const pkg = dData.packages[0];
    if (pkg.status !== "Success") {
      const errMsg = pkg["error_message"] ?? pkg.rmk ?? "Shipment creation failed";
      res.status(502).json({ error: errMsg }); return;
    }

    const awb = pkg.waybill as string;
    if (!awb) {
      res.status(502).json({ error: "Delhivery did not return a waybill number" }); return;
    }

    await db.update(ordersTable).set({
      trackingNumber: awb,
      courierName:    "Delhivery",
      status:         "dispatched" as any,
      updatedAt:      new Date(),
    }).where(eq(ordersTable.id, id));

    const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    res.json({ awb, trackingNumber: awb, order: formatOrder(updated) });
  } catch (err) {
    req.log.error({ err }, "Failed to dispatch order via Delhivery");
    res.status(500).json({ error: "Failed to dispatch order" });
  }
});

// DELETE /orders/:id/dispatch — admin only, cancels the Delhivery shipment and
// resets the order back to 'printed' so it can be re-dispatched.
router.delete("/orders/:id/dispatch", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    if (!order.trackingNumber) {
      res.status(400).json({ error: "Order has no shipment to cancel" }); return;
    }
    if (order.status !== "dispatched") {
      res.status(400).json({ error: "Only dispatched orders can have their shipment cancelled" }); return;
    }

    const apiToken = process.env["DELHIVERY_API_TOKEN"];
    if (!apiToken) {
      res.status(503).json({ error: "Delhivery not configured. Missing secret: DELHIVERY_API_TOKEN" }); return;
    }

    const awb = order.trackingNumber;
    const baseUrl = getDelhiveryBaseUrl();
    // Delhivery's edit endpoint cancels a shipment (before pickup) when called
    // with cancellation: "true" for the given waybill.
    const dResponse = await fetch(`${baseUrl}/api/p/edit`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ waybill: awb, cancellation: "true" }),
    });

    const rawText = await dResponse.text();
    const parsed = parseDelhiveryCancelResponse(rawText);

    if (parsed.kind === "invalid") {
      req.log.error({ status: dResponse.status, body: rawText }, "Delhivery cancel unrecognized response");
      res.status(502).json({ error: "Delhivery API returned an invalid response" });
      return;
    }
    // Delhivery rejects cancellation (e.g. already picked up) with status false
    // plus a remark/error message. Only an explicit success may reset the order.
    if (!dResponse.ok || parsed.kind === "rejected") {
      req.log.error({ status: dResponse.status, body: rawText }, "Delhivery cancel rejected");
      res.status(502).json({ error: parsed.remark || "Delhivery rejected the cancellation" });
      return;
    }

    // Reset the order so it can be re-dispatched
    await db.update(ordersTable).set({
      trackingNumber: null,
      courierName:    null,
      status:         "printed" as any,
      updatedAt:      new Date(),
    }).where(eq(ordersTable.id, id));

    trackingCache.delete(awb);

    const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    res.json({ ok: true, cancelledAwb: awb, order: formatOrder(updated) });
  } catch (err) {
    req.log.error({ err }, "Failed to cancel Delhivery shipment");
    res.status(500).json({ error: "Failed to cancel shipment" });
  }
});

// Flips a dispatched order to "delivered" when the Delhivery scan feed shows a
// Delivered scan, or to "returned" when it shows an RTO/return scan. A genuine
// Delivered scan wins over RTO wording (e.g. delivered on a later attempt).
// Never throws — a status-sync failure must not break tracking.
async function autoMarkDelivered(order: { id: number; status: string }, scans: DelhiveryScan[], log: Log): Promise<boolean> {
  try {
    if (order.status !== "dispatched") return false;
    let newStatus: "delivered" | "returned";
    if (hasDeliveredScan(scans)) newStatus = "delivered";
    else if (hasRtoScan(scans)) newStatus = "returned";
    else return false;
    const [result]: any = await db.update(ordersTable)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "dispatched" as any)));
    if ((result?.affectedRows ?? 0) > 0) {
      log.info({ orderId: order.id, status: newStatus }, `Order auto-marked as ${newStatus} from Delhivery scan`);
      return true;
    }
    return false;
  } catch (err) {
    log.error({ err, orderId: order.id }, "Failed to auto-mark order status from scans");
    return false;
  }
}

// ── Background delivered-status sync ────────────────────────────────────────
// Delhivery's tracking API accepts multiple comma-separated waybills per call;
// batching keeps us rate-limit friendly.
const SYNC_BATCH_SIZE = 25;
const SYNC_FETCH_TIMEOUT_MS = 20_000;

// Fetches scans for a batch of waybills in one API call. Returns a map of
// awb → scans for the shipments Delhivery returned. Throws on network/API
// failure — the caller logs and moves on.
async function fetchScansBatch(awbs: string[], apiToken: string): Promise<Map<string, DelhiveryScan[]>> {
  const baseUrl = getDelhiveryBaseUrl();
  const tResponse = await fetch(
    `${baseUrl}/api/v1/packages/json/?waybill=${encodeURIComponent(awbs.join(","))}&token=${encodeURIComponent(apiToken)}`,
    { signal: AbortSignal.timeout(SYNC_FETCH_TIMEOUT_MS) }
  );
  if (!tResponse.ok) {
    throw new Error(`Delhivery tracking API returned HTTP ${tResponse.status}`);
  }
  const tData = await tResponse.json() as any;
  const result = new Map<string, DelhiveryScan[]>();
  for (const entry of tData?.ShipmentData ?? []) {
    const shipment = entry?.Shipment;
    const awb = String(shipment?.AWB ?? "");
    if (!awb) continue;
    result.set(awb, mapShipmentScans(shipment));
  }
  return result;
}

// Periodic job: checks every dispatched Delhivery order and flips it to
// "delivered" when the scan feed shows a Delivered scan. Reuses the 5-min
// tracking cache (fresh cache entries skip the API entirely, and fetched
// scans are cached for the tracking page). Never throws.
export async function syncDeliveredOrders(log: Log): Promise<void> {
  try {
    const apiToken = process.env["DELHIVERY_API_TOKEN"];
    if (!apiToken) {
      log.warn({}, "Delivered-status sync skipped: DELHIVERY_API_TOKEN not configured");
      return;
    }

    const dispatched = await db
      .select()
      .from(ordersTable)
      .where(and(
        eq(ordersTable.status, "dispatched" as any),
        isNotNull(ordersTable.trackingNumber),
        or(isNull(ordersTable.courierName), eq(ordersTable.courierName, "Delhivery"))!,
      ));

    if (dispatched.length === 0) return;

    const now = Date.now();
    let marked = 0;

    // Serve from cache where fresh; collect the rest for batched fetches.
    const uncached: typeof dispatched = [];
    for (const order of dispatched) {
      const cached = trackingCache.get(order.trackingNumber!);
      if (cached && cached.expiresAt > now) {
        if (await autoMarkDelivered(order, cached.scans, log)) marked++;
      } else {
        uncached.push(order);
      }
    }

    for (let i = 0; i < uncached.length; i += SYNC_BATCH_SIZE) {
      const batch = uncached.slice(i, i + SYNC_BATCH_SIZE);
      let scansByAwb: Map<string, DelhiveryScan[]>;
      try {
        scansByAwb = await fetchScansBatch(batch.map(o => o.trackingNumber!), apiToken);
      } catch (err) {
        log.error({ err, waybills: batch.length }, "Delivered-status sync: batch fetch failed, skipping batch");
        continue;
      }
      for (const order of batch) {
        const scans = scansByAwb.get(order.trackingNumber!);
        if (!scans) continue;
        trackingCache.set(order.trackingNumber!, { scans, expiresAt: Date.now() + TRACKING_TTL_MS });
        if (await autoMarkDelivered(order, scans, log)) marked++;
      }
    }

    log.info({ dispatched: dispatched.length, marked }, "Delivered-status sync completed");
  } catch (err) {
    log.error({ err }, "Delivered-status sync failed");
  }
}

// GET /orders/:id/tracking  — public, proxies Delhivery tracking with 5-min cache
router.get("/orders/:id/tracking", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (!order.trackingNumber) {
      res.status(404).json({ error: "No tracking number for this order" }); return;
    }

    const awb = order.trackingNumber;
    const now = Date.now();
    const cached = trackingCache.get(awb);
    if (cached && cached.expiresAt > now) {
      await autoMarkDelivered(order, cached.scans, req.log);
      res.json({ scans: cached.scans, awb }); return;
    }

    const apiToken = process.env["DELHIVERY_API_TOKEN"];
    if (!apiToken) {
      res.status(503).json({ error: "Delhivery not configured" }); return;
    }

    const baseUrl = getDelhiveryBaseUrl();
    const tResponse = await fetch(
      `${baseUrl}/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}&token=${encodeURIComponent(apiToken)}`
    );

    if (!tResponse.ok) {
      res.status(502).json({ error: "Delhivery tracking API error" }); return;
    }

    const tData = await tResponse.json() as any;
    const scans = mapShipmentScans(tData?.ShipmentData?.[0]?.Shipment);

    trackingCache.set(awb, { scans, expiresAt: now + TRACKING_TTL_MS });
    await autoMarkDelivered(order, scans, req.log);
    res.json({ scans, awb });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Delhivery tracking");
    res.status(500).json({ error: "Failed to fetch tracking data" });
  }
});

// PATCH /orders/:id/assign
router.patch("/orders/:id/assign", async (req: Request, res: Response) => {
  try {
    // Admin only
    if (!parseAdminToken(req)) { res.status(401).json({ error: "Not authenticated" }); return; }

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const body = AssignOrderToOperatorBody.parse(req.body);
    await db
      .update(ordersTable)
      .set({ operatorId: body.operatorId, updatedAt: new Date() })
      .where(eq(ordersTable.id, id));

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to assign order");
    res.status(400).json({ error: "Failed to assign order" });
  }
});

function formatOrder(o: any) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail ?? null,
    rationCardNumber: o.rationCardNumber,
    deliveryName: o.deliveryName ?? null,
    address: o.address,
    postOffice: o.postOffice ?? null,
    state: o.state,
    district: o.district,
    pincode: o.pincode,
    cardType: o.cardType,
    familyCards: o.familyCards ?? [],
    rationCardPdfs: o.rationCardPdfs ?? [],
    quantity: o.quantity,
    amount: Number(o.amount),
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod ?? null,
    paymentScreenshotUrl: o.paymentScreenshotUrl ?? null,
    status: o.status,
    operatorId: o.operatorId ?? null,
    operatorName: null as string | null,
    trackingNumber: o.trackingNumber ?? null,
    courierName: o.courierName ?? null,
    notes: o.notes ?? null,
    welcomeLetterUrl: o.welcomeLetterUrl ?? null,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
  };
}

export default router;
