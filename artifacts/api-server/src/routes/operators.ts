import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { operatorsTable, ordersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  RegisterOperatorBody,
  LoginOperatorBody,
  GetOperatorOrdersQueryParams,
} from "@workspace/api-zod";
import { createOperatorToken, hashPassword, parseStaffToken, requireOperator } from "../lib/auth";

const router = Router();

// GET /operators — staff only (the roster carries emails, phones, addresses
// and wallet balances). Admin may list everything and filter by any status
// (e.g. pending applications); processing staff always get the ACTIVE roster
// only — pending/suspended applications are admin territory.
router.get("/operators", async (req: Request, res: Response) => {
  try {
    const staff = await parseStaffToken(req);
    if (!staff) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const statusFilter = req.query.status as string | undefined;
    if (staff.role !== "admin" && statusFilter && statusFilter !== "active") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const effectiveStatus = staff.role === "admin" ? statusFilter : "active";

    const rows = effectiveStatus
      ? await db.select().from(operatorsTable).where(eq(operatorsTable.status, effectiveStatus as any))
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
    await db
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
      });

    const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.email, body.email)).limit(1);
    if (!operator) { res.status(500).json({ error: "Failed to create operator" }); return; }

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
    // requireOperator centrally rejects terminated (deleted) accounts too.
    const operatorId = await requireOperator(req, res);
    if (operatorId === null) return;

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
    // requireOperator centrally rejects terminated (deleted) accounts too.
    const operatorId = await requireOperator(req, res);
    if (operatorId === null) return;

    const [stats] = await db
      .select({
        totalAssigned: sql<number>`count(*)`,
        pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
        processing: sql<number>`sum(case when status = 'processing' then 1 else 0 end)`,
        printed: sql<number>`sum(case when status = 'printed' then 1 else 0 end)`,
        dispatched: sql<number>`sum(case when status = 'dispatched' then 1 else 0 end)`,
        delivered: sql<number>`sum(case when status = 'delivered' then 1 else 0 end)`,
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
    // requireOperator centrally rejects terminated (deleted) accounts too.
    const operatorId = await requireOperator(req, res);
    if (operatorId === null) return;

    const [operator] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, operatorId));
    if (!operator) { res.status(401).json({ error: "Not authenticated" }); return; }

    res.json(formatOperator(operator));
  } catch (err) {
    req.log.error({ err }, "Failed to get current operator");
    res.status(500).json({ error: "Failed to get profile" });
  }
});

export function formatOperator(op: any) {
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
