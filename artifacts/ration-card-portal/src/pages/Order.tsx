import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useCreateOrder } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, MapPin, MessageCircle, Play, Plus, Pencil, Trash2, ShieldCheck, User } from "lucide-react";
import { useLocation } from "wouter";

const CARD_CATEGORIES = ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II"] as const;

type FamilyCardEntry = { customerName: string; rationCardNumber: string; cardType: string };

const SIDEBAR_FAQS = [
  { q: "What is e Ration Card?", a: "An e-Ration Card is the digital version of your ration card issued by the government's PDS system. It contains the same details as your physical card and can be downloaded online." },
  { q: "What does PVC Ration Card Portal do?", a: "We help you order a durable, wallet-size PVC printed version of your e-Ration card. We print your official card details onto a premium PVC card and deliver it to your doorstep." },
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
  paymentMethod: z.string().min(1, "Select payment method"),
});

type OrderForm = z.infer<typeof orderSchema>;

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh",
];

const CARD_PRICES: Record<string, number> = { AAY: 50, PHH: 50, SPHH: 50, "RKSY-I": 50, "RKSY-II": 50 };

export default function Order() {
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);
  const [familyCards, setFamilyCards] = useState<FamilyCardEntry[]>([]);
  const [showFamilyDialog, setShowFamilyDialog] = useState(false);
  const [addCardView, setAddCardView] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [subCard, setSubCard] = useState<FamilyCardEntry>({ customerName: "", rationCardNumber: "", cardType: "AAY" });
  const [subError, setSubError] = useState("");
  const createOrder = useCreateOrder();
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
      state: "",
      district: "",
      pincode: "",
      cardType: "AAY",
      quantity: 1,
      paymentMethod: "",
    },
  });

  const cardType = form.watch("cardType");
  const totalCards = 1 + familyCards.length;
  const amount = (CARD_PRICES[cardType] || 50) * totalCards;

  async function onSubmit(data: OrderForm) {
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
          paymentStatus: "paid",
          paymentMethod: data.paymentMethod,
        },
      },
      {
        onSuccess: (order) => {
          setSuccess({ orderNumber: order.orderNumber });
        },
        onError: () => {
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
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Placed!</h2>
                <p className="text-slate-600">Your PVC card order has been received successfully.</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Your Order Number</p>
                <p className="text-xl font-mono font-bold text-primary" data-testid="text-order-number">{success.orderNumber}</p>
              </div>
              <p className="text-sm text-slate-500">Save this number to track your order. Expected delivery: 5–7 working days.</p>
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
                    <p className="text-white/80 text-sm mt-2 max-w-xs">Order for <span className="font-bold">₹50/-</span> (inclusive of GST &amp; Normal Post charges)</p>
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
                          <FormLabel>State *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger data-testid="select-state"><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                            <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="district" render={({ field }) => (
                        <FormItem>
                          <FormLabel>District *</FormLabel>
                          <FormControl><Input data-testid="input-district" placeholder="Your district" {...field} /></FormControl>
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
                    <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Card & Payment</CardTitle>
                    <CardDescription>Review card category and complete payment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField control={form.control} name="cardType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger data-testid="select-card-type"><SelectValue /></SelectTrigger></FormControl>
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
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Total Cards</label>
                        <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700" data-testid="text-total-cards">{totalCards}</div>
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Rate per card</span>
                        <span>₹{CARD_PRICES[cardType] || 50}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Total Cards</span>
                        <span>{totalCards}</span>
                      </div>
                      <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between font-semibold text-lg">
                        <span>Total Amount</span>
                        <span className="text-primary">₹{amount}</span>
                      </div>
                    </div>

                    <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger data-testid="select-payment-method"><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                            <SelectItem value="netbanking">Net Banking</SelectItem>
                            <SelectItem value="card">Debit / Credit Card</SelectItem>
                            <SelectItem value="cash">Cash on Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                      <Button type="submit" data-testid="button-submit-order" className="bg-primary hover:bg-primary/90 px-8" disabled={createOrder.isPending}>
                        {createOrder.isPending ? "Processing..." : `Pay ₹${amount} & Order`}
                      </Button>
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
