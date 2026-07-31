import { ReplitConnectors } from "@replit/connectors-sdk";

// Minimal logger contract shared by pino (req.log) and the app logger.
type Log = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

// Emails are sent through the Resend connector (Replit-managed credentials).
// Until the business domain (e.g. erationcards.in) is verified inside Resend,
// Resend's sandbox only allows the onboarding@resend.dev sender and only
// delivers to the Resend account owner's own inbox. Once the domain is
// verified, set EMAIL_FROM (e.g. "PVC Card Portal <orders@erationcards.in>")
// to send to all customers.
const FROM_ADDRESS = process.env["EMAIL_FROM"] ?? "PVC Card Portal <onboarding@resend.dev>";
const TRACK_URL = "https://erationcards.in/track";
const SITE_URL = "https://erationcards.in";
// Absolute URL — email clients cannot resolve relative paths. Ships in the v5 bundle.
const LOGO_URL = "https://erationcards.in/favicon-192.png";

/** Teal branded header with the card-stack logo, shared by all email templates. */
function buildEmailHeader(): string {
  return `
  <div style="background: #00afc8; border-radius: 12px 12px 0 0; padding: 20px 24px;">
    <a href="${SITE_URL}" style="text-decoration: none; color: #ffffff; display: inline-block;">
      <img src="${LOGO_URL}" alt="PVC Card Portal" width="40" height="40" style="display: block; border: 0; margin-bottom: 8px; border-radius: 8px;" />
      <h1 style="margin: 0; color: #ffffff; font-size: 18px;">PVC Card Portal</h1>
    </a>
  </div>`;
}

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  amount: string;
  quantity: number;
}

function buildHtml(order: OrderEmailData): string {
  return `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
${buildEmailHeader()}
  <div style="border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px; padding: 24px;">
    <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(order.customerName)}</strong>,</p>
    <p style="margin: 0 0 16px;">Thank you! We have received your PVC card order. Your order number is:</p>
    <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 16px;">
      <span style="font-family: monospace; font-size: 22px; font-weight: bold; color: #00afc8; letter-spacing: 1px;">${escapeHtml(order.orderNumber)}</span>
    </div>
    <table style="width: 100%; font-size: 14px; margin-bottom: 16px; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Total cards</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold;">${order.quantity}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Amount paid</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold; border-top: 1px solid #e2e8f0;">&#8377;${escapeHtml(order.amount)}</td>
      </tr>
    </table>
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 13px; color: #92400e; margin-bottom: 16px;">
      Our team is now verifying your payment screenshot. Your card will be printed after verification and delivered within 5&ndash;7 working days.
    </div>
    <p style="margin: 0 0 6px; font-size: 14px;">Keep this order number safe &mdash; you will need it to track your order:</p>
    <p style="margin: 0 0 16px;"><a href="${TRACK_URL}" style="color: #00afc8; font-weight: bold;">${TRACK_URL}</a></p>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">This is an automatic email from PVC Card Portal. Please do not reply.</p>
  </div>
</div>`.trim();
}

function buildText(order: OrderEmailData): string {
  return [
    `Hello ${order.customerName},`,
    ``,
    `Thank you! We have received your PVC card order.`,
    `Your order number: ${order.orderNumber}`,
    `Total cards: ${order.quantity}`,
    `Amount paid: Rs ${order.amount}`,
    ``,
    `Our team is now verifying your payment screenshot. Your card will be printed after verification and delivered within 5-7 working days.`,
    ``,
    `Track your order: ${TRACK_URL}`,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface DispatchEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  courierName: string;
  trackingNumber: string;
}

function buildDispatchHtml(data: DispatchEmailData): string {
  return `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
${buildEmailHeader()}
  <div style="border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px; padding: 24px;">
    <p style="margin: 0 0 12px;">Hello <strong>${escapeHtml(data.customerName)}</strong>,</p>
    <p style="margin: 0 0 16px;">Good news &mdash; your PVC card is on the way! Your order has been handed over to the courier.</p>
    <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 16px;">
      <span style="font-family: monospace; font-size: 22px; font-weight: bold; color: #00afc8; letter-spacing: 1px;">${escapeHtml(data.orderNumber)}</span>
    </div>
    <table style="width: 100%; font-size: 14px; margin-bottom: 16px; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #64748b;">Courier</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold;">${escapeHtml(data.courierName)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Tracking number (AWB)</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold; border-top: 1px solid #e2e8f0;"><span style="font-family: monospace;">${escapeHtml(data.trackingNumber)}</span></td>
      </tr>
    </table>
    <p style="margin: 0 0 6px; font-size: 14px;">Track your delivery anytime with your order number:</p>
    <p style="margin: 0 0 16px;"><a href="${TRACK_URL}" style="color: #00afc8; font-weight: bold;">${TRACK_URL}</a></p>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">This is an automatic email from PVC Card Portal. Please do not reply.</p>
  </div>
</div>`.trim();
}

function buildDispatchText(data: DispatchEmailData): string {
  return [
    `Hello ${data.customerName},`,
    ``,
    `Good news - your PVC card is on the way! Your order has been handed over to the courier.`,
    ``,
    `Order number: ${data.orderNumber}`,
    `Courier: ${data.courierName}`,
    `Tracking number (AWB): ${data.trackingNumber}`,
    ``,
    `Track your delivery: ${TRACK_URL}`,
  ].join("\n");
}

/**
 * Sends the email through Resend. Two transports:
 * - RESEND_API_KEY set (e.g. Hostinger production): call the Resend API
 *   directly — the Replit connector proxy is not reachable outside Replit.
 * - Otherwise (Replit dev/deploy): use the Replit-managed Resend connector.
 */
/**
 * Human-readable one-liner for a failed fetch: undici wraps the real cause
 * (ENOTFOUND, ECONNREFUSED, timeouts, …) in err.cause, sometimes as an
 * AggregateError. Used for stderr mirrors that must be readable in hosting
 * panels without JSON tooling.
 */
export function describeFetchError(err: unknown): string {
  const e = err as {
    message?: string;
    cause?: { code?: string; message?: string; errors?: { code?: string; message?: string }[] };
  };
  const parts: string[] = [e?.message ?? String(err)];
  const cause = e?.cause;
  if (cause?.code) parts.push(cause.code);
  else if (cause?.errors?.length) parts.push(cause.errors.map((x) => x.code ?? x.message ?? "?").join("+"));
  else if (cause?.message) parts.push(cause.message);
  return parts.join(" — ");
}

/**
 * True when real emails must NOT leave the building: development runs (dev
 * server, Playwright e2e, manual testing) share the SAME Resend account as
 * production, and Resend's free tier allows only 100 sends per UTC day. On
 * launch day (30 Jul 2026) test orders exhausted the quota by 04:29 UTC and
 * every PRODUCTION send for the rest of the day was rejected with
 * 429 daily_quota_exceeded. Suppressed sends are logged and reported as
 * success so dev flows behave as if the email went out.
 *
 * Gated on === "development" (the dev workflow always sets it) so a
 * production host that forgets NODE_ENV still sends. Set
 * SETTINGS_OTP_SEND_EMAILS=true to opt back in to real sends during
 * development (same flag the settings OTP/change emails already use).
 */
function suppressRealEmailsInDev(): boolean {
  return process.env.NODE_ENV === "development" && process.env["SETTINGS_OTP_SEND_EMAILS"] !== "true";
}

async function postToResend(body: Record<string, unknown>): Promise<globalThis.Response> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (apiKey) {
    try {
      return await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // Mirror to stderr: Hostinger's Runtime Logs reliably surface stderr,
      // while pino's stdout JSON has proven invisible there. Rethrow so the
      // callers' fail-soft handling stays unchanged.
      console.error(`[Email] Resend API unreachable: ${describeFetchError(err)}`);
      throw err;
    }
  }
  // New client per call — connector tokens expire and must not be cached.
  // Off-Replit (e.g. Hostinger) this branch can never work: it exists only as
  // the dev fallback. Print the smoking-gun line to stderr so a missing
  // RESEND_API_KEY at runtime is immediately visible in hosting panels.
  if (!process.env["REPLIT_CONNECTORS_HOSTNAME"]) {
    console.error(
      "[Email] RESEND_API_KEY is missing from the runtime environment and no Replit connector is available — email cannot be sent. Check the hosting panel's environment variables.",
    );
  }
  const connectors = new ReplitConnectors();
  try {
    return await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch (err) {
    console.error(`[Email] Resend connector send failed: ${describeFetchError(err)}`);
    throw err;
  }
}

/**
 * Sends the order-number confirmation email via Resend.
 * Never throws — email failure must not block or lose the order, so all
 * errors are logged and reported as `false`.
 */
export async function sendOrderConfirmationEmail(order: OrderEmailData, log: Log): Promise<boolean> {
  if (suppressRealEmailsInDev()) {
    log.info(
      { orderNumber: order.orderNumber, to: order.customerEmail },
      "DEV ONLY — order confirmation email suppressed (not sent, quota protection)",
    );
    return true;
  }
  try {
    const res = await postToResend({
      from: FROM_ADDRESS,
      to: [order.customerEmail],
      subject: `Order ${order.orderNumber} received - PVC Card Portal`,
      html: buildHtml(order),
      text: buildText(order),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      log.error(
        { status: res.status, body: errBody.slice(0, 500), orderNumber: order.orderNumber },
        "Order confirmation email failed to send",
      );
      console.error(`[Email] Resend rejected order confirmation (HTTP ${res.status}): ${errBody.slice(0, 300)}`);
      return false;
    }

    log.info({ orderNumber: order.orderNumber }, "Order confirmation email sent");
    return true;
  } catch (err) {
    log.error({ err, orderNumber: order.orderNumber }, "Order confirmation email errored");
    return false;
  }
}

/**
 * Sends the "your card is on the way" email at dispatch time via Resend.
 * Never throws — email failure must not block the dispatch (the shipment
 * already exists), so all errors are logged and reported as `false`.
 */
export async function sendOrderDispatchedEmail(data: DispatchEmailData, log: Log): Promise<boolean> {
  if (suppressRealEmailsInDev()) {
    log.info(
      { orderNumber: data.orderNumber, to: data.customerEmail },
      "DEV ONLY — order dispatched email suppressed (not sent, quota protection)",
    );
    return true;
  }
  try {
    const res = await postToResend({
      from: FROM_ADDRESS,
      to: [data.customerEmail],
      subject: `Order ${data.orderNumber} dispatched - your card is on the way`,
      html: buildDispatchHtml(data),
      text: buildDispatchText(data),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      log.error(
        { status: res.status, body: errBody.slice(0, 500), orderNumber: data.orderNumber },
        "Order dispatched email failed to send",
      );
      console.error(`[Email] Resend rejected dispatch email (HTTP ${res.status}): ${errBody.slice(0, 300)}`);
      return false;
    }

    log.info({ orderNumber: data.orderNumber }, "Order dispatched email sent");
    return true;
  } catch (err) {
    log.error({ err, orderNumber: data.orderNumber }, "Order dispatched email errored");
    return false;
  }
}

export interface SettingsChangeEmailData {
  /** "UPI ID" or "Card prices" — human label for the changed field */
  fieldLabel: string;
  /** Human-readable previous value (already formatted for display) */
  oldValue: string;
  /** Human-readable new value (already formatted for display) */
  newValue: string;
  changedBy: string;
  changedAt: Date;
}

function formatChangeTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date) + " IST";
}

function buildSettingsChangeHtml(data: SettingsChangeEmailData): string {
  return `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
${buildEmailHeader()}
  <div style="border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px; padding: 24px;">
    <p style="margin: 0 0 16px;">The <strong>${escapeHtml(data.fieldLabel)}</strong> setting was just changed in the admin dashboard.</p>
    <table style="width: 100%; font-size: 14px; margin-bottom: 16px; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Old value</td>
        <td style="padding: 6px 0; text-align: right;"><span style="font-family: monospace; white-space: pre-line;">${escapeHtml(data.oldValue)}</span></td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; border-top: 1px solid #e2e8f0; vertical-align: top;">New value</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold; border-top: 1px solid #e2e8f0;"><span style="font-family: monospace; white-space: pre-line;">${escapeHtml(data.newValue)}</span></td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Saved by</td>
        <td style="padding: 6px 0; text-align: right; border-top: 1px solid #e2e8f0;">${escapeHtml(data.changedBy)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b; border-top: 1px solid #e2e8f0;">When</td>
        <td style="padding: 6px 0; text-align: right; border-top: 1px solid #e2e8f0;">${escapeHtml(formatChangeTime(data.changedAt))}</td>
      </tr>
    </table>
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 13px; color: #92400e; margin-bottom: 16px;">
      This value affects how customer money is collected. If you did not expect this change, contact your partner immediately.
    </div>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">This is an automatic email from PVC Card Portal. Please do not reply.</p>
  </div>
</div>`.trim();
}

function buildSettingsChangeText(data: SettingsChangeEmailData): string {
  return [
    `The ${data.fieldLabel} setting was just changed in the admin dashboard.`,
    ``,
    `Old value: ${data.oldValue}`,
    `New value: ${data.newValue}`,
    `Saved by: ${data.changedBy}`,
    `When: ${formatChangeTime(data.changedAt)}`,
    ``,
    `This value affects how customer money is collected. If you did not expect this change, contact your partner immediately.`,
  ].join("\n");
}

/**
 * Notifies both partners that a money-related setting (UPI ID / prices)
 * changed. Never throws — email failure must not block the save, so all
 * errors are logged and reported as `false` per recipient.
 */
export async function sendSettingsChangedEmail(
  recipients: string[],
  data: SettingsChangeEmailData,
  log: Log,
): Promise<boolean> {
  // In development the real partners must never be emailed (same rule as the
  // settings OTP codes). Set SETTINGS_OTP_SEND_EMAILS=true to opt back in.
  if (suppressRealEmailsInDev()) {
    log.info(
      { recipients, field: data.fieldLabel },
      "DEV ONLY — settings change email suppressed (not sent to partners)",
    );
    return true;
  }
  const results = await Promise.all(
    recipients.map(async (to) => {
      try {
        const res = await postToResend({
          from: FROM_ADDRESS,
          to: [to],
          subject: `${data.fieldLabel} changed - PVC Card Portal settings`,
          html: buildSettingsChangeHtml(data),
          text: buildSettingsChangeText(data),
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          log.error(
            { status: res.status, body: errBody.slice(0, 500), to, field: data.fieldLabel },
            "Settings change email failed to send",
          );
          console.error(`[Email] Resend rejected settings-change email (HTTP ${res.status}): ${errBody.slice(0, 300)}`);
          return false;
        }
        log.info({ to, field: data.fieldLabel }, "Settings change email sent");
        return true;
      } catch (err) {
        log.error({ err, to, field: data.fieldLabel }, "Settings change email errored");
        return false;
      }
    }),
  );
  return results.every(Boolean);
}

export interface SettingsOtpEmailData {
  to: string;
  code: string;
}

function buildOtpHtml(code: string): string {
  return `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
${buildEmailHeader()}
  <div style="border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px; padding: 24px;">
    <p style="margin: 0 0 12px;">Someone is opening the <strong>admin Settings</strong> (payment UPI ID &amp; card prices).</p>
    <p style="margin: 0 0 16px;">Your one-time code is:</p>
    <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; margin-bottom: 16px;">
      <span style="font-family: monospace; font-size: 28px; font-weight: bold; color: #00afc8; letter-spacing: 6px;">${escapeHtml(code)}</span>
    </div>
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; font-size: 13px; color: #92400e; margin-bottom: 16px;">
      Settings open only when <strong>both partners'</strong> codes are entered. The code expires in 10 minutes.
    </div>
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">If you did not expect this, ignore this email — nothing changes without both codes.</p>
  </div>
</div>`.trim();
}

/**
 * Sends a settings-unlock one-time code to a partner via Resend.
 * Never throws — the route decides how to react to a failed send, so all
 * errors are logged and reported as `false`. The code itself is never logged.
 */
export async function sendSettingsOtpEmail(data: SettingsOtpEmailData, log: Log): Promise<boolean> {
  try {
    const res = await postToResend({
      from: FROM_ADDRESS,
      to: [data.to],
      subject: `${data.code} is your Settings access code - PVC Card Portal`,
      html: buildOtpHtml(data.code),
      text: [
        `Someone is opening the admin Settings (payment UPI ID & card prices).`,
        ``,
        `Your one-time code: ${data.code}`,
        ``,
        `Settings open only when both partners' codes are entered. The code expires in 10 minutes.`,
        `If you did not expect this, ignore this email - nothing changes without both codes.`,
      ].join("\n"),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      log.error({ status: res.status, body: errBody.slice(0, 500), to: data.to }, "Settings OTP email failed to send");
      console.error(`[Email] Resend rejected settings-OTP email (HTTP ${res.status}): ${errBody.slice(0, 300)}`);
      return false;
    }

    log.info({ to: data.to }, "Settings OTP email sent");
    return true;
  } catch (err) {
    log.error({ err, to: data.to }, "Settings OTP email errored");
    return false;
  }
}
