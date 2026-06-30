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
import { useCreateOrder } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, CreditCard, MapPin, User } from "lucide-react";
import { useLocation } from "wouter";

const orderSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().min(10, "Enter a valid 10-digit phone number"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  rationCardNumber: z.string().min(5, "Enter a valid ration card number"),
  address: z.string().min(10, "Enter complete address"),
  state: z.string().min(1, "Select your state"),
  district: z.string().min(2, "Enter your district"),
  pincode: z.string().length(6, "Pincode must be 6 digits"),
  cardType: z.enum(["APL", "BPL", "AAY"]),
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

const CARD_PRICES: Record<string, number> = { APL: 50, BPL: 50, AAY: 50 };

export default function Order() {
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);
  const createOrder = useCreateOrder();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      rationCardNumber: "",
      address: "",
      state: "",
      district: "",
      pincode: "",
      cardType: "APL",
      quantity: 1,
      paymentMethod: "",
    },
  });

  const cardType = form.watch("cardType");
  const quantity = form.watch("quantity") || 1;
  const amount = (CARD_PRICES[cardType] || 50) * quantity;

  async function onSubmit(data: OrderForm) {
    createOrder.mutate(
      {
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail || undefined,
          rationCardNumber: data.rationCardNumber,
          address: data.address,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          cardType: data.cardType,
          quantity: data.quantity,
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
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => { setSuccess(null); form.reset(); setStep(1); }}>New Order</Button>
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
        <div className="container mx-auto px-4 max-w-3xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {step === 1 && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Details</CardTitle>
                    <CardDescription>Enter the card holder's information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField control={form.control} name="customerName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl><Input data-testid="input-customer-name" placeholder="As on ration card" {...field} /></FormControl>
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
                        <FormLabel>Email Address (optional)</FormLabel>
                        <FormControl><Input data-testid="input-email" type="email" placeholder="For order updates" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="rationCardNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ration Card Number *</FormLabel>
                        <FormControl><Input data-testid="input-ration-card-number" placeholder="e.g. RC-MH-2024-001234" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="pt-2">
                      <Button type="button" data-testid="button-next-step1" className="bg-primary hover:bg-primary/90 px-8" onClick={async () => {
                        const ok = await form.trigger(["customerName", "customerPhone", "rationCardNumber"]);
                        if (ok) setStep(2);
                      }}>Continue</Button>
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
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Address *</FormLabel>
                        <FormControl><Input data-testid="input-address" placeholder="House No, Street, Area" {...field} /></FormControl>
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
                    <FormField control={form.control} name="pincode" render={({ field }) => (
                      <FormItem className="max-w-xs">
                        <FormLabel>PIN Code *</FormLabel>
                        <FormControl><Input data-testid="input-pincode" placeholder="6-digit PIN code" maxLength={6} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                      <Button type="button" data-testid="button-next-step2" className="bg-primary hover:bg-primary/90 px-8" onClick={async () => {
                        const ok = await form.trigger(["address", "state", "district", "pincode"]);
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
                    <CardDescription>Select card type and complete payment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField control={form.control} name="cardType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger data-testid="select-card-type"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="APL">APL — Above Poverty Line</SelectItem>
                              <SelectItem value="BPL">BPL — Below Poverty Line</SelectItem>
                              <SelectItem value="AAY">AAY — Antyodaya Anna Yojana</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="quantity" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                            <FormControl><SelectTrigger data-testid="select-quantity"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Rate per card</span>
                        <span>₹{CARD_PRICES[cardType] || 50}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Quantity</span>
                        <span>{quantity}</span>
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
      </main>
      <Footer />
    </div>
  );
}
