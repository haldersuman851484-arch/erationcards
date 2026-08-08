import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DEFAULT_PRICING, isValidPricingMatrix, type PricingMatrix } from "@workspace/pricing";
import { DEFAULT_CONTACT, isValidContactInfo, type ContactInfo } from "@workspace/contact";

export const PRICING_SETTING_KEY = "pricing_matrix";
export const CONTACT_SETTING_KEY = "contact_info";
export const PROCESSING_PASSWORD_SETTING_KEY = "processing_password_hash";
export const PROCESSING_PASSWORD_CHANGED_AT_SETTING_KEY = "processing_password_changed_at";

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

/**
 * The live support contact details (phone, email, address, city, hours):
 * the admin-saved setting wins, otherwise the built-in launch defaults from
 * @workspace/contact. A malformed saved value (bad JSON / wrong shape) is
 * ignored so the portal can never lose its contact info.
 */
export async function getContactInfo(): Promise<{
  contact: ContactInfo;
  source: "custom" | "default";
}> {
  const saved = await getSettingValue(CONTACT_SETTING_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (isValidContactInfo(parsed)) return { contact: parsed, source: "custom" };
    } catch {
      // fall through to default
    }
  }
  return { contact: DEFAULT_CONTACT, source: "default" };
}
