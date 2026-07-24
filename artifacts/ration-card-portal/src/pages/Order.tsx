import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QRCodeSVG } from "qrcode.react";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useCreateOrder, useGetUpiConfig, useUploadPaymentScreenshot } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, MapPin, MessageCircle, Play, Plus, Pencil, Trash2, ShieldCheck, User, Upload, Copy, Smartphone, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useSeo } from "@/hooks/use-seo";

const CARD_CATEGORIES = ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II"] as const;

type FamilyCardEntry = { customerName: string; rationCardNumber: string; cardType: string };

const SIDEBAR_FAQS = [
  { q: "What is e Ration Card?", a: "An e-Ration Card is the digital version of your ration card issued by the government's PDS system. It contains the same details as your physical card and can be downloaded online." },
  { q: "What does PVC Card Portal do?", a: "We help you order a durable, wallet-size PVC printed version of your e-Ration card. We print your official card details onto a premium PVC card and deliver it to your doorstep." },
  { q: "How to Order PVC e Ration Card?", a: "Simply enter your card holder name, ration card number, and select your card category below, then follow the steps to complete your address and payment details." },
];

const orderSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().min(10, "Enter a valid 10-digit phone number"),
  rationCardNumber: z.string().min(5, "Enter a valid ration card number"),
  deliveryName: z.string().min(2, "Enter full name"),
  address: z.string().min(10, "Enter complete address"),
  postOffice: z.string().min(2, "Enter post office"),
  state: z.string().min(1, "Select your state"),
  district: z.string().min(2, "Enter your district"),
  pincode: z.string().length(6, "Pincode must be 6 digits"),
  cardType: z.enum(["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II"]),
  quantity: z.coerce.number().min(1).max(10),
});

type OrderForm = z.infer<typeof orderSchema>;

const WB_DISTRICTS = [
  "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur",
  "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram",
  "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia",
  "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur",
  "Purulia", "South 24 Parganas", "Uttar Dinajpur",
];

const SINGLE_CARD_PRICE = 50;
const MULTI_CARD_PRICE = 50;

export default function Order() {
  useSeo({
    title: "Apply for PVC Ration Card | ₹50 Only | Fast Delivery West Bengal",
    description: "Fill out a simple form and get your PVC ration card printed and delivered to your door. ₹50 per card. All West Bengal districts served.",
    canonical: "https://erationcards.in/order",
  });
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);
  const [familyCards, setFamilyCards] = useState<FamilyCardEntry[]>([]);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [addCardView, setAddCardView] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [subCard, setSubCard] = useState<FamilyCardEntry>({ customerName: "", rationCardNumber: "", cardType: "AAY" });
  const [subError, setSubError] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createOrder = useCreateOrder();
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
    setAddCardView(false);
  }

  function removeFamilyCard(index: number) {
    setFamilyCards((prev) => prev.filter((_, i) => i !== index));
  }

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
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
  const amount = totalCards === 1 ? SINGLE_CARD_PRICE : MULTI_CARD_PRICE * totalCards;

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
          setLocation(`/order-upload/${order.orderNumber}`);
        },
        onError: () => {
          setIsUploading(false);
          toast({ title: "Failed to place order", description: "Please try again.", variant: "destructive" });
        },
      }
    );
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
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-left">
                <p className="text-sm text-amber-800 font-medium mb-1">⏳ Payment NOT yet confirmed</p>
                <p className="text-xs text-amber-700">Our team will manually check your payment screenshot. <strong>Your card will NOT be printed until we verify your payment.</strong> If your screenshot is invalid or fake, your order will be cancelled. Verified orders are delivered in 5–7 working days.</p>
              </div>
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
                  setShowFamilyDialog(false);
                  setScreenshotFile(null);
                  setScreenshotPreview(null);
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
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${step >= s ? "bg-primary border-primary text-white" : "bg-white border-slate-300 text-slate-400"}`}>{s}</div>
                {s < 3 && <div className={`h-0.5 w-12 transition-colors ${step > s ? "bg-primary" : "bg-slate-200"}`} />}
              </div>
            ))}
            <span className="ml-2 text-sm text-slate-500">Step {step} of 3</span>
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
                    <p className="text-white/80 text-sm mt-2 max-w-xs">1 card <span className="font-bold">₹70/-</span> · 2+ cards <span className="font-bold">₹50/-</span> each (incl. GST &amp; postage)</p>
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
                      <CardDescription>Type Ration Card Holder Name, Card Number &amp; Select Ration Card Category</CardDescription>
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
                            <FormLabel>Ration Card Number *</FormLabel>
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
                              <SelectItem value="AAY">AAY</SelectItem>
                              <SelectItem value="PHH">PHH</SelectItem>
                              <SelectItem value="SPHH">SPHH</SelectItem>
                              <SelectItem value="RKSY-I">RKSY-I</SelectItem>
                              <SelectItem value="RKSY-II">RKSY-II</SelectItem>
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
                              <div key={idx} className="flex items-center justify-between bg-white rounded-md border border-slate-200 px-3 py-2" data-testid={`family-card-${idx}`}>
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
                          if (familyCards.length > 0) setStep(2);
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
                      <CardDescription>Type Ration Card Holder Name, Card Number &amp; Select Ration Card Category</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Card Holder Name *</label>
                        <Input data-testid="input-family-name" placeholder="CARD HOLDER NAME" value={subCard.customerName} onChange={(e) => setSubCard((s) => ({ ...s, customerName: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Ration Card Number *</label>
                          <Input data-testid="input-family-number" placeholder="00000 00000" value={subCard.rationCardNumber} onChange={(e) => setSubCard((s) => ({ ...s, rationCardNumber: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Card Category *</label>
                          <Select value={subCard.cardType} onValueChange={(v) => setSubCard((s) => ({ ...s, cardType: v }))}>
                            <SelectTrigger data-testid="select-family-card-type"><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent>
                              {CARD_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                      <Button type="button" data-testid="button-next-step2" className="bg-primary hover:bg-primary/90 px-8" onClick={async () => {
                        const ok = await form.trigger(["deliveryName", "address", "postOffice", "state", "district", "pincode", "customerPhone"]);
                        if (ok) setStep(3);
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
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Rate per card</span>
                        <span>₹{totalCards === 1 ? SINGLE_CARD_PRICE : MULTI_CARD_PRICE}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Total Cards</span>
                        <span>{totalCards}</span>
                      </div>
                      <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between font-semibold text-lg">
                        <span>Amount to Pay</span>
                        <span className="text-primary">₹{amount}</span>
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
                              I confirm that I have <strong>completed the UPI payment</strong> of <strong>₹{amount}</strong> and I am uploading the payment success screenshot below.
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
                          {isUploading || createOrder.isPending ? "Submitting…" : "Submit Order"}
                        </Button>
                      </div>
                    </div>
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
            <Button type="button" variant="outline" data-testid="button-family-no" className="min-w-24" onClick={() => { setShowFamilyDialog(false); setStep(2); }}>No</Button>
            <Button type="button" data-testid="button-family-yes" className="min-w-24 bg-primary hover:bg-primary/90" onClick={() => { setShowFamilyDialog(false); openAddCard(); }}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
