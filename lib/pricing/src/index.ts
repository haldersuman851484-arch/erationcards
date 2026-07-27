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

/** Per-card prices in ₹ by group, tier and audience. */
export const PRICING: Record<PriceGroup, Record<PriceTier, Record<Audience, number>>> = {
  ration: {
    single: { public: 70, operator: 70 },
    multi: { public: 50, operator: 40 },
  },
  special: {
    single: { public: 100, operator: 85 },
    multi: { public: 75, operator: 70 },
  },
};

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
export function perCardPrice(cardType: string, totalCardsInOrder: number, isOperator: boolean): number {
  const tier: PriceTier = totalCardsInOrder <= 1 ? "single" : "multi";
  const audience: Audience = isOperator ? "operator" : "public";
  return PRICING[priceGroupOf(cardType)][tier][audience];
}

/** Total ₹ amount for an order containing the given card types. */
export function computeOrderAmount(cardTypes: readonly string[], isOperator: boolean): number {
  return cardTypes.reduce((sum, t) => sum + perCardPrice(t, cardTypes.length, isOperator), 0);
}

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
export function priceBreakdown(cardTypes: readonly string[], isOperator: boolean): PriceLine[] {
  const lines: PriceLine[] = [];
  for (const group of ["ration", "special"] as const) {
    const count = cardTypes.filter((t) => priceGroupOf(t) === group).length;
    if (count === 0) continue;
    const sampleType = group === "ration" ? RATION_CARD_TYPES[0] : SPECIAL_CARD_TYPES[0];
    const unitPrice = perCardPrice(sampleType, cardTypes.length, isOperator);
    lines.push({ group, label: PRICE_GROUP_LABELS[group], count, unitPrice, subtotal: unitPrice * count });
  }
  return lines;
}
