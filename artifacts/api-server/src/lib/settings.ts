import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DEFAULT_PRICING, isValidPricingMatrix, type PricingMatrix } from "@workspace/pricing";

export const MERCHANT_UPI_SETTING_KEY = "merchant_upi_id";
export const PRICING_SETTING_KEY = "pricing_matrix";
export const PROCESSING_PASSWORD_SETTING_KEY = "processing_password_hash";

/**
 * UPI VPA format: handle@psp — e.g. mystore@okaxis, 9876543210@ybl.
 * Handle: 2-50 chars, alphanumeric with . _ - ; PSP: letters then alphanumerics.
 */
export const UPI_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,49}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

export async function getSettingValue(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, key))
    .limit(1);
  return row ? row.value : null;
}

export async function setSettingValue(key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onDuplicateKeyUpdate({ set: { value, updatedAt: new Date() } });
}

/**
 * The UPI ID customers pay to: the admin-saved setting wins,
 * otherwise the MERCHANT_UPI_ID environment variable (launch default).
 */
export async function getMerchantUpiId(): Promise<{
  merchantUpiId: string;
  source: "custom" | "default";
}> {
  const saved = await getSettingValue(MERCHANT_UPI_SETTING_KEY);
  if (saved) return { merchantUpiId: saved, source: "custom" };
  return { merchantUpiId: process.env.MERCHANT_UPI_ID || "", source: "default" };
}

/**
 * The live card price matrix: the admin-saved setting wins, otherwise the
 * built-in launch defaults from @workspace/pricing. A malformed saved value
 * (bad JSON / wrong shape) is ignored so pricing can never break orders.
 */
export async function getPricingMatrix(): Promise<{
  pricing: PricingMatrix;
  source: "custom" | "default";
}> {
  const saved = await getSettingValue(PRICING_SETTING_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (isValidPricingMatrix(parsed)) return { pricing: parsed, source: "custom" };
    } catch {
      // fall through to default
    }
  }
  return { pricing: DEFAULT_PRICING, source: "default" };
}
