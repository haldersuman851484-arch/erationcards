import { staffFetch } from "@/lib/staffSession";
import { useState, useEffect, useRef } from "react";
import { buildLabelAddressLines } from "@/lib/labelAddress";
import JsBarcode from "jsbarcode";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Download, FileText, ArrowLeft, Printer,
  Package, CheckCircle2, AlertCircle, ChevronRight, Search, X,
  Pencil, Loader2,
} from "lucide-react";
import { ALLOWED_CARD_TYPES } from "@workspace/pricing";

const COURIER_OPTIONS = [
  { value: "ecom-express", label: "Ecom Express" },
  { value: "ecom-express-shipyaari", label: "Ecom Express (Shipyaari)" },
  { value: "delivery", label: "Delivery" },
  { value: "xpressbees", label: "XpressBees" },
];

// All orderable categories (ration + ABHA/E-SHRAM/GENERAL) — shared source of truth.
const CARD_TYPES = ALLOWED_CARD_TYPES;
const COURIER_STORAGE_KEY = "courierDashboard_selectedCourier";

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Main card + family member cards, each with its cardIndex (0 = main). */
function buildAllCards(o: any) {
  const family: { customerName: string; rationCardNumber: string; cardType: string }[] = o.familyCards ?? [];
  return [
    { name: o.customerName, cardNumber: o.rationCardNumber, cardType: o.cardType, cardIndex: 0 },
    ...family.map((fc, i) => ({
      name: fc.customerName, cardNumber: fc.rationCardNumber, cardType: fc.cardType, cardIndex: i + 1,
    })),
  ];
}

/** True when the order has already been through printing (or beyond). */
function isPrintedOrBeyond(status: string) {
  return ["printed", "dispatched", "delivered"].includes(status);
}

type Service = "download" | "print" | null;

interface CourierDashboardProps {
  source: "public" | "operator";
}

export default function CourierDashboard({ source }: CourierDashboardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCourier, setSelectedCourier] = useState<string>(
    () => localStorage.getItem(COURIER_STORAGE_KEY) ?? "delivery"
  );
  const [activeService, setActiveService] = useState<Service>(null);

  // Download filters — live in parent so header can render them
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterCardType, setFilterCardType] = useState("all");
  const [filterCardSearch, setFilterCardSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Print scan-first view — search state lives in parent (header owns the input)
  const [printSearchOpen, setPrintSearchOpen] = useState(false);
  const [printSearchValue, setPrintSearchValue] = useState("");
  const printInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("adminToken")) setLocation("/admin/login");
  }, [setLocation]);

  function handleCourierChange(val: string) {
    setSelectedCourier(val);
    localStorage.setItem(COURIER_STORAGE_KEY, val);
  }

  function handleBack() {
    setActiveService(null);
    // reset filters when leaving download view
    setFilterFromDate("");
    setFilterToDate("");
    setFilterCardType("all");
    setFilterCardSearch("");
    setSearchOpen(false);
    // reset print scan state
    setPrintSearchOpen(false);
    setPrintSearchValue("");
  }

  // Open print search on any printable keypress (barcode scanner or keyboard)
  useEffect(() => {
    if (activeService !== "print") return;
    function onKeyDown(e: KeyboardEvent) {
      if (printSearchOpen) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Prevent the browser's default text insertion — the input opens and
        // autofocuses synchronously, so without this the same keystroke is
        // inserted again into the focused input (ghost first character).
        e.preventDefault();
        setPrintSearchOpen(true);
        setPrintSearchValue(e.key);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeService, printSearchOpen]);

  // Open download search on any printable keypress too (barcode scanner or
  // keyboard) — same behaviour as the print view, so a courier can scan a
  // card without first tapping the 🔍 icon.
  useEffect(() => {
    if (activeService !== "download") return;
    function onKeyDown(e: KeyboardEvent) {
      if (searchOpen) return;
      // Don't steal keystrokes that belong to another control — the download
      // header also has date inputs and the card-type select.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable ||
          ["combobox", "listbox", "option"].includes(t.getAttribute("role") ?? ""))
      ) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Same ghost-first-character guard as the print view above.
        e.preventDefault();
        setSearchOpen(true);
        setFilterCardSearch(e.key);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeService, searchOpen]);

  const label = source === "public" ? "Public Order" : "Operator Order";
  const courierLabel = COURIER_OPTIONS.find((c) => c.value === selectedCourier)?.label ?? "Delivery";

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.94) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .courier-card { animation: popIn 0.35s ease both; }
        .fade-in { animation: fadeSlideIn 0.3s ease both; }
      `}</style>

      <div className="min-h-screen bg-white">
        {/* ── Header ── */}
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="px-4 h-12 flex items-center justify-between gap-3">
            {/* Brand — print view shows source label instead of link */}
            {activeService === "print" ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-[12px]">■</div>
                <span className="font-semibold text-sm text-slate-800">Ration Card</span>
                <span className="text-slate-400 text-sm font-normal">mPanel</span>
                <span className="text-slate-300 text-sm select-none">•</span>
                <span className="text-sm font-medium text-primary">{label}</span>
              </div>
            ) : (
              <Link
                href="/processing"
                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity shrink-0"
              >
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-[12px]">C</div>
                <span className="font-semibold text-sm text-slate-800">Ration Card</span>
                <span className="text-slate-400 text-sm font-normal">mPanel</span>
              </Link>
            )}

            {/* Right side — changes by active service */}
            {activeService === "print" ? (
              /* Print scan view: 🔍 icon toggle with autofocused input */
              printSearchOpen ? (
                <div className="flex items-center gap-1">
                  <Input
                    ref={printInputRef}
                    autoFocus
                    placeholder="Scan or type ration card no. / order ID…"
                    value={printSearchValue}
                    onChange={(e) => setPrintSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setPrintSearchOpen(false); setPrintSearchValue(""); }
                    }}
                    className="h-8 text-xs w-56 border-slate-300 font-mono"
                  />
                  <button
                    onClick={() => { setPrintSearchOpen(false); setPrintSearchValue(""); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPrintSearchOpen(true)}
                  className="h-8 w-8 flex items-center justify-center border border-slate-300 rounded-md hover:border-primary hover:text-primary transition-colors text-slate-500"
                  title="Search (or press any key)"
                >
                  <Search className="w-4 h-4" />
                </button>
              )
            ) : activeService === "download" ? (
              /* Filter controls matching the screenshot */
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <input
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                  className="h-8 text-xs px-2 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                  className="h-8 text-xs px-2 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Select value={filterCardType} onValueChange={setFilterCardType}>
                  <SelectTrigger className="w-28 h-8 text-xs border-slate-300">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm">All Types</SelectItem>
                    {CARD_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {searchOpen ? (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      placeholder="Ration card no."
                      value={filterCardSearch}
                      onChange={(e) => setFilterCardSearch(e.target.value)}
                      className="h-8 text-xs w-36 border-slate-300"
                    />
                    <button
                      onClick={() => { setFilterCardSearch(""); setSearchOpen(false); }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="h-8 w-8 flex items-center justify-center border border-slate-300 rounded-md hover:border-primary hover:text-primary transition-colors text-slate-500"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              /* Courier service dropdown (landing & print views) */
              <Select value={selectedCourier} onValueChange={handleCourierChange}>
                <SelectTrigger className="w-44 h-8 text-xs border-slate-300">
                  <SelectValue>{courierLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Change Shipping Partner
                  </div>
                  {COURIER_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </header>

        <main className="px-4 py-10">
          {activeService === null ? (
            <LandingView label={label} onSelect={setActiveService} />
          ) : activeService === "download" ? (
            <DownloadView
              source={source}
              label={label}
              onBack={handleBack}
              toast={toast}
              queryClient={queryClient}
              fromDate={filterFromDate}
              toDate={filterToDate}
              cardType={filterCardType}
              cardSearch={filterCardSearch}
            />
          ) : activeService === "print" ? (
            <PrintStatusView
              source={source}
              label={label}
              onBack={handleBack}
              toast={toast}
              queryClient={queryClient}
              searchValue={printSearchValue}
              onSearchChange={setPrintSearchValue}
              onSearchClear={() => { setPrintSearchOpen(false); setPrintSearchValue(""); }}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────── */
/* Landing: two service cards                  */
/* ─────────────────────────────────────────── */
function LandingView({ label, onSelect }: { label: string; onSelect: (s: Service) => void }) {
  const services = [
    {
      key: "download" as const,
      icon: Download,
      title: "Download Ration Card",
      description: `Download ordered ration cards from ${label.toLowerCase().replace(" order", "")}.`,
    },
    {
      key: "print" as const,
      icon: Printer,
      title: "Print Status Update",
      description: "Update print status of ration card by scanning it.",
    },
  ];

  return (
    <div className="fade-in max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">
        Select Service <span className="text-primary font-normal">• {label}</span>
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map(({ key, icon: Icon, title, description }, i) => (
          <Card
            key={key}
            className="courier-card border border-slate-200 hover:border-primary hover:shadow-md cursor-pointer transition-all group"
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => onSelect(key)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm group-hover:text-primary transition-colors">{title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary mt-0.5 shrink-0 transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Download Ration Card sub-view               */
/* ─────────────────────────────────────────── */
function DownloadView({
  source, label, onBack, toast, queryClient,
  fromDate, toDate, cardType, cardSearch,
}: {
  source: "public" | "operator";
  label: string;
  onBack: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
  fromDate: string;
  toDate: string;
  cardType: string;
  cardSearch: string;
}) {
  const debouncedSearch = useDebounce(cardSearch, 400);

  // Track in-session download state at PDF level: key = `${orderId}_${cardIndex}`
  // Downloaded badge for a row shows only when ALL PDFs in that row are done.
  const [downloadedPdfs, setDownloadedPdfs]   = useState<Set<string>>(new Set());
  const [downloadingPdfs, setDownloadingPdfs] = useState<Set<string>>(new Set());
  // One status-PATCH attempt per order (on first PDF download). A ref, not
  // state: the check-and-mark must be synchronous, or two rapid clicks on
  // different PDFs of the same order both pass the guard and double-PATCH.
  const patchAttemptedOrders = useRef<Set<number>>(new Set());
  const [syncFailedOrders, setSyncFailedOrders] = useState<Set<number>>(new Set());

  const { data, isLoading, error } = useQuery<{ orders: any[]; total: number }>({
    queryKey: ["courier-download", source, fromDate, toDate, cardType, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        source,
        paymentStatus: "confirmed",
        limit: "200",
      });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (cardType && cardType !== "all") params.set("cardType", cardType);
      if (debouncedSearch) params.set("rationCardSearch", debouncedSearch);

      const r = await staffFetch(`/api/orders?${params}`, { headers: getAuthHeader() });
      if (!r.ok) throw new Error("Failed to fetch orders");
      return r.json();
    },
    refetchInterval: 30000,
  });

  /** Fetch the PDF as a blob and trigger a real file save (preserves server filename). */
  async function savePdfFile(pdfUrl: string) {
    const r = await fetch(pdfUrl);
    if (!r.ok) throw new Error("Download failed");
    const blob = await r.blob();

    // Extract filename from the URL's last path segment — never override it
    const filename = decodeURIComponent(pdfUrl.split("/").pop()?.split("?")[0] ?? "ration-card.pdf");

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }

  async function handleDownload(order: any, cardIndex: number, pdfUrl: string) {
    const orderId: number = order.id;
    const pdfKey = `${orderId}_${cardIndex}`;
    if (downloadingPdfs.has(pdfKey)) return;

    setDownloadingPdfs(prev => { const s = new Set(prev); s.add(pdfKey); return s; });

    try {
      await savePdfFile(pdfUrl);

      // Mark this individual PDF as downloaded (session state for instant UI feedback)
      setDownloadedPdfs(prev => { const s = new Set(prev); s.add(pdfKey); return s; });

      // Persist the download record to the DB — non-blocking, silent on failure
      // (the file is already on disk; this just updates the badge on next scan)
      staffFetch(`/api/orders/${orderId}/pdfs/${cardIndex}/downloaded`, {
        method: "PATCH",
        headers: getAuthHeader(),
      }).catch(() => {});

      // PATCH order to processing on first PDF download — non-blocking, fires
      // once per order. Guarded by the order's SERVER state, not just session
      // memory: only a fresh "pending" order may advance to processing. An
      // order that is already processing — or printed/dispatched/delivered/
      // cancelled — must never be moved (back) to processing by a download.
      if (order.status === "pending" && !patchAttemptedOrders.current.has(orderId)) {
        patchAttemptedOrders.current.add(orderId);
        try {
          const pr = await staffFetch(`/api/orders/${orderId}`, {
            method: "PATCH",
            headers: { ...getAuthHeader(), "Content-Type": "application/json" },
            body: JSON.stringify({ status: "processing" }),
          });
          if (pr.ok) {
            setSyncFailedOrders(prev => { const s = new Set(prev); s.delete(orderId); return s; });
            queryClient.invalidateQueries({ queryKey: ["courier-download", source] });
            queryClient.invalidateQueries({ queryKey: ["courier-print"] });
          } else {
            setSyncFailedOrders(prev => { const s = new Set(prev); s.add(orderId); return s; });
            toast({ title: "PDF saved locally — status sync failed", variant: "destructive" });
          }
        } catch {
          setSyncFailedOrders(prev => { const s = new Set(prev); s.add(orderId); return s; });
          toast({ title: "PDF saved locally — status sync failed", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Download failed. Please try again.", variant: "destructive" });
    } finally {
      setDownloadingPdfs(prev => { const s = new Set(prev); s.delete(pdfKey); return s; });
    }
  }

  /**
   * Download a PDF again after it was already downloaded (or the order was
   * printed). Deliberately fires NO PATCHes — re-fetching a lost file must
   * never change the order: status stays exactly as it is (a printed order
   * stays printed) and the downloaded flags are untouched.
   */
  async function handleRedownload(orderId: number, cardIndex: number, pdfUrl: string) {
    const pdfKey = `${orderId}_${cardIndex}`;
    if (downloadingPdfs.has(pdfKey)) return;

    setDownloadingPdfs(prev => { const s = new Set(prev); s.add(pdfKey); return s; });
    try {
      await savePdfFile(pdfUrl);
      toast({ title: "PDF downloaded again ✓" });
    } catch {
      toast({ title: "Download failed. Please try again.", variant: "destructive" });
    } finally {
      setDownloadingPdfs(prev => { const s = new Set(prev); s.delete(pdfKey); return s; });
    }
  }

  async function retrySyncPatch(order: any) {
    const orderId: number = order.id;
    // The pending→processing sync only applies while the order is still
    // pending on the server. If it advanced meanwhile (someone printed or
    // dispatched it), retrying must NOT knock the status back — just clear
    // the stale sync-failed flag.
    if (order.status !== "pending") {
      setSyncFailedOrders(prev => { const s = new Set(prev); s.delete(orderId); return s; });
      queryClient.invalidateQueries({ queryKey: ["courier-download", source] });
      return;
    }
    try {
      const pr = await staffFetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing" }),
      });
      if (pr.ok) {
        setSyncFailedOrders(prev => { const s = new Set(prev); s.delete(orderId); return s; });
        queryClient.invalidateQueries({ queryKey: ["courier-download", source] });
        queryClient.invalidateQueries({ queryKey: ["courier-print"] });
      } else {
        toast({ title: "Sync retry failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Sync retry failed", variant: "destructive" });
    }
  }

  const orders = data?.orders ?? [];

  return (
    <div className="fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Loading orders…</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center text-red-500 text-sm">Failed to load orders. Please try again.</div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No orders found for the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-600">Date</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Card Number</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Card Type</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, i) => {
                  const pdfs: { cardIndex: number; pdfUrl: string; downloaded?: boolean; downloadedAt?: string | null }[] = order.rationCardPdfs ?? [];
                  const allCards     = buildAllCards(order);
                  // Order already went through printing → done badges read "Printed ✓"
                  const printedOrder = isPrintedOrBeyond(order.status);
                  const syncFailed   = syncFailedOrders.has(order.id);

                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                      style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${Math.min(i * 25, 400)}ms` }}
                    >
                      {/* Date */}
                      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </TableCell>

                      {/* Name */}
                      <TableCell className="text-sm font-medium text-slate-800 uppercase">
                        {order.customerName}
                      </TableCell>

                      {/* Card Number */}
                      <TableCell className="text-sm font-mono text-slate-700">
                        {order.rationCardNumber}
                      </TableCell>

                      {/* Card Type */}
                      <TableCell className="text-sm text-slate-700">
                        {order.cardType}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-sm text-slate-600 capitalize">
                        {order.status}
                      </TableCell>

                      {/* Download */}
                      <TableCell>
                        {pdfs.length === 0 ? (
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {/* Per-PDF buttons — each card stays individually
                                (re-)downloadable, labelled by its card number */}
                            {pdfs.map((p) => {
                              const pdfKey     = `${order.id}_${p.cardIndex}`;
                              const isDone     = downloadedPdfs.has(pdfKey) || p.downloaded === true;
                              const isInFlight = downloadingPdfs.has(pdfKey);
                              const cardNumber = String(allCards.find(c => c.cardIndex === p.cardIndex)?.cardNumber ?? "");
                              const cardTail   = cardNumber.length > 6 ? `…${cardNumber.slice(-6)}` : cardNumber;
                              return isDone ? (
                                <button
                                  key={p.cardIndex}
                                  disabled={isInFlight}
                                  onClick={() => handleRedownload(order.id, p.cardIndex, p.pdfUrl)}
                                  title={`Download this PDF again — card ${cardNumber}`}
                                  data-testid={`button-redownload-${order.id}-${p.cardIndex}`}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 hover:bg-emerald-100 hover:border-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-wait"
                                >
                                  {isInFlight ? (
                                    <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  {printedOrder ? "Printed ✓" : "Downloaded ✓"}
                                  <span className="font-mono text-[10px] opacity-80">{cardTail}</span>
                                  <Download className="w-3 h-3 opacity-60" />
                                </button>
                              ) : (
                                <button
                                  key={p.cardIndex}
                                  disabled={isInFlight}
                                  onClick={() => handleDownload(order, p.cardIndex, p.pdfUrl)}
                                  data-testid={`button-download-${order.id}-${p.cardIndex}`}
                                  className="inline-flex items-center gap-1 text-xs border border-slate-300 rounded px-2 py-0.5 hover:border-primary hover:text-primary transition-colors text-slate-600 disabled:opacity-50 disabled:cursor-wait"
                                >
                                  {isInFlight ? (
                                    <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3" />
                                  )}
                                  {isInFlight ? "Downloading…" : "Download"}
                                  <span className="font-mono text-[10px] opacity-70">{cardTail}</span>
                                </button>
                              );
                            })}
                            {/* Sync failure note — shown below buttons, doesn't hide them */}
                            {syncFailed && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Sync failed
                                </span>
                                <button
                                  onClick={() => retrySyncPatch(order)}
                                  className="text-xs text-amber-700 underline hover:text-amber-900"
                                >
                                  Retry
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
            {(fromDate || toDate || (cardType && cardType !== "all") || debouncedSearch) && " (filtered)"}
          </div>
        </div>
      )}
    </div>
  );
}



/* ─────────────────────────────────────────── */
/* Print Status Update — scan-first UI         */
/* ─────────────────────────────────────────── */
function PrintStatusView({
  source, onBack, toast, queryClient, searchValue, onSearchChange, onSearchClear,
}: {
  source: "public" | "operator";
  label: string;
  onBack: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
}) {
  const [, setLocation] = useLocation();
  const debouncedSearch = useDebounce(searchValue, 300);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [undoOrderId, setUndoOrderId] = useState<number | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]); // session-local scan history for sidebar
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null); // null = show picker when multiple
  const [optimisticPrintedIds, setOptimisticPrintedIds] = useState<Set<number>>(new Set()); // instant green badge before PATCH resolves
  const [creatingShipment, setCreatingShipment] = useState(false); // dispatch API call in flight
  const [cancellingShipment, setCancellingShipment] = useState(false); // cancel API call in flight

  // ── Customer info editing (fix wrong name / mobile / address) ──
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);
  // Status fetched fresh from the server when the dialog opens — the search
  // result on screen can be stale (react-query cache), and the dispatched
  // warning must reflect the real current status.
  const [editOrderStatus, setEditOrderStatus] = useState<string | null>(null);
  // The order the dialog was opened FOR. Saves always PATCH this id — never the
  // live `order` from render state — so a search/selection change (e.g. a
  // barcode scan) while the dialog is open can never write into another order.
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [customerForm, setCustomerForm] = useState({
    customerName: "", customerPhone: "", address: "",
    postOffice: "", district: "", pincode: "", state: "",
  });

  // Refs never go stale inside closures — used for undo gate + toast teardown
  const undoTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUndoTokenRef = useRef<string | null>(null);   // unique per mark-printed; null = window closed
  const activeToastDismissRef = useRef<(() => void) | null>(null); // dismiss handle for the undo toast
  const autoMarkedIds      = useRef<Set<number>>(new Set()); // tracks which order IDs were auto-marked this session

  /** Fully close the undo window: cancel timer, invalidate token, dismiss toast */
  function closeUndoWindow() {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    activeUndoTokenRef.current = null;
    if (activeToastDismissRef.current) { activeToastDismissRef.current(); activeToastDismissRef.current = null; }
    setUndoOrderId(null);
  }

  // When a new scan starts while undo is pending, the new scan is intentional
  // confirmation — close the window (and dismiss the stale toast).
  useEffect(() => {
    if (searchValue.length > 0 && undoOrderId !== null) {
      closeUndoWindow();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, undoOrderId]);

  // Clean up on unmount
  useEffect(() => {
    return () => closeUndoWindow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery<{ orders: any[]; total: number }>({
    queryKey: ["courier-print-search", source, debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return { orders: [], total: 0 };
      const params = new URLSearchParams({
        source,
        quickSearch: debouncedSearch,
        limit: "5",
      });
      const r = await staffFetch(`/api/orders?${params}`, { headers: getAuthHeader() });
      if (!r.ok) throw new Error("Failed to fetch");
      return r.json();
    },
    enabled: debouncedSearch.length > 0,
  });

  async function undoMarkPrinted(orderId: number, token: string) {
    // Gate: only execute if the undo window is still open for this exact action
    if (activeUndoTokenRef.current !== token) {
      // Window already expired or a newer scan confirmed it — silently no-op
      return;
    }
    closeUndoWindow();
    try {
      const r = await staffFetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing" }),
      });
      if (!r.ok) throw new Error("Failed");
      // Revert optimistic badge so the UI shows "No" immediately
      setOptimisticPrintedIds(prev => { const s = new Set(prev); s.delete(orderId); return s; });
      queryClient.invalidateQueries({ queryKey: ["courier-print-search"] });
      toast({ title: "Undone — order is back to processing" });
    } catch {
      toast({ title: "Undo failed. Please correct it from the admin dashboard.", variant: "destructive" });
    }
  }

  async function markAsPrinted(orderId: number, opts?: { auto?: boolean }) {
    setMarkingId(orderId);
    try {
      const r = await staffFetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "printed" }),
      });
      if (!r.ok) throw new Error("Failed");

      // Manual clicks clear the search so the next card can be scanned.
      // Auto-mark keeps the result visible so the courier sees the green badges.
      if (!opts?.auto) onSearchClear();

      // Cancel any previously open undo window before opening a new one
      closeUndoWindow();

      // Unique token for this action — prevents a stale toast from undoing a later mark
      const token = `${orderId}_${Date.now()}`;
      activeUndoTokenRef.current = token;
      setUndoOrderId(orderId);

      // Expire the window after 5 seconds and dismiss the toast
      undoTimerRef.current = setTimeout(() => {
        closeUndoWindow();
      }, 5000);

      queryClient.invalidateQueries({ queryKey: ["courier-print-search"] });

      // Show the undo toast and store its dismiss handle
      const { dismiss } = toast({
        title: "Marked as printed ✓",
        duration: 5500, // slightly longer than undo window so button is visible for full 5 s
        action: (
          <ToastAction altText="Undo mark printed" onClick={() => undoMarkPrinted(orderId, token)}>
            Undo
          </ToastAction>
        ),
      });
      activeToastDismissRef.current = dismiss;
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setMarkingId(null);
    }
  }

  const orders = data?.orders ?? [];
  const hasSearched = debouncedSearch.length > 0;

  // Reset selection whenever the search string changes
  useEffect(() => {
    setSelectedOrderId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Auto-select when there is exactly one result — no picker needed
  useEffect(() => {
    if (orders.length === 1) setSelectedOrderId(orders[0].id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length, orders[0]?.id]);

  // Derive the active order from the explicit selection (safe for multi-match)
  const order: any = selectedOrderId != null
    ? (orders.find((o: any) => o.id === selectedOrderId) ?? null)
    : null;

  // ── Auto-mark on successful match ────────────────────────────────────────────
  // Fires once per unique order ID when the result panel first appears.
  // Skipped for orders already in a printed/dispatched/delivered state.
  // Skipped when the search looks like an order number lookup (not a ration card scan).
  useEffect(() => {
    if (!order) return;
    if (autoMarkedIds.current.has(order.id)) return;
    if (isPrintedOrBeyond(order.status)) return;
    // If the search term is a prefix of the order number but NOT of any card
    // number on the order — main card or a family member's card — the courier
    // is doing a manual order lookup, so do not auto-mark. A scan of ANY card
    // belonging to the order counts as a card scan.
    const isCardScan = buildAllCards(order).some(
      (c) => typeof c.cardNumber === "string" && c.cardNumber.startsWith(debouncedSearch)
    );
    const isOrderNumberSearch =
      debouncedSearch.length > 0 &&
      order.orderNumber.startsWith(debouncedSearch) &&
      !isCardScan;
    if (isOrderNumberSearch) return;
    autoMarkedIds.current.add(order.id);
    // Optimistically flip badges green before the PATCH resolves
    setOptimisticPrintedIds(prev => new Set([...prev, order.id]));
    markAsPrinted(order.id, { auto: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, debouncedSearch]);

  // Push each displayed order into session scan history for the sidebar
  useEffect(() => {
    if (order) {
      setRecentScans(prev => {
        const filtered = prev.filter((r: any) => r.id !== order.id);
        return [order, ...filtered].slice(0, 4);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // Safety net: if the displayed order changes while the customer-info dialog
  // is open (new scan / search), close the dialog instead of letting the form
  // hang around over a different order.
  useEffect(() => {
    if (editingCustomer && !savingCustomer && order?.id !== editingOrderId) {
      setEditingCustomer(false);
      setEditingOrderId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // Fetch all orders by the same customer phone — runs once per unique phone number
  const activePhone = order?.customerPhone ?? null;
  const { data: phoneHistoryData } = useQuery<{ orders: any[] }>({
    queryKey: ["phone-history", activePhone],
    queryFn: async () => {
      if (!activePhone) return { orders: [] };
      const params = new URLSearchParams({ phoneSearch: activePhone, limit: "10" });
      const r = await staffFetch(`/api/orders?${params}`, { headers: getAuthHeader() });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!activePhone,
  });
  // Exclude the currently displayed order so it doesn't appear in its own history
  const phoneHistory = (phoneHistoryData?.orders ?? []).filter((o: any) => o.id !== order?.id);

  // Count cards across ALL orders for this phone that are printed but not yet dispatched
  // (includes the current order itself so the courier sees the full pending queue)
  const pendingShipmentCards = (phoneHistoryData?.orders ?? [])
    .filter((o: any) => o.status === "printed")
    .reduce((sum: number, o: any) => sum + (o.quantity ?? 1), 0);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function fmtAddress(o: any) {
    return [
      o.address    && `Street: ${o.address}`,
      o.postOffice && `Post: ${o.postOffice}`,
      o.district   && `Town: ${o.district}`,
      o.pincode    && `Pin: ${o.pincode}`,
      o.state      && `State: ${o.state}`,
    ].filter(Boolean).join("  ");
  }

  // ── Customer info edit handlers ─────────────────────────────────────────────

  async function openCustomerEdit() {
    if (!order) return;
    // Re-fetch the order so the form and the dispatched warning reflect the
    // CURRENT server state — the on-screen search result can be a stale cache
    // (e.g. the order was dispatched or edited elsewhere meanwhile).
    const targetId: number = order.id;
    let src: any = order;
    try {
      const r = await staffFetch(`/api/orders/${targetId}`, { headers: getAuthHeader() });
      if (r.ok) src = await r.json();
    } catch { /* network hiccup — fall back to the on-screen values */ }
    setEditingOrderId(targetId);
    setCustomerForm({
      customerName: src.customerName ?? "",
      customerPhone: src.customerPhone ?? "",
      address: src.address ?? "",
      postOffice: src.postOffice ?? "",
      district: src.district ?? "",
      pincode: src.pincode ?? "",
      state: src.state ?? "",
    });
    setEditOrderStatus(src.status ?? order.status ?? null);
    setCustomerFormError(null);
    setEditingCustomer(true);
    // If the status drifted from what's on screen, refresh the visible card too
    if (src.status && src.status !== order.status) {
      queryClient.invalidateQueries({ queryKey: ["courier-print-search"] });
    }
  }

  /** Mirrors the server-side rules so obvious mistakes are caught before the request. */
  function validateCustomerForm(): string | null {
    const f = customerForm;
    if (!f.customerName.trim()) return "Customer name cannot be empty";
    if (!/^[0-9]{10}$/.test(f.customerPhone.trim())) return "Mobile number must be exactly 10 digits";
    if (!f.address.trim()) return "Street address cannot be empty";
    if (!f.district.trim()) return "Town/District cannot be empty";
    if (!/^[0-9]{6}$/.test(f.pincode.trim())) return "PIN code must be exactly 6 digits";
    if (!f.state.trim()) return "State cannot be empty";
    return null;
  }

  async function saveCustomerInfo() {
    if (editingOrderId == null) return;
    const validationError = validateCustomerForm();
    if (validationError) { setCustomerFormError(validationError); return; }
    setSavingCustomer(true);
    setCustomerFormError(null);
    try {
      const r = await staffFetch(`/api/orders/${editingOrderId}/customer-info`, {
        method: "PATCH",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerForm.customerName.trim(),
          customerPhone: customerForm.customerPhone.trim(),
          address: customerForm.address.trim(),
          postOffice: customerForm.postOffice.trim(),
          district: customerForm.district.trim(),
          pincode: customerForm.pincode.trim(),
          state: customerForm.state.trim(),
        }),
      });
      if (!r.ok) {
        let msg = "Could not save the changes. Please try again.";
        try {
          const j = await r.json();
          if (j?.error) msg = j.error;
        } catch { /* non-JSON error body */ }
        throw new Error(msg);
      }
      setEditingCustomer(false);
      queryClient.invalidateQueries({ queryKey: ["courier-print-search"] });
      queryClient.invalidateQueries({ queryKey: ["phone-history"] });
      toast({ title: "Customer info updated ✓" });
    } catch (err) {
      setCustomerFormError(err instanceof Error ? err.message : "Could not save the changes. Please try again.");
    } finally {
      setSavingCustomer(false);
    }
  }

  const allCards  = order ? buildAllCards(order) : [];
  const pdfs: { cardIndex: number; pdfUrl: string; downloaded?: boolean; downloadedAt?: string | null }[] = order?.rationCardPdfs ?? [];
  // isPrinted is true when the server confirms it OR when we've optimistically auto-marked it
  const isPrinted = order
    ? (["printed", "dispatched", "delivered"].includes(order.status) || optimisticPrintedIds.has(order.id))
    : false;
  // allCardsDownloaded: every card in the order has been downloaded by the team (DB-persisted)
  const allCardsDownloaded = allCards.length > 0 && allCards.every(
    (card) => pdfs.some(p => p.cardIndex === card.cardIndex && p.downloaded === true)
  );

  /** Escape a string for safe insertion into an HTML text/attribute context */
  function escHtml(s: string): string {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Build the barcode as an inline SVG string using the bundled jsbarcode
   * library (no CDN, no scripts inside the letter). The SVG is produced via
   * DOM APIs + XMLSerializer, so all text nodes are safely escaped.
   */
  function buildBarcodeSvg(value: string, label: string): string {
    try {
      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svgEl, value, {
        format: "CODE128",
        displayValue: true,
        text: label,
        fontSize: 14,
        width: 2,
        height: 56,
        margin: 0,
        textMargin: 2,
      });
      // Replace fixed px dimensions with a viewBox so CSS mm sizing scales it
      const w = parseFloat(svgEl.getAttribute("width") || "0");
      const h = parseFloat(svgEl.getAttribute("height") || "0");
      if (w > 0 && h > 0) {
        svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
      }
      return new XMLSerializer().serializeToString(svgEl);
    } catch {
      return ""; // invalid/empty value — letter prints without a barcode
    }
  }

  /**
   * Open the browser print dialog IN PLACE for the given HTML document via a
   * hidden same-page iframe — no new tab, no navigation away from the dashboard.
   */
  function printHtmlInPlace(html: string) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    iframe.style.border = "0";
    iframe.srcdoc = html;
    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) { iframe.remove(); return; }
      const cleanup = () => setTimeout(() => iframe.remove(), 300);
      win.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 120000); // fallback if afterprint never fires
      win.focus();
      win.print();
    };
    document.body.appendChild(iframe);
  }

  /**
   * Generate the welcome letter and open the browser print dialog IN PLACE
   * (hidden iframe — no new tab, no redirect). Layout matches the reference:
   * block anchored at the bottom of an A4 page, vertical barcode on the left.
   */
  function printWelcomeLetter(o: any) {
    const customerName = escHtml((o.customerName || "").toUpperCase());
    const formattedDate = escHtml(new Date(o.createdAt).toLocaleDateString("en-US", {
      month: "short", day: "2-digit", year: "numeric",
    }));
    const addressText = escHtml([
      o.address    && `Street: ${o.address}`,
      o.postOffice && `Post: ${o.postOffice}`,
      o.district   && `Town: ${o.district}`,
      o.pincode    && `Pin: ${o.pincode}`,
      o.state      && `State: ${o.state}`,
    ].filter(Boolean).join(" "));
    const phone    = escHtml(String(o.customerPhone || ""));
    const orderNum = String(o.orderNumber || "");
    const orderNumHtml = escHtml(orderNum);

    // All ration card numbers on the order: main card + every family card
    const cards = buildAllCards(o);
    const cardNumbersLine = cards
      .map((c) => escHtml(String(c.cardNumber || "")))
      .filter(Boolean)
      .join(" &#8226; ");
    const cardCount = cards.length;

    const barcodeSvg = buildBarcodeSvg(orderNum, `Order #${orderNum}`);

    // Static HTML — no scripts inside the letter document
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Welcome Letter &#8212; Order #${orderNumHtml}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;color:#000}
  @page{size:A4;margin:0}
  html,body{width:210mm;height:296mm}
  body{position:relative;background:#fff;overflow:hidden}
  /* Block anchored to the lower area of the A4 sheet (windowed-envelope zone) */
  .wrapper{position:absolute;left:80mm;bottom:27mm;width:106mm;display:flex;align-items:flex-end;gap:4mm}
  .bc-outer{flex-shrink:0;width:17mm;height:50mm;position:relative}
  .bc-inner{position:absolute;width:50mm;height:17mm;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg)}
  .bc-inner svg{width:50mm;height:17mm;display:block}
  .details{flex:1;min-width:0}
  .name{font-size:4.4mm;font-weight:700;text-transform:uppercase;margin-bottom:1.6mm}
  .order-row{display:flex;justify-content:space-between;align-items:baseline;gap:4mm;margin-bottom:1.6mm}
  .order-num{font-size:3.7mm;font-weight:700}
  .order-date{font-size:3.5mm}
  .mobile{font-size:3.4mm;margin-bottom:1.8mm}
  .addr-label{font-size:3.4mm;font-weight:700;margin-bottom:0.8mm}
  .addr-text{font-size:3.2mm;line-height:1.45;margin-bottom:1.8mm}
  .card-count{font-size:3.4mm;font-weight:700;margin-bottom:0.8mm}
  .card-nums{font-size:3.4mm}
</style>
</head>
<body>
<div class="wrapper">
  <div class="bc-outer"><div class="bc-inner">${barcodeSvg}</div></div>
  <div class="details">
    <p class="name">${customerName}</p>
    <div class="order-row">
      <span class="order-num">Order #${orderNumHtml}</span>
      <span class="order-date">${formattedDate}</span>
    </div>
    <p class="mobile">Mobile Number: ${phone}</p>
    <p class="addr-label">Address</p>
    <p class="addr-text">${addressText}</p>
    <p class="card-count">${cardCount} Card${cardCount !== 1 ? "s" : ""}</p>
    <p class="card-nums">${cardNumbersLine}</p>
  </div>
</div>
</body>
</html>`;

    printHtmlInPlace(html);
  }

  /**
   * A6 Delhivery shipping label (105 × 148 mm), content anchored at the TOP of
   * the page. Static HTML, no scripts; barcode encodes the Delhivery waybill.
   */
  function printShippingLabel(o: any, awb: string) {
    const customerName = escHtml((o.deliveryName || o.customerName || "").toUpperCase());
    // Full delivery address, one entry per printed line (shared with the
    // label page in ShippingLabel.tsx via buildLabelAddressLines)
    const addressHtml = buildLabelAddressLines(o)
      .map((l) => `<p class="line">${escHtml(l)}</p>`)
      .join("\n      ");
    const rawPhone = String(o.customerPhone || "");
    const phone = escHtml(rawPhone.startsWith("+") ? rawPhone : `+91${rawPhone}`);
    const orderNumHtml = escHtml(String(o.orderNumber || ""));
    const awbSvg = buildBarcodeSvg(awb, awb); // digits rendered below the bars
    const invoiceDate = escHtml(new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    }));

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Shipping Label &#8212; Order #${orderNumHtml}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;color:#000}
  @page{size:105mm 148mm;margin:0}
  html,body{width:105mm;height:147mm}
  body{background:#fff;overflow:hidden}
  /* Content block anchored to the TOP of the A6 sheet */
  .label{padding:4mm 6mm 0}
  .prepaid-row{display:flex;justify-content:flex-end}
  .prepaid{border:0.5mm solid #555;padding:0.6mm 2.4mm;font-size:5mm;font-weight:700;letter-spacing:0.2mm}
  .ci{font-size:3.6mm;margin-top:3.5mm}
  .name{font-size:4.8mm;font-weight:700;text-transform:uppercase;margin-top:0.8mm}
  .main{display:flex;justify-content:space-between;align-items:flex-end;gap:4mm;margin-top:2mm}
  .left{min-width:0}
  .line{font-size:3.9mm;margin-top:1.4mm}
  .ord-row{display:flex;gap:2mm;margin-top:3mm}
  .ord-box{border:0.4mm solid #444;padding:1.2mm 2.2mm;font-size:4mm;font-weight:600;white-space:nowrap}
  .dl-box{border:0.4mm solid #444;padding:1.2mm 2mm;font-size:4mm;font-weight:600}
  .bc{flex-shrink:0}
  .bc svg{width:40mm;height:19mm;display:block}
  .footer{margin-top:7mm;text-align:center}
  .inv{font-size:2.9mm}
  .auto{font-size:2.9mm;font-weight:700;margin-top:1mm}
  .notice{font-size:2.4mm;font-style:italic;margin-top:1mm}
</style>
</head>
<body>
<div class="label">
  <div class="prepaid-row"><span class="prepaid">PREPAID</span></div>
  <p class="ci">Customer Info</p>
  <p class="name">${customerName}</p>
  <div class="main">
    <div class="left">
      ${addressHtml}
      <p class="line">${phone}</p>
      <div class="ord-row">
        <span class="ord-box">Order #${orderNumHtml}</span>
        <span class="dl-box">DL</span>
      </div>
    </div>
    <div class="bc">${awbSvg}</div>
  </div>
  <div class="footer">
    <p class="inv">Invoice Date: ${invoiceDate} | Email: help@printpvccard.in | www.printpvccard.in</p>
    <p class="auto">THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE</p>
    <p class="notice">Notice: www.printpvccard.in is not a government portal. It is a PVC card printing portal</p>
  </div>
</div>
</body>
</html>`;

    printHtmlInPlace(html);
  }

  /**
   * Redirect to the full-page shipping label view for this order
   * (reference-portal style: label shown on its own light-grey page).
   */
  function openShippingLabelPage(o: any) {
    setLocation(`/processing/shipping-label/${encodeURIComponent(String(o.orderNumber || ""))}`);
  }

  /**
   * Create the Delhivery shipment for the active order (or reuse the existing
   * waybill) — all without leaving the dashboard.
   */
  async function handleCreateShipment() {
    if (!order || creatingShipment) return;

    // Shipment already exists — open its label page, never create a duplicate
    if (order.trackingNumber) {
      openShippingLabelPage(order);
      return;
    }

    setCreatingShipment(true);
    try {
      const r = await staffFetch(`/api/orders/${order.id}/dispatch`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      const data: any = await r.json().catch(() => ({}));

      if (!r.ok) {
        // "Already dispatched" still returns the waybill — open its label page
        if (data?.trackingNumber) {
          queryClient.invalidateQueries({ queryKey: ["courier-print-search"] });
          queryClient.invalidateQueries({ queryKey: ["phone-history"] });
          openShippingLabelPage(order);
          return;
        }
        if (r.status === 504) {
          toast({
            title: "Delhivery timed out",
            description: data?.error || "Delhivery is taking too long to respond. The shipment was not created — please try again.",
            variant: "destructive",
          });
          return;
        }
        toast({ title: data?.error || "Failed to create shipment", variant: "destructive" });
        return;
      }

      const awb = String(data.awb || data.trackingNumber || "");
      queryClient.invalidateQueries({ queryKey: ["courier-print-search"] });
      queryClient.invalidateQueries({ queryKey: ["phone-history"] });
      toast({ title: `Shipment created — AWB ${awb}` });
      printShippingLabel(data.order ?? order, awb);
    } catch {
      toast({ title: "Failed to create shipment. Check your connection.", variant: "destructive" });
    } finally {
      setCreatingShipment(false);
    }
  }

  /**
   * Cancel the Delhivery shipment for the active order (only possible before
   * pickup) and reset it back to 'printed' so it can be re-dispatched.
   */
  async function handleCancelShipment() {
    if (!order || cancellingShipment || !order.trackingNumber) return;

    if (!window.confirm(`Cancel shipment AWB ${order.trackingNumber} with Delhivery? The order will go back to printed status.`)) return;

    setCancellingShipment(true);
    try {
      const r = await staffFetch(`/api/orders/${order.id}/dispatch`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      const data: any = await r.json().catch(() => ({}));

      if (!r.ok) {
        toast({ title: data?.error || "Delhivery rejected the cancellation", variant: "destructive" });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["courier-print-search"] });
      queryClient.invalidateQueries({ queryKey: ["phone-history"] });
      toast({ title: "Shipment cancelled — you can re-dispatch when ready" });
    } catch {
      toast({ title: "Failed to cancel shipment. Check your connection.", variant: "destructive" });
    } finally {
      setCancellingShipment(false);
    }
  }

  const recentForSidebar = recentScans.filter((r: any) => r.id !== order?.id).slice(0, 3);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fade-in">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Centered scan prompt — visible when no search is active */}
      {!hasSearched && (
        <div className="flex flex-col items-center pt-12 min-h-[50vh]">
          <p className="text-2xl sm:text-3xl font-extrabold tracking-widest text-slate-800 text-center px-6 select-none uppercase">
            Scan Order Number or Ration Card Number
          </p>
          <p className="mt-3 text-sm text-slate-400 text-center">
            Use a barcode scanner or tap 🔍 in the header to type
          </p>
        </div>
      )}

      {/* Spinner */}
      {hasSearched && isLoading && (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Searching…</p>
        </div>
      )}

      {/* No results */}
      {hasSearched && !isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center py-16 fade-in">
          <AlertCircle className="w-10 h-10 mb-3 text-slate-300" />
          <p className="text-slate-600 font-semibold">No order found</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">"{debouncedSearch}"</p>
          <p className="text-xs text-slate-400 mt-1">No order matched this ration card number or order ID</p>
        </div>
      )}

      {/* Multiple matches — require explicit selection before showing the detail panel */}
      {hasSearched && !isLoading && orders.length > 1 && selectedOrderId == null && (
        <div className="fade-in max-w-lg space-y-2">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            {orders.length} orders match — select the correct one:
          </p>
          {orders.map((o: any) => (
            <button
              key={o.id}
              onClick={() => setSelectedOrderId(o.id)}
              className="w-full text-left border border-slate-200 rounded-lg px-4 py-3 bg-white hover:border-primary hover:bg-slate-50 transition-colors"
            >
              <p className="font-bold text-slate-900 uppercase text-sm leading-tight">{o.customerName}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {o.rationCardNumber} · {o.cardType} · {o.quantity} Cards
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ── Two-panel result ── */}
      {hasSearched && !isLoading && order && (
        <div className="fade-in">

          {/* Order heading */}
          <p className="text-xl font-bold text-slate-900 mb-1">
            Order #{order.orderNumber}
            <span className="text-slate-400 font-normal mx-2">•</span>
            {order.quantity} Cards
            <span className="text-slate-400 font-normal mx-2">•</span>
            {fmtDate(order.createdAt)}
            {order.trackingNumber && (
              <span
                data-testid="badge-shipped-delhivery"
                className="inline-flex items-center gap-1.5 align-middle ml-3 px-3 py-1 rounded-md border border-slate-300 bg-slate-100 text-sm font-medium text-slate-800 whitespace-nowrap"
              >
                Shipped With Delhivery <span aria-hidden="true">🚚</span>
              </span>
            )}
          </p>
          <p className="text-sm text-slate-500 mb-3">
            Ration Card: <span className="font-mono">{order.rationCardNumber}</span>
          </p>

          {/* Pending shipment count for this mobile number */}
          {pendingShipmentCards > 0 && (
            <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
              <span className="text-base">⏳</span>
              <span>
                <strong>{pendingShipmentCards} card{pendingShipmentCards !== 1 ? "s" : ""}</strong> ordered against this mobile number {pendingShipmentCards === 1 ? "is" : "are"} still pending shipment creation
              </span>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── Left: 2-column per-card grid ── */}
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allCards.map((card) => {
                  // hasPdf: true only when the courier has actually downloaded this card (DB-persisted)
                  const hasPdf      = pdfs.some(p => p.cardIndex === card.cardIndex && p.downloaded === true);
                  const highlighted = hasPdf && isPrinted;
                  return (
                    <div
                      key={card.cardIndex}
                      className={`border rounded-lg p-4 text-sm space-y-1.5 transition-colors ${
                        highlighted ? "bg-sky-50 border-sky-200" : "bg-white border-slate-200"
                      }`}
                    >
                      <p className="font-bold text-slate-900 uppercase leading-tight">{card.name}</p>
                      <p className="text-slate-600">
                        Card Number: <span className="font-medium text-slate-800">{card.cardNumber}</span>
                      </p>
                      <p className="text-slate-600">
                        Card Type: <span className="font-medium text-slate-800">{card.cardType}</span>
                      </p>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        Download Status:{" "}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                          hasPdf
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>{hasPdf ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        Print Status:{" "}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                          isPrinted
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>{isPrinted ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Right sidebar ── */}
            <div className="lg:w-64 shrink-0 space-y-3">

              {/* Customer Info */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-900">Customer Info</p>
                  <button
                    onClick={openCustomerEdit}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    data-testid="button-edit-customer-info"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="space-y-1 text-sm text-slate-700">
                  <p>Name: <span className="font-medium" data-testid="text-customer-name">{order.customerName}</span></p>
                  <p>Mobile Number: <span className="font-medium" data-testid="text-customer-phone">{order.customerPhone}</span></p>
                  <p className="mt-2 font-medium text-slate-900">Address</p>
                  <p className="text-xs text-slate-600 leading-relaxed" data-testid="text-customer-address">{fmtAddress(order)}</p>
                </div>
              </div>

              {/* Customer info edit dialog */}
              <Dialog open={editingCustomer} onOpenChange={(open) => { if (!savingCustomer) setEditingCustomer(open); }}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Customer Info</DialogTitle>
                  </DialogHeader>

                  {["dispatched", "delivered"].includes(editOrderStatus ?? order.status) && (
                    <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2" data-testid="text-dispatched-warning">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>This order was already dispatched — the courier shipment and label will <b>not</b> change. Only the details saved here are corrected.</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Customer Name</label>
                      <Input
                        value={customerForm.customerName}
                        onChange={(e) => setCustomerForm(f => ({ ...f, customerName: e.target.value }))}
                        data-testid="input-edit-customer-name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Mobile Number</label>
                      <Input
                        value={customerForm.customerPhone}
                        onChange={(e) => setCustomerForm(f => ({ ...f, customerPhone: e.target.value }))}
                        inputMode="numeric"
                        maxLength={10}
                        data-testid="input-edit-customer-phone"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Street Address</label>
                      <Input
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm(f => ({ ...f, address: e.target.value }))}
                        data-testid="input-edit-customer-street"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Post Office <span className="font-normal text-slate-400">(optional)</span></label>
                        <Input
                          value={customerForm.postOffice}
                          onChange={(e) => setCustomerForm(f => ({ ...f, postOffice: e.target.value }))}
                          data-testid="input-edit-customer-post"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Town / District</label>
                        <Input
                          value={customerForm.district}
                          onChange={(e) => setCustomerForm(f => ({ ...f, district: e.target.value }))}
                          data-testid="input-edit-customer-district"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">PIN Code</label>
                        <Input
                          value={customerForm.pincode}
                          onChange={(e) => setCustomerForm(f => ({ ...f, pincode: e.target.value }))}
                          inputMode="numeric"
                          maxLength={6}
                          data-testid="input-edit-customer-pincode"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">State</label>
                        <Input
                          value={customerForm.state}
                          onChange={(e) => setCustomerForm(f => ({ ...f, state: e.target.value }))}
                          data-testid="input-edit-customer-state"
                        />
                      </div>
                    </div>
                  </div>

                  {customerFormError && (
                    <p className="text-sm text-red-600" data-testid="text-customer-edit-error">{customerFormError}</p>
                  )}

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => setEditingCustomer(false)}
                      disabled={savingCustomer}
                      data-testid="button-cancel-customer-edit"
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveCustomerInfo} disabled={savingCustomer} data-testid="button-save-customer-edit">
                      {savingCustomer ? (<><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Saving…</>) : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>


              {/* Welcome Letter — generated in-browser, always enabled */}
              <button
                onClick={() => printWelcomeLetter(order)}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-sky-500 hover:bg-sky-600 text-white transition-colors"
              >
                Download Welcome Letter
              </button>

              {/* Previous orders by same phone number */}
              {phoneHistory.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Previous Orders</p>
                  {phoneHistory.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => onSearchChange(r.orderNumber)}
                      className="w-full text-left border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-baseline justify-between gap-x-2">
                        <div className="flex flex-wrap gap-x-2 items-baseline min-w-0">
                          <span className="font-mono font-semibold text-primary">Order #{r.orderNumber}</span>
                          <span className="uppercase font-medium text-slate-700 truncate">{r.customerName}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-slate-400">
                        <span>{fmtDate(r.createdAt)}</span>
                        <span>·</span>
                        <span>{r.quantity} Cards</span>
                        <span>·</span>
                        <span className={`font-semibold ${
                          ["printed","dispatched","delivered"].includes(r.status)
                            ? "text-emerald-600" : "text-amber-500"
                        }`}>{r.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Shipment hint — cards still pending download */}
              {isPrinted && !allCardsDownloaded && (
                <div className="w-full py-2.5 px-4 rounded-lg text-sm bg-slate-100 border border-slate-200 text-slate-500 text-center">
                  Download all cards first to create shipment
                </div>
              )}

            </div>
          </div>

          {/* Spacer so the fixed shipment button never overlaps content */}
          {isPrinted && allCardsDownloaded && <div className="h-20" />}
        </div>
      )}

      {/* ── Create Shipment with Delhivery — pinned bottom-right ── */}
      {order && isPrinted && allCardsDownloaded && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
          {order.trackingNumber && (
            <button
              onClick={handleCancelShipment}
              disabled={cancellingShipment || creatingShipment}
              data-testid="button-cancel-shipment"
              className="px-5 py-2.5 rounded-md bg-white border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold shadow-lg transition-colors"
            >
              {cancellingShipment ? "Cancelling…" : "Cancel Shipment"}
            </button>
          )}
          <button
            onClick={() =>
              order.trackingNumber
                ? openShippingLabelPage(order)
                : handleCreateShipment()
            }
            disabled={creatingShipment || cancellingShipment}
            data-testid="button-create-shipment"
            className="px-5 py-2.5 rounded-md bg-[#16257d] hover:bg-[#1d309e] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-lg transition-colors"
          >
            {creatingShipment
              ? "Creating Shipment…"
              : order.trackingNumber
                ? "Download Shipping Label"
                : "Create Shipment with Delhivery"}
          </button>
        </div>
      )}
    </div>
  );
}
