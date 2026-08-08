import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCreateOrder, useSubmitOrder, useCreateCashfreePaymentSession } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2, CreditCard, Download, ExternalLink, FileText, Loader2, Lock, Mail, MapPin, MessageCircle, Play, Plus, Pencil, Trash2, ShieldCheck, User, Upload, X } from "lucide-react";
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
import { openCashfreeCheckout, pollPaymentStatus } from "@/lib/cashfreeCheckout";

type FamilyCardEntry = { customerName: string; rationCardNumber: string; cardType: string };

const GOVT_DOWNLOAD_URL = "https://wbpds.wb.gov.in/E_Card_Download.aspx";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SIDEBAR_FAQS = [
  { q: "What is e Ration Card?", a: "An e-Ration Card is the digital version of your ration card issued by the government's PDS system. It contains the same details as your physical card and can be downloaded online." },
  { q: "What does PVC Card Portal do?", a: "We help you order a durable, wallet-size PVC printed version of your e-Ration card. We print your official card details onto a premium PVC card and deliver it to your doorstep." },
  { q: "How to Order PVC e Ration Card?", a: "Simply select your card type, then enter your card holder name and ration card number below, and follow the steps to complete your address and payment details." },
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
  cardType: z.enum(ALLOWED_CARD_TYPES, { errorMap: () => ({ message: "Please select your card type" }) }),
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

export default function Order() {
  const PRICING = usePricing();
  const CONTACT = useContact();
  useSeo({
    title: `Apply for PVC Ration Card Online | From ₹${PRICING.ration.multi.public} Per Card`,
    description: "Fill out a simple form and get your PVC ration card, ABHA, E-SHRAM, Aadhaar, Voter ID, PAN or other PVC card printed and delivered to your door. All West Bengal districts served.",
    canonical: "https://erationcards.in/order",
  });
  const [step, setStep] = useState(1);

  // GA4 funnel: one event per forward wizard-step transition so drop-off is
  // visible in Explorations. Silent no-op when analytics is off (dev/tests).
  const FUNNEL_STEP_EVENTS: Record<number, string> = {
    2: "begin_checkout",     // step 1 (card details) completed
    3: "add_shipping_info",  // step 2 (address) completed
    4: "add_payment_info",   // step 3 (online payment) completed
  };
  function advanceToStep(next: number) {
    const eventName = FUNNEL_STEP_EVENTS[next];
    if (eventName) trackEvent(eventName, { checkout_step: next - 1 });
    setStep(next);
  }
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);
  const [familyCards, setFamilyCards] = useState<FamilyCardEntry[]>([]);
  // Step-1 inline card editor: open = an extra card panel ("Card 2"+) is the
  // active panel; editIndex points at the familyCards entry being edited
  // (null = a brand-new card not yet committed to the list).
  const [addCardView, setAddCardView] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [subCard, setSubCard] = useState<FamilyCardEntry>({ customerName: "", rationCardNumber: "", cardType: "" });
  const [subError, setSubError] = useState("");
  // Server-rejected family-card entries: index in familyCards → message.
  const [familyCardErrors, setFamilyCardErrors] = useState<Record<number, string>>({});
  const [consentChecked, setConsentChecked] = useState(false);
  // Online-payment UI phase. "unconfirmed" = the checkout window closed but
  // the server has not seen the money yet — offer a re-check, never assume.
  const [payPhase, setPayPhase] = useState<
    "idle" | "opening" | "paying" | "checking" | "unconfirmed" | "failed" | "unavailable"
  >("idle");
  const [createdOrder, setCreatedOrder] = useState<{ orderNumber: string } | null>(null);
  const [cardPdfs, setCardPdfs] = useState<Record<number, { pdfUrl: string; originalFilename?: string }>>({});
  const [uploadingPdfIdx, setUploadingPdfIdx] = useState<number | null>(null);
  // PDFs attached inline at step 1, keyed by cardIndex (0 = the primary card,
  // i + 1 = familyCards[i]). No order exists during step 1, so the File
  // objects are held in browser memory and uploaded automatically through the
  // existing per-card endpoint as soon as payment succeeds.
  // `boundTo` is the identityKey() of the card's details at attach time: a
  // held file belongs to a PERSON, not to a panel slot, so if the details are
  // edited afterwards the file is dropped instead of silently riding along to
  // someone else's card.
  const [pendingPdfs, setPendingPdfs] = useState<Record<number, { file: File; boundTo: string }>>({});
  // Post-payment auto-upload lifecycle: idle → running → done. "done" with a
  // still-pending file means that card's auto-upload failed (Retry shown).
  const [autoUploadState, setAutoUploadState] = useState<"idle" | "running" | "done">("idle");
  const autoUploadRan = useRef(false);
  const autoSubmitFired = useRef(false);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const pdfFileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const stepOnePdfRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const createOrder = useCreateOrder();
  const submitOrder = useSubmitOrder();
  const createCashfreeSession = useCreateCashfreePaymentSession();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  function openAddCard(index: number | null = null) {
    if (index !== null) {
      setSubCard(familyCards[index]);
      setEditIndex(index);
    } else {
      setSubCard({ customerName: "", rationCardNumber: "", cardType: "" });
      setEditIndex(null);
    }
    setSubError("");
    setAddCardView(true);
  }

  /**
   * Commit the open extra-card panel into familyCards.
   * Returns true when the panel is committed — or silently discarded because
   * a brand-new card was left completely empty (opened by accident); returns
   * false when the entries are invalid, leaving the panel open with subError.
   */
  function commitFamilyEditor(): boolean {
    const isNew = editIndex === null;
    const isEmpty = !subCard.cardType && !subCard.customerName.trim() && !subCard.rationCardNumber.trim();
    const targetCardIndex = isNew ? familyCards.length + 1 : editIndex + 1;
    if (isNew && isEmpty) {
      // Abandoned empty panel — drop it. (A PDF can only be attached once the
      // details are filled, so an empty panel cannot hold one today; this
      // guard keeps a file from ever being silently discarded regardless.)
      if (pendingPdfs[targetCardIndex]) {
        setSubError("This card has a PDF attached but no details. Fill in the card details, or remove the PDF to continue.");
        return false;
      }
      setSubError("");
      setEditIndex(null);
      setAddCardView(false);
      return true;
    }
    if (!subCard.cardType) { setSubError("Please select card type"); return false; }
    if (subCard.customerName.trim().length < 2) { setSubError("Enter card holder name"); return false; }
    if (subCard.rationCardNumber.trim().length < 5) { setSubError("Enter a valid ration card number"); return false; }
    const entry = {
      customerName: subCard.customerName.trim(),
      rationCardNumber: subCard.rationCardNumber.trim(),
      cardType: subCard.cardType,
    };
    // A held PDF belongs to the person it was attached for. If this commit
    // changed the card's identity (edit or replace), the old file must not
    // upload against the new details — drop it and say so.
    const held = pendingPdfs[targetCardIndex];
    if (held && held.boundTo !== identityKey(entry.cardType, entry.customerName, entry.rationCardNumber)) {
      removePendingPdf(targetCardIndex);
      toast({
        title: "Attached PDF removed",
        description: `Card ${targetCardIndex + 1}'s details changed, so the PDF attached earlier was removed. Please attach the correct PDF for ${entry.customerName}.`,
        variant: "destructive",
      });
    }
    setFamilyCards((prev) => {
      const next = [...prev];
      if (editIndex !== null) next[editIndex] = entry;
      else next.push(entry);
      return next;
    });
    // Entries changed — stale server errors no longer match; re-validate on submit.
    setFamilyCardErrors({});
    setSubError("");
    setEditIndex(null);
    setAddCardView(false);
    return true;
  }

  function removeFamilyCard(index: number) {
    setFamilyCards((prev) => prev.filter((_, i) => i !== index));
    // Indexes shift after removal, so drop all server errors.
    setFamilyCardErrors({});
    // Re-key held step-1 PDFs the same way: familyCards[i] is cardIndex i+1,
    // so every file above the removed card moves down one slot (this also
    // covers a file attached to a still-open "new card" panel).
    setPendingPdfs((prev) => {
      const removedCardIndex = index + 1;
      const next: Record<number, { file: File; boundTo: string }> = {};
      for (const [key, held] of Object.entries(prev)) {
        const k = Number(key);
        if (k === removedCardIndex) continue;
        // The identity binding travels with the file — shifting slots does not
        // change whose card the file is for.
        next[k > removedCardIndex ? k - 1 : k] = held;
      }
      return next;
    });
    // Keep the open editor pointing at the same card after the shift.
    if (addCardView && editIndex !== null && index < editIndex) {
      setEditIndex(editIndex - 1);
    }
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
      // Deliberately unselected — the customer must actively choose a card type.
      cardType: "" as OrderForm["cardType"],
      quantity: 1,
    },
  });

  const cardType = form.watch("cardType");
  const totalCards = 1 + familyCards.length;
  // filter(Boolean): an unselected ("") card type must not count toward the
  // live total — the pricing helper would otherwise treat it as a ration card.
  const allCardTypes = [cardType, ...familyCards.map((c) => c.cardType)].filter(Boolean);
  const amount = computeOrderAmount(allCardTypes, false, PRICING);
  const breakdown = priceBreakdown(allCardTypes, false, PRICING);

  // Step 4 (after the order exists): one row per card in the order.
  const step4Cards = [
    { cardIndex: 0, name: form.getValues("customerName"), rationCardNumber: form.getValues("rationCardNumber"), cardType: form.getValues("cardType") as string },
    ...familyCards.map((fc, i) => ({ cardIndex: i + 1, name: fc.customerName, rationCardNumber: fc.rationCardNumber, cardType: fc.cardType })),
  ];
  const allPdfsUploaded = step4Cards.every((c) => !!cardPdfs[c.cardIndex]);

  // ----- Step-1 inline card panels -----
  // The optional PDF dropzone appears once the active panel's three details
  // are filled in.
  const watchedPrimaryName = form.watch("customerName");
  const watchedPrimaryNumber = form.watch("rationCardNumber");
  const primaryFieldsFilled = Boolean(cardType && watchedPrimaryName?.trim() && watchedPrimaryNumber?.trim());
  const familyFieldsFilled = Boolean(subCard.cardType && subCard.customerName.trim() && subCard.rationCardNumber.trim());
  // cardIndex of the panel currently being edited (0 = primary card;
  // familyCards[i] is cardIndex i + 1). A new, not-yet-saved card gets the
  // next free slot.
  const activePanelCardIndex = addCardView ? (editIndex !== null ? editIndex + 1 : familyCards.length + 1) : 0;
  // "Your Cards • NN" counts every panel, including a new one still being typed.
  const displayedCardCount = 1 + familyCards.length + (addCardView && editIndex === null ? 1 : 0);

  /**
   * The primary card has no explicit "save" moment — its fields are edited
   * live. So whenever the customer moves on (Add More / No Thanks / Next),
   * apply the same rule as family cards: a held PDF whose identity binding no
   * longer matches what is now typed is dropped, with a clear message.
   */
  function reconcilePrimaryHeldPdf() {
    const held = pendingPdfs[0];
    if (!held) return;
    const nowKey = identityKey(
      form.getValues("cardType") || "",
      form.getValues("customerName") || "",
      form.getValues("rationCardNumber") || "",
    );
    if (held.boundTo !== nowKey) {
      removePendingPdf(0);
      toast({
        title: "Attached PDF removed",
        description: `Card 1's details changed, so the PDF attached earlier was removed. Please attach the correct PDF for ${form.getValues("customerName")}.`,
        variant: "destructive",
      });
    }
  }

  /** "+ Yes, Add More": save whatever panel is active, then open a blank one. */
  async function handleAddMore() {
    if (addCardView) {
      if (!commitFamilyEditor()) return;
    } else {
      const ok = await form.trigger(["customerName", "rationCardNumber", "cardType"]);
      if (!ok) return;
    }
    reconcilePrimaryHeldPdf();
    openAddCard();
  }

  /** "No, Thanks" / "Next Step": save the active panel and move to delivery. */
  async function handleProceedToDelivery() {
    if (addCardView && !commitFamilyEditor()) return;
    const ok = await form.trigger(["customerName", "rationCardNumber", "cardType"]);
    if (!ok) return;
    reconcilePrimaryHeldPdf();
    advanceToStep(2);
  }

  /** Trash icon on the active extra-card panel. */
  function handleDeleteActivePanel() {
    if (editIndex !== null) {
      removeFamilyCard(editIndex);
    } else {
      // Never saved — just drop the panel and any PDF attached to it.
      setPendingPdfs((prev) => {
        const next = { ...prev };
        delete next[familyCards.length + 1];
        return next;
      });
    }
    setSubCard({ customerName: "", rationCardNumber: "", cardType: "" });
    setSubError("");
    setEditIndex(null);
    setAddCardView(false);
  }

  /** Pencil on a saved card row: commit the active panel, then edit that card. */
  function openEditFamilyCard(index: number) {
    if (addCardView) {
      if (editIndex === index) return;
      if (!commitFamilyEditor()) return;
    }
    openAddCard(index);
  }

  /** Pencil on the primary row (shown while an extra-card panel is active). */
  function openEditPrimaryCard() {
    if (addCardView && !commitFamilyEditor()) return;
  }

  // Server-side multer cap is 20MB on the card-PDF route — mirror it here so
  // an oversized file is rejected immediately, not after payment.
  const MAX_PDF_BYTES = 20 * 1024 * 1024;

  function pdfFileProblem(file: File): { title: string; description: string } | null {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) return { title: "Only PDF files allowed", description: "Please choose the e-ration card PDF file — photos or images cannot be used." };
    if (file.size > MAX_PDF_BYTES) return { title: "File too large", description: "PDFs up to 20MB are accepted. Please upload the original PDF downloaded from the government website." };
    return null;
  }

  /**
   * Fingerprint of the identity fields a held PDF was attached under. Case
   * and surrounding spaces are cosmetic; anything else (a different number,
   * name, or card type) means "possibly a different person's card".
   */
  function identityKey(cardType: string, name: string, number: string): string {
    return [cardType, name.trim().toUpperCase(), number.trim().toUpperCase()].join("|");
  }

  /** Step 1: hold the chosen file in the browser — it uploads after payment. */
  function attachPendingPdf(cardIndex: number, file: File) {
    const problem = pdfFileProblem(file);
    if (problem) {
      toast({ ...problem, variant: "destructive" });
      return;
    }
    // Bind the file to the details showing on the panel right now. Attach is
    // only reachable from the active panel: cardIndex 0 reads the form, any
    // other index reads the family-card editor.
    const boundTo = cardIndex === 0
      ? identityKey(form.getValues("cardType") || "", form.getValues("customerName") || "", form.getValues("rationCardNumber") || "")
      : identityKey(subCard.cardType, subCard.customerName, subCard.rationCardNumber);
    setPendingPdfs((prev) => ({ ...prev, [cardIndex]: { file, boundTo } }));
  }

  function removePendingPdf(cardIndex: number) {
    setPendingPdfs((prev) => {
      const next = { ...prev };
      delete next[cardIndex];
      return next;
    });
  }

  /**
   * Upload one card PDF to the order. Returns null on success or a
   * user-readable error message. Shared by the manual step-4 buttons and the
   * post-payment auto-upload run.
   */
  async function uploadCardPdfCore(orderNumber: string, cardIndex: number, file: File): Promise<string | null> {
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      fd.append("cardIndex", String(cardIndex));
      const res = await fetch(`${BASE}/api/orders/${encodeURIComponent(orderNumber)}/upload-card-pdf`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        let msg = "Could not upload the PDF. Please try again.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* non-JSON error body */ }
        return msg;
      }
      const { pdfUrl, originalFilename } = await res.json();
      setCardPdfs((prev) => ({ ...prev, [cardIndex]: { pdfUrl, originalFilename } }));
      // The held copy (if any) is now on the server.
      removePendingPdf(cardIndex);
      return null;
    } catch {
      return "Could not upload the PDF. Please check your connection and try again.";
    }
  }

  async function handleCardPdfUpload(cardIndex: number, file: File) {
    if (!createdOrder) return;
    const problem = pdfFileProblem(file);
    if (problem) {
      toast({ ...problem, variant: "destructive" });
      return;
    }
    setUploadingPdfIdx(cardIndex);
    const error = await uploadCardPdfCore(createdOrder.orderNumber, cardIndex, file);
    setUploadingPdfIdx(null);
    if (error) toast({ title: "Upload failed", description: error, variant: "destructive" });
  }

  /** Step 4 "Retry upload": re-send the file still held from step 1. */
  async function retryHeldUpload(cardIndex: number) {
    const held = pendingPdfs[cardIndex];
    if (!held || !createdOrder) return;
    setUploadingPdfIdx(cardIndex);
    const error = await uploadCardPdfCore(createdOrder.orderNumber, cardIndex, held.file);
    setUploadingPdfIdx(null);
    if (error) toast({ title: "Upload failed", description: error, variant: "destructive" });
  }

  /** Optional PDF dropzone / attached-file chip inside a step-1 card panel. */
  function renderPdfAttach(cardIndex: number) {
    const held = pendingPdfs[cardIndex];
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">
          Upload e-Ration Card PDF <span className="text-slate-400 font-normal">(optional — you can also do this after payment)</span>
        </p>
        {held ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3" data-testid={`pending-pdf-chip-${cardIndex}`}>
            <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800 truncate" data-testid={`text-pending-pdf-name-${cardIndex}`}>{held.file.name}</p>
              <p className="text-xs text-emerald-600">Will be attached automatically after payment</p>
            </div>
            <button type="button" aria-label="Remove PDF" data-testid={`button-remove-pending-pdf-${cardIndex}`} className="text-slate-400 hover:text-red-600 shrink-0" onClick={() => removePendingPdf(cardIndex)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid={`pdf-dropzone-${cardIndex}`}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 hover:border-primary/60 hover:bg-primary/5 transition-colors px-4 py-7 flex flex-col items-center gap-2 text-slate-500"
            onClick={() => stepOnePdfRefs.current[cardIndex]?.click()}
          >
            <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Upload className="w-5 h-5 text-primary" /></span>
            <span className="text-sm">Click to upload PDF <span className="font-semibold">(Max 20MB)</span></span>
            <span className="text-xs text-slate-400">The e-ration card PDF downloaded from the government website</span>
          </button>
        )}
        <input
          ref={(el) => { stepOnePdfRefs.current[cardIndex] = el; }}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          data-testid={`input-pdf-file-${cardIndex}`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) attachPendingPdf(cardIndex, f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  /**
   * `orderNumberArg` matters when this runs from the payment-polling chain:
   * those closures may predate `setCreatedOrder`, so `createdOrder` can still
   * be null inside them even though the order exists.
   */
  function handleFinalSubmit(orderNumberArg?: string) {
    const orderNumber = orderNumberArg ?? createdOrder?.orderNumber;
    if (!orderNumber) return;
    submitOrder.mutate(
      { orderNumber },
      {
        onSuccess: (result) => {
          setEmailSent(result.emailSent);
          setSuccess({ orderNumber });
          // GA4 conversion: silent no-op unless analytics is configured.
          trackEvent("purchase", {
            transaction_id: orderNumber,
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

  const payBusy =
    createOrder.isPending || payPhase === "opening" || payPhase === "paying" || payPhase === "checking";

  /**
   * After payment: push every PDF attached at step 1 through the per-card
   * upload endpoint, one at a time. If every card in the order was covered
   * and every upload succeeded, submit the order automatically — the customer
   * has nothing left to do. Any skipped card or failed upload falls back to
   * the manual step-4 flow (Retry keeps using the held file).
   */
  async function runAutoUploads(orderNumber: string) {
    if (autoUploadRan.current) return;
    autoUploadRan.current = true;
    const heldEntries = Object.entries(pendingPdfs)
      .map(([k, h]) => [Number(k), h] as const)
      .sort((a, b) => a[0] - b[0]);
    if (heldEntries.length === 0) return;
    setAutoUploadState("running");
    const uploadedNow = new Set<number>();
    let failures = 0;
    for (const [cardIndex, held] of heldEntries) {
      // Last line of defence: the commit/next gates should already have
      // dropped any file whose identity binding went stale — never let one
      // through to a card with different details.
      const card = step4Cards.find((c) => c.cardIndex === cardIndex);
      if (!card || held.boundTo !== identityKey(card.cardType, card.name, card.rationCardNumber)) {
        console.error(`Held PDF for card ${cardIndex + 1} no longer matches that card's details — not uploading it.`);
        removePendingPdf(cardIndex);
        continue;
      }
      setUploadingPdfIdx(cardIndex);
      const error = await uploadCardPdfCore(orderNumber, cardIndex, held.file);
      if (error) failures += 1;
      else uploadedNow.add(cardIndex);
    }
    setUploadingPdfIdx(null);
    setAutoUploadState("done");
    if (failures > 0) {
      toast({
        title: failures === 1 ? "One PDF could not be attached" : `${failures} PDFs could not be attached`,
        description: "Your file is still here — press Retry next to that card below.",
        variant: "destructive",
      });
      return;
    }
    // Decide off the local success set — React state updates land later.
    const everyCardCovered = step4Cards.every((c) => uploadedNow.has(c.cardIndex));
    if (everyCardCovered && !autoSubmitFired.current) {
      autoSubmitFired.current = true;
      handleFinalSubmit(orderNumber);
    }
  }

  /**
   * Takes the order number as a parameter on purpose: this is reached through
   * payment closures created before `setCreatedOrder` re-rendered, where the
   * `createdOrder` state is still null (guarding on it here silently skipped
   * the auto-upload).
   */
  function onPaid(orderNumber: string) {
    setPayPhase("idle");
    const heldCount = Object.keys(pendingPdfs).length;
    toast({
      title: "Payment received",
      description: heldCount > 0
        ? "Your payment is confirmed. Attaching your card PDF(s) now…"
        : "Your payment is confirmed. One last step — upload your card PDF(s).",
    });
    advanceToStep(4);
    window.scrollTo(0, 0);
    void runAutoUploads(orderNumber);
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
      toast({ title: "Could not start the payment", description: serverMessage ?? "Please check your connection and try again.", variant: "destructive" });
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
      toast({ title: "Could not open the payment window", description: "Please check your connection and try again.", variant: "destructive" });
      return;
    }
    await checkPaymentNow(orderNumber, 3, 1500);
  }

  async function onSubmit(data: OrderForm) {
    // Order already created (an earlier payment attempt) — never create a
    // duplicate; jump straight back into the payment flow.
    if (createdOrder) {
      await startPayment(createdOrder.orderNumber);
      return;
    }
    if (!consentChecked) {
      toast({ title: "Consent required", description: "Please tick the box to accept the Terms & Conditions and Refund Policy.", variant: "destructive" });
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
        },
      },
      {
        onSuccess: (order) => {
          setCreatedOrder({ orderNumber: order.orderNumber });
          setCardPdfs({});
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
              setAddCardView(false);
              setEditIndex(null);
              setSubError("");
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
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Placed!</h2>
                <p className="text-slate-600">Payment received — your order is confirmed and queued for printing.</p>
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
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-left" data-testid="note-payment-received">
                <p className="text-sm text-emerald-800 font-medium mb-1">✅ Payment received</p>
                <p className="text-xs text-emerald-700">Your payment was completed securely online through Cashfree — no manual verification needed. Your card will be printed and delivered within <strong>5–7 working days</strong>.</p>
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
                  setSubCard({ customerName: "", rationCardNumber: "", cardType: "" });
                  setSubError("");
                  setFamilyCardErrors({});
                  setConsentChecked(false);
                  setPayPhase("idle");
                  setCreatedOrder(null);
                  setCardPdfs({});
                  setPendingPdfs({});
                  setAutoUploadState("idle");
                  autoUploadRan.current = false;
                  autoSubmitFired.current = false;
                  setUploadingPdfIdx(null);
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
                      {/* Other PVC Cards pricing */}
                      <div className="flex flex-wrap items-center gap-2" data-testid="hero-special-pricing">
                        <span className="w-full sm:w-52">
                          <span className="block text-white/90 text-[13px] font-bold uppercase tracking-wide">Other PVC Cards</span>
                          <span className="block text-white/60 text-[11px] leading-tight" data-testid="hero-special-types">{`${SPECIAL_CARD_TYPES.slice(0, 3).join(" · ")} + ${SPECIAL_CARD_TYPES.length - 3} more`}</span>
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
                {step === 1 && (
                  <div className="space-y-5">
                    {!addCardView && (
                      <Card className="border-slate-200 shadow-sm" data-testid="card-panel-primary">
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-primary text-white text-xs font-bold px-3 py-1">Card 1</span>
                            <span className="inline-flex items-center rounded-full bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-0.5">Primary</span>
                          </div>
                          <CardTitle className="flex items-center gap-2 pt-1"><User className="w-5 h-5 text-primary" /> Card Details</CardTitle>
                          <CardDescription>Select Card Type, then type Card Holder Name &amp; Card Number</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <FormField control={form.control} name="cardType" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Card Type *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger data-testid="select-card-type-step1"><SelectValue placeholder="Select Card Type" /></SelectTrigger></FormControl>
                                {/* 16 card types now — cap the height so the list scrolls instead of overflowing small screens */}
                                <SelectContent className="max-h-60 overflow-y-auto">
                                  <CardTypeOptions />
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
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
                          {(primaryFieldsFilled || pendingPdfs[0]) && renderPdfAttach(0)}
                        </CardContent>
                      </Card>
                    )}

                    {addCardView && (
                      <Card className="border-slate-200 shadow-sm" data-testid={`card-panel-${activePanelCardIndex}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center rounded-full bg-primary text-white text-xs font-bold px-3 py-1">Card {activePanelCardIndex + 1}</span>
                            <button type="button" aria-label="Delete this card" data-testid="button-delete-card-panel" className="text-slate-400 hover:text-red-600" onClick={handleDeleteActivePanel}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <CardDescription className="pt-1">Select Card Type, then type Card Holder Name &amp; Card Number</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">Card Type *</label>
                            <Select value={subCard.cardType} onValueChange={(v) => setSubCard((s) => ({ ...s, cardType: v }))}>
                              <SelectTrigger data-testid="select-family-card-type"><SelectValue placeholder="Select Card Type" /></SelectTrigger>
                              <SelectContent className="max-h-60 overflow-y-auto">
                                <CardTypeOptions />
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-700">Card Holder Name *</label>
                              <Input data-testid="input-family-name" placeholder="CARD HOLDER NAME" value={subCard.customerName} onChange={(e) => setSubCard((s) => ({ ...s, customerName: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-700">Card Number *</label>
                              <Input data-testid="input-family-number" placeholder="00000 00000" value={subCard.rationCardNumber} onChange={(e) => setSubCard((s) => ({ ...s, rationCardNumber: e.target.value }))} />
                            </div>
                          </div>
                          {subError && <p className="text-sm text-red-600" data-testid="family-editor-error">{subError}</p>}
                          {(familyFieldsFilled || pendingPdfs[activePanelCardIndex]) && renderPdfAttach(activePanelCardIndex)}
                        </CardContent>
                      </Card>
                    )}

                    <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 p-4 sm:p-5" data-testid="print-more-prompt">
                      <p className="font-semibold text-slate-800">Do you want to print more cards?</p>
                      <p className="text-xs text-slate-500 mt-0.5 mb-3">2 or more cards cost less per card.</p>
                      <div className="flex flex-wrap gap-3">
                        <Button type="button" variant="outline" data-testid="button-family-no" className="min-w-28 bg-white" onClick={handleProceedToDelivery}>No, Thanks</Button>
                        <Button type="button" data-testid="button-add-another" className="min-w-32 bg-slate-800 hover:bg-slate-900 text-white" onClick={handleAddMore}>
                          <Plus className="w-4 h-4 mr-1" /> Yes, Add More
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" data-testid="button-next-step1" className="bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90 px-8" onClick={handleProceedToDelivery}>
                        Next Step <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>

                    {(familyCards.length > 0 || addCardView) && (
                      <Card className="border-slate-200 shadow-sm" data-testid="your-cards-summary">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <CreditCard className="w-4 h-4 text-primary" /> Your Cards
                            <span className="text-slate-400 font-normal">•</span>
                            <span data-testid="your-cards-count">{String(displayedCardCount).padStart(2, "0")}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {addCardView && (
                            <div className="rounded-md border border-slate-200 bg-white px-3 py-2" data-testid="summary-card-primary">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-700 truncate min-w-0">
                                  <span className="font-medium">{watchedPrimaryName}</span> • {watchedPrimaryNumber} •{" "}
                                  <span className="inline-flex items-center rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{cardType}</span>
                                  {pendingPdfs[0] && (
                                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 ml-1.5" data-testid="summary-pdf-tag-0"><FileText className="w-3 h-3" /> PDF</span>
                                  )}
                                </span>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  <span className="inline-flex items-center rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">Primary</span>
                                  <button type="button" aria-label="Edit primary card" data-testid="button-edit-primary" className="text-slate-500 hover:text-primary" onClick={openEditPrimaryCard}>
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {familyCards.map((fc, idx) =>
                            addCardView && editIndex === idx ? null : (
                              <div key={idx} data-family-card-row={idx} className={`rounded-md border px-3 py-2 ${familyCardErrors[idx] ? "border-red-500 bg-red-50" : "border-slate-200 bg-white"}`} data-testid={`family-card-${idx}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-700 truncate min-w-0">
                                    <span className="font-medium">{fc.customerName}</span> • {fc.rationCardNumber} •{" "}
                                    <span className="inline-flex items-center rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{fc.cardType}</span>
                                    {pendingPdfs[idx + 1] && (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 ml-1.5" data-testid={`summary-pdf-tag-${idx + 1}`}><FileText className="w-3 h-3" /> PDF</span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <button type="button" aria-label="Edit card" data-testid={`button-edit-family-${idx}`} className="text-slate-500 hover:text-primary" onClick={() => openEditFamilyCard(idx)}>
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
                            ),
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
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
                    <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Review &amp; Pay</CardTitle>
                    <CardDescription>Check your order summary, then pay securely online — UPI, card or net banking.</CardDescription>
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

                    {/* How online payment works */}
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">How payment works</p>
                      <ol className="space-y-1.5">
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                          <span>Tick the consent box below</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                          <span>Press the Pay button — a secure payment window opens</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                          <span>Pay <strong>₹{amount}</strong> by UPI, card or net banking — your order confirms automatically</span>
                        </li>
                      </ol>
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
                        , and I hereby give my consent to proceed with the printing of my document.
                      </span>
                    </label>

                    {/* Secure payment note */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex gap-2.5">
                      <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Payments are processed securely by <strong>Cashfree Payments</strong>, an RBI-authorised payment gateway. We never see or store your UPI PIN or card details.
                      </p>
                    </div>

                    {payPhase === "unavailable" && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="pay-unavailable-note">
                        <p className="text-sm font-semibold text-amber-800">Online payment is temporarily unavailable</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {createdOrder
                            ? `Your order ${createdOrder.orderNumber} is saved. Please try the payment again in a few minutes — you can also finish it later from the Track Order page.`
                            : "Please try again in a few minutes — your details stay filled in."}
                        </p>
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
                          onClick={() => createdOrder && checkPaymentNow(createdOrder.orderNumber, 4, 2000)}
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

                    <div className="space-y-2 pt-2">
                      {createdOrder && payPhase !== "checking" && payPhase !== "paying" && (
                        <p className="text-xs text-slate-500" data-testid="note-order-saved">
                          Your order <span className="font-mono font-semibold">{createdOrder.orderNumber}</span> is saved — the details above can no longer be changed for this order.
                        </p>
                      )}
                      {!consentChecked && !payBusy && (
                        <p className="text-xs text-amber-600 flex items-center gap-1.5" data-testid="submit-disabled-hint">
                          <span>⚠️</span> Please tick the consent box above to enable payment.
                        </p>
                      )}
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={payBusy}>Back</Button>
                        <Button
                          type="submit"
                          data-testid="button-pay-now"
                          className="bg-primary hover:bg-primary/90 px-8"
                          disabled={payBusy || !consentChecked}
                          title={!consentChecked ? "Tick the consent box first" : undefined}
                        >
                          {payPhase === "opening" ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting secure payment…</>
                          ) : payPhase === "paying" ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finish payment in the window…</>
                          ) : payPhase === "checking" ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking payment…</>
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

                    {autoUploadState === "running" && (
                      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 flex items-center gap-2" data-testid="auto-upload-progress">
                        <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
                        <p className="text-sm text-sky-800 font-medium">Attaching your PDFs automatically — please keep this page open.</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {step4Cards.map((card) => {
                        const uploaded = !!cardPdfs[card.cardIndex];
                        const isUploadingPdf = uploadingPdfIdx === card.cardIndex;
                        const canRetryHeld = !uploaded && !!pendingPdfs[card.cardIndex] && autoUploadState !== "running";
                        return (
                          <div key={card.cardIndex} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4" data-testid={`step4-card-${card.cardIndex}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{card.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">Card No: <span className="font-mono">{card.rationCardNumber}</span> · {card.cardType}</p>
                              {uploaded && (
                                <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1 min-w-0" data-testid={`text-pdf-name-${card.cardIndex}`}><CheckCircle2 className="w-3 h-3 shrink-0" /> <span className="truncate">{cardPdfs[card.cardIndex]?.originalFilename ?? "PDF uploaded"}</span></p>
                              )}
                              {canRetryHeld && !isUploadingPdf && (
                                <button type="button" className="text-xs text-primary underline mt-1" data-testid={`button-pick-different-${card.cardIndex}`} onClick={() => pdfFileRefs.current[card.cardIndex]?.click()}>
                                  choose a different file
                                </button>
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
                              disabled={isUploadingPdf || autoUploadState === "running"}
                              onClick={() => {
                                if (canRetryHeld) retryHeldUpload(card.cardIndex);
                                else pdfFileRefs.current[card.cardIndex]?.click();
                              }}
                            >
                              {isUploadingPdf ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Uploading…</>
                              ) : uploaded ? (
                                "Re-upload"
                              ) : canRetryHeld ? (
                                <><Upload className="w-3.5 h-3.5 mr-1" /> Retry upload</>
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

                    {!allPdfsUploaded && autoUploadState !== "running" && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5" data-testid="step4-pending-hint">
                        <span>⚠️</span> Upload the PDF for every card above to enable Submit.
                      </p>
                    )}
                    <Button
                      type="button"
                      data-testid="button-final-submit"
                      className="w-full bg-primary hover:bg-primary/90 h-11"
                      disabled={!allPdfsUploaded || submitOrder.isPending || autoUploadState === "running"}
                      onClick={() => handleFinalSubmit()}
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
    </div>
  );
}
