import { useState, useRef, useEffect } from "react";
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
  useCreateOrder, useGetUpiConfig, useUploadPaymentScreenshot,
  useLogoutOperator,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, Copy, Upload, Plus, Pencil, Trash2,
  User, MapPin, CreditCard, IndianRupee, ChevronRight, ChevronLeft,
  QrCode, ImageIcon, AlertTriangle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  RATION_CARD_TYPES,
  SPECIAL_CARD_TYPES,
  ALLOWED_CARD_TYPES,
  computeOrderAmount,
  priceBreakdown,
  PRICING,
} from "@workspace/pricing";

const WB_DISTRICTS = [
  "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur",
  "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram",
  "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia",
  "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur",
  "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur",
];

// Card categories & operator pricing come from @workspace/pricing — shared
// with the API server, which recomputes the amount when the order is created.

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

type FamilyCard = { customerName: string; rationCardNumber: string; cardType: string };

const orderSchema = z.object({
  customerName: z.string().min(2, "Name required"),
  customerPhone: z.string().min(10, "Valid phone required"),
  rationCardNumber: z.string().min(5, "Valid ration card number required"),
  deliveryName: z.string().min(2, "Full name required"),
  address: z.string().min(10, "Full address required"),
  postOffice: z.string().min(2, "Post office required"),
  district: z.string().min(1, "Select district"),
  pincode: z.string().length(6, "6-digit pincode required"),
  cardType: z.enum(ALLOWED_CARD_TYPES),
  quantity: z.coerce.number().min(1),
});
type OrderForm = z.infer<typeof orderSchema>;

function getAuthHeader() {
  const token = localStorage.getItem("operatorToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Pricing rows shown to the operator before they start filling the form. */
function OperatorPricingBanner() {
  const rows: Array<{ group: string; label: string; types: readonly string[]; typesColor: string; single: number; multi: number }> = [
    { group: "ration", label: "RATION CARD", types: RATION_CARD_TYPES, typesColor: "text-[#f2f9ffb5]", single: PRICING.ration.single.operator, multi: PRICING.ration.multi.operator },
    { group: "special", label: "OTHER PVC CARDS", types: SPECIAL_CARD_TYPES, typesColor: "text-[#c5e6eb]", single: PRICING.special.single.operator, multi: PRICING.special.multi.operator },
  ];
  return (
    <div className="rounded-xl border border-primary/15 from-primary/5 to-sky-50 p-4 mb-4 bg-[#038ffff2] text-[#ffffff]">
      <p className="text-xs font-bold uppercase tracking-wide mb-3 text-[#ffd900]">Operator Rates</p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.group} className="flex flex-wrap items-center gap-2">
            <span className="w-44 shrink-0">
              <span className="block font-semibold text-background text-sm">{row.label}</span>
              <span className={`block ${row.typesColor} text-[12px]`} data-testid={`pricing-types-${row.group}`}>
                {row.types.join(" · ")}
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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [familyCards, setFamilyCards] = useState<FamilyCard[]>([]);
  const [familyDialog, setFamilyDialog] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [subCard, setSubCard] = useState<FamilyCard>({ customerName: "", rationCardNumber: "", cardType: "AAY" });
  const [subError, setSubError] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: operator, error: opError } = useGetCurrentOperator({
    query: { queryKey: getGetCurrentOperatorQueryKey() },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: upiConfig } = useGetUpiConfig();
  const merchantUpiId = upiConfig?.merchantUpiId || "";
  const createOrder = useCreateOrder({ request: { headers: getAuthHeader() } } as any);
  const uploadScreenshot = useUploadPaymentScreenshot();
  const logoutOperator = useLogoutOperator();

  useEffect(() => { if (opError) setLocation("/operator/login"); }, [opError, setLocation]);

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: "", customerPhone: "", rationCardNumber: "",
      deliveryName: "", address: "", postOffice: "",
      district: "", pincode: "", cardType: "AAY", quantity: 1,
    },
  });

  const cardType = form.watch("cardType");
  const totalCards = 1 + familyCards.length;
  const allCardTypes = [cardType, ...familyCards.map((c) => c.cardType)];
  const amount = computeOrderAmount(allCardTypes, true);
  const breakdown = priceBreakdown(allCardTypes, true);

  const upiLink = merchantUpiId
    ? `upi://pay?pa=${merchantUpiId}&pn=PVC+Card+Portal&am=${amount}&cu=INR&tn=PVC+Ration+Card`
    : "";

  function copyUpi() {
    if (!merchantUpiId) return;
    navigator.clipboard.writeText(merchantUpiId).then(() => {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    });
  }

  function openAddFamily(idx: number | null = null) {
    if (idx !== null) { setSubCard(familyCards[idx]); setEditIdx(idx); }
    else { setSubCard({ customerName: "", rationCardNumber: "", cardType: "AAY" }); setEditIdx(null); }
    setSubError(""); setFamilyDialog(true);
  }

  function saveFamilyCard() {
    if (subCard.customerName.trim().length < 2) { setSubError("Enter card holder name"); return; }
    if (subCard.rationCardNumber.trim().length < 5) { setSubError("Enter valid ration card number"); return; }
    setFamilyCards(prev => {
      const next = [...prev];
      const entry = { customerName: subCard.customerName.trim(), rationCardNumber: subCard.rationCardNumber.trim(), cardType: subCard.cardType };
      if (editIdx !== null) next[editIdx] = entry; else next.push(entry);
      return next;
    });
    setFamilyDialog(false);
  }

  function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: OrderForm) {
    if (!screenshotFile) {
      toast({ title: "Screenshot required", description: "Upload the UPI payment screenshot to proceed.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    let screenshotUrl = "";
    try {
      const result = await uploadScreenshot.mutateAsync({ data: { screenshot: screenshotFile } });
      screenshotUrl = result.url;
    } catch {
      toast({ title: "Upload failed", description: "Could not upload screenshot. Try again.", variant: "destructive" });
      setIsUploading(false); return;
    }
    createOrder.mutate(
      { data: { customerName: data.customerName, customerPhone: data.customerPhone, rationCardNumber: data.rationCardNumber, deliveryName: data.deliveryName, address: data.address, postOffice: data.postOffice, state: "West Bengal", district: data.district, pincode: data.pincode, cardType: data.cardType, familyCards, quantity: totalCards, amount, paymentStatus: "pending", paymentMethod: "upi", paymentScreenshotUrl: screenshotUrl } },
      {
        onSuccess: (order) => { setIsUploading(false); setLocation(`/order-upload/${order.orderNumber}`); },
        onError: () => { setIsUploading(false); toast({ title: "Failed to place order", variant: "destructive" }); },
      }
    );
  }

  function handleLogout() {
    logoutOperator.mutate(undefined, {
      onSuccess: () => { localStorage.removeItem("operatorToken"); setLocation("/operator/login"); },
    });
  }

  function resetOrder() {
    setSuccess(null); setStep(1); setFamilyCards([]); setScreenshotFile(null); setScreenshotPreview(null); form.reset();
  }

  if (success) {
    return (
      <OperatorLayout operatorName={operator?.name} shopName={operator?.shopName} district={operator?.district} onLogout={handleLogout}>
        <div className="p-4 md:p-6 max-w-md mx-auto">
          <style>{`@keyframes popIn{0%{opacity:0;transform:scale(0.9) translateY(12px)}100%{opacity:1;transform:none}}`}</style>
          <div className="text-center space-y-5 py-8" style={{ animation: "popIn 0.4s ease both" }}>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Order Placed!</h2>
              <p className="text-slate-500 text-sm mt-1">Payment screenshot received. Our team will verify it shortly.</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Order Number</p>
              <p className="text-2xl font-mono font-bold text-primary">{success.orderNumber}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-left">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Payment NOT yet confirmed</p>
              <p className="text-xs text-amber-700 mt-1">Card will NOT be printed until admin verifies the payment screenshot.</p>
            </div>
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
                    <FormField control={form.control} name="cardType" render={({ field }) => (
                      <FormItem><FormLabel>Card Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                          <SelectContent><CardTypeOptions /></SelectContent>
                        </Select>
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
                          <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-2.5 border border-slate-200">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{fc.customerName}</p>
                              <p className="text-xs text-slate-500 font-mono">{fc.rationCardNumber} · {fc.cardType}</p>
                            </div>
                            <button type="button" onClick={() => openAddFamily(i)} className="text-slate-400 hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => setFamilyCards(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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
                    <Badge variant="outline" className="border-primary/30 text-primary text-xs">{cardType}</Badge>
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

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                      <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button type="button" className="flex-1 gap-2" onClick={() => form.trigger(["deliveryName","address","postOffice","district","pincode"]).then(ok => ok && setStep(3))}>
                      Next: Payment <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Payment ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">Upload only the UPI payment screenshot. Fake/invalid screenshots will result in immediate order cancellation.</p>
                </div>

                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <IndianRupee className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-slate-800 text-sm">Pay ₹{amount} via UPI</h2>
                    </div>

                    {merchantUpiId && (
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="bg-white rounded-xl p-3 border border-slate-200 shrink-0">
                          <QRCodeSVG value={upiLink} size={130} />
                          <p className="text-xs text-center text-slate-500 mt-2">Scan to pay</p>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5">UPI ID</p>
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                              <span className="font-mono text-sm font-medium text-slate-800 flex-1 text-xs break-all">{merchantUpiId}</span>
                              <button type="button" onClick={copyUpi} className={`shrink-0 text-xs px-2 py-1 rounded font-medium transition-colors ${copiedUpi ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
                                {copiedUpi ? "Copied!" : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <a href={upiLink} className="flex items-center justify-center gap-2 bg-primary text-white text-sm font-medium rounded-lg py-2.5 hover:bg-primary/90 transition-colors">
                            <QrCode className="w-4 h-4" /> Open UPI App
                          </a>
                          <div className="bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                            <p className="text-xs text-primary font-semibold">Amount: ₹{amount}</p>
                            {breakdown.map((line) => (
                              <p key={line.group} className="text-xs text-slate-500">
                                {line.label}: {line.count} card{line.count !== 1 ? "s" : ""} × ₹{line.unitPrice}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Screenshot upload */}
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Upload Payment Screenshot *</p>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
                      {!screenshotPreview ? (
                        <button type="button" onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 hover:border-primary rounded-xl p-6 text-center transition-colors group">
                          <Upload className="w-8 h-8 text-slate-300 group-hover:text-primary mx-auto mb-2 transition-colors" />
                          <p className="text-sm text-slate-500 group-hover:text-primary font-medium">Click to upload screenshot</p>
                          <p className="text-xs text-slate-400 mt-0.5">PNG, JPG up to 10MB</p>
                        </button>
                      ) : (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200">
                          <img src={screenshotPreview} alt="Payment screenshot" className="w-full max-h-48 object-contain bg-slate-50" />
                          <button type="button" onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }} className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md border border-slate-200 text-slate-500 hover:text-red-500 text-xs">✕</button>
                          <div className="flex items-center gap-1.5 p-2 bg-emerald-50 border-t border-emerald-200">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-xs text-emerald-700 font-medium">Screenshot uploaded</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isUploading || createOrder.isPending || !screenshotFile}>
                    {isUploading ? "Uploading…" : createOrder.isPending ? "Placing Order…" : "Place Order"}
                  </Button>
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
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Card Holder Name *</label>
              <Input placeholder="Full name" value={subCard.customerName} onChange={e => setSubCard(p => ({ ...p, customerName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Card Number *</label>
              <Input placeholder="Card number" value={subCard.rationCardNumber} onChange={e => setSubCard(p => ({ ...p, rationCardNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Card Category *</label>
              <Select value={subCard.cardType} onValueChange={v => setSubCard(p => ({ ...p, cardType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><CardTypeOptions /></SelectContent>
              </Select>
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
