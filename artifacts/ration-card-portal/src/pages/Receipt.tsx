import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { BRAND } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useTrackOrder, getTrackOrderQueryKey } from "@workspace/api-client-react";
import { Download, ArrowLeft, CreditCard, AlertCircle, Loader2 } from "lucide-react";
import { computeOrderAmount, perCardPrice } from "@workspace/pricing";

/**
 * Customer payment receipt — public page at /receipt/:orderNumber.
 *
 * Follows the shipping-label pattern: an on-screen A4-style sheet plus the
 * browser print dialog for "Download as PDF" (no PDF library in the project).
 * Data comes from the same public track-by-order-number endpoint the Track
 * page uses, so it exposes nothing beyond what /track already shows.
 */

type FamilyCard = { customerName: string; rationCardNumber: string; cardType: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The orders.payment_status DB enum allows pending/paid/failed/refunded/
 * confirmed/rejected — map every value (plus an unknown fallback) so a
 * receipt never mislabels a paid or refunded order as "pending".
 */
type PayKind = "paid" | "pending" | "failed" | "refunded" | "unknown";

const PAY_GROUP: Record<string, PayKind> = {
  confirmed: "paid",
  paid: "paid",
  pending: "pending",
  rejected: "failed",
  failed: "failed",
  refunded: "refunded",
};

const PAYMENT_PILL: Record<PayKind, { label: string; style: React.CSSProperties }> = {
  paid: { label: "PAID", style: { background: "#d1fae5", color: "#047857", border: "1px solid #6ee7b7" } },
  pending: { label: "PAYMENT PENDING", style: { background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d" } },
  failed: { label: "NOT VERIFIED", style: { background: "#ffe4e6", color: "#be123c", border: "1px solid #fda4af" } },
  refunded: { label: "REFUNDED", style: { background: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc" } },
  unknown: { label: "PAYMENT STATUS", style: { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" } },
};

/** ₹70 stays "70"; a hypothetical uneven split renders "23.33" instead of a rounded lie. */
function fmtMoney(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function Receipt() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber ?? "";

  const { data: order, isLoading, error } = useTrackOrder(
    { orderNumber },
    { query: { enabled: !!orderNumber, queryKey: getTrackOrderQueryKey({ orderNumber }) } }
  );

  // Sets the saved-PDF filename in the print dialog to "Receipt-<order no>".
  useEffect(() => {
    if (!order) return;
    const prev = document.title;
    document.title = `Receipt-${order.orderNumber}`;
    return () => { document.title = prev; };
  }, [order]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading receipt…
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-slate-700 font-medium">Order not found</p>
          <p className="text-sm text-slate-500">We couldn't find an order with number {orderNumber}. Please check the number and try again.</p>
          <Link href="/track">
            <Button variant="outline" className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Go to Track Order</Button>
          </Link>
        </div>
      </div>
    );
  }

  const cards: FamilyCard[] = [
    { customerName: order.customerName, rationCardNumber: order.rationCardNumber, cardType: order.cardType },
    ...(((order as any).familyCards ?? []) as FamilyCard[]),
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
    if (Math.abs(computeOrderAmount(cardTypes, isOperator) - order.amount) < 0.005) {
      unitPrices = cardTypes.map((t) => perCardPrice(t, cardTypes.length, isOperator));
      break;
    }
  }
  const evenUnit = order.amount / Math.max(quantity, 1);
  const rowPrice = (i: number) => (unitPrices ? unitPrices[i] : evenUnit);
  const uniformUnit = cards.every((_, i) => rowPrice(i) === rowPrice(0)) ? rowPrice(0) : null;
  const payKind: PayKind = PAY_GROUP[order.paymentStatus] ?? "unknown";
  const pill = payKind === "unknown"
    ? { label: String(order.paymentStatus || "UNKNOWN").toUpperCase(), style: PAYMENT_PILL.unknown.style }
    : PAYMENT_PILL[payKind];
  const isPaid = payKind === "paid";
  const paymentMethod = (order as any).paymentMethod ? String((order as any).paymentMethod).toUpperCase() : "UPI";
  const deliveryName = (order as any).deliveryName || order.customerName;
  const postOffice = (order as any).postOffice;
  const phone = order.customerPhone ? (String(order.customerPhone).startsWith("+") ? order.customerPhone : `+91 ${order.customerPhone}`) : "";

  return (
    <div className="min-h-screen bg-slate-100 pb-16" data-testid="page-receipt">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body * { visibility: hidden; }
          #receipt-sheet, #receipt-sheet * { visibility: visible; }
          #receipt-sheet {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0; box-shadow: none; border-radius: 0; padding: 0;
          }
        }
      `}</style>

      {/* Action bar — never printed */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 print:hidden">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-3xl">
          <Link href="/track">
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Track Order
            </Button>
          </Link>
          <Button
            onClick={() => window.print()}
            size="sm"
            className="gap-1.5 bg-primary hover:bg-primary/90"
            data-testid="button-download-receipt"
          >
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 mt-3 print:hidden">
        Choose “Save as PDF” in the print window to download your receipt.
      </p>

      {/* The receipt sheet — the only thing that prints */}
      <div
        id="receipt-sheet"
        className="bg-white max-w-3xl mx-auto mt-4 rounded-xl shadow-sm px-6 py-8 sm:px-10 sm:py-10"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 leading-tight">{BRAND.name}</p>
              <p className="text-xs text-slate-500">erationcards.in</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold tracking-wide text-slate-900">PAYMENT RECEIPT</p>
            <p className="text-sm text-slate-500 font-mono" data-testid="text-receipt-order-num">#{order.orderNumber}</p>
            <span
              className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
              style={pill.style}
              data-testid="badge-payment-state"
            >
              {pill.label}
            </span>
          </div>
        </div>

        {/* Customer + order meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Customer</p>
            <p className="font-bold text-slate-900">{order.customerName}</p>
            {phone && <p className="text-slate-600 mt-0.5">{phone}</p>}
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-1.5">Delivery Address</p>
            <p className="text-slate-700 leading-snug">
              {deliveryName !== order.customerName && <>{deliveryName}<br /></>}
              {order.address}
              {postOffice && <><br />PO: {postOffice}</>}
              <br />{order.district}, {order.state} – {order.pincode}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Receipt / Order Date</p>
                <p className="text-slate-800 font-medium">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Payment Method</p>
                <p className="text-slate-800 font-medium">{paymentMethod}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Order Status</p>
                <p className="text-slate-800 font-medium capitalize">{order.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="py-6 border-b border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="pb-2 font-semibold w-8">#</th>
                <th className="pb-2 font-semibold">PVC Ration Card</th>
                <th className="pb-2 font-semibold w-20">Type</th>
                <th className="pb-2 font-semibold text-right w-24">Price</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card, i) => (
                <tr key={i} className="border-t border-slate-100" data-testid={`row-receipt-card-${i}`}>
                  <td className="py-2.5 text-slate-500">{i + 1}</td>
                  <td className="py-2.5">
                    <p className="font-medium text-slate-900">{card.customerName}</p>
                    <p className="text-xs text-slate-500 font-mono">{card.rationCardNumber}</p>
                  </td>
                  <td className="py-2.5 text-slate-600">{card.cardType}</td>
                  <td className="py-2.5 text-right text-slate-800">₹{fmtMoney(rowPrice(i))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={3} className="pt-3 text-right font-bold text-slate-900">Total {isPaid ? "Paid" : "Amount"}</td>
                <td className="pt-3 text-right font-extrabold text-slate-900 text-base" data-testid="text-receipt-total">₹{fmtMoney(order.amount)}</td>
              </tr>
            </tfoot>
          </table>
          {quantity > 1 && uniformUnit !== null && (
            <p className="text-xs text-slate-400 mt-2 text-right">{quantity} cards × ₹{fmtMoney(uniformUnit)} per card</p>
          )}
        </div>

        {/* Payment note */}
        <div className="py-5">
          {payKind === "paid" && (
            <p className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              Payment received with thanks.
            </p>
          )}
          {payKind === "pending" && (
            <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              Payment verification is pending. This receipt confirms your order details and becomes a payment receipt once your payment is verified.
            </p>
          )}
          {payKind === "failed" && (
            <p className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
              We could not verify this payment. Please contact {BRAND.email} for help.
            </p>
          )}
          {payKind === "refunded" && (
            <p className="text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5">
              This payment has been refunded. Contact {BRAND.email} if you have any questions.
            </p>
          )}
          {payKind === "unknown" && (
            <p className="text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              For questions about this payment, contact {BRAND.email}.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 text-center space-y-1.5">
          <p className="text-xs text-slate-500">
            {BRAND.email} | {BRAND.phone} | erationcards.in
          </p>
          <p className="text-xs font-semibold text-slate-600">
            This is a computer-generated receipt and does not require a signature.
          </p>
          <p className="text-[12px] italic text-slate-400">
            Notice: erationcards.in is not a government portal. It is a private PVC card printing service.
          </p>
        </div>
      </div>
    </div>
  );
}
