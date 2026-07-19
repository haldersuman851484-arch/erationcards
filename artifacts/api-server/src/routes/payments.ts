import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parseAdminToken } from "../lib/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadsDir =
  process.env.UPLOADS_DIR ||
  path.resolve(__dirname, "../../uploads");

mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `screenshot-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const PaymentStatusUpdateBody = z.object({
  paymentStatus: z.enum(["confirmed", "rejected", "pending"]),
});

const router = Router();

router.get("/payments/upi-config", (_req: Request, res: Response) => {
  const merchantUpiId = process.env.MERCHANT_UPI_ID || "";
  res.json({ merchantUpiId });
});

router.post(
  "/payments/upload-screenshot",
  upload.single("screenshot"),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No screenshot uploaded" });
      return;
    }
    const url = `/api/uploads/${req.file.filename}`;
    res.json({ url });
  }
);

router.patch("/orders/:id/payment-status", async (req: Request, res: Response) => {
  const admin = parseAdminToken(req);
  if (!admin) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }
    const body = PaymentStatusUpdateBody.parse(req.body);
    const [order] = await db
      .update(ordersTable)
      .set({ paymentStatus: body.paymentStatus as any, updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ id: order.id, paymentStatus: order.paymentStatus });
  } catch (err) {
    req.log.error({ err }, "Failed to update payment status");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
