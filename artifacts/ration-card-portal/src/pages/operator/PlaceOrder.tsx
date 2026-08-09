import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { OperatorLayout } from "@/components/OperatorLayout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useGetCurrentOperator, getGetCurrentOperatorQueryKey,
  useCreateOrder, useCreateCashfreePaymentSession,
  useLogoutOperator, useSubmitOrder,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Download, Plus, Pencil, Trash2,
  User, MapPin, CreditCard, IndianRupee, ChevronRight, ChevronLeft,
  FileText, Loader2, Lock, Mail,
} from "lucide-react";
import {
  RATION_CARD_TYPES,
  SPECIAL_CARD_TYPES,
  ALLOWED_CARD_TYPES,
  computeOrderAmount,
  priceBreakdown,
} from "@workspace/pricing";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { usePricing } from "@/hooks/use-pricing";
import { useContact } from "@/hooks/use-contact";
import { applyServerFieldErrors, extractFamilyCardIssues, scrollToFamilyCard, scrollToField } from "@/lib/serverFieldErrors";
import { openCashfreeCheckout, pollPaymentStatus } from "@/lib/cashfreeCheckout";

const WB_DISTRICTS = [
  "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur",
  "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram",
  "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia",
  "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur",
  "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur",
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Card types & operator pricing come from @workspace/pricing — shared
// with the API server, which recomputes the amount when the order is created.

/** Card-type options grouped as ration vs Other PVC Cards. */
function CardTypeOptions() {
  return (
    <>
      <SelectGroup>
        <SelectLabel>Ration Card</SelectLabel>
        {RATION_CARD_TYPES.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
      </SelectGroup>
      <SelectGroup>
        <SelectLabel>Other PVC Cards</SelectLabel>
        {SPECIAL_CARD_TYPES.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
      </SelectGroup>
    </>
  );
}

type FamilyCard = { customerName: string; rationCardNumber: string; cardType: string };

const orderSchema = z.object({
  customerName: z.string().min(2, "Name required"),
  customerPhone: z.string().min(10, "Valid phone required"),
  customerEmail: z.string().trim().email("Valid email required"),
  rationCardNumber: z.string().min(5, "Valid ration card number required"),
  deliveryName: z.string().min(2, "Full name required"),
  address: z.string().min(10, "Full address required"),
  postOffice: z.string().min(2, "Post office required"),
  district: z.string().min(1, "Select district"),
  pincode: z.string().length(6, "6-digit pincode required"),
  cardType: z.enum(ALLOWED_CARD_TYPES, { errorMap: () => ({ message: "Please select your card type" }) }),
  quantity: z.coerce.number().min(1),
});
type OrderForm = z.infer<typeof orderSchema>;

// Which wizard step renders each form field — used to navigate back to the
// right step when the server rejects a field after submission.
const ORDER_FIELD_STEPS: Record<string, number> = {
  customerName: 1,
  customerPhone: 1,
  rationCardNumber: 1,
  cardType: 1,
  deliveryName: 2,
  address: 2,
  postOffice: 2,
  district: 2,
  pincode: 2,
  customerEmail: 2,
};

function getAuthHeader() {
  const token = localStorage.getItem("operatorToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Pricing rows shown to the operator before they start filling the form. */
function OperatorPricingBanner() {
  const PRICING = usePricing();
  const rows: Array<{ group: string; label: string; typesLabel: string; typesColor: string; single: number; multi: number }> = [
    { group: "ration", label: "RATION CARD", typesLabel: RATION_CARD_TYPES.join(" · "), typesColor: "text-[#f2f9ffb5]", single: PRICING.ration.single.operator, multi: PRICING.ration.multi.operator },
    { group: "special", label: "OTHER PVC CARDS", typesLabel: `${SPECIAL_CARD_TYPES.slice(0, 3).join(" · ")} + ${SPECIAL_CARD_TYPES.length - 3} more`, typesColor: "text-[#c5e6eb]", single: PRICING.special.single.operator, multi: PRICING.special.multi.operator },
  ];
  return (
    <div className="rounded-xl border border-primary/15 from-primary/5 to-sky-50 p-4 mb-4 bg-[#038ffff2] text-[#ffffff]">
      <p className="text-xs font-bold uppercase tracking-wide mb-3 text-[#ffd900]">Operator Rates</p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.group} className="flex flex-wrap items-center gap-2">
            <span className="w-44 shrink-0">
              <span className="block font-semibold text-background text-[14px]">{row.label}</span>
              <span className={`block ${row.typesColor} text-[12px]`} data-testid={`pricing-types-${row.group}`}>
                {row.typesLabel}
              </span>
            </span>
            {/* Single pill */}
            <span className="rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1">
              1 card ₹{row.single}
            </span>
            {/* Multi pill with SAVE badge */}
            <span className="relative rounded-full bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1">
              2+ cards ₹{row.multi} each
              <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[9px] font-extrabold rounded px-1 py-0.5 leading-none">
                SAVE
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] mt-3 text-[#ffffff]">incl. GST &amp; postage · Operator rates</p>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const steps = ["Card Details", "Delivery", "Payment"];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const s = i + 1;
        const active = step === s;
        const done = step > s;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${done ? "bg-primary border-primary text-white" : active ? "bg-primary border-primary text-white scale-110 shadow-md shadow-primary/30" : "bg-white border-slate-300 text-slate-400"}`}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${active ? "text-primary" : done ? "text-slate-600" : "text-slate-400"}`}>{label}</span>
            {i < steps.length - 1 && <div className={`h-0.5 w-6 sm:w-10 ${done ? "bg-primary" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function PlaceOrder() {
  const PRICING = usePricing();
  const CONTACT = useContact();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [familyCards, setFamilyCards] = useState<FamilyCard[]>([]);
  const [familyDialog, setFamilyDialog] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [subCard, setSubCard] = useState<FamilyCard>({ customerName: "", rationCardNumber: "", cardType: "" });
  const [subError, setSubError] = useState("");
  // Server-rejected family-card entries: index in familyCards → message.
  const [familyCardErrors, setFamilyCardErrors] = useState<Record<number, string>>({});
  const [consentChecked, setConsentChecked] = useState(false);
  // Online-payment UI phase. "unconfirmed" = the checkout window closed but
  // the server has not seen the money yet — offer a re-check, never assume.
  const [payPhase, setPayPhase] = useState<
    "idle" | "opening" | "paying" | "checking" | "unconfirmed" | "failed" | "unavailable"
  >("idle");
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{ orderNumber: string } | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const { data: operator, error: opError } = useGetCurrentOperator({
    query: { queryKey: getGetCurrentOperatorQueryKey() },
    request: { headers: getAuthHeader() },
  } as any);

  const createOrder = useCreateOrder({ request: { headers: getAuthHeader() } } as any);
  const createCashfreeSession = useCreateCashfreePaymentSession();
  const submitOrder = useSubmitOrder();
  const logoutOperator = useLogoutOperator();

  useEffect(() => { if (opError) setLocation("/operator/login"); }, [opError, setLocation]);

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: "", customerPhone: "", customerEmail: "", rationCardNumber: "",
      deliveryName: "", address: "", postOffice: "",
      // Deliberately unselected — the operator must actively choose a card type.
      district: "", pincode: "", cardType: "" as OrderForm["cardType"], quantity: 1,
    },
  });

  const cardType = form.watch("cardType");
  const totalCards = 1 + familyCards.length;
  // filter(Boolean): an unselected ("") card type must not count toward the
  // live total — the pricing helper would otherwise treat it as a ration card.
  const allCardTypes = [cardType, ...familyCards.map((c) => c.cardType)].filter(Boolean);
  const amount = computeOrderAmount(allCardTypes, true, PRICING);
  const breakdown = priceBreakdown(allCardTypes, true, PRICING);

  /**
   * Payment is the last step: show the success screen straight away. The
   * server finalized the order when the payment confirmed (submittedAt +
   * confirmation email) — the legacy submit call only reads the email
   * outcome, so its failure never hides the success screen.
   */
  function finishToSuccess(orderNumber: string) {
    submitOrder.mutate(
      { orderNumber },
      {
        onSuccess: (result) => setEmailSent(result.emailSent),
        onError: () => setEmailSent(null),
      },
    );
    setSuccess({ orderNumber });
    window.scrollTo(0, 0);
  }

  const payBusy =
    createOrder.isPending || payPhase === "opening" || payPhase === "paying" || payPhase === "checking";

  function onPaid(orderNumber: string) {
    setPayPhase("idle");
    finishToSuccess(orderNumber);
  }

  /** Re-check with the server whether the money actually arrived. */
  async function checkPaymentNow(orderNumber: string, attempts: number, intervalMs: number) {
    setPayPhase("checking");
    const status = await pollPaymentStatus(orderNumber, attempts, intervalMs);
    if (status === "paid") onPaid(orderNumber);
    else if (status === "failed") setPayPhase("failed");
    else setPayPhase("unconfirmed");
  }

  /**
   * Create (or reuse) the Cashfree payment session for this order, open the
   * secure checkout window, then poll the server for the outcome. The server
   * is the source of truth — the SDK promise only tells us the window closed.
   */
  async function startPayment(orderNumber: string) {
    setPayPhase("opening");
    let session;
    try {
      session = await createCashfreeSession.mutateAsync({
        data: { orderNumber, returnPath: `/pay/${orderNumber}` },
      });
    } catch (err: any) {
      if (err?.status === 503) {
        setPayPhase("unavailable");
        return;
      }
      const serverMessage = typeof err?.data?.error === "string" ? err.data.error : null;
      setPayPhase("idle");
      toast({ title: "Could not start the payment", description: serverMessage ?? "Check the connection and try again.", variant: "destructive" });
      return;
    }
    if (session.alreadyPaid) {
      onPaid(orderNumber);
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
      toast({ title: "Could not open the payment window", description: "Check the connection and try again.", variant: "destructive" });
      return;
    }
    await checkPaymentNow(orderNumber, 3, 1500);
  }

  function openAddFamily(idx: number | null = null) {
    if (idx !== null) { setSubCard(familyCards[idx]); setEditIdx(idx); }
    else { setSubCard({ customerName: "", rationCardNumber: "", cardType: "" }); setEditIdx(null); }
    setSubError(""); setFamilyDialog(true);
  }

  function saveFamilyCard() {
    if (!subCard.cardType) { setSubError("Please select card type"); return; }
    if (subCard.customerName.trim().length < 2) { setSubError("Enter card holder name"); return; }
    if (subCard.rationCardNumber.trim().length < 5) { setSubError("Enter valid ration card number"); return; }
    setFamilyCards(prev => {
      const next = [...prev];
      const entry = { customerName: subCard.customerName.trim(), rationCardNumber: subCard.rationCardNumber.trim(), cardType: subCard.cardType };
      if (editIdx !== null) next[editIdx] = entry; else next.push(entry);
      return next;
    });
    // Entries changed — stale server errors no longer match; re-validate on submit.
    setFamilyCardErrors({});
    setFamilyDialog(false);
  }

  async function onSubmit(data: OrderForm) {
    // Order already created (an earlier payment attempt) — never create a
    // duplicate; jump straight back into the payment flow.
    if (createdOrder) {
      await startPayment(createdOrder.orderNumber);
      return;
    }
    if (!consentChecked) {
      toast({ title: "Consent required", description: "Tick the consent box to proceed.", variant: "destructive" });
      return;
    }
    createOrder.mutate(
      { data: { customerName: data.customerName, customerPhone: data.customerPhone, customerEmail: data.customerEmail, rationCardNumber: data.rationCardNumber, deliveryName: data.deliveryName, address: data.address, postOffice: data.postOffice, state: "West Bengal", district: data.district, pincode: data.pincode, cardType: data.cardType, familyCards, quantity: totalCards, amount } },
      {
        onSuccess: (order) => {
          setCreatedOrder({ orderNumber: order.orderNumber });
          // Straight into payment — the order stays "pending" until paid.
          void startPayment(order.orderNumber);
        },
        onError: (err: any) => {
          const serverMessage = typeof err?.data?.error === "string" ? err.data.error : null;
          // Field-level 400: highlight the offending input(s) inline, jump to
          // the wizard step that contains the first one, and scroll to it.
          const firstField = applyServerFieldErrors(form, err?.data?.details);
          // Issues inside the familyCards array: highlight the exact family
          // card row(s) in the step-1 list and name the bad field.
          const familyIssues = extractFamilyCardIssues(err?.data?.details);
          if (familyIssues.length > 0) {
            const map: Record<number, string> = {};
            for (const fi of familyIssues) if (!(fi.index in map)) map[fi.index] = fi.message;
            setFamilyCardErrors(map);
          }
          if (firstField || familyIssues.length > 0) {
            if (firstField) {
              setStep(ORDER_FIELD_STEPS[firstField] ?? 1);
              scrollToField(form, firstField);
            } else {
              setStep(1);
              scrollToFamilyCard(familyIssues[0].index);
            }
            toast({
              title: familyIssues.length > 0 && !firstField
                ? `Please fix family member card ${familyIssues[0].index + 1}`
                : "Please fix the highlighted field",
              description: serverMessage ?? "Check the fields marked in red and try again.",
              variant: "destructive",
            });
            return;
          }
          toast({ title: "Failed to place order", description: serverMessage ?? "Please try again.", variant: "destructive" });
        },
      }
    );
  }

  function handleLogout() {
    logoutOperator.mutate(undefined, {
      onSuccess: () => { localStorage.removeItem("operatorToken"); setLocation("/operator/login"); },
    });
  }

  // Fetch the authoritative order from the server (amount is recomputed
  // there), then build and save the PDF — form state may already be stale.
  async function handleDownloadInvoice() {
    if (!success || invoiceBusy) return;
    setInvoiceBusy(true);
    try {
      const res = await fetch(`${BASE}/api/orders/track?orderNumber=${encodeURIComponent(success.orderNumber)}`);
      if (!res.ok) throw new Error("order lookup failed");
      const fullOrder = await res.json();
      await downloadInvoicePdf(fullOrder, PRICING, CONTACT);
    } catch {
      toast({
        title: "Download failed",
        description: "Could not create the invoice PDF. Try again — it is also available from Track Order.",
        variant: "destructive",
      });
    } finally {
      setInvoiceBusy(false);
    }
  }

  function resetOrder() {
    setSuccess(null); setStep(1); setFamilyCards([]); setFamilyCardErrors({}); setConsentChecked(false); setPayPhase("idle");
    setCreatedOrder(null); setEmailSent(null);
    form.reset();
  }

  if (success) {
    return (
      <OperatorLayout operatorName={operator?.name} shopName={operator?.shopName} district={operator?.district} onLogout={handleLogout}>
        <div className="p-4 md:p-6 max-w-md mx-auto">
          <style>{`@keyframes popIn{0%{opacity:0;transform:scale(0.9) translateY(12px)}100%{opacity:1;transform:none}}`}</style>
          <div className="text-center space-y-5 py-8" style={{ animation: "popIn 0.4s ease both" }} data-testid="order-success-card">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Order Placed!</h2>
              <p className="text-slate-500 text-sm mt-1">Payment completed online — the order is confirmed and queued for printing.</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Order Number</p>
              <p className="text-2xl font-mono font-bold text-primary">{success.orderNumber}</p>
            </div>
            {emailSent === true && (
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 flex items-start gap-2 text-left" data-testid="note-email-sent">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700">Order number emailed to <strong>{form.getValues("customerEmail")}</strong>.</p>
              </div>
            )}
            {emailSent === false && (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-start gap-2 text-left" data-testid="note-email-failed">
                <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Email could not be sent — note down the order number for the customer.</p>
              </div>
            )}
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-left" data-testid="note-payment-received">
              <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Payment received</p>
              <p className="text-xs text-emerald-700 mt-1">Paid securely online via Cashfree — no manual verification needed. Delivery in 5–7 working days.</p>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-200 flex items-start gap-2 text-left" data-testid="note-pdf-pending">
              <FileText className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-800"><span className="font-semibold">Next:</span> upload the customer's e-ration card PDF from <strong>Track Order</strong> using this order number. It can be added or changed any time.</p>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
              onClick={handleDownloadInvoice}
              disabled={invoiceBusy}
              data-testid="button-download-invoice"
            >
              {invoiceBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {invoiceBusy ? "Preparing Invoice…" : "Download Invoice"}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setLocation("/operator/track")}>Track Order</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={resetOrder}>New Order</Button>
            </div>
          </div>
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout operatorName={operator?.name} shopName={operator?.shopName} district={operator?.district} onLogout={handleLogout}>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-900">Order PVC Card</h1>
          <p className="text-slate-500 text-sm mt-0.5">Place a new PVC ration card order for your customer.</p>
        </div>

        <OperatorPricingBanner />

        <StepIndicator step={step} />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>

            {/* ── Step 1: Card Details ── */}
            {step === 1 && (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-slate-800 text-sm">Customer & Card Details</h2>
                  </div>

                  <FormField control={form.control} name="cardType" render={({ field }) => (
                    <FormItem><FormLabel>Card Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-card-type-operator"><SelectValue placeholder="Select Card Type" /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-60 overflow-y-auto"><CardTypeOptions /></SelectContent>
                      </Select>
                      <FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="customerName" render={({ field }) => (
                      <FormItem><FormLabel>Card Holder Name *</FormLabel>
                        <FormControl><Input placeholder="Full name on ration card" {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="customerPhone" render={({ field }) => (
                      <FormItem><FormLabel>Mobile Number *</FormLabel>
                        <FormControl><Input placeholder="10-digit mobile" {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="rationCardNumber" render={({ field }) => (
                      <FormItem><FormLabel>Card Number *</FormLabel>
                        <FormControl><Input placeholder="Card number" {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                  </div>

                  {/* Family Cards */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Family Cards</p>
                        <p className="text-xs text-slate-500">{familyCards.length} additional card{familyCards.length !== 1 ? "s" : ""} added</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => openAddFamily()}>
                        <Plus className="w-3.5 h-3.5" /> Add Family Card
                      </Button>
                    </div>
                    {familyCards.length > 0 && (
                      <div className="space-y-2">
                        {familyCards.map((fc, i) => (
                          <div key={i} data-family-card-row={i} className={`bg-white rounded-lg p-2.5 border ${familyCardErrors[i] ? "border-red-500 bg-red-50" : "border-slate-200"}`} data-testid={`family-card-${i}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{fc.customerName}</p>
                                <p className="text-xs text-slate-500 font-mono">{fc.rationCardNumber} · {fc.cardType}</p>
                              </div>
                              <button type="button" onClick={() => openAddFamily(i)} className="text-slate-400 hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => { setFamilyCards(p => p.filter((_, j) => j !== i)); setFamilyCardErrors({}); }} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            {familyCardErrors[i] && (
                              <p className="text-xs font-medium text-red-600 mt-1" data-testid={`family-card-error-${i}`}>{familyCardErrors[i]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price summary */}
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex items-center justify-between">
                    <div>
                      {breakdown.map((line) => (
                        <p key={line.group} className="text-xs text-slate-500" data-testid={`price-line-${line.group}`}>
                          {line.label}: {line.count} card{line.count !== 1 ? "s" : ""} × ₹{line.unitPrice}
                        </p>
                      ))}
                      <p className="text-sm font-bold text-primary">₹{amount} total</p>
                    </div>
                    {cardType && <Badge variant="outline" className="border-primary/30 text-primary text-xs">{cardType}</Badge>}
                  </div>

                  <Button type="button" className="w-full gap-2" onClick={() => form.trigger(["customerName","customerPhone","rationCardNumber","cardType"]).then(ok => ok && setStep(2))}>
                    Next: Delivery Address <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Step 2: Delivery ── */}
            {step === 2 && (
              <Card className="border-0 shadow-sm bg-white">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-slate-800 text-sm">Delivery Address</h2>
                  </div>

                  <FormField control={form.control} name="deliveryName" render={({ field }) => (
                    <FormItem><FormLabel>Full Name (Delivery) *</FormLabel>
                      <FormControl><Input placeholder="Name for delivery" {...field} /></FormControl>
                      <FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Street Address *</FormLabel>
                      <FormControl><Input placeholder="House no, street, locality" {...field} /></FormControl>
                      <FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="postOffice" render={({ field }) => (
                      <FormItem><FormLabel>Post Office *</FormLabel>
                        <FormControl><Input placeholder="Post office" {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none text-slate-700">State</label>
                      <Input value="West Bengal" disabled className="bg-slate-50 text-slate-500" />
                    </div>
                    <FormField control={form.control} name="district" render={({ field }) => (
                      <FormItem><FormLabel>District *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                          <SelectContent className="max-h-52 overflow-y-auto">{WB_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="pincode" render={({ field }) => (
                    <FormItem className="sm:w-1/3"><FormLabel>PIN Code *</FormLabel>
                      <FormControl><Input placeholder="6-digit PIN" maxLength={6} {...field} /></FormControl>
                      <FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="customerEmail" render={({ field }) => (
                    <FormItem><FormLabel>Email ID *</FormLabel>
                      <FormControl><Input data-testid="input-email" type="email" placeholder="customer@example.com" {...field} /></FormControl>
                      <p className="text-xs text-slate-500">The order number will be emailed to the customer at this address.</p>
                      <FormMessage /></FormItem>
                  )} />

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                      <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button type="button" className="flex-1 gap-2" onClick={() => form.trigger(["deliveryName","address","postOffice","district","pincode","customerEmail"]).then(ok => ok && setStep(3))}>
                      Next: Payment <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Payment ── */}
            {step === 3 && (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <IndianRupee className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-slate-800 text-sm">Review &amp; Pay ₹{amount}</h2>
                    </div>

                    <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                      <p className="text-xs text-primary font-semibold">Amount: ₹{amount}</p>
                      {breakdown.map((line) => (
                        <p key={line.group} className="text-xs text-slate-500" data-testid={`price-line-step3-${line.group}`}>
                          {line.label}: {line.count} card{line.count !== 1 ? "s" : ""} × ₹{line.unitPrice}
                        </p>
                      ))}
                    </div>

                    {/* Secure payment note */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex gap-2.5">
                      <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Payment opens in a secure <strong>Cashfree Payments</strong> window — pay by any UPI app, card or net banking. The order confirms automatically once the payment succeeds.
                      </p>
                    </div>

                    {/* Consent checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group" data-testid="label-consent">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        data-testid="checkbox-consent"
                        className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 leading-snug">
                        I have read and understood all the{" "}
                        <a
                          href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/terms`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="link-consent-terms"
                        >
                          Terms &amp; Conditions
                        </a>{" "}
                        and the{" "}
                        <a
                          href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/refund`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary hover:text-primary/80"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="link-consent-refund"
                        >
                          Return/Refund Policy
                        </a>
                        , and I hereby give my consent to proceed with the printing of the customer&apos;s document.
                      </span>
                    </label>

                    {payPhase === "unavailable" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="pay-unavailable-note">
                        <p className="text-sm font-semibold text-amber-800">Online payment is temporarily unavailable</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {createdOrder
                            ? `Order ${createdOrder.orderNumber} is saved. Try the payment again in a few minutes — or finish it later from Track Order.`
                            : "Try again in a few minutes — the form stays filled in."}
                        </p>
                      </div>
                    )}

                    {payPhase === "failed" && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="pay-failed-note">
                        <p className="text-sm font-semibold text-red-700">Payment not completed</p>
                        <p className="text-xs text-red-600 mt-0.5">The payment failed or was cancelled. If money left the account, the bank returns it automatically within a few days. You can safely try again.</p>
                      </div>
                    )}

                    {payPhase === "unconfirmed" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2" data-testid="pay-unconfirmed-note">
                        <p className="text-sm font-semibold text-amber-800">Payment confirmation not received yet</p>
                        <p className="text-xs text-amber-700">If the payment was completed, wait a moment and press <strong>Check Payment Status</strong> — do not pay twice. If the window was closed without paying, press the Pay button again.</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid="button-check-status"
                          onClick={() => createdOrder && checkPaymentNow(createdOrder.orderNumber, 4, 2000)}
                        >
                          Check Payment Status
                        </Button>
                      </div>
                    )}

                    {payPhase === "checking" && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2" data-testid="pay-checking-note">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <p className="text-sm text-slate-700">Checking the payment…</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {createdOrder && payPhase !== "checking" && payPhase !== "paying" && (
                    <p className="text-xs text-slate-500" data-testid="note-order-saved">
                      Order <span className="font-mono font-semibold">{createdOrder.orderNumber}</span> is saved — the details can no longer be changed.
                    </p>
                  )}
                  {!consentChecked && !payBusy && (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5" data-testid="submit-disabled-hint">
                      <span>⚠️</span> Tick the consent box above to enable payment.
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)} disabled={payBusy}>
                      <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button
                      type="submit"
                      data-testid="button-pay-now"
                      className="flex-1 bg-primary hover:bg-primary/90"
                      disabled={payBusy || !consentChecked}
                      title={!consentChecked ? "Tick the consent box first" : undefined}
                    >
                      {payPhase === "opening" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting…</>
                      ) : payPhase === "paying" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finish payment…</>
                      ) : payPhase === "checking" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking…</>
                      ) : createOrder.isPending ? (
                        "Saving order…"
                      ) : payPhase === "failed" || payPhase === "unconfirmed" ? (
                        "Try Payment Again"
                      ) : (
                        <>Pay ₹{amount} Securely</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </form>
        </Form>
      </div>

      {/* Family card dialog */}
      <Dialog open={familyDialog} onOpenChange={setFamilyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editIdx !== null ? "Edit" : "Add"} Family Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Card Type *</label>
              <Select value={subCard.cardType} onValueChange={v => setSubCard(p => ({ ...p, cardType: v }))}>
                <SelectTrigger data-testid="select-family-card-type-operator"><SelectValue placeholder="Select Card Type" /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto"><CardTypeOptions /></SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Card Holder Name *</label>
              <Input placeholder="Full name" value={subCard.customerName} onChange={e => setSubCard(p => ({ ...p, customerName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Card Number *</label>
              <Input placeholder="Card number" value={subCard.rationCardNumber} onChange={e => setSubCard(p => ({ ...p, rationCardNumber: e.target.value }))} />
            </div>
            {subError && <p className="text-sm text-red-500">{subError}</p>}
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setFamilyDialog(false)}>Cancel</Button>
              <Button type="button" className="flex-1" onClick={saveFamilyCard}>Save Card</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OperatorLayout>
  );
}
