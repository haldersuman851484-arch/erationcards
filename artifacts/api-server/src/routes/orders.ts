import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { ordersTable, FamilyCardsSchema, ALLOWED_CARD_TYPES } from "@workspace/db";
import { eq, and, desc, gte, lte, sql, or, like, isNull, isNotNull } from "drizzle-orm";
import {
  CreateOrderBody,
  UpdateOrderStatusBody,
  AssignOrderToOperatorBody,
  ListOrdersQueryParams,
  TrackOrderQueryParams,
} from "@workspace/api-zod";
import { generateOrderNumber, parseOperatorToken } from "../lib/auth";

const router = Router();

const SINGLE_CARD_PRICE = 70;
const PUBLIC_CARD_PRICE = 50;
const OPERATOR_CARD_PRICE = 40;

// GET /orders - list all orders
router.get("/orders", async (req: Request, res: Response) => {
  try {
    const params = ListOrdersQueryParams.parse(req.query);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const source = typeof req.query.source === "string" ? req.query.source : undefined;
    const paymentStatusFilter = typeof req.query.paymentStatus === "string" ? req.query.paymentStatus : undefined;
    const cardTypeFilter = typeof req.query.cardType === "string" ? req.query.cardType : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const rationCardSearch = typeof req.query.rationCardSearch === "string" ? req.query.rationCardSearch.trim() : undefined;

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
      .orderBy(desc(ordersTable.createdAt))
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
    const perCard = quantity === 1 ? SINGLE_CARD_PRICE : (isOperator ? OPERATOR_CARD_PRICE : PUBLIC_CARD_PRICE);
    const amount = perCard * quantity;

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

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(or(...conditions))
      .orderBy(desc(ordersTable.createdAt))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to track order");
    res.status(500).json({ error: "Failed to track order" });
  }
});

// GET /orders/stats
router.get("/orders/stats", async (req: Request, res: Response) => {
  try {
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
    const orders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt))
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

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    res.json(formatOrder(order));
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Failed to get order" });
  }
});

// PATCH /orders/:id
router.patch("/orders/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const body = UpdateOrderStatusBody.parse(req.body);
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

// PATCH /orders/:id/assign
router.patch("/orders/:id/assign", async (req: Request, res: Response) => {
  try {
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
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
  };
}

export default router;
