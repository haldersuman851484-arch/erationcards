import crypto from "crypto";

// ── Cashfree Payment Gateway client (REST v3) ──────────────────────────────
// Mirrors the Delhivery pattern: one env variable (CASHFREE_ENV) picks the
// endpoint, and the dev box defaults to the sandbox so a misconfigured
// environment can never create real payment orders by accident.
//
// API reference: https://www.cashfree.com/docs/api-reference/payments
// - Create order:  POST {base}/orders            → payment_session_id
// - Get order:     GET  {base}/orders/{order_id} → order_status
// - Webhook:       HMAC-SHA256(timestamp + rawBody, secretKey), base64,
//                  sent in x-webhook-signature with x-webhook-timestamp.

export const CASHFREE_API_VERSION = "2026-01-01";

const SANDBOX_BASE = "https://sandbox.cashfree.com/pg";
const PRODUCTION_BASE = "https://api.cashfree.com/pg";

export type CashfreeMode = "sandbox" | "production";

export type CashfreeConfig =
  | {
      configured: true;
      mode: CashfreeMode;
      baseUrl: string;
      appId: string;
      secretKey: string;
    }
  | {
      configured: false;
      /** Human-readable reason, safe for logs (never contains key material). */
      reason: string;
    };

// Decides sandbox vs production:
// - CASHFREE_ENV=production  → production (the Hostinger .env sets this)
// - CASHFREE_ENV=sandbox     → sandbox
// - unset + TEST… app id     → sandbox (Cashfree test keys start with "TEST")
// - unset + production keys  → REFUSE. A dev environment must never silently
//   create live payment orders; the operator has to opt in explicitly.
export function getCashfreeConfig(env: NodeJS.ProcessEnv = process.env): CashfreeConfig {
  const appId = (env["CASHFREE_APP_ID"] ?? "").trim();
  const secretKey = (env["CASHFREE_SECRET_KEY"] ?? "").trim();
  const envSetting = (env["CASHFREE_ENV"] ?? "").trim().toLowerCase();

  if (!appId || !secretKey) {
    return {
      configured: false,
      reason:
        "CASHFREE_APP_ID / CASHFREE_SECRET_KEY are not set. Online payment stays disabled until both keys are configured.",
    };
  }

  if (envSetting === "production") {
    return { configured: true, mode: "production", baseUrl: PRODUCTION_BASE, appId, secretKey };
  }
  if (envSetting === "sandbox" || envSetting === "test" || envSetting === "staging") {
    return { configured: true, mode: "sandbox", baseUrl: SANDBOX_BASE, appId, secretKey };
  }
  if (envSetting !== "") {
    return {
      configured: false,
      reason: `CASHFREE_ENV has the unknown value "${envSetting}" — use "sandbox" or "production".`,
    };
  }

  // CASHFREE_ENV is unset: infer only the safe direction.
  if (appId.startsWith("TEST")) {
    return { configured: true, mode: "sandbox", baseUrl: SANDBOX_BASE, appId, secretKey };
  }
  return {
    configured: false,
    reason:
      "The configured Cashfree keys look like PRODUCTION keys, but CASHFREE_ENV is not set to \"production\". " +
      "Refusing to create live payment orders from this environment. Set CASHFREE_ENV=production on the live host " +
      "(or use TEST keys here).",
  };
}

export class CashfreeApiError extends Error {
  status: number;
  /** Cashfree error code, e.g. "order_already_exists". */
  code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.name = "CashfreeApiError";
    this.status = status;
    this.code = code;
  }
}

export function isOrderAlreadyExistsError(err: unknown): boolean {
  return err instanceof CashfreeApiError && (err.code === "order_already_exists" || err.status === 409);
}

function authHeaders(cfg: { appId: string; secretKey: string }): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-version": CASHFREE_API_VERSION,
    "x-client-id": cfg.appId,
    "x-client-secret": cfg.secretKey,
  };
}

async function parseCashfreeError(res: globalThis.Response): Promise<CashfreeApiError> {
  let code: string | null = null;
  let message = `Cashfree API responded with HTTP ${res.status}`;
  try {
    const body: any = await res.json();
    if (body && typeof body === "object") {
      if (typeof body.code === "string") code = body.code;
      if (typeof body.message === "string" && body.message) message = body.message;
    }
  } catch {
    // Non-JSON error body — keep the generic message.
  }
  return new CashfreeApiError(res.status, code, message);
}

export interface CreateCashfreeOrderParams {
  /** Cashfree order_id — our order number, possibly with a -R<n> retry suffix. */
  cfOrderId: string;
  /** Amount in rupees (server-computed; never taken from the client). */
  amount: number;
  customerPhone: string;
  customerName?: string | null;
  customerEmail?: string | null;
  returnUrl: string;
  notifyUrl?: string | null;
  orderNote?: string;
}

export interface CashfreeOrderInfo {
  cfOrderId: string;
  /** ACTIVE | PAID | EXPIRED | TERMINATED | TERMINATION_REQUESTED */
  orderStatus: string;
  paymentSessionId: string | null;
}

// Cashfree customer_id allows alphanumeric plus _ and - only.
export function toCashfreeCustomerId(orderNumber: string): string {
  const cleaned = orderNumber.replace(/[^A-Za-z0-9_-]/g, "_");
  return cleaned.length > 0 ? cleaned : "customer";
}

function mapOrderResponse(data: any): CashfreeOrderInfo {
  return {
    cfOrderId: String(data?.order_id ?? ""),
    orderStatus: String(data?.order_status ?? ""),
    paymentSessionId:
      typeof data?.payment_session_id === "string" && data.payment_session_id.length > 0
        ? data.payment_session_id
        : null,
  };
}

export async function createCashfreeOrder(
  cfg: { baseUrl: string; appId: string; secretKey: string },
  params: CreateCashfreeOrderParams,
): Promise<CashfreeOrderInfo> {
  const body: Record<string, unknown> = {
    order_id: params.cfOrderId,
    order_amount: Math.round(params.amount * 100) / 100,
    order_currency: "INR",
    customer_details: {
      customer_id: toCashfreeCustomerId(params.cfOrderId),
      customer_phone: params.customerPhone,
      ...(params.customerName ? { customer_name: params.customerName } : {}),
      ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
    },
    order_meta: {
      return_url: params.returnUrl,
      ...(params.notifyUrl ? { notify_url: params.notifyUrl } : {}),
    },
    ...(params.orderNote ? { order_note: params.orderNote } : {}),
  };

  const res = await fetch(`${cfg.baseUrl}/orders`, {
    method: "POST",
    headers: authHeaders(cfg),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw await parseCashfreeError(res);
  return mapOrderResponse(await res.json());
}

export async function getCashfreeOrder(
  cfg: { baseUrl: string; appId: string; secretKey: string },
  cfOrderId: string,
): Promise<CashfreeOrderInfo> {
  const res = await fetch(`${cfg.baseUrl}/orders/${encodeURIComponent(cfOrderId)}`, {
    method: "GET",
    headers: authHeaders(cfg),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw await parseCashfreeError(res);
  return mapOrderResponse(await res.json());
}

// ── Retry-suffix helpers ────────────────────────────────────────────────────
// The first payment attempt uses the order number itself as the Cashfree
// order_id. Cashfree order_ids are single-use per merchant account, so when a
// previous attempt expired or was terminated we create "<orderNumber>-R2",
// "-R3", … and remember the latest in orders.cf_order_id. Stripping the
// suffix always recovers our order number (webhooks echo the cf order id).

export function nextCfOrderId(orderNumber: string, currentCfOrderId: string | null): string {
  if (!currentCfOrderId) return orderNumber;
  const match = currentCfOrderId.match(/-R(\d+)$/);
  const nextAttempt = match ? parseInt(match[1]!, 10) + 1 : 2;
  return `${orderNumber}-R${nextAttempt}`;
}

export function cfOrderIdToOrderNumber(cfOrderId: string): string {
  return cfOrderId.replace(/-R\d+$/, "");
}

// ── Payment-status mapping ──────────────────────────────────────────────────
// Maps a Cashfree order_status onto our orders.payment_status enum. Returns
// null when the gateway state implies no change (still awaiting payment).
export function mapCashfreeOrderStatus(orderStatus: string): "paid" | "failed" | null {
  switch (orderStatus) {
    case "PAID":
      return "paid";
    case "EXPIRED":
    case "TERMINATED":
      return "failed";
    default:
      return null; // ACTIVE, TERMINATION_REQUESTED, unknown → no change
  }
}

// ── Webhook signature ───────────────────────────────────────────────────────
// signature = base64( HMAC-SHA256( timestamp + rawBody, secretKey ) )
// The HMAC covers the raw request bytes — the route must receive the
// unparsed body (see the express.raw() mount in app.ts).

export function computeCashfreeSignature(
  rawBody: Buffer | string,
  timestamp: string,
  secretKey: string,
): string {
  const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  return crypto
    .createHmac("sha256", secretKey)
    .update(Buffer.concat([Buffer.from(timestamp, "utf8"), raw]))
    .digest("base64");
}

export function verifyCashfreeWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  timestamp: string,
  secretKey: string,
): boolean {
  if (!signature || !timestamp) return false;
  const expected = computeCashfreeSignature(rawBody, timestamp, secretKey);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type WebhookSuccessBinding =
  | { accept: true }
  | { accept: false; reason: "attempt-mismatch" | "amount-missing" | "amount-mismatch" };

/**
 * A verified webhook signature only proves the event came from Cashfree —
 * not that it belongs to this order. Before money is recorded, the signed
 * event must also bind to the order: its order_id must equal the CURRENTLY
 * recorded payment attempt (stale -R retries are refused; retries only ever
 * happen after the previous attempt went terminal and unpayable), and the
 * signed amount must match what the customer owes to the paisa. Anything
 * else is logged for manual review in the Cashfree dashboard, never
 * auto-accepted.
 */
export function evaluateWebhookSuccess(params: {
  payloadCfOrderId: string;
  payloadAmount: unknown;
  recordedCfOrderId: string | null;
  orderAmount: string | number;
}): WebhookSuccessBinding {
  if (!params.recordedCfOrderId || params.payloadCfOrderId !== params.recordedCfOrderId) {
    return { accept: false, reason: "attempt-mismatch" };
  }
  const paid =
    typeof params.payloadAmount === "number"
      ? params.payloadAmount
      : typeof params.payloadAmount === "string" && params.payloadAmount.trim() !== ""
        ? Number(params.payloadAmount)
        : NaN;
  if (!Number.isFinite(paid)) {
    return { accept: false, reason: "amount-missing" };
  }
  const expected = Number(params.orderAmount);
  if (!Number.isFinite(expected) || Math.abs(paid - expected) > 0.009) {
    return { accept: false, reason: "amount-mismatch" };
  }
  return { accept: true };
}
