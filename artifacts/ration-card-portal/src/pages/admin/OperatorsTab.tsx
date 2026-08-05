import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useListOperators,
  getListOperatorsQueryKey,
  useUpdateOperatorStatus,
  useUpdateOperator,
  useDeleteOperator,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { staffFetch } from "@/lib/staffSession";
import {
  Users, UserCheck, UserX, Store, Pencil, Trash2, Download, MapPin, Phone, Mail,
} from "lucide-react";

/**
 * Operators Tab — full operator management for the admin dashboard.
 *
 * Lists every operator (all statuses), lets the admin approve/suspend,
 * edit every profile field (server rejects duplicate emails), permanently
 * terminate an account behind a "this is permanent" confirmation, and
 * download the whole roster as an Excel-friendly CSV (UTF-8 BOM, so
 * Bengali names open correctly).
 */

type OperatorRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  shopName: string;
  address: string;
  state: string;
  district: string;
  pincode: string;
  status: string;
  walletBalance: number;
  totalOrdersHandled: number;
  createdAt: string;
};

type StatusFilter = "all" | "pending" | "active" | "suspended";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  pending: "Needs approval",
  active: "Active",
  suspended: "Suspended",
};

/** Client-side mirror of the server's validation, for instant feedback. */
function fieldError(field: string, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case "name":
      return v.length >= 2 && v.length <= 100 ? null : "Name must be 2-100 characters";
    case "email":
      return /^\S+@\S+\.\S+$/.test(v) && v.length <= 255 ? null : "Enter a valid email address";
    case "phone":
      return /^[6-9]\d{9}$/.test(v) ? null : "Enter the 10-digit mobile number (starts with 6-9)";
    case "shopName":
      return v.length >= 2 && v.length <= 150 ? null : "Shop name must be 2-150 characters";
    case "address":
      return v.length >= 5 && v.length <= 500 ? null : "Address must be 5-500 characters";
    case "state":
      return v.length >= 2 && v.length <= 100 ? null : "State must be 2-100 characters";
    case "district":
      return v.length >= 2 && v.length <= 100 ? null : "District must be 2-100 characters";
    case "pincode":
      return /^[1-9]\d{5}$/.test(v) ? null : "PIN code must be 6 digits and cannot start with 0";
    case "walletBalance": {
      if (!/^\d+(\.\d{1,2})?$/.test(v)) return "Enter the wallet amount in rupees, like 250 or 250.50";
      const n = parseFloat(v);
      return n >= 0 && n <= 9999999.99 ? null : "Wallet balance must be between ₹0 and ₹99,99,999.99";
    }
    default:
      return null;
  }
}

const EDIT_FIELDS = [
  "name", "email", "phone", "shopName", "address", "state", "district", "pincode", "walletBalance",
] as const;

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">Active</Badge>;
  }
  if (status === "pending") {
    return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">Pending</Badge>;
  }
  return <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">Suspended</Badge>;
}

function rupees(n: number): string {
  return `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface OperatorsTabProps {
  authHeaders: Record<string, string>;
}

export default function OperatorsTab({ authHeaders }: OperatorsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editTarget, setEditTarget] = useState<OperatorRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [terminateTarget, setTerminateTarget] = useState<OperatorRow | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useListOperators({
    query: { queryKey: getListOperatorsQueryKey(), refetchInterval: 15000 },
    request: { headers: authHeaders },
  } as any);
  const operators = ((data as OperatorRow[] | undefined) ?? []);

  const updateStatus = useUpdateOperatorStatus({ request: { headers: authHeaders } } as any);
  const updateOperator = useUpdateOperator({ request: { headers: authHeaders } } as any);
  const deleteOperator = useDeleteOperator({ request: { headers: authHeaders } } as any);

  const counts: Record<StatusFilter, number> = {
    all: operators.length,
    pending: operators.filter((o) => o.status === "pending").length,
    active: operators.filter((o) => o.status === "active").length,
    suspended: operators.filter((o) => o.status === "suspended").length,
  };
  const visible = statusFilter === "all" ? operators : operators.filter((o) => o.status === statusFilter);

  function refreshList() {
    queryClient.invalidateQueries({ queryKey: getListOperatorsQueryKey() });
  }

  function handleStatus(op: OperatorRow, status: "active" | "suspended") {
    updateStatus.mutate(
      { id: op.id, data: { status } } as any,
      {
        onSuccess: () => {
          toast({
            title:
              status === "active"
                ? (op.status === "pending" ? "Operator approved! They can now log in." : "Operator re-activated. They can log in again.")
                : (op.status === "pending" ? "Application rejected." : "Operator suspended. They can no longer log in."),
          });
          refreshList();
        },
        onError: () => toast({ title: "Failed to update operator status", variant: "destructive" }),
      },
    );
  }

  function openEdit(op: OperatorRow) {
    setForm({
      name: op.name ?? "",
      email: op.email ?? "",
      phone: op.phone ?? "",
      shopName: op.shopName ?? "",
      address: op.address ?? "",
      state: op.state ?? "",
      district: op.district ?? "",
      pincode: op.pincode ?? "",
      status: op.status ?? "pending",
      walletBalance: String(op.walletBalance ?? 0),
    });
    setFormErrors({});
    setEditTarget(op);
  }

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setFormErrors((e) => {
      if (!e[field]) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  function handleSave() {
    if (!editTarget) return;
    const errors: Record<string, string> = {};
    for (const field of EDIT_FIELDS) {
      const err = fieldError(field, form[field] ?? "");
      if (err) errors[field] = err;
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    updateOperator.mutate(
      {
        id: editTarget.id,
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          shopName: form.shopName.trim(),
          address: form.address.trim(),
          state: form.state.trim(),
          district: form.district.trim(),
          pincode: form.pincode.trim(),
          status: form.status as "pending" | "active" | "suspended",
          walletBalance: Number(parseFloat(form.walletBalance).toFixed(2)),
        },
      } as any,
      {
        onSuccess: () => {
          toast({ title: "Operator details saved." });
          refreshList();
          setEditTarget(null);
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          toast({
            title: "Could not save",
            description: e?.data?.error ?? "Please check the details and try again.",
            variant: "destructive",
          });
        },
      },
    );
  }

  function handleTerminate() {
    if (!terminateTarget) return;
    const name = terminateTarget.name;
    deleteOperator.mutate(
      { id: terminateTarget.id } as any,
      {
        onSuccess: (resp: any) => {
          const kept = Number(resp?.ordersKept ?? 0);
          toast({
            title: `${name}'s account is deleted.`,
            description:
              kept > 0
                ? `They can no longer log in. ${kept} past ${kept === 1 ? "order stays" : "orders stay"} in your records.`
                : "They can no longer log in. They had no orders on record.",
          });
          refreshList();
          setTerminateTarget(null);
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          toast({
            title: "Could not delete the account",
            description: e?.data?.error ?? "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const r = await staffFetch("/api/admin/operators/export", { headers: authHeaders });
      if (!r.ok) throw new Error("Export failed");
      const blob = await r.blob();
      const cd = r.headers.get("content-disposition") ?? "";
      const m = cd.match(/filename="?([^";]+)"?/i);
      const filename = m?.[1] ?? `operators_${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast({ title: "Download started", description: "The file opens in Excel — Bengali names show correctly." });
    } catch {
      toast({ title: "Could not download the list", description: "Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }

  const FIELD_LABELS: Record<string, string> = {
    name: "Full name",
    email: "Email (login)",
    phone: "Phone",
    shopName: "Shop name",
    address: "Address",
    state: "State",
    district: "District",
    pincode: "PIN code",
    walletBalance: "Wallet balance (₹)",
  };

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Operators
            <span className="text-slate-400 font-normal text-sm">
              ({isLoading ? "…" : operators.length} total)
            </span>
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">Auto-refreshes every 15s</span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9"
              onClick={handleDownload}
              disabled={downloading || isLoading || operators.length === 0}
              data-testid="button-download-operators"
            >
              <Download className="w-4 h-4" /> {downloading ? "Preparing…" : "Download all (CSV)"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              data-testid={`filter-operators-${f}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === f
                  ? "bg-primary text-white border-primary"
                  : f === "pending" && counts.pending > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {FILTER_LABELS[f]} ({counts[f]})
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-14 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-slate-400 text-sm">Loading operators…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">
              {operators.length === 0 ? "No operators yet" : `No ${FILTER_LABELS[statusFilter].toLowerCase()} operators right now`}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {operators.length === 0
                ? "When shops register as printing partners, they appear here."
                : "Try another filter above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Operator</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Wallet</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((op) => (
                  <TableRow key={op.id} data-testid={`row-operator-${op.id}`}>
                    <TableCell className="pl-5 align-top">
                      <p className="font-semibold text-slate-900 whitespace-nowrap">{op.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                        <Store className="w-3 h-3 shrink-0" /> {op.shopName}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="text-xs text-slate-600 flex items-center gap-1 whitespace-nowrap">
                        <Mail className="w-3 h-3 shrink-0 text-slate-400" /> {op.email}
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-1 whitespace-nowrap mt-0.5">
                        <Phone className="w-3 h-3 shrink-0 text-slate-400" /> {op.phone}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="text-xs text-slate-600 flex items-center gap-1 whitespace-nowrap">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" /> {op.district} · PIN {op.pincode}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-[180px] truncate" title={`${op.address}, ${op.state}`}>
                        {op.address}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge status={op.status} />
                    </TableCell>
                    <TableCell className="align-top text-right font-medium text-slate-700 whitespace-nowrap">
                      {rupees(op.walletBalance)}
                    </TableCell>
                    <TableCell className="align-top text-right text-slate-700">{op.totalOrdersHandled}</TableCell>
                    <TableCell className="align-top text-xs text-slate-500 whitespace-nowrap">
                      {new Date(op.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell className="align-top pr-5">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {op.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 h-8 px-2.5"
                              data-testid={`button-approve-operator-${op.id}`}
                              onClick={() => handleStatus(op, "active")}
                              disabled={updateStatus.isPending}
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50 gap-1 h-8 px-2.5"
                              data-testid={`button-reject-operator-${op.id}`}
                              onClick={() => handleStatus(op, "suspended")}
                              disabled={updateStatus.isPending}
                            >
                              <UserX className="w-3.5 h-3.5" /> Reject
                            </Button>
                          </>
                        )}
                        {op.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50 gap-1 h-8 px-2.5"
                            data-testid={`button-suspend-operator-${op.id}`}
                            onClick={() => handleStatus(op, "suspended")}
                            disabled={updateStatus.isPending}
                          >
                            <UserX className="w-3.5 h-3.5" /> Suspend
                          </Button>
                        )}
                        {op.status === "suspended" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1 h-8 px-2.5"
                            data-testid={`button-activate-operator-${op.id}`}
                            onClick={() => handleStatus(op, "active")}
                            disabled={updateStatus.isPending}
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Re-activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 gap-1"
                          data-testid={`button-edit-operator-${op.id}`}
                          onClick={() => openEdit(op)}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Permanently delete this operator account"
                          data-testid={`button-terminate-operator-${op.id}`}
                          onClick={() => setTerminateTarget(op)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit operator</DialogTitle>
            <DialogDescription>
              Changes apply immediately. The email is what they use to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["name", "email", "phone", "shopName"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`operator-${field}`}>{FIELD_LABELS[field]}</Label>
                <Input
                  id={`operator-${field}`}
                  value={form[field] ?? ""}
                  onChange={(e) => setField(field, e.target.value)}
                  data-testid={`input-operator-${field}`}
                />
                {formErrors[field] && (
                  <p className="text-xs text-red-600" data-testid={`error-operator-${field}`}>{formErrors[field]}</p>
                )}
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="operator-address">{FIELD_LABELS.address}</Label>
              <Textarea
                id="operator-address"
                rows={2}
                value={form.address ?? ""}
                onChange={(e) => setField("address", e.target.value)}
                data-testid="input-operator-address"
              />
              {formErrors.address && (
                <p className="text-xs text-red-600" data-testid="error-operator-address">{formErrors.address}</p>
              )}
            </div>
            {(["state", "district", "pincode"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`operator-${field}`}>{FIELD_LABELS[field]}</Label>
                <Input
                  id={`operator-${field}`}
                  value={form[field] ?? ""}
                  onChange={(e) => setField(field, e.target.value)}
                  data-testid={`input-operator-${field}`}
                />
                {formErrors[field] && (
                  <p className="text-xs text-red-600" data-testid={`error-operator-${field}`}>{formErrors[field]}</p>
                )}
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="operator-walletBalance">{FIELD_LABELS.walletBalance}</Label>
              <Input
                id="operator-walletBalance"
                inputMode="decimal"
                value={form.walletBalance ?? ""}
                onChange={(e) => setField("walletBalance", e.target.value)}
                data-testid="input-operator-walletBalance"
              />
              {formErrors.walletBalance && (
                <p className="text-xs text-red-600" data-testid="error-operator-walletBalance">{formErrors.walletBalance}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status ?? "pending"} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger data-testid="select-operator-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending (cannot log in yet)</SelectItem>
                  <SelectItem value="active">Active (can log in)</SelectItem>
                  <SelectItem value="suspended">Suspended (blocked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditTarget(null)} data-testid="button-cancel-edit-operator">
              Cancel
            </Button>
            <Button
              className="bg-primary text-white"
              onClick={handleSave}
              disabled={updateOperator.isPending}
              data-testid="button-save-operator"
            >
              {updateOperator.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Terminate confirmation ── */}
      <AlertDialog open={!!terminateTarget} onOpenChange={(open) => { if (!open) setTerminateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {terminateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This is permanent and cannot be undone. {terminateTarget?.name} will be locked out
              immediately — even if they are logged in right now — and can never log in again.
              Their past orders and records stay safely in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-terminate">Keep the account</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleTerminate}
              disabled={deleteOperator.isPending}
              data-testid="button-confirm-terminate"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
