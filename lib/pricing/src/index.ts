/**
 * @workspace/pricing — single source of truth for orderable PVC card
 * categories and their pricing.
 *
 * Used by BOTH sides of the stack:
 *   - artifacts/api-server → authoritative amount computation on POST /orders
 *     (the client-sent amount is always ignored and recomputed there)
 *   - ration-card-portal   → live totals in the public & operator order forms,
 *     hero price pills, and receipt per-card price reconstruction
 *   - lib/db               → re-exports ALLOWED_CARD_TYPES for its zod
 *     FamilyCardSchema enum
 *
 * Never duplicate these numbers anywhere else.
 *
 * Pricing model:
 *   - Every card type belongs to a price group:
 *       "ration"  → AAY, PHH, SPHH, RKSY-I, RKSY-II
 *       "special" → ABHA, E-SHRAM, GENERAL
 *   - The tier (single vs multi) is decided by the TOTAL number of cards in
 *     the order. Each card is then charged its own group's rate at that tier.
 *     Example (public): 1 PHH + 1 ABHA → 2 cards → multi tier
 *       → ₹50 (ration multi) + ₹75 (special multi) = ₹125.
 */

export const RATION_CARD_TYPES = ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II"] as const;
export const SPECIAL_CARD_TYPES = ["ABHA", "E-SHRAM", "GENERAL"] as const;

/** All orderable card categories, ration types first. */
export const ALLOWED_CARD_TYPES = [...RATION_CARD_TYPES, ...SPECIAL_CARD_TYPES] as const;

export type RationCardType = (typeof RATION_CARD_TYPES)[number];
export type SpecialCardType = (typeof SPECIAL_CARD_TYPES)[number];
export type AllowedCardType = (typeof ALLOWED_CARD_TYPES)[number];

export type PriceGroup = "ration" | "special";
export type PriceTier = "single" | "multi";
export type Audience = "public" | "operator";

/** Full price matrix: ₹ per card by group, tier and audience. */
export type PricingMatrix = Record<PriceGroup, Record<PriceTier, Record<Audience, number>>>;

/**
 * Launch-default prices. These are ONLY the fallback: the live prices are
 * admin-editable and stored in the API server's `settings` table (key
 * `pricing_matrix`). The API server and the portal both resolve prices at
 * runtime and pass the resolved matrix into the functions below.
 */
export const DEFAULT_PRICING: PricingMatrix = {
  ration: {
    single: { public: 70, operator: 70 },
    multi: { public: 50, operator: 40 },
  },
  special: {
    single: { public: 100, operator: 85 },
    multi: { public: 75, operator: 70 },
  },
};

/** Bounds for admin-edited prices (₹ per card, whole rupees). */
export const PRICE_MIN = 1;
export const PRICE_MAX = 10000;

/**
 * Runtime guard for a price matrix loaded from JSON (settings table / API).
 * Accepts only a complete matrix of integers within [PRICE_MIN, PRICE_MAX].
 */
export function isValidPricingMatrix(value: unknown): value is PricingMatrix {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  for (const group of ["ration", "special"] as const) {
    const g = v[group];
    if (typeof g !== "object" || g === null) return false;
    for (const tier of ["single", "multi"] as const) {
      const t = (g as Record<string, unknown>)[tier];
      if (typeof t !== "object" || t === null) return false;
      for (const audience of ["public", "operator"] as const) {
        const p = (t as Record<string, unknown>)[audience];
        if (typeof p !== "number" || !Number.isInteger(p) || p < PRICE_MIN || p > PRICE_MAX) return false;
      }
    }
  }
  return true;
}

/** Human label for each price group, for order summaries and receipts. */
export const PRICE_GROUP_LABELS: Record<PriceGroup, string> = {
  ration: "Ration Card",
  special: "ABHA / E-SHRAM / GENERAL",
};

const SPECIAL_SET: ReadonlySet<string> = new Set(SPECIAL_CARD_TYPES);

/**
 * Price group of a card type. Unknown values fall back to "ration" so legacy
 * or imported rows can still be displayed; the API server independently
 * rejects unknown card types on order creation.
 */
export function priceGroupOf(cardType: string): PriceGroup {
  return SPECIAL_SET.has(cardType) ? "special" : "ration";
}

/** Per-card ₹ price for one card, given the order's TOTAL card count. */
export function perCardPrice(
  cardType: string,
  totalCardsInOrder: number,
  isOperator: boolean,
  pricing: PricingMatrix = DEFAULT_PRICING
): number {
  const tier: PriceTier = totalCardsInOrder <= 1 ? "single" : "multi";
  const audience: Audience = isOperator ? "operator" : "public";
  return pricing[priceGroupOf(cardType)][tier][audience];
}

/** Total ₹ amount for an order containing the given card types. */
export function computeOrderAmount(
  cardTypes: readonly string[],
  isOperator: boolean,
  pricing: PricingMatrix = DEFAULT_PRICING
): number {
  return cardTypes.reduce((sum, t) => sum + perCardPrice(t, cardTypes.length, isOperator, pricing), 0);
}

/**
 * SEO price tokens — used by ration-card-portal/index.html so the prices
 * Google shows in search snippets (meta description, Open Graph, JSON-LD
 * FAQ/offers, priceRange) always follow the live admin-edited prices.
 *
 * index.html contains placeholders like %%PRICE_RATION_SINGLE%%; in dev the
 * Vite plugin substitutes DEFAULT_PRICING, and in production the API server
 * substitutes the live matrix every time it serves index.html.
 */
export type SeoPriceTokenKey =
  | "RATION_SINGLE"
  | "RATION_MULTI"
  | "SPECIAL_SINGLE"
  | "SPECIAL_MULTI"
  | "RATION_LOW"
  | "RATION_HIGH"
  | "PUBLIC_MIN"
  | "PUBLIC_MAX";

/** Public-audience price values for each SEO token. */
export function seoPriceValues(pricing: PricingMatrix): Record<SeoPriceTokenKey, number> {
  const rationSingle = pricing.ration.single.public;
  const rationMulti = pricing.ration.multi.public;
  const specialSingle = pricing.special.single.public;
  const specialMulti = pricing.special.multi.public;
  const all = [rationSingle, rationMulti, specialSingle, specialMulti];
  return {
    RATION_SINGLE: rationSingle,
    RATION_MULTI: rationMulti,
    SPECIAL_SINGLE: specialSingle,
    SPECIAL_MULTI: specialMulti,
    RATION_LOW: Math.min(rationSingle, rationMulti),
    RATION_HIGH: Math.max(rationSingle, rationMulti),
    PUBLIC_MIN: Math.min(...all),
    PUBLIC_MAX: Math.max(...all),
  };
}

/**
 * Replaces every %%PRICE_<KEY>%% placeholder in the given HTML with the
 * corresponding public price from the matrix. Unknown placeholders are left
 * untouched (and can be asserted against in tests).
 */
export function applySeoPriceTokens(html: string, pricing: PricingMatrix = DEFAULT_PRICING): string {
  const values = seoPriceValues(pricing);
  return html.replace(/%%PRICE_([A-Z_]+)%%/g, (match, key: string) => {
    const v = values[key as SeoPriceTokenKey];
    return v === undefined ? match : String(v);
  });
}

/**
 * Prerender-only pricing "matrix" whose PUBLIC values are %%PRICE_*%% SEO
 * tokens instead of numbers. The build-time prerenderer
 * (ration-card-portal/scripts/prerender.mjs) renders the public pages with
 * this matrix so every price in the captured HTML is a token; the API server
 * then substitutes the LIVE admin-edited prices via applySeoPriceTokens on
 * every request — prerendered pages can never show stale prices.
 *
 * Operator prices never appear on prerendered public pages, so those slots
 * keep the launch-default numbers. Never use this matrix for arithmetic.
 */
export const TOKEN_PRICING = {
  ration: {
    single: { public: "%%PRICE_RATION_SINGLE%%", operator: DEFAULT_PRICING.ration.single.operator },
    multi: { public: "%%PRICE_RATION_MULTI%%", operator: DEFAULT_PRICING.ration.multi.operator },
  },
  special: {
    single: { public: "%%PRICE_SPECIAL_SINGLE%%", operator: DEFAULT_PRICING.special.single.operator },
    multi: { public: "%%PRICE_SPECIAL_MULTI%%", operator: DEFAULT_PRICING.special.multi.operator },
  },
} as unknown as PricingMatrix;

export interface PriceLine {
  group: PriceGroup;
  /** e.g. "Ration Card" or "ABHA / E-SHRAM / GENERAL" */
  label: string;
  count: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Groups an order's cards into displayable price lines (ration first).
 * An order with only one group yields a single line.
 */
export function priceBreakdown(
  cardTypes: readonly string[],
  isOperator: boolean,
  pricing: PricingMatrix = DEFAULT_PRICING
): PriceLine[] {
  const lines: PriceLine[] = [];
  for (const group of ["ration", "special"] as const) {
    const count = cardTypes.filter((t) => priceGroupOf(t) === group).length;
    if (count === 0) continue;
    const sampleType = group === "ration" ? RATION_CARD_TYPES[0] : SPECIAL_CARD_TYPES[0];
    const unitPrice = perCardPrice(sampleType, cardTypes.length, isOperator, pricing);
    lines.push({ group, label: PRICE_GROUP_LABELS[group], count, unitPrice, subtotal: unitPrice * count });
  }
  return lines;
}
