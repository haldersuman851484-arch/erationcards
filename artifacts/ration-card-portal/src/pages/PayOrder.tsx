import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Navbar, Footer } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CreditCard, FileText, Loader2, Lock, Search } from "lucide-react";
import { createCashfreePaymentSession } from "@workspace/api-client-react";
import { openCashfreeCheckout, pollPaymentStatus } from "@/lib/cashfreeCheckout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TrackedOrder {
  orderNumber: string;
  customerName?: string;
  amount: number;
  quantity?: number;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
}

type PayPhase = "idle" | "opening" | "paying" | "checking" | "unconfirmed" | "failed" | "unavailable";

/**
 * Standalone payment page: /pay/:orderNumber
 *
 * Lets a customer (or operator) finish paying for an order that was saved but
 * not paid — e.g. the payment window was closed, the gateway was briefly
 * unavailable, or they returned from Cashfree's hosted page. The server is
 * always the source of truth for the payment status.
 */
export default function PayOrder({ params }: { params: { orderNumber: string } }) {
  const orderNumber = decodeURIComponent(params.orderNumber ?? "").trim();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [payPhase, setPayPhase] = useState<PayPhase>("idle");
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}`);
        if (!res.ok) {
          if (alive) { setOrder(null); setLoading(false); }
          return;
        }
        const data = await res.json();
        if (!alive) return;
        setOrder(data);
        setLoading(false);
        // Coming back from the payment window (or a webhook race): ask the
        // server once whether the money already arrived.
        if (data?.paymentMethod === "cashfree" && (data?.paymentStatus === "pending" || data?.paymentStatus === "failed")) {
          setPayPhase("checking");
          const status = await pollPaymentStatus(orderNumber, 2, 1200);
          if (!alive) return;
          if (status === "paid") setOrder((o) => (o ? { ...o, paymentStatus: "paid" } : o));
          setPayPhase("idle");
        }
      } catch {
        if (alive) { setOrder(null); setLoading(false); }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  function onPaid() {
    setPayPhase("idle");
    setOrder((o) => (o ? { ...o, paymentStatus: "paid" } : o));
    window.scrollTo(0, 0);
  }

  /** Re-check with the server whether the money actually arrived. */
  async function checkPaymentNow(attempts: number, intervalMs: number) {
    setPayPhase("checking");
    const status = await pollPaymentStatus(orderNumber, attempts, intervalMs);
    if (status === "paid") onPaid();
    else if (status === "failed") setPayPhase("failed");
    else setPayPhase("unconfirmed");
  }

  async function startPayment() {
    setPayPhase("opening");
    let session;
    try {
      session = await createCashfreePaymentSession({ orderNumber, returnPath: `/pay/${orderNumber}` });
    } catch (err: any) {
      if (err?.status === 503) {
        setPayPhase("unavailable");
        return;
      }
      const serverMessage = typeof err?.data?.error === "string" ? err.data.error : null;
      setPayPhase("idle");
      toast({ title: "Could not start the payment", description: serverMessage ?? "Please check your connection and try again.", variant: "destructive" });
      return;
    }
    if (session.alreadyPaid) {
      onPaid();
      return;
    }
    if (!session.paymentSessionId) {
      setPayPhase("unavailable");
      return;
    }
    try {
      setPayPhase("paying");
      await openCashfreeCheckout(session.paymentSessionId, session.mode);
    } catch {
      setPayPhase("idle");
      toast({ title: "Could not open the payment window", description: "Please check your connection and try again.", variant: "destructive" });
      return;
    }
    await checkPaymentNow(3, 1500);
  }

  const payBusy = payPhase === "opening" || payPhase === "paying" || payPhase === "checking";
  const isPaid = order?.paymentStatus === "paid" || order?.paymentStatus === "confirmed";
  const isLegacy = !!order && order.paymentMethod !== "cashfree";
  const isRejected = order?.paymentStatus === "rejected";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-10">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3" data-testid="pay-page-loading">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-slate-500">Loading your order…</p>
          </div>
        )}

        {!loading && !order && (
          <Card className="border-slate-200 shadow-sm" data-testid="pay-page-notfound">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Order not found</h1>
                <p className="text-sm text-slate-600 mt-1">
                  We could not find an order with number <span className="font-mono font-semibold">{orderNumber || "—"}</span>. Please check the number and try again.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link href="/track"><Button variant="outline" data-testid="link-track">Track Order</Button></Link>
                <Link href="/order"><Button className="bg-primary hover:bg-primary/90">Place New Order</Button></Link>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && order && isPaid && (
          <Card className="border-slate-200 shadow-sm" data-testid="pay-page-paid">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Payment received</h1>
                <p className="text-sm text-slate-600 mt-1">
                  Order <span className="font-mono font-semibold">{order.orderNumber}</span> is paid — no further payment is needed.
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-left">
                <p className="text-xs text-emerald-700">
                  If you have not uploaded the e-ration card PDF(s) yet, do it now so printing can start. Already done? Check progress on Track Order.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={`/order-upload/${encodeURIComponent(order.orderNumber)}`}>
                  <Button className="bg-primary hover:bg-primary/90 gap-2 w-full sm:w-auto" data-testid="link-upload-pdfs">
                    <FileText className="w-4 h-4" /> Upload Card PDF(s)
                  </Button>
                </Link>
                <Link href="/track"><Button variant="outline" className="w-full sm:w-auto" data-testid="link-track">Track Order</Button></Link>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && order && !isPaid && isLegacy && (
          <Card className="border-slate-200 shadow-sm" data-testid="pay-legacy-note">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">No online payment needed here</h1>
                <p className="text-sm text-slate-600 mt-1">
                  Order <span className="font-mono font-semibold">{order.orderNumber}</span> was placed with our earlier payment process, so it is verified manually by our team. You can see its latest status on Track Order.
                </p>
              </div>
              <Link href="/track"><Button variant="outline" data-testid="link-track">Track Order</Button></Link>
            </CardContent>
          </Card>
        )}

        {!loading && order && !isPaid && !isLegacy && isRejected && (
          <Card className="border-slate-200 shadow-sm" data-testid="pay-page-rejected">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Payment needs attention</h1>
                <p className="text-sm text-slate-600 mt-1">
                  We could not verify the payment for order <span className="font-mono font-semibold">{order.orderNumber}</span>. Please contact us and we will sort it out.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link href="/contact"><Button className="bg-primary hover:bg-primary/90">Contact Us</Button></Link>
                <Link href="/track"><Button variant="outline" data-testid="link-track">Track Order</Button></Link>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && order && !isPaid && !isLegacy && !isRejected && (
          <Card className="border-slate-200 shadow-sm" data-testid="pay-page-pay-card">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-lg font-bold text-slate-900">Complete your payment</h1>
                <p className="text-sm text-slate-600 mt-1">
                  Order <span className="font-mono font-semibold">{order.orderNumber}</span>
                  {order.customerName ? <> for <span className="font-medium">{order.customerName}</span></> : null} is saved and waiting for payment.
                </p>
              </div>

              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20 flex items-center justify-between">
                <span className="text-sm text-slate-600">Amount to Pay{order.quantity ? ` (${order.quantity} card${order.quantity !== 1 ? "s" : ""})` : ""}</span>
                <span className="text-xl font-bold text-primary" data-testid="text-amount-to-pay">₹{order.amount}</span>
              </div>

              {order.paymentStatus === "failed" && payPhase === "idle" && (
                <p className="text-xs text-red-600" data-testid="note-previous-failed">
                  The previous payment attempt was not completed — you can safely try again.
                </p>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex gap-2.5">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Payments are processed securely by <strong>Cashfree Payments</strong>, an RBI-authorised payment gateway. We never see or store your UPI PIN or card details.
                </p>
              </div>

              {payPhase === "unavailable" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="pay-unavailable-note">
                  <p className="text-sm font-semibold text-amber-800">Online payment is temporarily unavailable</p>
                  <p className="text-xs text-amber-700 mt-0.5">Your order stays saved. Please try again in a few minutes.</p>
                </div>
              )}

              {payPhase === "failed" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="pay-failed-note">
                  <p className="text-sm font-semibold text-red-700">Payment not completed</p>
                  <p className="text-xs text-red-600 mt-0.5">The payment failed or was cancelled. If any money left your account, your bank returns it automatically within a few days. You can safely try again.</p>
                </div>
              )}

              {payPhase === "unconfirmed" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2" data-testid="pay-unconfirmed-note">
                  <p className="text-sm font-semibold text-amber-800">Payment confirmation not received yet</p>
                  <p className="text-xs text-amber-700">If you completed the payment, wait a moment and press <strong>Check Payment Status</strong> — please do not pay twice. If you closed the window without paying, simply press the Pay button again.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="button-check-status"
                    onClick={() => checkPaymentNow(4, 2000)}
                  >
                    Check Payment Status
                  </Button>
                </div>
              )}

              {payPhase === "checking" && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2" data-testid="pay-checking-note">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <p className="text-sm text-slate-700">Checking your payment…</p>
                </div>
              )}

              <Button
                type="button"
                data-testid="button-pay-now"
                className="w-full bg-primary hover:bg-primary/90 h-11"
                disabled={payBusy}
                onClick={() => startPayment()}
              >
                {payPhase === "opening" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting secure payment…</>
                ) : payPhase === "paying" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finish payment in the window…</>
                ) : payPhase === "checking" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking payment…</>
                ) : payPhase === "failed" || payPhase === "unconfirmed" ? (
                  "Try Payment Again"
                ) : (
                  <>Pay ₹{order.amount} Securely</>
                )}
              </Button>

              <p className="text-[11px] text-slate-400 text-center">
                By paying you agree to our{" "}
                <a href={`${BASE}/terms`} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Terms &amp; Conditions</a>{" "}
                and{" "}
                <a href={`${BASE}/refund`} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Return/Refund Policy</a>.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
