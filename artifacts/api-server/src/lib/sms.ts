import { logger } from "./logger";

const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";
const TRACKING_BASE = "https://erationcards.in/track";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(-10);
}

export async function sendOrderSms(
  phone: string,
  orderNumber: string,
  amount: number
): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    logger.warn("FAST2SMS_API_KEY not set — skipping SMS notification");
    return;
  }

  const number = normalizePhone(phone);
  if (number.length !== 10) {
    logger.warn({ phone }, "Invalid phone number — skipping SMS");
    return;
  }

  const message =
    `Your PVC Ration Card order ${orderNumber} has been placed. ` +
    `Amount: Rs.${amount}. Track: ${TRACKING_BASE}`;

  try {
    const params = new URLSearchParams({
      route: "q",
      message,
      language: "english",
      flash: "0",
      numbers: number,
    });

    const res = await fetch(`${FAST2SMS_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        authorization: apiKey,
        "cache-control": "no-cache",
      },
    });

    const body = (await res.json()) as { return?: boolean; message?: string[] };
    if (!res.ok || body.return === false) {
      logger.error({ status: res.status, body }, "Fast2SMS returned error");
    } else {
      logger.info({ orderNumber, number }, "Order confirmation SMS sent");
    }
  } catch (err) {
    logger.error({ err, orderNumber }, "Failed to send order SMS");
  }
}
