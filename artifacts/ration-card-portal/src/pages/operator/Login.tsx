import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoginOperator } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { LogIn } from "lucide-react";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function OperatorLogin() {
  const loginOperator = useLoginOperator();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: FormData) {
    loginOperator.mutate(
      { data },
      {
        onSuccess: (response) => {
          localStorage.setItem("operatorToken", response.token);
          toast({ title: `Welcome back, ${response.operator.name}!` });
          setLocation("/operator/dashboard");
        },
        onError: () => {
          toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4 bg-slate-50">
        <Card className="w-full max-w-md border-slate-200 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Operator Login</CardTitle>
            <CardDescription>Access your PVC card printing dashboard</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input data-testid="input-operator-email" type="email" placeholder="your@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input data-testid="input-operator-password" type="password" placeholder="Your password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" data-testid="button-operator-login" className="w-full bg-primary hover:bg-primary/90 h-11 mt-2" disabled={loginOperator.isPending}>
                  {loginOperator.isPending ? "Logging in..." : "Login to Dashboard"}
                </Button>
              </form>
            </Form>
            <div className="mt-5 text-center">
              <p className="text-sm text-slate-500">
                Not yet a partner?{" "}
                <Link href="/operator/register" className="text-primary font-medium hover:underline">Register as Operator</Link>
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">Test credentials: <span className="font-mono">ramesh@printshop.com / Test@1234</span></p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
