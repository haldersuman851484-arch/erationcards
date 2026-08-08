import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { ordersTable, RationCardPdfsSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { uploadToStorage } from "../lib/storage";

const ONLY_PDF_ERROR = "Only PDF files are allowed. Please upload the e-ration card PDF file.";

// Only real PDFs are accepted: mimetype is checked here, and the file
// content is verified against the %PDF header after multer buffers it.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error(ONLY_PDF_ERROR));
  },
});

/**
 * Runs multer and converts its errors (wrong type, too large) into clean
 * 400 JSON responses instead of letting them fall through as 500s.
 */
function uploadPdfSingle(req: Request, res: Response, next: NextFunction) {
  upload.single("pdf")(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "File is too large. Maximum size is 20 MB."
          : err instanceof Error && err.message === ONLY_PDF_ERROR
            ? ONLY_PDF_ERROR
            : "Upload failed";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

/**
 * Keep the customer's filename as close to exact as possible: strip only
 * path components, control characters, and characters that would break
 * URLs, storage keys, or the serve route (`/ \ " # ? %`, runs of dots).
 * Guarantees a non-empty name ending in .pdf.
 */
export function sanitizePdfFilename(originalname: string, cardIndex: number): string {
  // Multipart filenames arrive latin1-decoded (busboy default) while
  // browsers send UTF-8 bytes — re-decode so non-ASCII names (e.g. Bengali)
  // survive exactly. Identity for pure-ASCII; the U+FFFD guard keeps the
  // original when the bytes are not valid UTF-8.
  const utf8 = Buffer.from(originalname, "latin1").toString("utf8");
  if (!utf8.includes("\uFFFD")) originalname = utf8;
  let name = originalname.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\x00-\x1f\x7f"#?%]/g, "").replace(/\.{2,}/g, ".").trim();
  name = name.replace(/^\.+/, "");
  if (name.toLowerCase() === "pdf" || name.toLowerCase() === ".pdf") name = "";
  if (name && !/\.pdf$/i.test(name)) name = `${name}.pdf`;
  if (!name) name = `card-${cardIndex}.pdf`;
  // Cap length while keeping the .pdf suffix.
  if (name.length > 160) name = `${name.slice(0, 156)}.pdf`;
  return name;
}

const router = Router();

// POST /orders/:orderNumber/upload-card-pdf
router.post(
  "/orders/:orderNumber/upload-card-pdf",
  uploadPdfSingle,
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

    // Content check: a real PDF carries the %PDF header near the start of
    // the file. Catches images or other files renamed to ".pdf".
    const head = req.file.buffer.subarray(0, 1024).toString("latin1");
    if (!head.includes("%PDF-")) {
      res.status(400).json({ error: ONLY_PDF_ERROR });
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

      // Online-payment orders must be paid before PDFs can join the print
      // queue — otherwise a saved-but-unpaid order looks "queued" while it
      // would never be printed. The UI sends these customers to /pay first.
      if (
        order.paymentMethod === "cashfree" &&
        order.paymentStatus !== "paid" &&
        order.paymentStatus !== "confirmed"
      ) {
        res.status(409).json({
          error:
            "Payment for this order is not complete yet. Please complete the payment first — you can upload the card PDFs right after.",
        });
        return;
      }

      // Per-order, per-card storage key that ends in the customer's own
      // filename: same-named files from different orders/cards can never
      // collide, and re-uploading a card simply replaces its PDF.
      const originalFilename = sanitizePdfFilename(req.file.originalname, cardIndex);
      const storageKey = `card-pdfs/${orderNumber}/${cardIndex}/${originalFilename}`;

      await uploadToStorage(storageKey, req.file.buffer, "application/pdf");

      const pdfUrl = `/api/uploads/card-pdfs/${encodeURIComponent(orderNumber)}/${cardIndex}/${encodeURIComponent(originalFilename)}`;

      const existingResult = RationCardPdfsSchema.safeParse(order.rationCardPdfs ?? []);
      if (!existingResult.success) {
        req.log.error({ issues: existingResult.error.issues }, "Stored rationCardPdfs is malformed");
        res.status(500).json({ error: "Order PDF data is malformed; contact support" });
        return;
      }
      const existing = existingResult.data;

      const updated = [
        ...existing.filter((e) => e.cardIndex !== cardIndex),
        { cardIndex, pdfUrl, uploadedAt: new Date().toISOString(), originalFilename },
      ].sort((a, b) => a.cardIndex - b.cardIndex);

      await db
        .update(ordersTable)
        .set({ rationCardPdfs: updated as any, updatedAt: new Date() })
        .where(eq(ordersTable.orderNumber, orderNumber));

      res.json({ cardIndex, pdfUrl, originalFilename });
    } catch (err) {
      req.log.error({ err }, "Failed to upload card PDF");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
