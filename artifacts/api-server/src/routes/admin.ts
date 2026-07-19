import { Router, Request, Response } from "express";
import { LoginAdminBody } from "@workspace/api-zod";
import { ADMIN_EMAIL, ADMIN_PASSWORD, createAdminToken, parseAdminToken } from "../lib/auth";
import { db } from "@workspace/db";
import { paymentVerificationsTable, operatorsTable } from "@workspace/db";
import { desc, sql, eq } from "drizzle-orm";

const router = Router();

// GET /admin/verifications
router.get("/admin/verifications", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));
    const offset = (page - 1) * limit;

    const [verifications, [{ count }]] = await Promise.all([
      db.select().from(paymentVerificationsTable)
        .orderBy(desc(paymentVerificationsTable.verifiedAt))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(paymentVerificationsTable),
    ]);

    res.json({
      verifications: verifications.map((v) => ({
        ...v,
        verifiedAt: v.verifiedAt instanceof Date ? v.verifiedAt.toISOString() : String(v.verifiedAt),
      })),
      total: Number(count),
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list verifications");
    res.status(500).json({ error: "Failed to list verifications" });
  }
});

// PATCH /admin/operators/:id/status
router.patch("/admin/operators/:id/status", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) { res.status(400).json({ error: "Invalid operator ID" }); return; }

    const { status } = req.body;
    if (!["active", "pending", "suspended"].includes(status)) {
      res.status(400).json({ error: "Invalid status value" }); return;
    }

    const [operator] = await db
      .update(operatorsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(operatorsTable.id, id))
      .returning();

    if (!operator) { res.status(404).json({ error: "Operator not found" }); return; }

    res.json({
      id: operator.id,
      name: operator.name,
      email: operator.email,
      status: operator.status,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update operator status");
    res.status(500).json({ error: "Failed to update operator status" });
  }
});

// POST /admin/login
router.post("/admin/login", async (req: Request, res: Response) => {
  try {
    const body = LoginAdminBody.parse(req.body);

    if (body.email !== ADMIN_EMAIL || body.password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const token = createAdminToken(body.email, "admin");
    res.json({ role: "admin", email: body.email, token });
  } catch (err) {
    req.log.error({ err }, "Admin login failed");
    res.status(400).json({ error: "Login failed" });
  }
});

// GET /admin/me
router.get("/admin/me", async (req: Request, res: Response) => {
  try {
    const admin = parseAdminToken(req);
    if (!admin) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json({ role: admin.role, email: admin.email });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin session");
    res.status(500).json({ error: "Failed to get session" });
  }
});

// POST /admin/logout
router.post("/admin/logout", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
