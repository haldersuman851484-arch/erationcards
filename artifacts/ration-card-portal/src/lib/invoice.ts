import { computeOrderAmount, perCardPrice, DEFAULT_PRICING, type PricingMatrix } from "@workspace/pricing";

/**
 * Shared invoice/receipt derivation used by the on-screen Receipt page and
 * the downloadable PDF invoice — one source of truth so both always agree.
 */

export type InvoiceCard = { customerName: string; rationCardNumber: string; cardType: string };

/**
 * The orders.payment_status DB enum allows pending/paid/failed/refunded/
 * confirmed/rejected — map every value (plus an unknown fallback) so an
 * invoice never mislabels a paid or refunded order as "pending".
 */
export type PayKind = "paid" | "pending" | "failed" | "refunded" | "unknown";

export const PAY_GROUP: Record<string, PayKind> = {
  confirmed: "paid",
  paid: "paid",
  pending: "pending",
  rejected: "failed",
  failed: "failed",
  refunded: "refunded",
};

export const PAY_LABEL: Record<PayKind, string> = {
  paid: "PAID",
  pending: "PAYMENT PENDING",
  failed: "NOT VERIFIED",
  refunded: "REFUNDED",
  unknown: "PAYMENT STATUS",
};

/**
 * Payment note shown on the sheet and inside the PDF — identical wording.
 * Takes the live support email (admin-editable in Settings) so the note
 * always points customers at the current address.
 */
export function payNotes(supportEmail: string): Record<PayKind, string> {
  return {
    paid: "Payment received with thanks.",
    pending: "Payment is pending. This invoice confirms your order details and becomes a payment receipt once your payment is completed.",
    failed: `We could not verify this payment. Please contact ${supportEmail} for help.`,
    refunded: `This payment has been refunded. Contact ${supportEmail} if you have any questions.`,
    unknown: `For questions about this payment, contact ${supportEmail}.`,
  };
}

/** ₹70 stays "70"; a hypothetical uneven split renders "23.33" instead of a rounded lie. */
export function fmtMoney(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function formatInvoiceDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Minimal shape of the public track-order response that the invoice needs. */
export type InvoiceOrder = {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  rationCardNumber: string;
  cardType: string;
  familyCards?: InvoiceCard[];
  quantity?: number;
  amount: number;
  paymentStatus?: string;
  paymentMethod?: string | null;
  status?: string;
  createdAt: string;
  address?: string;
  postOffice?: string | null;
  district?: string;
  state?: string;
  pincode?: string;
  deliveryName?: string | null;
};

export type InvoiceModel = {
  cards: InvoiceCard[];
  quantity: number;
  rowPrice: (i: number) => number;
  /** Set when every card costs the same — used for the "N × price" note. */
  uniformUnit: number | null;
  payKind: PayKind;
  payLabel: string;
  isPaid: boolean;
  paymentMethod: string;
  deliveryName: string;
  postOffice: string | null;
  phone: string;
};

export function buildInvoiceModel(order: InvoiceOrder, pricing: PricingMatrix = DEFAULT_PRICING): InvoiceModel {
  const cards: InvoiceCard[] = [
    { customerName: order.customerName, rationCardNumber: order.rationCardNumber, cardType: order.cardType },
    ...(order.familyCards ?? []),
  ];
  const quantity = order.quantity || cards.length;

  // Reconstruct per-card prices from the shared pricing rules. The public
  // track endpoint doesn't say whether an operator placed the order, so try
  // the public scheme first, then the operator scheme — whichever reproduces
  // the stored total priced this order (when both match, the prices are
  // identical anyway). Orders whose stored amount matches neither (e.g.
  // legacy or manually adjusted) fall back to an even split across cards.
  const cardTypes = cards.map((c) => c.cardType);
  let unitPrices: number[] | null = null;
  for (const isOperator of [false, true]) {
    if (Math.abs(computeOrderAmount(cardTypes, isOperator, pricing) - order.amount) < 0.005) {
      unitPrices = cardTypes.map((t) => perCardPrice(t, cardTypes.length, isOperator, pricing));
      break;
    }
  }
  const evenUnit = order.amount / Math.max(quantity, 1);
  const rowPrice = (i: number) => (unitPrices ? unitPrices[i] : evenUnit);
  const uniformUnit = cards.every((_, i) => rowPrice(i) === rowPrice(0)) ? rowPrice(0) : null;

  const payKind: PayKind = PAY_GROUP[order.paymentStatus ?? ""] ?? "unknown";
  const payLabel = payKind === "unknown"
    ? String(order.paymentStatus || "UNKNOWN").toUpperCase()
    : PAY_LABEL[payKind];

  const rawPhone = order.customerPhone ? String(order.customerPhone) : "";
  const phone = rawPhone ? (rawPhone.startsWith("+") ? rawPhone : `+91 ${rawPhone}`) : "";

  return {
    cards,
    quantity,
    rowPrice,
    uniformUnit,
    payKind,
    payLabel,
    isPaid: payKind === "paid",
    paymentMethod:
      order.paymentMethod === "cashfree"
        ? "Online (Cashfree)"
        : order.paymentMethod
          ? String(order.paymentMethod).toUpperCase()
          : "UPI",
    deliveryName: order.deliveryName || order.customerName,
    postOffice: order.postOffice ?? null,
    phone,
  };
}
