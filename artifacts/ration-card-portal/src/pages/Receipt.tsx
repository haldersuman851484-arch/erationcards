import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { BRAND } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useTrackOrder, getTrackOrderQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Download, ArrowLeft, CreditCard, AlertCircle, Loader2, Printer } from "lucide-react";
import {
  buildInvoiceModel,
  fmtMoney,
  formatInvoiceDate,
  PAY_NOTE,
  type PayKind,
  type InvoiceOrder,
} from "@/lib/invoice";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { usePricing } from "@/hooks/use-pricing";

/**
 * Customer invoice — public page at /receipt/:orderNumber.
 *
 * "Download Invoice" saves a real PDF file (built client-side with jsPDF);
 * the browser print dialog stays available as a fallback for paper copies
 * and for names in scripts the PDF fonts can't render. Data comes from the
 * same public track-by-order-number endpoint the Track page uses, so it
 * exposes nothing beyond what /track already shows.
 */

const PILL_STYLE: Record<PayKind, React.CSSProperties> = {
  paid: { background: "#d1fae5", color: "#047857", border: "1px solid #6ee7b7" },
  pending: { background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d" },
  failed: { background: "#ffe4e6", color: "#be123c", border: "1px solid #fda4af" },
  refunded: { background: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc" },
  unknown: { background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" },
};

const NOTE_CLASS: Record<PayKind, string> = {
  paid: "text-emerald-700 bg-emerald-50 border-emerald-200",
  pending: "text-amber-700 bg-amber-50 border-amber-200",
  failed: "text-rose-700 bg-rose-50 border-rose-200",
  refunded: "text-sky-700 bg-sky-50 border-sky-200",
  unknown: "text-slate-600 bg-slate-50 border-slate-200",
};

export default function Receipt() {
  const pricing = usePricing();
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber ?? "";
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const { data: order, isLoading, error } = useTrackOrder(
    { orderNumber },
    { query: { enabled: !!orderNumber, queryKey: getTrackOrderQueryKey({ orderNumber }) } }
  );

  // Sets the saved-PDF filename in the print dialog to "Invoice-<order no>".
  useEffect(() => {
    if (!order) return;
    const prev = document.title;
    document.title = `Invoice-${order.orderNumber}`;
    return () => { document.title = prev; };
  }, [order]);

  async function handleDownload() {
    if (!order || downloading) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(order as unknown as InvoiceOrder, pricing);
    } catch {
      toast({
        title: "Download failed",
        description: "Could not create the invoice PDF. Please try again, or use Print instead.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading invoice…
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

  const m = buildInvoiceModel(order as unknown as InvoiceOrder, pricing);
  const pillStyle = PILL_STYLE[m.payKind];

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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="gap-1.5"
              data-testid="button-print-invoice"
            >
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90"
              data-testid="button-download-invoice"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Preparing…" : "Download Invoice"}
            </Button>
          </div>
        </div>
      </div>

      {/* The invoice sheet — the only thing that prints */}
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
            <p className="text-lg font-extrabold tracking-wide text-slate-900">INVOICE</p>
            <p className="text-sm text-slate-500 font-mono" data-testid="text-receipt-order-num">#{order.orderNumber}</p>
            <span
              className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
              style={pillStyle}
              data-testid="badge-payment-state"
            >
              {m.payLabel}
            </span>
          </div>
        </div>

        {/* Customer + order meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Customer</p>
            <p className="font-bold text-slate-900">{order.customerName}</p>
            {m.phone && <p className="text-slate-600 mt-0.5">{m.phone}</p>}
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-1.5">Delivery Address</p>
            <p className="text-slate-700 leading-snug">
              {m.deliveryName !== order.customerName && <>{m.deliveryName}<br /></>}
              {order.address}
              {m.postOffice && <><br />PO: {m.postOffice}</>}
              <br />{order.district}, {order.state} – {order.pincode}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Invoice / Order Date</p>
                <p className="text-slate-800 font-medium">{formatInvoiceDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Payment Method</p>
                <p className="text-slate-800 font-medium">{m.paymentMethod}</p>
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
              {m.cards.map((card, i) => (
                <tr key={i} className="border-t border-slate-100" data-testid={`row-receipt-card-${i}`}>
                  <td className="py-2.5 text-slate-500">{i + 1}</td>
                  <td className="py-2.5">
                    <p className="font-medium text-slate-900">{card.customerName}</p>
                    <p className="text-xs text-slate-500 font-mono">{card.rationCardNumber}</p>
                  </td>
                  <td className="py-2.5 text-slate-600">{card.cardType}</td>
                  <td className="py-2.5 text-right text-slate-800">₹{fmtMoney(m.rowPrice(i))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td colSpan={3} className="pt-3 text-right font-bold text-slate-900">Total {m.isPaid ? "Paid" : "Amount"}</td>
                <td className="pt-3 text-right font-extrabold text-slate-900 text-base" data-testid="text-receipt-total">₹{fmtMoney(order.amount)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">Prices are inclusive of GST &amp; postage.</p>
            {m.quantity > 1 && m.uniformUnit !== null && (
              <p className="text-xs text-slate-400 text-right">{m.quantity} cards × ₹{fmtMoney(m.uniformUnit)} per card</p>
            )}
          </div>
        </div>

        {/* Payment note */}
        <div className="py-5">
          <p className={`text-sm font-medium border rounded-lg px-3 py-2.5 ${NOTE_CLASS[m.payKind]}`}>
            {PAY_NOTE[m.payKind]}
          </p>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 text-center space-y-1.5">
          <p className="text-xs text-slate-500">
            {BRAND.email} | {BRAND.phone} | erationcards.in
          </p>
          <p className="text-xs font-semibold text-slate-600">
            This is a computer-generated invoice and does not require a signature.
          </p>
          <p className="text-[12px] italic text-slate-400">
            Notice: erationcards.in is not a government portal. It is a private PVC card printing service.
          </p>
        </div>
      </div>
    </div>
  );
}
