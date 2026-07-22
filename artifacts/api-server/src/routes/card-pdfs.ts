import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "@workspace/db";
import { ordersTable, RationCardPdfsSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { uploadsDir } from "./payments";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALLOWED_PDF_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = file.originalname.match(/\.[^.]+$/)?.[0] ?? ".pdf";
    cb(null, `card-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_PDF_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF and image files are allowed"));
  },
});

const router = Router();

// POST /orders/:orderNumber/upload-card-pdf
router.post(
  "/orders/:orderNumber/upload-card-pdf",
  upload.single("pdf"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const orderNumber = String(req.params.orderNumber);
    const cardIndex = parseInt(String(req.body.cardIndex ?? "0"));
    if (isNaN(cardIndex) || cardIndex < 0) {
      res.status(400).json({ error: "Invalid cardIndex" });
      return;
    }

    try {
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.orderNumber, orderNumber))
        .limit(1);

      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const pdfUrl = `/api/uploads/${req.file.filename}`;
      const existingResult = RationCardPdfsSchema.safeParse(order.rationCardPdfs ?? []);
      if (!existingResult.success) {
        req.log.error({ issues: existingResult.error.issues }, "Stored rationCardPdfs is malformed");
        res.status(500).json({ error: "Order PDF data is malformed; contact support" });
        return;
      }
      const existing = existingResult.data;

      const updated = [
        ...existing.filter((e) => e.cardIndex !== cardIndex),
        { cardIndex, pdfUrl, uploadedAt: new Date().toISOString() },
      ].sort((a, b) => a.cardIndex - b.cardIndex);

      await db
        .update(ordersTable)
        .set({ rationCardPdfs: updated as any, updatedAt: new Date() })
        .where(eq(ordersTable.orderNumber, orderNumber));

      res.json({ cardIndex, pdfUrl });
    } catch (err) {
      req.log.error({ err }, "Failed to upload card PDF");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
