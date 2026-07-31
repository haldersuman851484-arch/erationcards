import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoginAdmin } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Shield, Home, Clock } from "lucide-react";
import { SESSION_EXPIRED_PARAM } from "@/lib/staffSession";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function AdminLogin() {
  const loginAdmin = useLoginAdmin();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const sessionExpired =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get(SESSION_EXPIRED_PARAM) === "1";

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: FormData) {
    loginAdmin.mutate(
      { data },
      {
        onSuccess: (response) => {
          localStorage.setItem("adminToken", response.token || "");
          if (response.role === "processing") {
            toast({ title: "Welcome!", description: "Opening the processing panel." });
            setLocation("/processing");
          } else {
            toast({ title: "Welcome, Admin!" });
            setLocation("/admin/dashboard");
          }
        },
        onError: () => {
          toast({ title: "Login failed", description: "Invalid credentials.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative">
      <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 hover:opacity-80 transition-opacity">
        <img src={import.meta.env.BASE_URL + "favicon.svg"} alt="PVC Card Portal logo" width="32" height="32" className="w-8 h-8" />
        <span className="font-bold text-lg text-white tracking-tight">PVC Card Portal</span>
      </Link>
      <Card className="w-full max-w-sm border-slate-700 bg-slate-800 text-white shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-white text-xl">Staff Login</CardTitle>
          <CardDescription className="text-slate-400">Secure access for authorized personnel only</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {sessionExpired && (
            <div
              data-testid="notice-session-expired"
              className="mb-4 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300"
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Your session has expired — please log in again.</span>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-admin-email"
                      type="email"
                      placeholder="Your email address"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Password</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-admin-password"
                      type="password"
                      placeholder="Admin password"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" data-testid="button-admin-login" className="w-full bg-primary hover:bg-primary/90 h-11 mt-2" disabled={loginAdmin.isPending}>
                {loginAdmin.isPending ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
