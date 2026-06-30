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
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Users } from "lucide-react";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh",
];

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  shopName: z.string().min(2, "Shop name is required"),
  address: z.string().min(10, "Enter complete address"),
  state: z.string().min(1, "Select your state"),
  district: z.string().min(2, "Enter your district"),
  pincode: z.string().length(6, "Pincode must be 6 digits"),
});

type FormData = z.infer<typeof schema>;

export default function OperatorRegister() {
  const registerOperator = useRegisterOperator();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", email: "", phone: "", password: "",
      shopName: "", address: "", state: "", district: "", pincode: "",
    },
  });

  function onSubmit(data: FormData) {
    registerOperator.mutate(
      { data },
      {
        onSuccess: (response) => {
          localStorage.setItem("operatorToken", response.token);
          toast({ title: "Registration successful!", description: `Welcome, ${response.operator.name}!` });
          setLocation("/operator/dashboard");
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || "Registration failed. Email may already be registered.";
          toast({ title: "Registration failed", description: msg, variant: "destructive" });
        },
      }
    );
  }

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
          <p className="text-slate-600">Become a PVC card printing partner and serve customers in your area.</p>
        </div>
      </div>

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Operator Registration Form</CardTitle>
              <CardDescription>Fill in your details to register as a printing operator partner.</CardDescription>
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
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Shop / Business Details</h3>
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
                        <FormField control={form.control} name="state" render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger data-testid="select-operator-state"><SelectValue placeholder="State" /></SelectTrigger></FormControl>
                              <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="district" render={({ field }) => (
                          <FormItem>
                            <FormLabel>District *</FormLabel>
                            <FormControl><Input data-testid="input-operator-district" placeholder="District" {...field} /></FormControl>
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
                      Already have an account?{" "}
                      <Link href="/operator/login" className="text-primary font-medium hover:underline">Login here</Link>
                    </p>
                    <Button type="submit" data-testid="button-register-operator" className="bg-primary hover:bg-primary/90 px-8" disabled={registerOperator.isPending}>
                      {registerOperator.isPending ? "Registering..." : "Register as Operator"}
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
