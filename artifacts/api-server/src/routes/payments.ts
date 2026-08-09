import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getPricingMatrix, getContactInfo } from "../lib/settings";
import {
  getCashfreeConfig,
  createCashfreeOrder,
  getCashfreeOrder,
  nextCfOrderId,
  cfOrderIdToOrderNumber,
  mapCashfreeOrderStatus,
  evaluateWebhookSuccess,
  verifyCashfreeWebhookSignature,
  isOrderAlreadyExistsError,
  type CashfreeOrderInfo,
} from "../lib/cashfree";
import { finalizeOrderOnPayment } from "../lib/orderFinalize";

const CashfreeSessionBody = z.object({
  orderNumber: z.string().min(4).max(64),
  // SPA path Cashfree sends the customer back to after a redirect checkout.
  // Path only — the origin is always resolved server-side (see resolveReturnUrl).
  returnPath: z.string().max(200).optional(),
});

const router = Router();

// Public: live price matrix for order forms, FAQ copy and receipts.
router.get("/pricing/config", async (req: Request, res: Response) => {
  try {
    const { pricing } = await getPricingMatrix();
    res.json({ pricing });
  } catch (err) {
    req.log.error({ err }, "Failed to load pricing config");
    res.status(500).json({ error: "Failed to load pricing config" });
  }
});

// Public: live support contact details for the footer, Contact page, FAQ,
// policy pages and the Track-page WhatsApp button.
router.get("/contact/config", async (req: Request, res: Response) => {
  try {
    const { contact } = await getContactInfo();
    res.json({ contact });
  } catch (err) {
    req.log.error({ err }, "Failed to load contact config");
    res.status(500).json({ error: "Failed to load contact config" });
  }
});

// ── Cashfree payment gateway ────────────────────────────────────────────────
// Flow: the customer creates an order first (POST /orders, always unpaid),
// then this endpoint opens a Cashfree payment session for it. The order
// number acts as the capability, exactly like /orders/track and the card-PDF
// upload endpoints. Amounts always come from the stored order row — never
// from the client.

function resolveReturnUrl(req: Request, orderNumber: string, returnPath?: string): string {
  const path =
    returnPath && /^\/[A-Za-z0-9_\-/]*$/.test(returnPath)
      ? returnPath
      : `/pay/${orderNumber}`;
  if (process.env.NODE_ENV === "production") return `https://erationcards.in${path}`;
  const origin = req.get("origin");
  if (origin && /^https?:\/\/[A-Za-z0-9.:[\]-]+$/.test(origin)) return `${origin}${path}`;
  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (devDomain) return `https://${devDomain}${path}`;
  return `https://erationcards.in${path}`;
}

function resolveNotifyUrl(): string | null {
  const override = process.env["CASHFREE_NOTIFY_URL"];
  if (override) return override;
  if (process.env.NODE_ENV === "production") {
    return "https://erationcards.in/api/payments/cashfree/webhook";
  }
  // Dev boxes are not reachable from Cashfree's servers; the status poll
  // endpoint keeps payment state in sync instead.
  return null;
}

// POST /payments/cashfree/session — create (or reuse) a payment session.
router.post("/payments/cashfree/session", async (req: Request, res: Response) => {
  try {
    const body = CashfreeSessionBody.parse(req.body);
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, body.orderNumber))
      .limit(1);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const cfg = getCashfreeConfig();

    if (order.paymentStatus === "paid" || order.paymentStatus === "confirmed") {
      // Self-heal: if a crash after the paid-status update left the order
      // unfinalized, repair it on this read path (idempotent, never throws).
      await finalizeOrderOnPayment(order, req.log);
      res.json({
        alreadyPaid: true,
        paymentSessionId: null,
        mode: cfg.configured ? cfg.mode : "sandbox",
        amount: Number(order.amount),
        cfOrderId: order.cfOrderId ?? null,
      });
      return;
    }

    // Orders from the earlier (pre-gateway) payment process must never be
    // invited to pay online — money may already have been sent for them.
    if (order.paymentMethod === "upi" && order.paymentScreenshotUrl) {
      res.status(409).json({
        error:
          "This order was placed with our earlier payment process, so online payment is not used for it. Please do not pay again — if you have any question about your payment, contact support.",
      });
      return;
    }

    if (!cfg.configured) {
      req.log.warn({ reason: cfg.reason }, "Cashfree session requested but the gateway is not configured");
      res.status(503).json({
        error: "Online payment is temporarily unavailable. Please try again in some time or contact support.",
      });
      return;
    }

    // Re-use the existing Cashfree order while it is still payable.
    let cfOrderId = order.cfOrderId ?? null;
    let paymentSessionId: string | null = null;
    if (cfOrderId) {
      try {
        const existing = await getCashfreeOrder(cfg, cfOrderId);
        if (existing.orderStatus === "PAID") {
          await db
            .update(ordersTable)
            .set({ paymentStatus: "paid" as any, paymentMethod: "cashfree", updatedAt: new Date() })
            .where(eq(ordersTable.id, order.id));
          req.log.info({ orderNumber: order.orderNumber, cfOrderId }, "Cashfree order already paid; synced during session request");
          await finalizeOrderOnPayment(order, req.log);
          res.json({
            alreadyPaid: true,
            paymentSessionId: null,
            mode: cfg.mode,
            amount: Number(order.amount),
            cfOrderId,
          });
          return;
        }
        if (existing.orderStatus === "ACTIVE" && existing.paymentSessionId) {
          paymentSessionId = existing.paymentSessionId;
        }
      } catch (err) {
        req.log.warn({ err, cfOrderId }, "Could not fetch the existing Cashfree order; creating a fresh one");
      }
    }

    if (!paymentSessionId) {
      const returnUrl = resolveReturnUrl(req, order.orderNumber, body.returnPath);
      const notifyUrl = resolveNotifyUrl();
      let candidate = nextCfOrderId(order.orderNumber, cfOrderId);
      let created: CashfreeOrderInfo | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          created = await createCashfreeOrder(cfg, {
            cfOrderId: candidate,
            amount: Number(order.amount),
            customerPhone: order.customerPhone,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            returnUrl,
            notifyUrl,
            orderNote: `PVC card order ${order.orderNumber}`,
          });
          break;
        } catch (err) {
          if (isOrderAlreadyExistsError(err)) {
            // That id was used by an earlier attempt — bump the retry suffix.
            candidate = nextCfOrderId(order.orderNumber, candidate);
            continue;
          }
          throw err;
        }
      }
      if (!created || !created.paymentSessionId) {
        req.log.error({ orderNumber: order.orderNumber }, "Cashfree order creation did not return a payment session");
        res.status(502).json({ error: "Could not start the payment. Please try again." });
        return;
      }
      cfOrderId = created.cfOrderId;
      paymentSessionId = created.paymentSessionId;
      await db
        .update(ordersTable)
        .set({
          cfOrderId,
          paymentMethod: "cashfree",
          // A failed attempt becomes payable again the moment a new session opens.
          ...(order.paymentStatus === "failed" ? { paymentStatus: "pending" as any } : {}),
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, order.id));
    }

    res.json({
      alreadyPaid: false,
      paymentSessionId,
      mode: cfg.mode,
      amount: Number(order.amount),
      cfOrderId,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    req.log.error({ err }, "Failed to create a Cashfree payment session");
    res.status(502).json({ error: "Could not start the payment. Please try again." });
  }
});

// GET /payments/cashfree/status?orderNumber=… — re-check with Cashfree and
// sync the stored payment status. This is the poll target while the checkout
// modal is open, and the fallback that keeps dev (no webhooks) consistent.
router.get("/payments/cashfree/status", async (req: Request, res: Response) => {
  try {
    const orderNumber = String(req.query.orderNumber ?? "").trim();
    if (!orderNumber) {
      res.status(400).json({ error: "orderNumber is required" });
      return;
    }
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, orderNumber))
      .limit(1);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.paymentStatus === "paid" || order.paymentStatus === "confirmed" || !order.cfOrderId) {
      if (order.paymentStatus === "paid" || order.paymentStatus === "confirmed") {
        // Self-heal any paid-but-unfinalized order on this read path too.
        await finalizeOrderOnPayment(order, req.log);
      }
      res.json({ paymentStatus: order.paymentStatus, cashfreeStatus: null });
      return;
    }

    const cfg = getCashfreeConfig();
    if (!cfg.configured) {
      res.json({ paymentStatus: order.paymentStatus, cashfreeStatus: null });
      return;
    }

    let cf: CashfreeOrderInfo;
    try {
      cf = await getCashfreeOrder(cfg, order.cfOrderId);
    } catch (err) {
      req.log.warn({ err, cfOrderId: order.cfOrderId }, "Cashfree status check failed; returning the stored status");
      res.json({ paymentStatus: order.paymentStatus, cashfreeStatus: null });
      return;
    }

    const mapped = mapCashfreeOrderStatus(cf.orderStatus);
    let paymentStatus: string = order.paymentStatus;
    if (mapped === "paid") {
      paymentStatus = "paid";
      await db
        .update(ordersTable)
        .set({ paymentStatus: "paid" as any, paymentMethod: "cashfree", updatedAt: new Date() })
        .where(eq(ordersTable.id, order.id));
      req.log.info({ orderNumber }, "Cashfree payment confirmed via status poll");
      await finalizeOrderOnPayment(order, req.log);
    } else if (mapped === "failed" && order.paymentStatus === "pending") {
      paymentStatus = "failed";
      await db
        .update(ordersTable)
        .set({ paymentStatus: "failed" as any, updatedAt: new Date() })
        .where(eq(ordersTable.id, order.id));
      req.log.info({ orderNumber, cashfreeStatus: cf.orderStatus }, "Cashfree payment marked failed via status poll");
    }

    res.json({ paymentStatus, cashfreeStatus: cf.orderStatus });
  } catch (err) {
    req.log.error({ err }, "Failed to check the Cashfree payment status");
    res.status(500).json({ error: "Failed to check payment status" });
  }
});

// POST /payments/cashfree/webhook — server-to-server notification from
// Cashfree. Mounted with express.raw() in app.ts: the HMAC signature covers
// the raw request bytes, so this handler receives a Buffer, verifies it,
// and only then parses JSON. Unknown orders answer 200 (Cashfree would
// otherwise retry forever); processing errors answer 5xx (Cashfree retries).
router.post("/payments/cashfree/webhook", async (req: Request, res: Response) => {
  const cfg = getCashfreeConfig();
  if (!cfg.configured) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  const signature = String(req.headers["x-webhook-signature"] ?? "");
  const timestamp = String(req.headers["x-webhook-timestamp"] ?? "");
  const raw = Buffer.isBuffer(req.body)
    ? req.body
    : typeof req.body === "string"
      ? Buffer.from(req.body, "utf8")
      : null;
  if (!raw) {
    req.log.error("Cashfree webhook arrived without a raw body — check the express.raw() mount in app.ts");
    res.status(400).json({ error: "Raw body required" });
    return;
  }
  if (!verifyCashfreeWebhookSignature(raw, signature, timestamp, cfg.secretKey)) {
    req.log.warn("Cashfree webhook rejected: signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const type = String(payload?.type ?? "");
  const cfOrderId = String(payload?.data?.order?.order_id ?? "");
  const cfPaymentStatus = String(payload?.data?.payment?.payment_status ?? "");
  if (!cfOrderId) {
    res.json({ received: true });
    return;
  }
  const orderNumber = cfOrderIdToOrderNumber(cfOrderId);

  try {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, orderNumber))
      .limit(1);
    if (!order) {
      req.log.warn({ cfOrderId, orderNumber }, "Cashfree webhook for an unknown order");
      res.json({ received: true });
      return;
    }

    const isSuccess = type === "PAYMENT_SUCCESS_WEBHOOK" || cfPaymentStatus === "SUCCESS";
    const isFailure =
      type === "PAYMENT_FAILED_WEBHOOK" ||
      type === "PAYMENT_USER_DROPPED_WEBHOOK" ||
      cfPaymentStatus === "FAILED" ||
      cfPaymentStatus === "USER_DROPPED";

    if (isSuccess) {
      // Bind the signed event to the CURRENT payment attempt and the exact
      // rupee amount before recording money. The signature only proves the
      // event came from Cashfree — not that it belongs to this attempt or
      // matches what the customer owes. Mismatches are logged for manual
      // follow-up in the Cashfree dashboard, never auto-accepted.
      const binding = evaluateWebhookSuccess({
        payloadCfOrderId: cfOrderId,
        payloadAmount: payload?.data?.order?.order_amount,
        recordedCfOrderId: order.cfOrderId ?? null,
        orderAmount: order.amount,
      });
      if (!binding.accept) {
        req.log.warn(
          { orderNumber, cfOrderId, recordedCfOrderId: order.cfOrderId, reason: binding.reason },
          "Cashfree webhook: signed SUCCESS did not match the order — ignored; verify in the Cashfree dashboard",
        );
        res.json({ received: true });
        return;
      }
      if (order.paymentStatus === "pending" || order.paymentStatus === "failed") {
        // Atomic guard: only pending/failed may become paid, so a duplicate
        // webhook, replay, or concurrent status poll can never downgrade a
        // settled order or double-apply.
        await db
          .update(ordersTable)
          .set({ paymentStatus: "paid" as any, paymentMethod: "cashfree", updatedAt: new Date() })
          .where(
            and(
              eq(ordersTable.id, order.id),
              inArray(ordersTable.paymentStatus, ["pending", "failed"]),
            ),
          );
        req.log.info({ orderNumber, cfOrderId }, "Cashfree webhook: payment marked paid");
        await finalizeOrderOnPayment(order, req.log);
      } else {
        req.log.info(
          { orderNumber, paymentStatus: order.paymentStatus },
          "Cashfree webhook: success for an already-settled order — no change",
        );
      }
    } else if (isFailure) {
      // Only fail the CURRENT attempt — a late webhook for an old attempt
      // must not override a newer retry the customer may be paying right now.
      if (order.paymentStatus === "pending" && order.cfOrderId === cfOrderId) {
        await db
          .update(ordersTable)
          .set({ paymentStatus: "failed" as any, updatedAt: new Date() })
          .where(eq(ordersTable.id, order.id));
        req.log.info({ orderNumber, cfOrderId, type }, "Cashfree webhook: payment marked failed");
      }
    } else {
      req.log.info({ orderNumber, type }, "Cashfree webhook: event type ignored");
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err, orderNumber }, "Cashfree webhook processing failed");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
