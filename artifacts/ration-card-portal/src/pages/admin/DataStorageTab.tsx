import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGetOrdersArchivePreview,
  getGetOrdersArchivePreviewQueryKey,
  useDeleteArchivedOrders,
  getGetOrderStatsQueryKey,
  getListSettingsChangeHistoryQueryKey,
} from "@workspace/api-client-react";
import type { OrdersArchiveDeleteResponse, OrdersArchivePreview } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { staffFetch } from "@/lib/staffSession";
import {
  HardDrive, Download, Trash2, Lock, AlertTriangle, CheckCircle2, Search, Archive, FileText,
} from "lucide-react";

/** Plain-language names for order statuses shown in the range summary. */
const STATUS_LABELS: Record<string, string> = {
  pending: "New (payment not checked)",
  processing: "Being processed",
  printed: "Printed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
};

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

type ArchiveSource = "both" | "public" | "operator";

type Filter = { fromDate: string; toDate: string; source: ArchiveSource };

const keyOf = (f: Filter) => `${f.fromDate}|${f.toDate}|${f.source}`;

/** Receipt returned by the download; proves the ZIP was saved before deleting. */
type Receipt = { token: string; key: string; deletable: number; expiresAt: number };

const SOURCE_LABELS: Record<ArchiveSource, string> = {
  both: "All orders",
  public: "Customer orders only",
  operator: "Operator orders only",
};

interface DataStorageTabProps {
  authHeaders: Record<string, string>;
  settingsUnlocked: boolean;
  settingsHeaders: Record<string, string>;
  /** Jump to the Settings tab so the owner can do the two-partner unlock. */
  goToSettings: () => void;
  /** Returns true when the error was a SETTINGS_LOCKED relock (parent handles it). */
  onSettingsAuthError: (err: unknown) => boolean;
}

export default function DataStorageTab({
  authHeaders,
  settingsUnlocked,
  settingsHeaders,
  goToSettings,
  onSettingsAuthError,
}: DataStorageTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [source, setSource] = useState<ArchiveSource>("both");

  // The filter the preview/download/delete actually run against — frozen when
  // "Check this range" is clicked so edits to the inputs can't drift mid-flow.
  const [checkedFilter, setCheckedFilter] = useState<Filter | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteResult, setDeleteResult] = useState<OrdersArchiveDeleteResponse | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const currentKey = keyOf({ fromDate, toDate, source });
  const datesValid = !!fromDate && !!toDate && fromDate <= toDate;

  // Editing the dates after checking invalidates the shown preview (not the receipt —
  // the receipt is bound to its own filter and simply hides until the filter matches again).
  useEffect(() => {
    if (checkedFilter && keyOf(checkedFilter) !== currentKey) {
      setCheckedFilter(null);
      setDeleteResult(null);
    }
  }, [currentKey, checkedFilter]);

  // Tick every 30s so an expired receipt visibly disables the delete step.
  useEffect(() => {
    if (!receipt) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [receipt]);

  const previewQuery = useGetOrdersArchivePreview(
    (checkedFilter ?? { fromDate: "", toDate: "" }) as never,
    {
      query: {
        queryKey: getGetOrdersArchivePreviewQueryKey(checkedFilter as never),
        enabled: !!checkedFilter,
      },
      request: { headers: authHeaders },
    } as never,
  );
  const preview = checkedFilter ? (previewQuery.data as OrdersArchivePreview | undefined) : undefined;

  const deleteMutation = useDeleteArchivedOrders({
    request: { headers: settingsHeaders },
  } as never);

  const receiptMatchesFilter = !!receipt && !!checkedFilter && receipt.key === keyOf(checkedFilter);
  const receiptExpired = !!receipt && receipt.expiresAt <= now;

  function handleCheck() {
    if (!datesValid) {
      toast({
        title: "Pick both dates first",
        description: "Choose a start and end date, with the start date not after the end date.",
        variant: "destructive",
      });
      return;
    }
    setDeleteResult(null);
    setCheckedFilter({ fromDate, toDate, source });
  }

  async function handleDownload() {
    if (!checkedFilter) return;
    setDownloading(true);
    try {
      const qs = new URLSearchParams({
        fromDate: checkedFilter.fromDate,
        toDate: checkedFilter.toDate,
        source: checkedFilter.source,
      });
      const r = await staffFetch(`/api/admin/orders/archive/export?${qs.toString()}`, {
        headers: authHeaders,
      });
      if (!r.ok) {
        let msg = "Could not prepare the download. Try again.";
        try {
          const j = (await r.json()) as { error?: string };
          if (j?.error) msg = j.error;
        } catch { /* non-JSON error body */ }
        toast({ title: "Download failed", description: msg, variant: "destructive" });
        return;
      }
      const token = r.headers.get("x-archive-receipt");
      const deletable = Number(r.headers.get("x-archive-deletable") ?? "0");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-archive_${checkedFilter.fromDate}_${checkedFilter.toDate}_${checkedFilter.source}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      if (token) {
        setReceipt({
          token,
          key: keyOf(checkedFilter),
          deletable: Number.isFinite(deletable) ? deletable : 0,
          expiresAt: Date.now() + 30 * 60 * 1000,
        });
        setNow(Date.now());
      }
      setDeleteResult(null);
      toast({
        title: "Archive downloaded",
        description: "Save the ZIP file somewhere safe — it is your permanent copy of these orders.",
      });
    } catch {
      toast({
        title: "Download failed",
        description: "The connection dropped while preparing the file. Try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }

  function handleDelete() {
    if (!checkedFilter || !receipt) return;
    deleteMutation.mutate(
      {
        data: {
          fromDate: checkedFilter.fromDate,
          toDate: checkedFilter.toDate,
          source: checkedFilter.source,
          receipt: receipt.token,
          confirmText: confirmText.trim(),
        },
      } as never,
      {
        onSuccess: (data: OrdersArchiveDeleteResponse) => {
          setDeleteResult(data);
          setReceipt(null);
          setConfirmText("");
          setConfirmOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListSettingsChangeHistoryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrdersArchivePreviewQueryKey(checkedFilter as never) });
          toast({
            title: "Old orders deleted",
            description: `${data.deletedOrders} orders removed, about ${formatBytes(data.freedBytes)} of file space freed.`,
          });
        },
        onError: (err: unknown) => {
          setConfirmOpen(false);
          if (onSettingsAuthError(err)) return;
          const e = err as { data?: { error?: string; code?: string } };
          const code = e?.data?.code;
          if (code === "RECEIPT_EXPIRED" || code === "RECEIPT_STALE" || code === "RECEIPT_INVALID" || code === "RECEIPT_FILTER_MISMATCH") {
            // The download no longer proves the current data — force a fresh one.
            setReceipt(null);
          }
          toast({
            title: "Nothing was deleted",
            description: e?.data?.error || "Something went wrong. No orders were removed.",
            variant: "destructive",
          });
        },
      },
    );
  }

  const deletableCount = preview?.deletable.count ?? 0;
  const confirmReady = confirmText.trim() === "DELETE";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Intro ── */}
      <Card className="border-slate-200 shadow-sm" data-testid="card-archive-intro">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="w-5 h-5 text-primary" /> Download &amp; clean up old orders
          </CardTitle>
          <p className="text-sm text-slate-500">
            Save finished orders to your computer as one ZIP file, then remove them from the
            website to free up storage space. The ZIP contains spreadsheets of every order plus
            all uploaded payment screenshots and card PDFs — it is your permanent record, so
            keep it somewhere safe.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1 — pick range */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs mr-1.5">1</span>
              Choose which orders (by the date the order was placed)
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1" htmlFor="archive-from">From date</label>
                <Input
                  id="archive-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-40"
                  data-testid="input-archive-from"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1" htmlFor="archive-to">To date</label>
                <Input
                  id="archive-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-40"
                  data-testid="input-archive-to"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Which orders</label>
                <Select value={source} onValueChange={(v) => setSource(v as ArchiveSource)}>
                  <SelectTrigger className="w-52" data-testid="select-archive-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">{SOURCE_LABELS.both}</SelectItem>
                    <SelectItem value="public">{SOURCE_LABELS.public}</SelectItem>
                    <SelectItem value="operator">{SOURCE_LABELS.operator}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCheck}
                disabled={!datesValid || previewQuery.isFetching}
                className="gap-2"
                data-testid="button-archive-check"
              >
                <Search className="w-4 h-4" />
                {previewQuery.isFetching ? "Checking…" : "Check this range"}
              </Button>
            </div>
            {fromDate && toDate && fromDate > toDate && (
              <p className="text-xs text-red-600" data-testid="text-archive-date-error">
                The start date is after the end date — swap them around.
              </p>
            )}
          </div>

          {/* Preview result */}
          {checkedFilter && previewQuery.isError && (
            <p className="text-sm text-red-600" data-testid="text-archive-preview-error">
              Could not check this date range. Refresh the page and try again.
            </p>
          )}
          {preview && (
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/60" data-testid="card-archive-preview">
              {preview.total === 0 ? (
                <p className="text-sm text-slate-600" data-testid="text-archive-empty">
                  No orders were placed between these dates. Pick a different range.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline" data-testid="badge-archive-total">
                      {preview.total} {preview.total === 1 ? "order" : "orders"} in this range
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200" variant="outline" data-testid="badge-archive-files">
                      {preview.archive.files} uploaded {preview.archive.files === 1 ? "file" : "files"}
                      {preview.sizesKnown && preview.archive.bytes > 0 ? ` · ${formatBytes(preview.archive.bytes)}` : ""}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1" data-testid="text-archive-by-status">
                    {Object.entries(preview.byStatus).map(([s, n]) => (
                      <span key={s}>{statusLabel(s)}: <strong>{n}</strong></span>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2" data-testid="text-archive-deletable">
                      <p className="font-medium text-green-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> {preview.deletable.count} can be deleted
                      </p>
                      <p className="text-xs text-green-700 mt-0.5">
                        Delivered, returned or cancelled orders — finished business.
                      </p>
                    </div>
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2" data-testid="text-archive-skipped">
                      <p className="font-medium text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> {preview.skipped.count} will be kept
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {preview.skipped.count === 0
                          ? "Every order in this range is finished."
                          : "Still in progress — these are never deleted, only downloaded."}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2 — download */}
          {preview && preview.total > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-xs mr-1.5">2</span>
                Download everything first
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="gap-2"
                  data-testid="button-archive-download"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? "Preparing your ZIP file…" : "Download archive (ZIP)"}
                </Button>
                {downloading && (
                  <p className="text-xs text-slate-500">
                    This can take a while when there are many files — leave this page open.
                  </p>
                )}
                {receiptMatchesFilter && !receiptExpired && (
                  <p className="text-xs text-green-700 flex items-center gap-1" data-testid="text-archive-receipt-ok">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Downloaded — deleting is now allowed for 30 minutes.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — delete */}
          {preview && preview.total > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-700">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-xs mr-1.5">3</span>
                Delete the finished orders from the website
              </p>

              {deletableCount === 0 ? (
                <p className="text-sm text-slate-500" data-testid="text-archive-nothing-deletable">
                  Nothing in this range can be deleted — all {preview.total} orders are still in progress.
                </p>
              ) : !receiptMatchesFilter ? (
                <p className="text-sm text-slate-500" data-testid="text-archive-need-download">
                  Download the archive above first. Deleting only unlocks after the ZIP file is saved,
                  so nothing can be lost.
                </p>
              ) : receiptExpired ? (
                <p className="text-sm text-amber-700" data-testid="text-archive-receipt-expired">
                  More than 30 minutes have passed since the download. Download the archive again to
                  re-confirm nothing changed, then delete.
                </p>
              ) : !settingsUnlocked ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-2" data-testid="text-archive-locked">
                  <p className="text-sm text-amber-800 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" /> Deleting needs both partners' approval codes — the same
                    unlock used for prices and the UPI ID.
                  </p>
                  <Button variant="outline" size="sm" onClick={goToSettings} data-testid="button-archive-go-unlock">
                    Open Settings to unlock
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    This permanently removes <strong>{receipt?.deletable ?? deletableCount} finished
                    {(receipt?.deletable ?? deletableCount) === 1 ? " order" : " orders"}</strong> and
                    their uploaded files from the website. Orders still in progress are kept. Your
                    downloaded ZIP stays on your computer.
                  </p>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1" htmlFor="archive-confirm">
                        Type <strong>DELETE</strong> (in capital letters) to allow it
                      </label>
                      <Input
                        id="archive-confirm"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE"
                        className="w-40"
                        data-testid="input-archive-confirm"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      disabled={!confirmReady || deleteMutation.isPending}
                      onClick={() => setConfirmOpen(true)}
                      data-testid="button-archive-delete"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteMutation.isPending ? "Deleting…" : "Delete finished orders"}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Note: the dashboard totals will go down after deleting — those orders move to
                    your ZIP file, which becomes the only copy.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Result summary */}
          {deleteResult && (
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 space-y-1.5" data-testid="card-archive-result">
              <p className="text-sm font-medium text-green-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Clean-up finished
              </p>
              <ul className="text-sm text-green-800 space-y-0.5">
                <li data-testid="text-result-orders">• {deleteResult.deletedOrders} orders removed from the website</li>
                <li data-testid="text-result-files">
                  • {deleteResult.deletedFiles} uploaded files removed, freeing about {formatBytes(deleteResult.freedBytes)}
                </li>
                {deleteResult.skipped.count > 0 && (
                  <li data-testid="text-result-skipped">• {deleteResult.skipped.count} in-progress orders kept (not deleted)</li>
                )}
              </ul>
              {deleteResult.failedOrders.length > 0 && (
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 mt-1" data-testid="text-result-failed">
                  {deleteResult.failedOrders.length} {deleteResult.failedOrders.length === 1 ? "order" : "orders"} could not
                  be fully removed and {deleteResult.failedOrders.length === 1 ? "was" : "were"} kept:{" "}
                  {deleteResult.failedOrders.map((f) => f.orderNumber).join(", ")}. Try the same date range again later.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── How it works footnote ── */}
      <Card className="border-slate-200 shadow-sm bg-slate-50/50">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-slate-500 flex items-start gap-2">
            <Archive className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Inside the ZIP: <strong>orders.csv</strong> (every order&apos;s details),{" "}
              <strong>family-cards.csv</strong> (each card on each order),{" "}
              <strong>payment-verifications.csv</strong> (who confirmed which payment), and a folder
              per order with its payment screenshot and card PDFs. The spreadsheets open in Excel —
              Bengali names show correctly.
            </span>
          </p>
          <p className="text-xs text-slate-500 flex items-start gap-2 mt-2">
            <FileText className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Every clean-up is recorded in the Settings tab&apos;s &quot;Recent changes&quot; list and
              both partners get an email about it — the same safety net as price changes.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Final confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="dialog-archive-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {receipt?.deletable ?? deletableCount} finished orders?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be removed from the website permanently, together with their uploaded
              screenshots and card PDFs. The only remaining copy will be the ZIP file you just
              downloaded. This cannot be undone from the website.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-archive-cancel">Keep everything</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              data-testid="button-archive-confirm-final"
            >
              Yes, delete them
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
