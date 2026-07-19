import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { operatorsTable, ordersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  RegisterOperatorBody,
  LoginOperatorBody,
  GetOperatorOrdersQueryParams,
} from "@workspace/api-zod";
import { parseOperatorToken, createOperatorToken, hashPassword } from "../lib/auth";

const router = Router();

// GET /operators
router.get("/operators", async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const rows = statusFilter
      ? await db.select().from(operatorsTable).where(eq(operatorsTable.status, statusFilter as any))
      : await db.select().from(operatorsTable);
    res.json(rows.map(formatOperator));
  } catch (err) {
    req.log.error({ err }, "Failed to list operators");
    res.status(500).json({ error: "Failed to list operators" });
  }
});

// POST /operators - register
router.post("/operators", async (req: Request, res: Response) => {
  try {
    const body = RegisterOperatorBody.parse(req.body);
    const existing = await db.select().from(operatorsTable).where(eq(operatorsTable.email, body.email));
    if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }

    const passwordHash = hashPassword(body.password);
    const [operator] = await db
      .insert(operatorsTable)
      .values({
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        shopName: body.shopName,
        address: body.address,
        state: body.state,
        district: body.district,
        pincode: body.pincode,
        status: "pending",
      })
      .returning();

    const token = createOperatorToken(operator.id);
    res.status(201).json({ operator: formatOperator(operator), token });
  } catch (err) {
    req.log.error({ err }, "Failed to register operator");
    res.status(400).json({ error: "Failed to register operator" });
  }
});

// POST /operators/login - must be before /operators/me
router.post("/operators/login", async (req: Request, res: Response) => {
  try {
    const body = LoginOperatorBody.parse(req.body);
    const passwordHash = hashPassword(body.password);

    const [operator] = await db
      .select()
      .from(operatorsTable)
      .where(and(eq(operatorsTable.email, body.email), eq(operatorsTable.passwordHash, passwordHash)));

    if (!operator) { res.status(401).json({ error: "Invalid email or password" }); return; }
    if (operator.status === "pending") { res.status(403).json({ error: "Your application is under review. Please wait for admin approval." }); return; }
    if (operator.status === "suspended") { res.status(403).json({ error: "Account suspended. Contact admin." }); return; }

    const token = createOperatorToken(operator.id);
    res.json({ operator: formatOperator(operator), token });
  } catch (err) {
    req.log.error({ err }, "Failed to login");
    res.status(400).json({ error: "Failed to login" });
  }
});

// POST /operators/logout
router.post("/operators/logout", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /operators/me/orders - must be before /operators/me
router.get("/operators/me/orders", async (req: Request, res: Response) => {
  try {
    const operatorId = parseOperatorToken(req);
    if (!operatorId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const params = GetOperatorOrdersQueryParams.parse(req.query);
    const conditions: ReturnType<typeof eq>[] = [eq(ordersTable.operatorId, operatorId)];
    if (params.status) conditions.push(eq(ordersTable.status, params.status as any));

    const orders = await db.select().from(ordersTable).where(and(...conditions));
    res.json(orders.map(formatOrder));
  } catch (err) {
    req.log.error({ err }, "Failed to get operator orders");
    res.status(500).json({ error: "Failed to get orders" });
  }
});

// GET /operators/me/stats - must be before /operators/me
router.get("/operators/me/stats", async (req: Request, res: Response) => {
  try {
    const operatorId = parseOperatorToken(req);
    if (!operatorId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [stats] = await db
      .select({
        totalAssigned: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        processing: sql<number>`count(*) filter (where status = 'processing')`,
        printed: sql<number>`count(*) filter (where status = 'printed')`,
        dispatched: sql<number>`count(*) filter (where status = 'dispatched')`,
        delivered: sql<number>`count(*) filter (where status = 'delivered')`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.operatorId, operatorId));

    const [operator] = await db
      .select({ walletBalance: operatorsTable.walletBalance })
      .from(operatorsTable)
      .where(eq(operatorsTable.id, operatorId));

    res.json({
      totalAssigned: Number(stats.totalAssigned),
      pending: Number(stats.pending),
      processing: Number(stats.processing),
      printed: Number(stats.printed),
      dispatched: Number(stats.dispatched),
      delivered: Number(stats.delivered),
      walletBalance: Number(operator?.walletBalance ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get operator stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// GET /operators/me
router.get("/operators/me", async (req: Request, res: Response) => {
  try {
    const operatorId = parseOperatorToken(req);
    if (!operatorId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, operatorId));
    if (!operator) { res.status(401).json({ error: "Not authenticated" }); return; }

    res.json(formatOperator(operator));
  } catch (err) {
    req.log.error({ err }, "Failed to get current operator");
    res.status(500).json({ error: "Failed to get profile" });
  }
});

function formatOperator(op: any) {
  return {
    id: op.id,
    name: op.name,
    email: op.email,
    phone: op.phone,
    shopName: op.shopName,
    address: op.address,
    state: op.state,
    district: op.district,
    pincode: op.pincode,
    status: op.status,
    walletBalance: Number(op.walletBalance ?? 0),
    totalOrdersHandled: op.totalOrdersHandled ?? 0,
    createdAt: op.createdAt instanceof Date ? op.createdAt.toISOString() : String(op.createdAt),
  };
}

function formatOrder(o: any) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerEmail: o.customerEmail ?? null,
    rationCardNumber: o.rationCardNumber,
    address: o.address,
    state: o.state,
    district: o.district,
    pincode: o.pincode,
    cardType: o.cardType,
    quantity: o.quantity,
    amount: Number(o.amount),
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod ?? null,
    status: o.status,
    operatorId: o.operatorId ?? null,
    operatorName: null as string | null,
    trackingNumber: o.trackingNumber ?? null,
    notes: o.notes ?? null,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
  };
}

export default router;
