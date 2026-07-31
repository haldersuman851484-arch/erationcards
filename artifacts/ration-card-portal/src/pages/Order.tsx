import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useCreateOrder, useGetUpiConfig, useUploadPaymentScreenshot, useSubmitOrder } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CheckCircle2, CreditCard, Download, ExternalLink, FileText, Loader2, Mail, MapPin, MessageCircle, Play, Plus, Pencil, Trash2, ShieldCheck, User, Upload, Copy, Smartphone, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useSeo } from "@/hooks/use-seo";
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
import { trackEvent } from "@/lib/analytics";

type FamilyCardEntry = { customerName: string; rationCardNumber: string; cardType: string };

const GOVT_DOWNLOAD_URL = "https://wbpds.wb.gov.in/E_Card_Download.aspx";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SIDEBAR_FAQS = [
  { q: "What is e Ration Card?", a: "An e-Ration Card is the digital version of your ration card issued by the government's PDS system. It contains the same details as your physical card and can be downloaded online." },
  { q: "What does PVC Card Portal do?", a: "We help you order a durable, wallet-size PVC printed version of your e-Ration card. We print your official card details onto a premium PVC card and deliver it to your doorstep." },
  { q: "How to Order PVC e Ration Card?", a: "Simply enter your card holder name, ration card number, and select your card category below, then follow the steps to complete your address and payment details." },
];

const orderSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().min(10, "Enter a valid 10-digit phone number"),
  customerEmail: z.string().trim().email("Enter a valid email address"),
  rationCardNumber: z.string().min(5, "Enter a valid ration card number"),
  deliveryName: z.string().min(2, "Enter full name"),
  address: z.string().min(10, "Enter complete address"),
  postOffice: z.string().min(2, "Enter post office"),
  state: z.string().min(1, "Select your state"),
  district: z.string().min(2, "Enter your district"),
  pincode: z.string().length(6, "Pincode must be 6 digits"),
  cardType: z.enum(ALLOWED_CARD_TYPES),
  quantity: z.coerce.number().min(1).max(10),
});

type OrderForm = z.infer<typeof orderSchema>;

// Which wizard step renders each form field — used to navigate back to the
// right step when the server rejects a field after submission.
const ORDER_FIELD_STEPS: Record<string, number> = {
  customerName: 1,
  rationCardNumber: 1,
  cardType: 1,
  deliveryName: 2,
  address: 2,
  postOffice: 2,
  state: 2,
  district: 2,
  pincode: 2,
  customerPhone: 2,
  customerEmail: 2,
};

const WB_DISTRICTS = [
  "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur",
  "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram",
  "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia",
  "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur",
  "Purulia", "South 24 Parganas", "Uttar Dinajpur",
];

// Pricing lives in @workspace/pricing — shared with the API server, which
// recomputes the amount authoritatively when the order is created.

/** Card-category options grouped as ration vs ABHA/E-SHRAM/GENERAL. */
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

export default function Order() {
  const PRICING = usePricing();
  const CONTACT = useContact();
  useSeo({
    title: `Apply for PVC Ration Card Online | From ₹${PRICING.ration.multi.public} Per Card`,
    description: "Fill out a simple form and get your PVC ration card, ABHA, E-SHRAM or GENERAL card printed and delivered to your door. All West Bengal districts served.",
    canonical: "https://erationcards.in/order",
  });
  const [step, setStep] = useState(1);

  // GA4 funnel: one event per forward wizard-step transition so drop-off is
  // visible in Explorations. Silent no-op when analytics is off (dev/tests).
  const FUNNEL_STEP_EVENTS: Record<number, string> = {
    2: "begin_checkout",     // step 1 (card details) completed
    3: "add_shipping_info",  // step 2 (address) completed
    4: "add_payment_info",   // step 3 (payment screenshot) completed
  };
  function advanceToStep(next: number) {
    const eventName = FUNNEL_STEP_EVENTS[next];
    if (eventName) trackEvent(eventName, { checkout_step: next - 1 });
    setStep(next);
  }
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);
  const [familyCards, setFamilyCards] = useState<FamilyCardEntry[]>([]);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [addCardView, setAddCardView] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [subCard, setSubCard] = useState<FamilyCardEntry>({ customerName: "", rationCardNumber: "", cardType: "AAY" });
  const [subError, setSubError] = useState("");
  // Server-rejected family-card entries: index in familyCards → message.
  const [familyCardErrors, setFamilyCardErrors] = useState<Record<number, string>>({});
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{ orderNumber: string } | null>(null);
  const [cardPdfs, setCardPdfs] = useState<Record<number, { pdfUrl: string; originalFilename?: string }>>({});
  const [uploadingPdfIdx, setUploadingPdfIdx] = useState<number | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const pdfFileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createOrder = useCreateOrder();
  const submitOrder = useSubmitOrder();
  const uploadScreenshot = useUploadPaymentScreenshot();
  const { data: upiConfig, isLoading: upiLoading, isError: upiError, refetch: refetchUpi } = useGetUpiConfig();
  const merchantUpiId = upiConfig?.merchantUpiId || "";
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  function openAddCard(index: number | null = null) {
    if (index !== null) {
      setSubCard(familyCards[index]);
      setEditIndex(index);
    } else {
      setSubCard({ customerName: "", rationCardNumber: "", cardType: "AAY" });
      setEditIndex(null);
    }
    setSubError("");
    setAddCardView(true);
  }

  function saveSubCard() {
    if (subCard.customerName.trim().length < 2) { setSubError("Enter card holder name"); return; }
    if (subCard.rationCardNumber.trim().length < 5) { setSubError("Enter a valid ration card number"); return; }
    setFamilyCards((prev) => {
      const next = [...prev];
      const entry = {
        customerName: subCard.customerName.trim(),
        rationCardNumber: subCard.rationCardNumber.trim(),
        cardType: subCard.cardType,
      };
      if (editIndex !== null) next[editIndex] = entry;
      else next.push(entry);
      return next;
    });
    // Entries changed — stale server errors no longer match; re-validate on submit.
    setFamilyCardErrors({});
    setAddCardView(false);
  }

  function removeFamilyCard(index: number) {
    setFamilyCards((prev) => prev.filter((_, i) => i !== index));
    // Indexes shift after removal, so drop all server errors.
    setFamilyCardErrors({});
  }

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      rationCardNumber: "",
      deliveryName: "",
      address: "",
      postOffice: "",
      state: "West Bengal",
      district: "",
      pincode: "",
      cardType: "AAY",
      quantity: 1,
    },
  });

  const cardType = form.watch("cardType");
  const totalCards = 1 + familyCards.length;
  const allCardTypes = [cardType, ...familyCards.map((c) => c.cardType)];
  const amount = computeOrderAmount(allCardTypes, false, PRICING);
  const breakdown = priceBreakdown(allCardTypes, false, PRICING);

  // Step 4 (after the order exists): one row per card in the order.
  const step4Cards = [
    { cardIndex: 0, name: form.getValues("customerName"), rationCardNumber: form.getValues("rationCardNumber"), cardType: form.getValues("cardType") as string },
    ...familyCards.map((fc, i) => ({ cardIndex: i + 1, name: fc.customerName, rationCardNumber: fc.rationCardNumber, cardType: fc.cardType })),
  ];
  const allPdfsUploaded = step4Cards.every((c) => !!cardPdfs[c.cardIndex]);

  async function handleCardPdfUpload(cardIndex: number, file: File) {
    if (!createdOrder) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      toast({ title: "Only PDF files allowed", description: "Please choose the e-ration card PDF file — photos or images cannot be used.", variant: "destructive" });
      return;
    }
    setUploadingPdfIdx(cardIndex);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      fd.append("cardIndex", String(cardIndex));
      const res = await fetch(`${BASE}/api/orders/${encodeURIComponent(createdOrder.orderNumber)}/upload-card-pdf`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        let msg = "Could not upload the PDF. Please try again.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* non-JSON error body */ }
        throw new Error(msg);
      }
      const { pdfUrl, originalFilename } = await res.json();
      setCardPdfs((prev) => ({ ...prev, [cardIndex]: { pdfUrl, originalFilename } }));
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Could not upload the PDF. Please try again.", variant: "destructive" });
    } finally {
      setUploadingPdfIdx(null);
    }
  }

  function handleFinalSubmit() {
    if (!createdOrder) return;
    submitOrder.mutate(
      { orderNumber: createdOrder.orderNumber },
      {
        onSuccess: (result) => {
          setEmailSent(result.emailSent);
          setSuccess({ orderNumber: createdOrder.orderNumber });
          // GA4 conversion: silent no-op unless analytics is configured.
          trackEvent("purchase", {
            transaction_id: createdOrder.orderNumber,
            value: amount,
            currency: "INR",
            items: [{ item_name: "PVC Card Print", quantity: totalCards }],
          });
          window.scrollTo(0, 0);
        },
        onError: () => {
          toast({ title: "Submission failed", description: "Please try again. Your order and uploaded PDFs are saved.", variant: "destructive" });
        },
      },
    );
  }

  function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function copyUpiId() {
    if (!merchantUpiId) return;
    navigator.clipboard.writeText(merchantUpiId).then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    });
  }

  async function onSubmit(data: OrderForm) {
    // Order already created — the customer is on step 4; never create a duplicate.
    if (createdOrder) { setStep(4); return; }
    if (!screenshotFile) {
      toast({ title: "Screenshot required", description: "Please upload your UPI payment screenshot.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    let screenshotUrl = "";
    try {
      const result = await uploadScreenshot.mutateAsync({ data: { screenshot: screenshotFile } });
      screenshotUrl = result.url;
    } catch {
      toast({ title: "Upload failed", description: "Could not upload payment screenshot. Please try again.", variant: "destructive" });
      setIsUploading(false);
      return;
    }

    createOrder.mutate(
      {
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          rationCardNumber: data.rationCardNumber,
          deliveryName: data.deliveryName,
          address: data.address,
          postOffice: data.postOffice,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          cardType: data.cardType,
          familyCards,
          quantity: totalCards,
          amount,
          paymentStatus: "pending",
          paymentMethod: "upi",
          paymentScreenshotUrl: screenshotUrl,
        },
      },
      {
        onSuccess: (order) => {
          setIsUploading(false);
          setCreatedOrder({ orderNumber: order.orderNumber });
          setCardPdfs({});
          advanceToStep(4);
          window.scrollTo(0, 0);
        },
        onError: (err: any) => {
          setIsUploading(false);
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
              setAddCardView(false);
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
        description: "Could not create the invoice PDF. Please try again — you can also download it any time from Track Order.",
        variant: "destructive",
      });
    } finally {
      setInvoiceBusy(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <Card className="max-w-md w-full text-center border-slate-200 shadow-lg" data-testid="order-success-card">
            <CardContent className="pt-12 pb-10 space-y-6">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Placed!</h2>
                <p className="text-slate-600">We have received your order. Our team is reviewing your payment screenshot.</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Your Order Number</p>
                <p className="text-xl font-mono font-bold text-primary" data-testid="text-order-number">{success.orderNumber}</p>
              </div>
              {emailSent === true && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 flex items-start gap-2 text-left" data-testid="note-email-sent">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700">We have emailed your order number to <strong>{form.getValues("customerEmail")}</strong>.</p>
                </div>
              )}
              {emailSent === false && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 flex items-start gap-2 text-left" data-testid="note-email-failed">
                  <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">We could not send the email right now — please write down your order number shown above.</p>
                </div>
              )}
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-left">
                <p className="text-sm text-amber-800 font-medium mb-1">⏳ Payment NOT yet confirmed</p>
                <p className="text-xs text-amber-700">Our team will manually check your payment screenshot. <strong>Your card will NOT be printed until we verify your payment.</strong> If your screenshot is invalid or fake, your order will be cancelled. Verified orders are delivered in 5–7 working days.</p>
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
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setLocation("/track")}>Track Order</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => {
                  setSuccess(null);
                  form.reset();
                  setStep(1);
                  setFamilyCards([]);
                  setAddCardView(false);
                  setEditIndex(null);
                  setSubCard({ customerName: "", rationCardNumber: "", cardType: "AAY" });
                  setSubError("");
                  setFamilyCardErrors({});
                  setShowFamilyDialog(false);
                  setScreenshotFile(null);
                  setScreenshotPreview(null);
                  setPaymentConfirmed(false);
                  setCreatedOrder(null);
                  setCardPdfs({});
                  setEmailSent(null);
                }}>New Order</Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-slate-900">Order PVC Printed Card</h1>
          <p className="text-slate-600 mt-1">Fill in your details below to order a high-quality PVC ration card.</p>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${step >= s ? "bg-primary border-primary text-white" : "bg-white border-slate-300 text-slate-400"}`}>{s}</div>
                {s < 4 && <div className={`h-0.5 w-12 transition-colors ${step > s ? "bg-primary" : "bg-slate-200"}`} />}
              </div>
            ))}
            <span className="ml-2 text-sm text-slate-500">Step {step} of 4</span>
          </div>
        </div>
      </div>

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4 max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {step === 1 && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-sky-500/80 to-cyan-400/80 p-6 md:p-8 text-white shadow-lg">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-fuchsia-400/20 rounded-full blur-2xl" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">
                      Get Your <span className="text-yellow-300">e Ration</span> Card
                    </h2>
                    <div className="mt-3 space-y-2">
                      {/* Ration card pricing */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-full sm:w-52">
                          <span className="block text-white/90 text-[13px] font-bold uppercase tracking-wide">Ration Card</span>
                          <span className="block text-white/60 text-[11px] leading-tight" data-testid="hero-ration-types">{RATION_CARD_TYPES.join(" · ")}</span>
                        </span>
                        <div className="flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-full px-3 py-1">
                          <span className="text-white/80 text-xs font-medium">1 card</span>
                          <span className="text-white text-sm font-extrabold">₹{PRICING.ration.single.public}</span>
                        </div>
                        <div className="relative flex items-center gap-1.5 bg-yellow-400 rounded-full px-3 py-1 shadow-md">
                          <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none tracking-wide uppercase">SAVE</span>
                          <span className="text-yellow-900 text-xs font-medium">2+ cards</span>
                          <span className="text-yellow-900 text-sm font-extrabold">₹{PRICING.ration.multi.public} each</span>
                        </div>
                      </div>
                      {/* ABHA / E-SHRAM / GENERAL pricing */}
                      <div className="flex flex-wrap items-center gap-2" data-testid="hero-special-pricing">
                        <span className="w-full sm:w-52">
                          <span className="block text-white/90 text-[13px] font-bold uppercase tracking-wide">Other PVC Cards</span>
                          <span className="block text-white/60 text-[11px] leading-tight" data-testid="hero-special-types">{SPECIAL_CARD_TYPES.join(" · ")}</span>
                        </span>
                        <div className="flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-full px-3 py-1">
                          <span className="text-white/80 text-xs font-medium">1 card</span>
                          <span className="text-white text-sm font-extrabold">₹{PRICING.special.single.public}</span>
                        </div>
                        <div className="relative flex items-center gap-1.5 bg-yellow-400 rounded-full px-3 py-1 shadow-md">
                          <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none tracking-wide uppercase">SAVE</span>
                          <span className="text-yellow-900 text-xs font-medium">2+ cards</span>
                          <span className="text-yellow-900 text-sm font-extrabold">₹{PRICING.special.multi.public} each</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/60 text-xs mt-1.5">incl. GST &amp; postage</p>
                  </div>
                  <div className="flex flex-wrap gap-2 max-w-xs justify-end">
                    <Badge className="bg-white/20 hover:bg-white/20 text-white border-0 gap-1"><ShieldCheck className="w-3 h-3" /> No Hologram</Badge>
                    <Badge className="bg-white/20 hover:bg-white/20 text-white border-0">Durable</Badge>
                    <Badge className="bg-white/20 hover:bg-white/20 text-white border-0">Scannable Bar Code in Backside</Badge>
                    <Badge className="bg-white/20 hover:bg-white/20 text-white border-0">10 year Paint Guarantee</Badge>
                    <Badge className="bg-white/20 hover:bg-white/20 text-white border-0">Premium Quality PVC Card</Badge>
                    <Badge className="bg-white/20 hover:bg-white/20 text-white border-0">Secure QR Code</Badge>
                  </div>
                </div>
              </div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {step === 1 && !addCardView && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Details</CardTitle>
                      <CardDescription>Type Card Holder Name, Card Number &amp; Select Card Category</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField control={form.control} name="customerName" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Holder Name *</FormLabel>
                            <FormControl><Input data-testid="input-customer-name" placeholder="CARD HOLDER NAME" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="rationCardNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Number *</FormLabel>
                            <FormControl><Input data-testid="input-ration-card-number" placeholder="00000 00000" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="cardType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger data-testid="select-card-type-step1"><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <CardTypeOptions />
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {familyCards.length > 0 && (
                        <div className="rounded-lg bg-slate-100 border border-slate-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-700">{familyCards.length} Extra Card{familyCards.length > 1 ? "s" : ""}</span>
                            <span className="text-sm font-medium text-slate-700">Total Cards: {String(totalCards).padStart(2, "0")}</span>
                          </div>
                          <div className="space-y-2">
                            {familyCards.map((fc, idx) => (
                              <div key={idx} data-family-card-row={idx} className={`bg-white rounded-md border px-3 py-2 ${familyCardErrors[idx] ? "border-red-500 bg-red-50" : "border-slate-200"}`} data-testid={`family-card-${idx}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-700 truncate">
                                    <span className="font-medium">{fc.customerName}</span> • {fc.rationCardNumber} • {fc.cardType}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <button type="button" aria-label="Edit card" data-testid={`button-edit-family-${idx}`} className="text-slate-500 hover:text-primary" onClick={() => openAddCard(idx)}>
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button type="button" aria-label="Delete card" data-testid={`button-delete-family-${idx}`} className="text-slate-500 hover:text-red-600" onClick={() => removeFamilyCard(idx)}>
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {familyCardErrors[idx] && (
                                  <p className="text-xs font-medium text-red-600 mt-1" data-testid={`family-card-error-${idx}`}>{familyCardErrors[idx]}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button type="button" variant="secondary" data-testid="button-add-another" className="bg-slate-800 hover:bg-slate-900 text-white px-6" onClick={async () => {
                          const ok = await form.trigger(["customerName", "rationCardNumber", "cardType"]);
                          if (ok) openAddCard();
                        }}>
                          <Plus className="w-4 h-4 mr-1" /> Add Another
                        </Button>
                        <Button type="button" data-testid="button-next-step1" className="bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90 px-8" onClick={async () => {
                          const ok = await form.trigger(["customerName", "rationCardNumber", "cardType"]);
                          if (!ok) return;
                          if (familyCards.length > 0) advanceToStep(2);
                          else setShowFamilyDialog(true);
                        }}>Next</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {step === 1 && addCardView && (
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Add Another Card Details</CardTitle>
                      <CardDescription>Type Card Holder Name, Card Number &amp; Select Card Category</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Card Holder Name *</label>
                        <Input data-testid="input-family-name" placeholder="CARD HOLDER NAME" value={subCard.customerName} onChange={(e) => setSubCard((s) => ({ ...s, customerName: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Card Number *</label>
                          <Input data-testid="input-family-number" placeholder="00000 00000" value={subCard.rationCardNumber} onChange={(e) => setSubCard((s) => ({ ...s, rationCardNumber: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Card Category *</label>
                          <Select value={subCard.cardType} onValueChange={(v) => setSubCard((s) => ({ ...s, cardType: v }))}>
                            <SelectTrigger data-testid="select-family-card-type"><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent>
                              <CardTypeOptions />
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {subError && <p className="text-sm text-red-600">{subError}</p>}
                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" data-testid="button-family-back" onClick={() => setAddCardView(false)}>Back</Button>
                        <Button type="button" data-testid="button-family-save" className="bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90 px-8" onClick={saveSubCard}>Save</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {step === 2 && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Delivery Address</CardTitle>
                    <CardDescription>Where should we deliver your card?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <FormField control={form.control} name="deliveryName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl><Input data-testid="input-delivery-name" placeholder="Receiver's full name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Address *</FormLabel>
                        <FormControl><Input data-testid="input-address" placeholder="House No, Street, Area" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="postOffice" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post Office *</FormLabel>
                        <FormControl><Input data-testid="input-post-office" placeholder="Your post office" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="input-state"
                              value={field.value}
                              readOnly
                              className="bg-slate-50 text-slate-700 cursor-default"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="district" render={({ field }) => (
                        <FormItem>
                          <FormLabel>District *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-district">
                                <SelectValue placeholder="Select your district" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 overflow-y-auto">
                              {WB_DISTRICTS.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField control={form.control} name="pincode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>PIN Code *</FormLabel>
                          <FormControl><Input data-testid="input-pincode" placeholder="6-digit PIN code" maxLength={6} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="customerPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number *</FormLabel>
                          <FormControl><Input data-testid="input-phone" placeholder="10-digit mobile number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="customerEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email ID *</FormLabel>
                        <FormControl><Input data-testid="input-email" type="email" placeholder="yourname@example.com" {...field} /></FormControl>
                        <p className="text-xs text-slate-500">We will send your order number to this email after you submit.</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                      <Button type="button" data-testid="button-next-step2" className="bg-primary hover:bg-primary/90 px-8" onClick={async () => {
                        const ok = await form.trigger(["deliveryName", "address", "postOffice", "state", "district", "pincode", "customerPhone", "customerEmail"]);
                        if (ok) advanceToStep(3);
                      }}>Continue</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === 3 && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Pay via UPI</CardTitle>
                    <CardDescription>Scan the QR code or use the UPI ID below, then upload your payment screenshot</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      {breakdown.map((line) => (
                        <div key={line.group} className="flex justify-between text-sm mb-1" data-testid={`price-line-${line.group}`}>
                          <span className="text-slate-600">{line.label} — {line.count} × ₹{line.unitPrice}</span>
                          <span>₹{line.subtotal}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Total Cards</span>
                        <span>{totalCards}</span>
                      </div>
                      <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between font-semibold text-lg">
                        <span>Amount to Pay</span>
                        <span className="text-primary" data-testid="text-amount-to-pay">₹{amount}</span>
                      </div>
                    </div>

                    {/* Numbered steps guide */}
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Follow these steps in order</p>
                      <ol className="space-y-1.5">
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                          <span>Scan the QR code or copy the UPI ID below</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                          <span>Complete the payment of <strong>₹{amount}</strong> in your UPI app</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                          <span>Take a screenshot of the payment success screen, then upload it below</span>
                        </li>
                      </ol>
                    </div>

                    {upiLoading ? (
                      <div className="text-center py-6 text-slate-500 text-sm">
                        Loading payment details…
                      </div>
                    ) : upiError ? (
                      <div className="text-center py-6 space-y-3">
                        <p className="text-sm font-medium text-slate-700">Could not load payment details</p>
                        <p className="text-xs text-slate-500">Please check your connection and try again.</p>
                        <button
                          type="button"
                          onClick={() => refetchUpi()}
                          className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          Retry
                        </button>
                      </div>
                    ) : merchantUpiId ? (
                      <>
                        <div className="flex flex-col sm:flex-row gap-6 items-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-white border-2 border-primary/20 rounded-xl shadow-sm">
                              <QRCodeSVG
                                value={`upi://pay?pa=${merchantUpiId}&pn=PVC+Card+Portal&am=${amount}&cu=INR&tn=PVC+Card+Order`}
                                size={160}
                                fgColor="#00afc8"
                                data-testid="upi-qr-code"
                              />
                            </div>
                            <p className="text-xs text-slate-500 text-center">Scan with any UPI app</p>
                          </div>
                          <div className="flex-1 space-y-4 w-full">
                            <div>
                              <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">UPI ID</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm text-slate-900 select-all" data-testid="text-merchant-upi-id">
                                  {merchantUpiId}
                                </div>
                                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copyUpiId} data-testid="button-copy-upi">
                                  <Copy className="w-4 h-4 mr-1" />
                                  {copiedUpi ? "Copied!" : "Copy"}
                                </Button>
                              </div>
                            </div>
                            <a
                              href={`upi://pay?pa=${merchantUpiId}&pn=PVC+Card+Portal&am=${amount}&cu=INR&tn=PVC+Card+Order`}
                              data-testid="link-open-upi-app"
                            >
                              <Button type="button" className="w-full bg-primary hover:bg-primary/90 gap-2">
                                <Smartphone className="w-4 h-4" />
                                Open in UPI App
                              </Button>
                            </a>
                            <p className="text-xs text-slate-500">Works with PhonePe, GPay, Paytm &amp; all UPI apps</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-5 space-y-4">
                          {/* Payment confirmation checkbox */}
                          <label className="flex items-start gap-3 cursor-pointer group" data-testid="label-payment-confirmed">
                            <input
                              type="checkbox"
                              checked={paymentConfirmed}
                              onChange={(e) => setPaymentConfirmed(e.target.checked)}
                              data-testid="checkbox-payment-confirmed"
                              className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900 leading-snug">
                              I confirm that I have <strong>completed the UPI payment</strong> of <strong>₹{amount}</strong> and I am uploading the payment success screenshot below. I have read and understood all the{" "}
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
                              , and I hereby give my consent to proceed with the printing of my document.
                            </span>
                          </label>

                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                            <span className="text-red-500 text-lg leading-none mt-0.5">⚠️</span>
                            <div>
                              <p className="text-sm font-semibold text-red-700">Upload your UPI payment screenshot only</p>
                              <p className="text-xs text-red-600 mt-0.5">Uploading any other photo (selfie, tree, random image, etc.) will cause your order to be <strong>cancelled with no refund</strong>. Our team manually verifies every screenshot.</p>
                            </div>
                          </div>

                          <p className="text-sm font-medium text-slate-700">
                            Upload UPI payment screenshot *
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleScreenshotChange}
                            data-testid="input-screenshot"
                          />
                          {screenshotPreview ? (
                            <div className="space-y-3">
                              <div className="relative w-full max-w-xs rounded-lg overflow-hidden border-2 border-emerald-300 shadow-sm">
                                <img src={screenshotPreview} alt="Payment screenshot" className="w-full object-cover max-h-48" />
                                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">Screenshot selected</div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                              >
                                Change Screenshot
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <button
                                type="button"
                                data-testid="button-upload-screenshot"
                                onClick={() => paymentConfirmed && fileInputRef.current?.click()}
                                disabled={!paymentConfirmed}
                                className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                                  paymentConfirmed
                                    ? "border-slate-300 hover:border-primary/50 cursor-pointer bg-slate-50/50 hover:bg-primary/5"
                                    : "border-slate-200 cursor-not-allowed bg-slate-100/70 opacity-60"
                                }`}
                              >
                                <Upload className={`w-8 h-8 mx-auto mb-2 ${paymentConfirmed ? "text-slate-400" : "text-slate-300"}`} />
                                <p className={`text-sm font-medium ${paymentConfirmed ? "text-slate-700" : "text-slate-400"}`}>
                                  {paymentConfirmed ? "Click to upload UPI payment screenshot" : "Confirm payment above to unlock upload"}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">Must be your UPI payment success screen · JPG or PNG</p>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6 space-y-1">
                        <p className="text-sm font-medium text-slate-700">Payment setup in progress</p>
                        <p className="text-xs text-slate-500">Our payment details are being configured. Please contact us to complete your order.</p>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      {(!paymentConfirmed || !screenshotFile) && !isUploading && !createOrder.isPending && merchantUpiId && (
                        <p className="text-xs text-amber-600 flex items-center gap-1.5" data-testid="submit-disabled-hint">
                          <span>⚠️</span>
                          {!paymentConfirmed
                            ? "Please confirm you have completed payment before submitting."
                            : "Please upload your UPI payment screenshot before submitting."}
                        </p>
                      )}
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                        <Button
                          type="submit"
                          data-testid="button-submit-order"
                          className="bg-primary hover:bg-primary/90 px-8"
                          disabled={isUploading || createOrder.isPending || !screenshotFile || !merchantUpiId || !paymentConfirmed}
                          title={
                            !paymentConfirmed
                              ? "Confirm you have completed payment first"
                              : !screenshotFile
                              ? "Upload your payment screenshot first"
                              : undefined
                          }
                        >
                          {isUploading || createOrder.isPending ? "Placing Order…" : "Place Order & Continue"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === 4 && createdOrder && (
                <Card className="border-slate-200 shadow-sm" data-testid="card-step4-upload">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Upload e-Ration Card PDF</CardTitle>
                    <CardDescription>Last step — upload the PDF for each card below, then press Submit.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Order created — {createdOrder.orderNumber}</p>
                        <p className="text-xs text-emerald-700 mt-0.5">Do not close this page yet. Upload the PDF for every card and press Submit to finish your order.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {step4Cards.map((card) => {
                        const uploaded = !!cardPdfs[card.cardIndex];
                        const isUploadingPdf = uploadingPdfIdx === card.cardIndex;
                        return (
                          <div key={card.cardIndex} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4" data-testid={`step4-card-${card.cardIndex}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{card.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Card No: <span className="font-mono">{card.rationCardNumber}</span> · {card.cardType}</p>
                              {uploaded && (
                                <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1 min-w-0" data-testid={`text-pdf-name-${card.cardIndex}`}><CheckCircle2 className="w-3 h-3 shrink-0" /> <span className="truncate">{cardPdfs[card.cardIndex]?.originalFilename ?? "PDF uploaded"}</span></p>
                              )}
                            </div>
                            <input
                              ref={(el) => { pdfFileRefs.current[card.cardIndex] = el; }}
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCardPdfUpload(card.cardIndex, file);
                                e.target.value = "";
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              data-testid={`button-upload-pdf-${card.cardIndex}`}
                              className={`shrink-0 ${uploaded ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary hover:bg-primary/90 text-white"}`}
                              disabled={isUploadingPdf}
                              onClick={() => pdfFileRefs.current[card.cardIndex]?.click()}
                            >
                              {isUploadingPdf ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Uploading…</>
                              ) : uploaded ? (
                                "Re-upload"
                              ) : (
                                <><Upload className="w-3.5 h-3.5 mr-1" /> Upload PDF</>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-semibold">Don't have the PDF?</span> Download your e-Ration card from the official WB government website, then upload it here. Do not rename or edit the file.
                      </p>
                      <a href={GOVT_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-1.5 hover:underline">
                        Open wbpds.wb.gov.in <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {!allPdfsUploaded && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5" data-testid="step4-pending-hint">
                        <span>⚠️</span> Upload the PDF for every card above to enable Submit.
                      </p>
                    )}
                    <Button
                      type="button"
                      data-testid="button-final-submit"
                      className="w-full bg-primary hover:bg-primary/90 h-11"
                      disabled={!allPdfsUploaded || submitOrder.isPending}
                      onClick={handleFinalSubmit}
                    >
                      {submitOrder.isPending ? "Submitting…" : "Submit"}
                    </Button>
                  </CardContent>
                </Card>
              )}
              </form>
            </Form>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg"><MessageCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {SIDEBAR_FAQS.map((faq, idx) => (
                    <AccordionItem key={idx} value={`sidebar-faq-${idx}`} className="border border-slate-200 rounded-lg px-3 bg-slate-50/50">
                      <AccordionTrigger className="text-left text-sm font-medium text-slate-900 py-3 hover:no-underline hover:text-primary">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 text-sm leading-relaxed pb-3">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-700 h-40 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent" />
                <button type="button" className="relative z-10 w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg" aria-label="Play video">
                  <Play className="w-6 h-6 text-white fill-white" />
                </button>
                <p className="absolute bottom-3 left-4 right-4 text-white font-bold text-sm leading-tight">
                  HOW TO ORDER PVC E RATION — full process in five minutes!
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={showFamilyDialog} onOpenChange={setShowFamilyDialog}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-family-member">
          <DialogHeader>
            <DialogTitle>Family Member</DialogTitle>
            <DialogDescription>Do you want to order for any other family member's card?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-3 sm:justify-end">
            <Button type="button" variant="outline" data-testid="button-family-no" className="min-w-24" onClick={() => { setShowFamilyDialog(false); advanceToStep(2); }}>No</Button>
            <Button type="button" data-testid="button-family-yes" className="min-w-24 bg-primary hover:bg-primary/90" onClick={() => { setShowFamilyDialog(false); openAddCard(); }}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
