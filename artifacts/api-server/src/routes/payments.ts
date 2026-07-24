import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { ordersTable, paymentVerificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { parseAdminToken } from "../lib/auth";
import { uploadToStorage } from "../lib/storage";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// Use memory storage — file is uploaded to GCS after validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
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
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No screenshot uploaded" });
      return;
    }
    const ext = MIME_TO_EXT[req.file.mimetype] ?? ".jpg";
    const filename = `screenshot-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    try {
      await uploadToStorage(filename, req.file.buffer, req.file.mimetype);
    } catch (err) {
      req.log.error({ err }, "Failed to upload screenshot to storage");
      res.status(500).json({ error: "Upload failed" });
      return;
    }
    const url = `/api/uploads/${filename}`;
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
    await db
      .update(ordersTable)
      .set({ paymentStatus: body.paymentStatus as any, updatedAt: new Date() })
      .where(eq(ordersTable.id, id));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (body.paymentStatus === "confirmed" || body.paymentStatus === "rejected") {
      await db.insert(paymentVerificationsTable).values({
        orderId: order.id,
        orderNumber: order.orderNumber,
        action: body.paymentStatus,
        adminEmail: admin.email,
        screenshotUrl: order.paymentScreenshotUrl ?? null,
      });
    }

    res.json({ id: order.id, paymentStatus: order.paymentStatus });
  } catch (err) {
    req.log.error({ err }, "Failed to update payment status");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
