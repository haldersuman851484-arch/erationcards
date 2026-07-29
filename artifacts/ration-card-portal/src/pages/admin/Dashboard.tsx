import { staffFetch } from "@/lib/staffSession";
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGetCurrentAdmin,
  getGetCurrentAdminQueryKey,
  useGetOrderStats,
  getGetOrderStatsQueryKey,
  useListOperators,
  getListOperatorsQueryKey,
  useUpdateOperatorStatus,
  useLogoutAdmin,
  useListPaymentVerifications,
  getListPaymentVerificationsQueryKey,
  useUpdateReviewStatus,
  useDeleteReview,
  useGetUpiSetting,
  getGetUpiSettingQueryKey,
  useUpdateUpiSetting,
  getGetUpiConfigQueryKey,
  useGetPricingSetting,
  getGetPricingSettingQueryKey,
  useUpdatePricingSetting,
  getGetPricingConfigQueryKey,
  useGetContactSetting,
  getGetContactSettingQueryKey,
  useUpdateContactSetting,
  getGetContactConfigQueryKey,
  useUpdateProcessingPassword,
  useListSettingsChangeHistory,
  getListSettingsChangeHistoryQueryKey,
  useGetSettingsOtpConfig,
  getGetSettingsOtpConfigQueryKey,
  useSendSettingsOtp,
  useVerifySettingsOtp,
} from "@workspace/api-client-react";
import { PRICE_MIN, PRICE_MAX, type PricingMatrix } from "@workspace/pricing";
import { CONTACT_FIELDS, CONTACT_FIELD_LABELS, contactFieldError, type ContactField, type ContactInfo } from "@workspace/contact";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Clock, Truck, CheckCircle, CheckCircle2, XCircle,
  ImageIcon, LogOut, IndianRupee, Users, Shield, MapPin,
  Phone, CreditCard, Calendar, ShieldCheck, ClipboardList,
  UserCheck, UserX, Store, AlertCircle, Send,
  Star, MessageSquare, RotateCcw, Trash2, Settings, IndianRupee as RupeeIcon,
  Lock, Mail,
} from "lucide-react";

function getAuthHeader() {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Settings stay unlocked for ~15 min after both partners' codes are verified.
// sessionStorage so a page refresh keeps the unlock but closing the tab drops it.
const UNLOCK_STORAGE_KEY = "settingsUnlock";

function readStoredUnlock(): { token: string; expiresAt: number } | null {
  try {
    const raw = sessionStorage.getItem(UNLOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: unknown; expiresAt?: unknown };
    if (typeof parsed?.token !== "string" || typeof parsed?.expiresAt !== "number") return null;
    if (parsed.expiresAt <= Date.now()) return null;
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

/**
 * Human-readable one-liner for a history entry. UPI changes show old → new
 * directly; pricing changes are JSON matrices, so show only the cells that
 * actually differ (e.g. "Ration · 1 card · Customer: ₹100 → ₹120").
 */
function describeHistoryChange(entry: { field: "upi" | "pricing" | "processing_password" | "contact"; oldValue: string; newValue: string }): string {
  if (entry.field === "upi") return `${entry.oldValue || "— not set —"} → ${entry.newValue}`;
  if (entry.field === "processing_password") return "Employee password changed (hidden for security)";
  if (entry.field === "contact") {
    try {
      const before = JSON.parse(entry.oldValue) as Partial<ContactInfo>;
      const after = JSON.parse(entry.newValue) as Partial<ContactInfo>;
      const parts: string[] = [];
      for (const f of CONTACT_FIELDS) {
        if ((before?.[f] ?? "") !== (after?.[f] ?? "")) {
          parts.push(`${CONTACT_FIELD_LABELS[f]}: ${before?.[f] || "—"} → ${after?.[f] || "—"}`);
        }
      }
      return parts.length > 0 ? parts.join(", ") : "Contact details re-saved (no values changed)";
    } catch {
      return "Contact details updated";
    }
  }
  try {
    const before = JSON.parse(entry.oldValue);
    const after = JSON.parse(entry.newValue);
    const parts: string[] = [];
    for (const group of ["ration", "special"] as const) {
      for (const tier of ["single", "multi"] as const) {
        for (const audience of ["public", "operator"] as const) {
          const b = before?.[group]?.[tier]?.[audience];
          const a = after?.[group]?.[tier]?.[audience];
          if (b !== a) {
            const groupLabel = group === "ration" ? "Ration" : "ABHA/E-SHRAM/General";
            const tierLabel = tier === "single" ? "1 card" : "2+ cards";
            const audLabel = audience === "public" ? "Customer" : "Operator";
            parts.push(`${groupLabel} · ${tierLabel} · ${audLabel}: ₹${b ?? "?"} → ₹${a}`);
          }
        }
      }
    }
    return parts.length > 0 ? parts.join(", ") : "Prices re-saved (no values changed)";
  } catch {
    return "Prices updated";
  }
}

// Mirrors UPI_ID_REGEX on the server: handle@psp, e.g. mystore@okaxis
const UPI_INPUT_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,49}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

function AnimatedRow({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <TableRow
      className="hover:bg-slate-50/60 transition-colors"
      style={{
        animation: `fadeSlideIn 0.35s ease both`,
        animationDelay: `${index * 45}ms`,
      }}
    >
      {children}
    </TableRow>
  );
}

/**
 * Admin Dashboard — partners only.
 *
 * Day-to-day order processing (public/operator order tabs and the courier
 * mPanels) lives in the Processing Panel at /processing, where employees log
 * in with the processing password. This dashboard keeps the admin-only areas:
 * operator applications, the payment verification log, reviews, and settings.
 */
export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("applications");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const { data: admin, isLoading: adminLoading, error: adminError } = useGetCurrentAdmin({
    query: { queryKey: getGetCurrentAdminQueryKey() },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: stats } = useGetOrderStats({
    query: { queryKey: getGetOrderStatsQueryKey(), enabled: !!admin },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: operators } = useListOperators({
    query: { queryKey: getListOperatorsQueryKey(), enabled: !!admin },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery<any[]>({
    queryKey: ["operators", "pending"],
    enabled: !!admin && activeTab === "applications",
    refetchInterval: activeTab === "applications" ? 15000 : false,
    queryFn: async () => {
      const r = await staffFetch("/api/operators?status=pending", { headers: getAuthHeader() as Record<string, string> });
      if (!r.ok) throw new Error("Failed to fetch applications");
      return r.json();
    },
  });

  const updateOperatorStatus = useUpdateOperatorStatus({
    request: { headers: getAuthHeader() },
  } as any);

  const { data: verificationsData, isLoading: verificationsLoading } = useListPaymentVerifications(
    {},
    {
      query: {
        queryKey: getListPaymentVerificationsQueryKey({}),
        enabled: !!admin && activeTab === "verifications",
        refetchInterval: activeTab === "verifications" ? 15000 : false,
      },
      request: { headers: getAuthHeader() },
    } as any
  );

  const { data: reviewsData, isLoading: reviewsLoading, refetch: refetchReviews } = useQuery<any[]>({
    queryKey: ["admin", "reviews"],
    enabled: !!admin && activeTab === "reviews",
    refetchInterval: activeTab === "reviews" ? 15000 : false,
    queryFn: async () => {
      const r = await staffFetch("/api/admin/reviews", { headers: getAuthHeader() as Record<string, string> });
      if (!r.ok) throw new Error("Failed to fetch reviews");
      return r.json();
    },
  });

  const updateReviewStatus = useUpdateReviewStatus({
    request: { headers: getAuthHeader() },
  } as any);

  const deleteReview = useDeleteReview({
    request: { headers: getAuthHeader() },
  } as any);

  const logoutAdmin = useLogoutAdmin();

  useEffect(() => {
    if (adminError) setLocation("/admin/login");
  }, [adminError, setLocation]);

  // Processing staff belong in the Processing Panel — this page is admin-only.
  useEffect(() => {
    if (admin && admin.role !== "admin") setLocation("/processing");
  }, [admin, setLocation]);

  // ── Settings unlock gate (two-partner email OTP) ──
  const [settingsUnlock, setSettingsUnlock] = useState<{ token: string; expiresAt: number } | null>(readStoredUnlock);
  const settingsUnlocked = !!settingsUnlock;

  const relockSettings = useCallback((notify: boolean) => {
    setSettingsUnlock(null);
    try { sessionStorage.removeItem(UNLOCK_STORAGE_KEY); } catch { /* ignore */ }
    if (notify) {
      toast({ title: "Settings locked again", description: "The unlock time ended. Send new codes to reopen." });
    }
  }, [toast]);

  // Auto-relock exactly when the unlock token expires.
  useEffect(() => {
    if (!settingsUnlock) return;
    const ms = settingsUnlock.expiresAt - Date.now();
    if (ms <= 0) { relockSettings(false); return; }
    const t = setTimeout(() => relockSettings(true), ms);
    return () => clearTimeout(t);
  }, [settingsUnlock, relockSettings]);

  const [otpSent, setOtpSent] = useState(false);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpError, setOtpError] = useState<string | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setTimeout(() => setCooldownLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearTimeout(t);
  }, [cooldownLeft]);

  const otpConfigQuery = useGetSettingsOtpConfig({
    query: {
      queryKey: getGetSettingsOtpConfigQueryKey(),
      enabled: activeTab === "settings" && !settingsUnlocked,
    },
    request: { headers: getAuthHeader() },
  } as any);
  const partnerEmails: string[] = otpConfigQuery.data?.partnerEmails ?? [];
  // Codes may already be in the partners' inboxes from an earlier attempt.
  const showCodeInputs = otpSent || !!otpConfigQuery.data?.otpPending;

  useEffect(() => {
    const c = otpConfigQuery.data?.cooldownRemainingSeconds ?? 0;
    if (c > 0) setCooldownLeft(c);
  }, [otpConfigQuery.data]);

  const sendOtpMutation = useSendSettingsOtp({
    request: { headers: getAuthHeader() },
  } as any);
  const verifyOtpMutation = useVerifySettingsOtp({
    request: { headers: getAuthHeader() },
  } as any);

  function handleSendCodes() {
    setOtpError(null);
    sendOtpMutation.mutate(undefined as any, {
      onSuccess: (data: any) => {
        setOtpSent(true);
        setOtpInputs({});
        setCooldownLeft(data?.cooldownSeconds ?? 60);
        toast({ title: "Codes sent!", description: "Each partner got a 6-digit code by email. Codes work for 10 minutes." });
      },
      onError: (err: unknown) => {
        const e = err as { data?: { error?: string; secondsRemaining?: number } };
        if (typeof e?.data?.secondsRemaining === "number") setCooldownLeft(e.data.secondsRemaining);
        setOtpError(e?.data?.error || "Could not send the codes. Try again.");
      },
    });
  }

  function handleVerifyCodes() {
    const entries = partnerEmails.map((email) => ({ email, code: (otpInputs[email] ?? "").trim() }));
    if (entries.length === 0 || entries.some((e) => !/^\d{6}$/.test(e.code))) {
      setOtpError("Enter the 6-digit code from each email.");
      return;
    }
    setOtpError(null);
    verifyOtpMutation.mutate({ data: { codes: entries } } as any, {
      onSuccess: (data: any) => {
        const unlock = {
          token: data.unlockToken as string,
          expiresAt: Date.now() + ((data?.expiresInSeconds ?? 900) as number) * 1000,
        };
        try { sessionStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(unlock)); } catch { /* ignore */ }
        setSettingsUnlock(unlock);
        setOtpSent(false);
        setOtpInputs({});
        queryClient.invalidateQueries({ queryKey: getGetUpiSettingQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPricingSettingQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetContactSettingQueryKey() });
        toast({ title: "Settings unlocked!", description: "Both codes matched. Settings stay open for 15 minutes." });
      },
      onError: (err: unknown) => {
        const e = err as { data?: { error?: string } };
        setOtpError(e?.data?.error || "Could not verify the codes. Try again.");
      },
    });
  }

  /** 403 SETTINGS_LOCKED from the server → drop the stale unlock and show the gate again. */
  function handleSettingsAuthError(err: unknown): boolean {
    const e = err as { data?: { code?: string } };
    if (e?.data?.code === "SETTINGS_LOCKED") {
      relockSettings(true);
      return true;
    }
    return false;
  }

  const settingsHeaders = {
    ...getAuthHeader(),
    ...(settingsUnlock ? { "x-settings-unlock": settingsUnlock.token } : {}),
  };

  // ── Payment settings (merchant UPI ID) ──
  const upiSettingQuery = useGetUpiSetting({
    query: { queryKey: getGetUpiSettingQueryKey(), enabled: settingsUnlocked },
    request: { headers: settingsHeaders },
  } as any);
  const updateUpiMutation = useUpdateUpiSetting({
    request: { headers: settingsHeaders },
  } as any);
  const [upiInput, setUpiInput] = useState("");
  const [upiInputInvalid, setUpiInputInvalid] = useState(false);

  useEffect(() => {
    if (upiSettingQuery.data) setUpiInput(upiSettingQuery.data.merchantUpiId);
  }, [upiSettingQuery.data]);

  function handleSaveUpi() {
    const candidate = upiInput.trim();
    if (!UPI_INPUT_REGEX.test(candidate)) {
      setUpiInputInvalid(true);
      return;
    }
    setUpiInputInvalid(false);
    updateUpiMutation.mutate(
      { data: { merchantUpiId: candidate } },
      {
        onSuccess: () => {
          toast({ title: "UPI ID updated!", description: "Customers now see the new UPI ID and QR code." });
          queryClient.invalidateQueries({ queryKey: getGetUpiSettingQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUpiConfigQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListSettingsChangeHistoryQueryKey() });
        },
        onError: (err: unknown) => {
          if (handleSettingsAuthError(err)) return;
          const serverMsg = (err as { data?: { error?: string } })?.data?.error;
          toast({
            title: "Could not save UPI ID",
            description: serverMsg || "Check the format (yourname@bank) and try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  // ── Support contact details (phone, email, address, city, hours) ──
  const contactSettingQuery = useGetContactSetting({
    query: { queryKey: getGetContactSettingQueryKey(), enabled: settingsUnlocked },
    request: { headers: settingsHeaders },
  } as any);
  const updateContactMutation = useUpdateContactSetting({
    request: { headers: settingsHeaders },
  } as any);
  const [contactInputs, setContactInputs] = useState<Record<ContactField, string>>({
    phone: "", email: "", address: "", city: "", hours: "",
  });
  const [contactErrors, setContactErrors] = useState<Partial<Record<ContactField, string>>>({});

  useEffect(() => {
    const c = contactSettingQuery.data?.contact as ContactInfo | undefined;
    if (!c) return;
    setContactInputs({ phone: c.phone, email: c.email, address: c.address, city: c.city, hours: c.hours });
    setContactErrors({});
  }, [contactSettingQuery.data]);

  function handleSaveContact() {
    const trimmed = Object.fromEntries(
      CONTACT_FIELDS.map((f) => [f, (contactInputs[f] ?? "").trim()]),
    ) as Record<ContactField, string>;
    const errors: Partial<Record<ContactField, string>> = {};
    for (const f of CONTACT_FIELDS) {
      const msg = contactFieldError(f, trimmed[f]);
      if (msg) errors[f] = msg;
    }
    setContactErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Check the highlighted details",
        description: "Fix the fields marked in red, then save again.",
        variant: "destructive",
      });
      return;
    }
    updateContactMutation.mutate(
      { data: { contact: trimmed } },
      {
        onSuccess: () => {
          toast({
            title: "Contact details updated!",
            description: "The footer, Contact page, FAQ, policy pages, WhatsApp button and invoices now show the new details.",
          });
          queryClient.invalidateQueries({ queryKey: getGetContactSettingQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetContactConfigQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListSettingsChangeHistoryQueryKey() });
        },
        onError: (err: unknown) => {
          if (handleSettingsAuthError(err)) return;
          const serverMsg = (err as { data?: { error?: string } })?.data?.error;
          toast({
            title: "Could not save contact details",
            description: serverMsg || "Please check the values and try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  // ── Pricing settings (card price matrix) ──
  const pricingSettingQuery = useGetPricingSetting({
    query: { queryKey: getGetPricingSettingQueryKey(), enabled: settingsUnlocked },
    request: { headers: settingsHeaders },
  } as any);
  const updatePricingMutation = useUpdatePricingSetting({
    request: { headers: settingsHeaders },
  } as any);

  // ── Employee (processing) password ──
  const updateProcessingPasswordMutation = useUpdateProcessingPassword({
    request: { headers: settingsHeaders },
  } as any);
  const [empPassword, setEmpPassword] = useState("");
  const [empPasswordConfirm, setEmpPasswordConfirm] = useState("");
  const [empPasswordError, setEmpPasswordError] = useState<string | null>(null);

  function handleSaveEmployeePassword() {
    const candidate = empPassword;
    if (candidate.trim() !== candidate || candidate.length < 8 || candidate.length > 100) {
      setEmpPasswordError("The password must be 8-100 characters with no spaces at the start or end.");
      return;
    }
    if (candidate !== empPasswordConfirm) {
      setEmpPasswordError("The two passwords don't match. Type the same password in both boxes.");
      return;
    }
    setEmpPasswordError(null);
    updateProcessingPasswordMutation.mutate(
      { data: { newPassword: candidate } },
      {
        onSuccess: () => {
          setEmpPassword("");
          setEmpPasswordConfirm("");
          toast({ title: "Employee password changed!", description: "The employee must use the new password from their very next login — no restart needed." });
          queryClient.invalidateQueries({ queryKey: getListSettingsChangeHistoryQueryKey() });
        },
        onError: (err: unknown) => {
          if (handleSettingsAuthError(err)) return;
          const serverMsg = (err as { data?: { error?: string } })?.data?.error;
          setEmpPasswordError(serverMsg || "Could not save the new password. Try again.");
        },
      }
    );
  }

  // ── Recent changes (read-only audit trail, visible only while unlocked) ──
  const historyQuery = useListSettingsChangeHistory({
    query: { queryKey: getListSettingsChangeHistoryQueryKey(), enabled: settingsUnlocked },
    request: { headers: settingsHeaders },
  } as any);

  // A stale/invalid unlock token makes the settings GET queries themselves come
  // back 403 SETTINGS_LOCKED — treat that exactly like a mutation relock so the
  // gate reappears instead of a dead "unlocked" screen with load errors.
  useEffect(() => {
    const errors: unknown[] = [upiSettingQuery.error, pricingSettingQuery.error, contactSettingQuery.error];
    if (errors.some((e) => (e as { data?: { code?: string } } | null)?.data?.code === "SETTINGS_LOCKED")) {
      relockSettings(true);
    }
  }, [upiSettingQuery.error, pricingSettingQuery.error, contactSettingQuery.error, relockSettings]);
  // Flat string inputs keyed "group.tier.audience" so partial typing never crashes
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [priceErrors, setPriceErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const p = pricingSettingQuery.data?.pricing as PricingMatrix | undefined;
    if (!p) return;
    const next: Record<string, string> = {};
    for (const group of ["ration", "special"] as const)
      for (const tier of ["single", "multi"] as const)
        for (const audience of ["public", "operator"] as const)
          next[`${group}.${tier}.${audience}`] = String(p[group][tier][audience]);
    setPriceInputs(next);
    setPriceErrors({});
  }, [pricingSettingQuery.data]);

  function handleSavePrices() {
    const errors: Record<string, boolean> = {};
    const matrix: any = { ration: {}, special: {} };
    for (const group of ["ration", "special"] as const) {
      for (const tier of ["single", "multi"] as const) {
        const cell: any = {};
        for (const audience of ["public", "operator"] as const) {
          const key = `${group}.${tier}.${audience}`;
          const n = Number((priceInputs[key] ?? "").trim());
          if (!Number.isInteger(n) || n < PRICE_MIN || n > PRICE_MAX) errors[key] = true;
          cell[audience] = n;
        }
        matrix[group][tier] = cell;
      }
    }
    setPriceErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({
        title: "Check the highlighted prices",
        description: `Each price must be a whole rupee amount between ₹${PRICE_MIN} and ₹${PRICE_MAX}.`,
        variant: "destructive",
      });
      return;
    }
    updatePricingMutation.mutate(
      { data: { pricing: matrix } },
      {
        onSuccess: () => {
          toast({ title: "Prices updated!", description: "Order forms, new orders and Google search snippet prices all follow the new prices immediately." });
          queryClient.invalidateQueries({ queryKey: getGetPricingSettingQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPricingConfigQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListSettingsChangeHistoryQueryKey() });
        },
        onError: (err: unknown) => {
          if (handleSettingsAuthError(err)) return;
          const serverMsg = (err as { data?: { error?: string } })?.data?.error;
          toast({
            title: "Could not save prices",
            description: serverMsg || "Please check the values and try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  function handleOperatorStatus(operatorId: number, status: "active" | "suspended") {
    updateOperatorStatus.mutate(
      { id: operatorId, data: { status } },
      {
        onSuccess: () => {
          toast({ title: status === "active" ? "Operator approved! They can now log in." : "Operator rejected." });
          queryClient.invalidateQueries({ queryKey: ["operators", "pending"] });
          queryClient.invalidateQueries({ queryKey: getListOperatorsQueryKey() });
        },
        onError: () => toast({ title: "Failed to update operator status", variant: "destructive" }),
      }
    );
  }

  function handleReviewAction(reviewId: number, status: "approved" | "rejected", successTitle?: string) {
    updateReviewStatus.mutate(
      { id: reviewId, data: { status } },
      {
        onSuccess: () => {
          toast({ title: successTitle ?? (status === "approved" ? "Review approved and published!" : "Review rejected.") });
          refetchReviews();
        },
        onError: () => toast({ title: "Failed to update review", variant: "destructive" }),
      }
    );
  }

  function handleDeleteReview() {
    if (!deleteTarget) return;
    deleteReview.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({ title: "Review deleted permanently." });
          setDeleteTarget(null);
          refetchReviews();
        },
        onError: () => {
          toast({ title: "Failed to delete review", variant: "destructive" });
          setDeleteTarget(null);
        },
      }
    );
  }

  function handleLogout() {
    logoutAdmin.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      },
    });
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const verifications = verificationsData?.verifications ?? [];
  const pendingDeliveries = (stats?.pendingOrders ?? 0) + (stats?.processingOrders ?? 0) + (stats?.printedOrders ?? 0) + (stats?.dispatchedOrders ?? 0);

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.92) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .stat-card { animation: popIn 0.4s ease both; }
        .tab-panel { animation: fadeSlideIn 0.3s ease both; }
      `}</style>

      <div className="min-h-screen bg-slate-100">
        <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-semibold">Admin Dashboard</span>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs ml-1">Manager</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-300 text-sm hidden lg:block">{admin?.email}</span>
              <Button variant="outline" size="sm" className="border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors" data-testid="button-admin-logout" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: Package, color: "text-slate-700", delay: 0 },
              { label: "Pending Payment", value: stats?.pendingOrders ?? 0, icon: Clock, color: "text-amber-600", delay: 1 },
              { label: "Pending Delivery", value: pendingDeliveries, icon: Truck, color: "text-blue-600", delay: 2 },
              { label: "Delivered", value: stats?.deliveredOrders ?? 0, icon: CheckCircle, color: "text-emerald-600", delay: 3 },
              ...((stats?.returnedOrders ?? 0) > 0
                ? [{ label: "Returned (RTO)", value: stats!.returnedOrders, icon: RotateCcw, color: "text-rose-600", delay: 4 }]
                : []),
            ].map(({ label, value, icon: Icon, color, delay }) => (
              <Card key={label} className="stat-card border-0 shadow-sm bg-white overflow-hidden" style={{ animationDelay: `${delay * 80}ms` }}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="stat-card border-0 shadow-sm bg-white" style={{ animationDelay: "320ms" }}>
              <CardContent className="pt-5 pb-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</p>
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-3xl font-bold text-emerald-600">₹{stats?.totalRevenue?.toLocaleString("en-IN") ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">Today: ₹{stats?.todayRevenue ?? 0} · {stats?.todayOrders ?? 0} orders</p>
              </CardContent>
            </Card>
            <Card className="stat-card border-0 shadow-sm bg-white" style={{ animationDelay: "400ms" }}>
              <CardContent className="pt-5 pb-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Operators</p>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-3xl font-bold text-primary">{operators?.length ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">Registered printing partners</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-slate-200 shadow-sm h-11 p-1 flex-wrap">
              <TabsTrigger value="applications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                <UserCheck className="w-4 h-4" /> Applications
                {applicationsData && (applicationsData as any[]).length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">{(applicationsData as any[]).length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="verifications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                <ShieldCheck className="w-4 h-4" /> Verification Log
                {verificationsData && <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">{verificationsData.total}</span>}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                <Star className="w-4 h-4" /> Reviews
                {reviewsData && (reviewsData as any[]).filter((r: any) => r.status === "pending").length > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                    {(reviewsData as any[]).filter((r: any) => r.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all" data-testid="tab-settings">
                <Settings className="w-4 h-4" /> Settings
              </TabsTrigger>
            </TabsList>

            {/* ── Applications Tab ── */}
            <TabsContent value="applications" className="tab-panel mt-4">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-primary" />
                      Operator Applications
                      <span className="text-slate-400 font-normal text-sm">
                        ({applicationsLoading ? "…" : (applicationsData as any[] | undefined)?.length ?? 0} pending)
                      </span>
                    </CardTitle>
                    <span className="text-xs text-slate-400">Auto-refreshes every 15s</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {applicationsLoading ? (
                    <div className="py-14 flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <p className="text-slate-400 text-sm">Loading applications…</p>
                    </div>
                  ) : !applicationsData || (applicationsData as any[]).length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                        <UserCheck className="w-8 h-8 text-emerald-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No pending applications</p>
                      <p className="text-slate-400 text-sm mt-1">All operator applications have been reviewed.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {(applicationsData as any[]).map((op, i) => (
                        <div
                          key={op.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5"
                          style={{ animation: "fadeSlideIn 0.35s ease both", animationDelay: `${i * 60}ms` }}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                              <Store className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-slate-900">{op.name}</p>
                                <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs gap-1">
                                  <AlertCircle className="w-3 h-3" /> Pending Review
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-slate-600">{op.shopName}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {op.district}, {op.state}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {op.phone}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" /> PIN {op.pincode}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Applied {new Date(op.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">{op.email}</p>
                              {op.address && <p className="text-xs text-slate-400 italic">{op.address}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0 sm:flex-col sm:items-end ml-14 sm:ml-0">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 px-4 shadow-sm"
                              data-testid={`button-approve-operator-${op.id}`}
                              onClick={() => handleOperatorStatus(op.id, "active")}
                              disabled={updateOperatorStatus.isPending}
                            >
                              <UserCheck className="w-4 h-4" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5 h-9 px-4"
                              data-testid={`button-reject-operator-${op.id}`}
                              onClick={() => handleOperatorStatus(op.id, "suspended")}
                              disabled={updateOperatorStatus.isPending}
                            >
                              <UserX className="w-4 h-4" /> Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Reviews Tab ── */}
            <TabsContent value="reviews" className="tab-panel mt-4">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Customer Reviews
                      {reviewsData && (
                        <span className="text-slate-400 font-normal text-sm ml-1">({(reviewsData as any[]).length} total)</span>
                      )}
                    </CardTitle>
                    <span className="text-xs text-slate-400">Auto-refreshes every 15s</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {reviewsLoading ? (
                    <div className="py-14 flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <p className="text-slate-400 text-sm">Loading reviews…</p>
                    </div>
                  ) : !reviewsData || (reviewsData as any[]).length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-amber-200" />
                      </div>
                      <p className="text-slate-500 font-medium">No reviews yet</p>
                      <p className="text-slate-400 text-sm mt-1">Customer reviews appear here after they submit them from the tracking page.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {(reviewsData as any[]).map((review: any, i: number) => (
                        <div
                          key={review.id}
                          className="p-5 flex flex-col sm:flex-row gap-4"
                          style={{ animation: "fadeSlideIn 0.35s ease both", animationDelay: `${i * 60}ms` }}
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">{review.customerName}</span>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {review.district}
                              </span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{review.cardType}</span>
                              {review.status === "pending" && (
                                <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">Pending</Badge>
                              )}
                              {review.status === "approved" && (
                                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Approved
                                </Badge>
                              )}
                              {review.status === "rejected" && (
                                <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs gap-1">
                                  <XCircle className="w-3 h-3" /> Rejected
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, si) => (
                                <Star
                                  key={si}
                                  className={`w-3.5 h-3.5 ${si < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`}
                                />
                              ))}
                              <span className="text-xs text-slate-500 ml-1">{review.rating}/5</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">"{review.quote}"</p>
                            {review.photoUrl && (
                              <a href={review.photoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <ImageIcon className="w-3.5 h-3.5" /> View photo
                              </a>
                            )}
                            <p className="text-xs text-slate-400">
                              Order: <span className="font-mono text-primary">{review.orderNumber}</span>
                              {" · "}
                              {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                          {review.status === "pending" && (
                            <div className="flex sm:flex-col gap-2 shrink-0">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 px-3"
                                data-testid={`button-approve-review-${review.id}`}
                                onClick={() => handleReviewAction(review.id, "approved", "Review confirmed — now live on the homepage!")}
                                disabled={updateReviewStatus.isPending || deleteReview.isPending}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5 h-8 px-3"
                                data-testid={`button-delete-review-${review.id}`}
                                onClick={() => setDeleteTarget({ id: review.id, name: review.customerName })}
                                disabled={updateReviewStatus.isPending || deleteReview.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </Button>
                            </div>
                          )}
                          {review.status === "approved" && (
                            <div className="flex sm:flex-col gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5 h-8 px-3"
                                data-testid={`button-remove-review-${review.id}`}
                                onClick={() => handleReviewAction(review.id, "rejected", "Review removed from the homepage.")}
                                disabled={updateReviewStatus.isPending}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Remove from homepage
                              </Button>
                            </div>
                          )}
                          {review.status === "rejected" && (
                            <div className="flex sm:flex-col gap-2 shrink-0">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 px-3"
                                data-testid={`button-approve-review-${review.id}`}
                                onClick={() => handleReviewAction(review.id, "approved")}
                                disabled={updateReviewStatus.isPending || deleteReview.isPending}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5 h-8 px-3"
                                data-testid={`button-delete-review-${review.id}`}
                                onClick={() => setDeleteTarget({ id: review.id, name: review.customerName })}
                                disabled={updateReviewStatus.isPending || deleteReview.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Verification Log Tab ── */}
            <TabsContent value="verifications" className="tab-panel mt-4">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" />
                      Payment Verification Log
                      {verificationsData && (
                        <span className="text-slate-400 font-normal text-sm ml-1">({verificationsData.total} records)</span>
                      )}
                    </CardTitle>
                    <span className="text-xs text-slate-400">Auto-refreshes every 15s</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {verificationsLoading ? (
                    <div className="py-14 flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                      <p className="text-slate-400 text-sm">Loading verification records…</p>
                    </div>
                  ) : verifications.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No verifications yet</p>
                      <p className="text-slate-400 text-sm mt-1">Records appear here when you confirm or reject a payment.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Order Number</TableHead>
                            <TableHead>Decision</TableHead>
                            <TableHead>Verified By</TableHead>
                            <TableHead>Screenshot</TableHead>
                            <TableHead>Date & Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verifications.map((v, i) => (
                            <AnimatedRow key={v.id} index={i}>
                              <TableCell className="text-xs text-slate-400 font-mono">{v.id}</TableCell>
                              <TableCell>
                                <span className="font-mono text-sm font-semibold text-primary">{v.orderNumber}</span>
                              </TableCell>
                              <TableCell>
                                {v.action === "confirmed" ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Confirmed
                                    </Badge>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1">
                                      <XCircle className="w-3 h-3" /> Rejected
                                    </Badge>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Shield className="w-3 h-3 text-primary" />
                                  </div>
                                  <span className="text-xs text-slate-600">{v.adminEmail}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {v.screenshotUrl ? (
                                  <a href={v.screenshotUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1.5">
                                    <img
                                      src={v.screenshotUrl}
                                      alt="Payment screenshot"
                                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm group-hover:scale-105 transition-transform"
                                    />
                                    <span className="text-xs text-primary group-hover:underline hidden sm:block">View</span>
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-slate-700">
                                    {new Date(v.verifiedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(v.verifiedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              </TableCell>
                            </AnimatedRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Settings Tab ── */}
            <TabsContent value="settings" className="tab-panel mt-4 space-y-6">
              {!settingsUnlocked ? (
              <Card className="border-slate-200 shadow-sm max-w-2xl" data-testid="card-settings-locked">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="w-5 h-5 text-primary" /> Settings are locked
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    The payment UPI ID and card prices are protected. One-time codes are emailed to
                    both partners — settings open only after both codes are entered.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {otpConfigQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                  ) : otpConfigQuery.isError ? (
                    <p className="text-sm text-red-600" data-testid="text-otp-config-error">
                      Could not load the unlock status. Refresh the page to try again.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {partnerEmails.map((email, i) => (
                          <div key={email} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-mono text-sm text-slate-900" data-testid={`text-partner-email-${i}`}>{email}</span>
                          </div>
                        ))}
                      </div>

                      {!showCodeInputs ? (
                        <Button
                          onClick={handleSendCodes}
                          disabled={sendOtpMutation.isPending || cooldownLeft > 0}
                          data-testid="button-send-codes"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {sendOtpMutation.isPending
                            ? "Sending codes…"
                            : cooldownLeft > 0
                              ? `Wait ${cooldownLeft}s to send again`
                              : "Email codes to both partners"}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          {partnerEmails.map((email, i) => (
                            <div key={email}>
                              <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">
                                Code emailed to {email}
                              </p>
                              <Input
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="6-digit code"
                                className="font-mono max-w-[200px] tracking-widest"
                                value={otpInputs[email] ?? ""}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                                  setOtpInputs((p) => ({ ...p, [email]: digits }));
                                  setOtpError(null);
                                }}
                                data-testid={`input-otp-${i}`}
                              />
                            </div>
                          ))}
                          <div className="flex items-center gap-3 flex-wrap">
                            <Button
                              onClick={handleVerifyCodes}
                              disabled={verifyOtpMutation.isPending}
                              data-testid="button-verify-codes"
                            >
                              <ShieldCheck className="w-4 h-4 mr-2" />
                              {verifyOtpMutation.isPending ? "Checking…" : "Verify & open settings"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleSendCodes}
                              disabled={sendOtpMutation.isPending || cooldownLeft > 0}
                              data-testid="button-resend-codes"
                            >
                              {sendOtpMutation.isPending
                                ? "Sending…"
                                : cooldownLeft > 0
                                  ? `Resend in ${cooldownLeft}s`
                                  : "Resend codes"}
                            </Button>
                          </div>
                          <p className="text-xs text-slate-400">
                            Codes work for 10 minutes. After 5 wrong tries you must send new codes.
                          </p>
                        </div>
                      )}

                      {otpError && (
                        <p className="text-sm text-red-600" data-testid="text-otp-error">{otpError}</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              ) : (
              <>
              <div>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
                  data-testid="badge-settings-unlocked"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Unlocked by both partners — locks again automatically after 15 minutes
                </Badge>
              </div>
              <Card className="border-slate-200 shadow-sm max-w-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RupeeIcon className="w-5 h-5 text-primary" /> Payment UPI ID
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Customers pay to this UPI ID on the order page — the QR code and the copy button both use it.
                    A change applies to the very next order, no restart needed.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {upiSettingQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Loading current UPI ID…</p>
                  ) : upiSettingQuery.isError ? (
                    <p className="text-sm text-red-600" data-testid="text-upi-load-error">
                      Could not load the current UPI ID. Refresh the page to try again.
                    </p>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Currently in use</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm text-slate-900" data-testid="text-current-upi-id">
                            {upiSettingQuery.data?.merchantUpiId || "— not set —"}
                          </div>
                          <Badge
                            variant="outline"
                            className={upiSettingQuery.data?.source === "custom"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"}
                            data-testid="badge-upi-source"
                          >
                            {upiSettingQuery.data?.source === "custom" ? "Saved by you" : "Default (server setting)"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Change UPI ID</p>
                        <div className="flex items-center gap-2">
                          <Input
                            value={upiInput}
                            onChange={(e) => { setUpiInput(e.target.value); setUpiInputInvalid(false); }}
                            placeholder="yourname@bank"
                            className="font-mono max-w-sm"
                            data-testid="input-upi-id"
                          />
                          <Button
                            onClick={handleSaveUpi}
                            disabled={
                              updateUpiMutation.isPending ||
                              !upiInput.trim() ||
                              upiInput.trim() === upiSettingQuery.data?.merchantUpiId
                            }
                            data-testid="button-save-upi"
                          >
                            {updateUpiMutation.isPending ? "Saving…" : "Save"}
                          </Button>
                        </div>
                        {upiInputInvalid && (
                          <p className="text-xs text-red-600 mt-1.5" data-testid="text-upi-format-error">
                            Enter a valid UPI ID like yourname@bank
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1.5">
                          Example: 9876543210@ybl or mystore@okaxis. Double-check before saving — customers will pay to this ID.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ── Support contact details ── */}
              <Card className="border-slate-200 shadow-sm max-w-2xl" data-testid="card-contact-details">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="w-5 h-5 text-primary" /> Support Contact Details
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    The phone number, email, office address and working hours shown across the whole
                    website — footer, Contact page, FAQ, policy pages, the WhatsApp help button on
                    Track Order, and downloaded invoices. The phone number also powers the WhatsApp
                    chat link. Changes apply immediately — no restart needed.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactSettingQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Loading current details…</p>
                  ) : contactSettingQuery.isError ? (
                    <p className="text-sm text-red-600" data-testid="text-contact-load-error">
                      Could not load the current contact details. Refresh the page to try again.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={contactSettingQuery.data?.source === "custom"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"}
                          data-testid="badge-contact-source"
                        >
                          {contactSettingQuery.data?.source === "custom" ? "Saved by you" : "Default launch details"}
                        </Badge>
                      </div>
                      {CONTACT_FIELDS.map((f) => (
                        <div key={f}>
                          <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">
                            {CONTACT_FIELD_LABELS[f]}
                          </p>
                          <Input
                            value={contactInputs[f] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setContactInputs((prev) => ({ ...prev, [f]: v }));
                              setContactErrors((prev) => ({ ...prev, [f]: undefined }));
                            }}
                            className={contactErrors[f] ? "border-red-500 focus-visible:ring-red-500" : ""}
                            data-testid={`input-contact-${f}`}
                          />
                          {contactErrors[f] && (
                            <p className="text-xs text-red-600 mt-1.5" data-testid={`text-contact-error-${f}`}>
                              {contactErrors[f]}
                            </p>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleSaveContact}
                          disabled={updateContactMutation.isPending}
                          data-testid="button-save-contact"
                        >
                          {updateContactMutation.isPending ? "Saving…" : "Save Contact Details"}
                        </Button>
                        <p className="text-xs text-slate-400">
                          Shown to every customer — double-check for typos before saving.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ── Card Prices ── */}
              <Card className="border-slate-200 shadow-sm max-w-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RupeeIcon className="w-5 h-5 text-primary" /> Card Prices
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Per-card prices in ₹. "1 card" applies when the order has a single card; "2+ cards"
                    is the per-card rate when the order has two or more. Changes apply immediately to
                    the order forms and to new orders — no restart needed. The prices shown in
                    Google search snippets (page description &amp; FAQ) update automatically too;
                    Google refreshes them the next time it re-crawls the site.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {pricingSettingQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Loading current prices…</p>
                  ) : pricingSettingQuery.isError ? (
                    <p className="text-sm text-red-600" data-testid="text-pricing-load-error">
                      Could not load the current prices. Refresh the page to try again.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={pricingSettingQuery.data?.source === "custom"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"}
                          data-testid="badge-pricing-source"
                        >
                          {pricingSettingQuery.data?.source === "custom" ? "Saved by you" : "Default launch prices"}
                        </Badge>
                      </div>
                      {([
                        { group: "ration" as const, title: "Ration Card (AAY · PHH · SPHH · RKSY-I · RKSY-II)" },
                        { group: "special" as const, title: "ABHA / E-SHRAM / GENERAL" },
                      ]).map(({ group, title }) => (
                        <div key={group} className="border border-slate-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-slate-800 mb-3">{title}</p>
                          <div className="grid grid-cols-2 gap-4">
                            {(["public", "operator"] as const).map((audience) => (
                              <div key={audience}>
                                <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">
                                  {audience === "public" ? "Customer price" : "Operator price"}
                                </p>
                                <div className="space-y-2">
                                  {(["single", "multi"] as const).map((tier) => {
                                    const key = `${group}.${tier}.${audience}`;
                                    return (
                                      <div key={tier} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 w-16">{tier === "single" ? "1 card" : "2+ cards"}</span>
                                        <div className="relative">
                                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                          <Input
                                            type="number"
                                            min={PRICE_MIN}
                                            max={PRICE_MAX}
                                            value={priceInputs[key] ?? ""}
                                            onChange={(e) => {
                                              setPriceInputs((prev) => ({ ...prev, [key]: e.target.value }));
                                              setPriceErrors((prev) => ({ ...prev, [key]: false }));
                                            }}
                                            className={`pl-6 w-28 ${priceErrors[key] ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                            data-testid={`input-price-${group}-${tier}-${audience}`}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {Object.values(priceErrors).some(Boolean) && (
                        <p className="text-xs text-red-600" data-testid="text-pricing-format-error">
                          Each price must be a whole rupee amount between ₹{PRICE_MIN} and ₹{PRICE_MAX}.
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleSavePrices}
                          disabled={updatePricingMutation.isPending}
                          data-testid="button-save-prices"
                        >
                          {updatePricingMutation.isPending ? "Saving…" : "Save Prices"}
                        </Button>
                        <p className="text-xs text-slate-400">
                          Double-check before saving — customers are charged these amounts.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* ── Employee password ── */}
              <Card className="border-slate-200 shadow-sm max-w-2xl" data-testid="card-employee-password">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="w-5 h-5 text-primary" /> Employee Password
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    The password your employee uses to open the Processing Panel. Change it here any
                    time — for example when someone leaves. The new password works from the very next
                    login, no restart needed. The employee's email stays the same.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">New password</p>
                    <Input
                      type="password"
                      value={empPassword}
                      onChange={(e) => { setEmpPassword(e.target.value); setEmpPasswordError(null); }}
                      placeholder="At least 8 characters"
                      className="max-w-sm"
                      data-testid="input-employee-password"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Type it again</p>
                    <Input
                      type="password"
                      value={empPasswordConfirm}
                      onChange={(e) => { setEmpPasswordConfirm(e.target.value); setEmpPasswordError(null); }}
                      placeholder="Same password again"
                      className="max-w-sm"
                      data-testid="input-employee-password-confirm"
                    />
                  </div>
                  {empPasswordError && (
                    <p className="text-xs text-red-600" data-testid="text-employee-password-error">{empPasswordError}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={handleSaveEmployeePassword}
                      disabled={updateProcessingPasswordMutation.isPending || !empPassword || !empPasswordConfirm}
                      data-testid="button-save-employee-password"
                    >
                      {updateProcessingPasswordMutation.isPending ? "Saving…" : "Change Password"}
                    </Button>
                    <p className="text-xs text-slate-400">
                      Tell the employee the new password yourself — it is never emailed or shown anywhere.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* ── Recent changes (read-only audit trail) ── */}
              <Card className="border-slate-200 shadow-sm max-w-2xl" data-testid="card-settings-history">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="w-5 h-5 text-primary" /> Recent changes
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Every saved UPI ID or price change is recorded here automatically — what changed,
                    from and to what, and who saved it. This list cannot be edited or deleted.
                  </p>
                </CardHeader>
                <CardContent>
                  {historyQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Loading change history…</p>
                  ) : historyQuery.isError ? (
                    <p className="text-sm text-red-600" data-testid="text-history-load-error">
                      Could not load the change history. Refresh the page to try again.
                    </p>
                  ) : (historyQuery.data?.changes?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500" data-testid="text-history-empty">
                      No changes recorded yet. The first UPI ID or price save will appear here.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {historyQuery.data!.changes.map((entry, i) => (
                        <li
                          key={entry.id}
                          className="border border-slate-200 rounded-lg px-3 py-2.5"
                          data-testid={`row-history-${i}`}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge
                              variant="outline"
                              className={entry.field === "upi"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : entry.field === "processing_password"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : entry.field === "contact"
                                    ? "bg-teal-50 text-teal-700 border-teal-200"
                                    : "bg-purple-50 text-purple-700 border-purple-200"}
                            >
                              {entry.field === "upi"
                                ? "UPI ID"
                                : entry.field === "processing_password"
                                  ? "Employee password"
                                  : entry.field === "contact"
                                    ? "Contact details"
                                    : "Card prices"}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {new Date(entry.changedAt).toLocaleString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                                hour: "numeric", minute: "2-digit",
                              })}
                            </span>
                            <span className="text-xs text-slate-400">by {entry.changedBy}</span>
                          </div>
                          <p className="text-sm font-mono text-slate-800 break-all">
                            {describeHistoryChange(entry)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              </>
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* Delete Review Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this review permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget ? `The review from ${deleteTarget.name} will be erased for good. It will never appear on the homepage or in this list again. This cannot be undone.` : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-review">Cancel</AlertDialogCancel>
              <AlertDialogAction
                data-testid="button-confirm-delete-review"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteReview}
                disabled={deleteReview.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
