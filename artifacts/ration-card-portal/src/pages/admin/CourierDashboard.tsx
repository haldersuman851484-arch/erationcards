import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  Download, FileText, ArrowLeft, Printer,
  Package, CheckCircle2, AlertCircle, ChevronRight, Search, X, Truck,
} from "lucide-react";

const COURIER_OPTIONS = [
  { value: "ecom-express", label: "Ecom Express" },
  { value: "ecom-express-shipyaari", label: "Ecom Express (Shipyaari)" },
  { value: "delivery", label: "Delivery" },
  { value: "xpressbees", label: "XpressBees" },
];

const CARD_TYPES = ["AAY", "PHH", "SPHH", "RKSY-I", "RKSY-II"] as const;
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

type Service = "download" | "print" | "dispatch" | null;

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
        setPrintSearchOpen(true);
        setPrintSearchValue(e.key);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeService, printSearchOpen]);

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
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-[10px]">■</div>
                <span className="font-semibold text-sm text-slate-800">Ration Card</span>
                <span className="text-slate-400 text-sm font-normal">mPanel</span>
                <span className="text-slate-300 text-sm select-none">•</span>
                <span className="text-sm font-medium text-primary">{label}</span>
              </div>
            ) : (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity shrink-0"
              >
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-[10px]">C</div>
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
              onSearchClear={() => { setPrintSearchOpen(false); setPrintSearchValue(""); }}
            />
          ) : (
            <DispatchView
              source={source}
              label={label}
              onBack={handleBack}
              toast={toast}
              queryClient={queryClient}
            />
          )}
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
    {
      key: "dispatch" as const,
      icon: Truck,
      title: "Dispatch Orders",
      description: "Dispatch printed cards via Delhivery and get AWB numbers automatically.",
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
  // PATCH state tracked per order (one PATCH per order, on first PDF download)
  const [patchedOrders, setPatchedOrders]   = useState<Set<number>>(new Set());
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

      const r = await fetch(`/api/orders?${params}`, { headers: getAuthHeader() });
      if (!r.ok) throw new Error("Failed to fetch orders");
      return r.json();
    },
    refetchInterval: 30000,
  });

  async function handleDownload(orderId: number, cardIndex: number, pdfUrl: string, totalPdfs: number) {
    const pdfKey = `${orderId}_${cardIndex}`;
    if (downloadingPdfs.has(pdfKey)) return;

    setDownloadingPdfs(prev => { const s = new Set(prev); s.add(pdfKey); return s; });

    try {
      // Fetch PDF as blob to force a real file download (preserves server filename)
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

      // Mark this individual PDF as downloaded
      setDownloadedPdfs(prev => { const s = new Set(prev); s.add(pdfKey); return s; });

      // PATCH order to processing on first PDF download — non-blocking, fires once per order
      if (!patchedOrders.has(orderId)) {
        setPatchedOrders(prev => { const s = new Set(prev); s.add(orderId); return s; });
        try {
          const pr = await fetch(`/api/orders/${orderId}`, {
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

  async function retrySyncPatch(orderId: number) {
    try {
      const pr = await fetch(`/api/orders/${orderId}`, {
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
                  const pdfs: { cardIndex: number; pdfUrl: string }[] = order.rationCardPdfs ?? [];
                  // All PDFs downloaded → show single green badge instead of buttons
                  const allDownloaded = pdfs.length > 0 && pdfs.every(p => downloadedPdfs.has(`${order.id}_${p.cardIndex}`));
                  const syncFailed    = syncFailedOrders.has(order.id);

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
                        ) : allDownloaded ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Downloaded ✓
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {/* Per-PDF download buttons — each independent */}
                            {pdfs.map((p, idx) => {
                              const pdfKey     = `${order.id}_${p.cardIndex}`;
                              const isDone     = downloadedPdfs.has(pdfKey);
                              const isInFlight = downloadingPdfs.has(pdfKey);
                              return isDone ? (
                                <span key={p.cardIndex} className="flex items-center gap-1 text-xs text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {pdfs.length === 1 ? "Downloaded ✓" : `PDF ${idx + 1} ✓`}
                                </span>
                              ) : (
                                <button
                                  key={p.cardIndex}
                                  disabled={isInFlight}
                                  onClick={() => handleDownload(order.id, p.cardIndex, p.pdfUrl, pdfs.length)}
                                  className="inline-flex items-center gap-1 text-xs border border-slate-300 rounded px-2 py-0.5 hover:border-primary hover:text-primary transition-colors text-slate-600 disabled:opacity-50 disabled:cursor-wait"
                                >
                                  {isInFlight ? (
                                    <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3" />
                                  )}
                                  {pdfs.length === 1 ? (isInFlight ? "Downloading…" : "Download") : (isInFlight ? `PDF ${idx + 1}…` : `PDF ${idx + 1}`)}
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
                                  onClick={() => retrySyncPatch(order.id)}
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
/* Dispatch Orders sub-view (Delhivery)        */
/* ─────────────────────────────────────────── */
function DispatchView({
  source, label, onBack, toast, queryClient,
}: {
  source: "public" | "operator";
  label: string;
  onBack: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { data, isLoading, error } = useQuery<{ orders: any[]; total: number }>({
    queryKey: ["courier-dispatch", source],
    queryFn: async () => {
      const params = new URLSearchParams({ source, status: "printed", limit: "100" });
      const r = await fetch(`/api/orders?${params}`, { headers: getAuthHeader() });
      if (!r.ok) throw new Error("Failed to fetch orders");
      return r.json();
    },
    refetchInterval: 30000,
  });

  // Track dispatched orders in this session: id -> awb
  const [dispatchedMap, setDispatchedMap] = useState<Record<number, string>>({});
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);

  async function dispatchOrder(orderId: number) {
    setDispatchingId(orderId);
    try {
      const r = await fetch(`/api/orders/${orderId}/dispatch`, {
        method: "POST",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({ title: (body as any).error ?? "Dispatch failed", variant: "destructive" });
        return;
      }
      const awb = (body as any).awb ?? (body as any).trackingNumber ?? "—";
      setDispatchedMap((prev) => ({ ...prev, [orderId]: awb }));
      toast({ title: `Dispatched! AWB: ${awb}` });
      queryClient.invalidateQueries({ queryKey: ["courier-dispatch", source] });
    } catch {
      toast({ title: "Network error — dispatch failed", variant: "destructive" });
    } finally {
      setDispatchingId(null);
    }
  }

  const orders = data?.orders ?? [];

  return (
    <div className="fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-lg font-semibold text-slate-800 mb-1">Dispatch Orders</h2>
      <p className="text-sm text-slate-500 mb-6">
        Orders in <span className="font-medium text-purple-700">printed</span> status from{" "}
        <span className="font-medium text-slate-700">{label}</span> — dispatch via Delhivery to get AWB numbers.
      </p>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Loading orders…</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center text-red-500 text-sm">Failed to load orders. Please try again.</div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No printed orders to dispatch — all caught up!</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Card Number</TableHead>
                  <TableHead className="text-xs">Card Type</TableHead>
                  <TableHead className="text-xs">Address</TableHead>
                  <TableHead className="text-xs">Action / AWB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, i) => {
                  const awb = dispatchedMap[order.id];
                  const alreadyDispatched = !!awb || order.status === "dispatched";
                  const existingAwb = awb ?? order.trackingNumber;
                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-slate-50/60 transition-colors"
                      style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${Math.min(i * 30, 400)}ms` }}
                    >
                      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-800 uppercase">{order.customerName}</TableCell>
                      <TableCell className="text-sm font-mono text-slate-700">{order.rationCardNumber}</TableCell>
                      <TableCell className="text-sm text-slate-700">{order.cardType}</TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[160px] truncate">
                        {order.address}, {order.district} – {order.pincode}
                      </TableCell>
                      <TableCell>
                        {alreadyDispatched && existingAwb ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> Dispatched ✓
                            </span>
                            <span className="text-xs font-mono text-slate-500">{existingAwb}</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs text-orange-700 border-orange-300 hover:bg-orange-50"
                            disabled={dispatchingId === order.id}
                            onClick={() => dispatchOrder(order.id)}
                          >
                            <Truck className="w-3 h-3 mr-1" />
                            {dispatchingId === order.id ? "Dispatching…" : "Dispatch via Delhivery"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
            {orders.length} order{orders.length !== 1 ? "s" : ""} ready to dispatch
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
  source, onBack, toast, queryClient, searchValue, onSearchClear,
}: {
  source: "public" | "operator";
  label: string;
  onBack: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
  searchValue: string;
  onSearchClear: () => void;
}) {
  const debouncedSearch = useDebounce(searchValue, 300);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [undoOrderId, setUndoOrderId] = useState<number | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]); // session-local scan history for sidebar
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null); // null = show picker when multiple

  // Refs never go stale inside closures — used for undo gate + toast teardown
  const undoTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUndoTokenRef = useRef<string | null>(null);   // unique per mark-printed; null = window closed
  const activeToastDismissRef = useRef<(() => void) | null>(null); // dismiss handle for the undo toast

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
      const r = await fetch(`/api/orders?${params}`, { headers: getAuthHeader() });
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
      const r = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing" }),
      });
      if (!r.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["courier-print-search"] });
      toast({ title: "Undone — order is back to processing" });
    } catch {
      toast({ title: "Undo failed. Please correct it from the admin dashboard.", variant: "destructive" });
    }
  }

  async function markAsPrinted(orderId: number) {
    setMarkingId(orderId);
    try {
      const r = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "printed" }),
      });
      if (!r.ok) throw new Error("Failed");

      // Clear search immediately so next card can be scanned
      onSearchClear();

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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function buildAllCards(o: any) {
    const family: { customerName: string; rationCardNumber: string; cardType: string }[] = o.familyCards ?? [];
    return [
      { name: o.customerName, cardNumber: o.rationCardNumber, cardType: o.cardType, cardIndex: 0 },
      ...family.map((fc, i) => ({
        name: fc.customerName, cardNumber: fc.rationCardNumber, cardType: fc.cardType, cardIndex: i + 1,
      })),
    ];
  }

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

  const allCards  = order ? buildAllCards(order) : [];
  const pdfs: { cardIndex: number; pdfUrl: string }[] = order?.rationCardPdfs ?? [];
  const isPrinted = order ? ["printed", "dispatched", "delivered"].includes(order.status) : false;
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
            Scan Ration Card or PRN Number
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
          <p className="text-xs text-slate-400 mt-1">No processing order matched this ration card number or order ID</p>
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

          {/* PRN heading */}
          <p className="text-xl font-bold text-slate-900 mb-5">
            PRN{order.rationCardNumber}
            <span className="text-slate-400 font-normal mx-2">•</span>
            {order.quantity} Cards
            <span className="text-slate-400 font-normal mx-2">•</span>
            {fmtDate(order.createdAt)}
          </p>

          <div className="flex flex-col lg:flex-row gap-6">

            {/* ── Left: 2-column per-card grid ── */}
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allCards.map((card) => {
                  const hasPdf      = pdfs.some(p => p.cardIndex === card.cardIndex);
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
                <p className="font-bold text-slate-900 mb-2">Customer Info</p>
                <div className="space-y-1 text-sm text-slate-700">
                  <p>Name: <span className="font-medium">{order.customerName}</span></p>
                  <p>Mobile Number: <span className="font-medium">{order.customerPhone}</span></p>
                  <p className="mt-2 font-medium text-slate-900">Address</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{fmtAddress(order)}</p>
                </div>
              </div>

              {/* Dealer Signature Card — orange, disabled until URL is uploaded */}
              <button
                disabled={!order.dealerSignatureCardUrl}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = order.dealerSignatureCardUrl;
                  a.download = `dealer-signature-${order.rationCardNumber}.pdf`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                }}
                className="w-full py-3 px-4 rounded-lg font-extrabold text-sm tracking-wider uppercase bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={!order.dealerSignatureCardUrl ? "Not uploaded yet" : undefined}
              >
                Dealer Signature Card
              </button>

              {/* Welcome Letter — sky blue, disabled until URL is uploaded */}
              <button
                disabled={!order.welcomeLetterUrl}
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = order.welcomeLetterUrl;
                  a.download = `welcome-letter-${order.rationCardNumber}.pdf`;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                }}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={!order.welcomeLetterUrl ? "Not uploaded yet" : undefined}
              >
                Download Welcome Letter
              </button>

              {/* Mark Printed */}
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 text-sm"
                disabled={markingId === order.id || isPrinted}
                onClick={() => markAsPrinted(order.id)}
              >
                <Printer className="w-4 h-4 mr-2" />
                {markingId === order.id ? "Saving…" : isPrinted ? "Already Printed ✓" : "Mark Printed"}
              </Button>

              {/* Recently scanned */}
              {recentForSidebar.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recently Scanned</p>
                  {recentForSidebar.map((r: any) => (
                    <div key={r.id} className="border border-slate-200 rounded-lg px-3 py-2 text-xs bg-slate-50">
                      <div className="flex flex-wrap gap-x-2 items-baseline">
                        <span className="font-mono font-medium text-slate-800">{r.rationCardNumber}</span>
                        <span className="uppercase font-medium text-slate-700">{r.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-slate-400">
                        <span>{fmtDate(r.createdAt)}</span>
                        <span>·</span>
                        <span>{r.quantity} Cards</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
