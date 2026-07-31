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
import { useRegisterOperator } from "@workspace/api-client-react";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Users, Clock, CheckCircle2, Phone, Mail, Store } from "lucide-react";

const WB_DISTRICTS = [
  "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur",
  "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram",
  "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia",
  "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur",
  "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas",
  "Uttar Dinajpur",
];

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  shopName: z.string().min(2, "Shop name is required"),
  address: z.string().min(10, "Enter complete address"),
  district: z.string().min(1, "Select your district"),
  pincode: z.string().length(6, "Pincode must be 6 digits"),
});

type FormData = z.infer<typeof schema>;

function SubmittedScreen({ name, email }: { name: string; email: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full text-center space-y-6" style={{ animation: "popIn 0.45s ease both" }}>
          <style>{`
            @keyframes popIn {
              0%   { opacity: 0; transform: scale(0.88) translateY(16px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes pulse-ring {
              0%   { transform: scale(1); opacity: 0.6; }
              70%  { transform: scale(1.35); opacity: 0; }
              100% { transform: scale(1.35); opacity: 0; }
            }
          `}</style>

          <div className="relative mx-auto w-24 h-24">
            <span className="absolute inset-0 rounded-full bg-amber-400/30" style={{ animation: "pulse-ring 2s ease-out infinite" }} />
            <span className="absolute inset-0 rounded-full bg-amber-400/20" style={{ animation: "pulse-ring 2s ease-out 0.4s infinite" }} />
            <div className="relative w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center border-4 border-amber-300">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Application Submitted!</h1>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Thank you, <strong>{name}</strong>. Your operator application is now <span className="font-semibold text-amber-600">under review</span>. Our admin will verify your details and approve your account.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-3">
            <h3 className="text-sm font-semibold text-amber-800">What happens next?</h3>
            <div className="space-y-2">
              {[
                { icon: CheckCircle2, text: "Admin reviews your shop details", done: true },
                { icon: CheckCircle2, text: "Your account is approved", done: false },
                { icon: CheckCircle2, text: "Login and start handling orders", done: false },
              ].map(({ icon: Icon, text, done }, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${done ? "text-amber-700" : "text-amber-500/70"}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${done ? "text-amber-600" : "text-amber-300"}`} />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your registered details</p>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {email}
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <p className="text-sm text-slate-500">Once approved, you can log in with your email and password.</p>
            <Link href="/operator/login">
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white">
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function OperatorRegister() {
  useSeo({
    title: "Become a PVC Card Operator in West Bengal",
    description:
      "Register your shop as a PVC card printing operator in West Bengal. Print durable PVC ration cards for customers in your area. Applications reviewed by our admin team.",
    canonical: "https://erationcards.in/operator/register",
  });
  const registerOperator = useRegisterOperator();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState<{ name: string; email: string } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", email: "", phone: "", password: "",
      shopName: "", address: "", district: "", pincode: "",
    },
  });

  function onSubmit(data: FormData) {
    registerOperator.mutate(
      { data: { ...data, state: "West Bengal" } },
      {
        onSuccess: (response) => {
          setSubmitted({ name: response.operator.name, email: response.operator.email });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || "Registration failed. Email may already be registered.";
          toast({ title: "Registration failed", description: msg, variant: "destructive" });
        },
      }
    );
  }

  if (submitted) return <SubmittedScreen name={submitted.name} email={submitted.email} />;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Register as Operator</h1>
          </div>
          <p className="text-slate-600">Become a PVC card printing partner and serve customers in West Bengal.</p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <Clock className="w-3 h-3" /> Applications are reviewed by admin before activation
          </div>
        </div>
      </div>

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Operator Registration Form</CardTitle>
              <CardDescription>Fill in your details. Your application will be reviewed and approved by our admin team.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl><Input data-testid="input-operator-name" placeholder="Your full name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number *</FormLabel>
                          <FormControl><Input data-testid="input-operator-phone" placeholder="10-digit mobile" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl><Input data-testid="input-operator-email" type="email" placeholder="your@email.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl><Input data-testid="input-operator-password" type="password" placeholder="Minimum 8 characters" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-slate-400" /> Shop / Business Details
                    </h3>
                    <div className="space-y-5">
                      <FormField control={form.control} name="shopName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop / Business Name *</FormLabel>
                          <FormControl><Input data-testid="input-shop-name" placeholder="e.g. Ramesh Print Shop" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop Address *</FormLabel>
                          <FormControl><Input data-testid="input-operator-address" placeholder="Full shop address" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                          <label className="text-sm font-medium leading-none">State</label>
                          <Input value="West Bengal" disabled className="bg-slate-50 text-slate-500" />
                        </div>
                        <FormField control={form.control} name="district" render={({ field }) => (
                          <FormItem>
                            <FormLabel>District *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-operator-district">
                                  <SelectValue placeholder="Select district" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-52 overflow-y-auto">
                                {WB_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="pincode" render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIN Code *</FormLabel>
                            <FormControl><Input data-testid="input-operator-pincode" placeholder="6-digit PIN" maxLength={6} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-slate-500">
                      Already registered?{" "}
                      <Link href="/operator/login" className="text-primary font-medium hover:underline">Login here</Link>
                    </p>
                    <Button type="submit" data-testid="button-register-operator" className="bg-primary hover:bg-primary/90 px-8" disabled={registerOperator.isPending}>
                      {registerOperator.isPending ? "Submitting..." : "Submit Application"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
