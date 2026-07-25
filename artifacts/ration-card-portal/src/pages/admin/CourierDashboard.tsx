import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Download, FileText, ArrowLeft, Printer, Truck,
  Package, CheckCircle2, AlertCircle, ChevronRight,
} from "lucide-react";

const COURIER_OPTIONS = [
  { value: "ecom-express", label: "Ecom Express" },
  { value: "ecom-express-shipyaari", label: "Ecom Express (Shipyaari)" },
  { value: "delivery", label: "Delivery" },
  { value: "xpressbees", label: "XpressBees" },
];

const COURIER_STORAGE_KEY = "courierDashboard_selectedCourier";

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Service = "download" | "print" | null;

interface CourierDashboardProps {
  source: "public" | "operator";
}

export default function CourierDashboard({ source }: CourierDashboardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCourier, setSelectedCourier] = useState<string>(() => {
    return localStorage.getItem(COURIER_STORAGE_KEY) ?? "delivery";
  });
  const [activeService, setActiveService] = useState<Service>(null);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) setLocation("/admin/login");
  }, [setLocation]);

  function handleCourierChange(val: string) {
    setSelectedCourier(val);
    localStorage.setItem(COURIER_STORAGE_KEY, val);
  }

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
          <div className="container mx-auto px-4 h-12 flex items-center justify-between gap-4">
            {/* Brand + panel title */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <Link href="/admin/dashboard" className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-[10px]">
                  C
                </div>
                <span className="font-semibold">Ration Card</span>
              </Link>
              <span className="text-slate-400 font-normal">mPanel</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{label}</span>
            </div>

            {/* Courier service dropdown */}
            <Select value={selectedCourier} onValueChange={handleCourierChange}>
              <SelectTrigger className="w-44 h-8 text-xs border-slate-300">
                <SelectValue>{courierLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Change Shipping Partner
                </div>
                {COURIER_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-sm">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="container mx-auto px-4 py-10">
          {activeService === null ? (
            <LandingView
              label={label}
              onSelect={setActiveService}
            />
          ) : activeService === "download" ? (
            <DownloadView source={source} label={label} onBack={() => setActiveService(null)} toast={toast} />
          ) : (
            <PrintStatusView source={source} label={label} onBack={() => setActiveService(null)} toast={toast} queryClient={queryClient} />
          )}
        </main>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────── */
/* Landing: two service cards                  */
/* ─────────────────────────────────────────── */
function LandingView({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (s: Service) => void;
}) {
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
    <div className="fade-in">
      <h1 className="text-xl font-semibold text-slate-800 mb-6">
        Select Service{" "}
        <span className="text-primary font-normal">• {label}</span>
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
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
                  <p className="font-semibold text-slate-800 text-sm group-hover:text-primary transition-colors">
                    {title}
                  </p>
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
  source,
  label,
  onBack,
  toast,
}: {
  source: "public" | "operator";
  label: string;
  onBack: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const { data, isLoading, error } = useQuery<{ orders: any[]; total: number }>({
    queryKey: ["courier-download", source],
    queryFn: async () => {
      const params = new URLSearchParams({
        source,
        paymentStatus: "confirmed",
        limit: "100",
      });
      const r = await fetch(`/api/orders?${params}`, { headers: getAuthHeader() });
      if (!r.ok) throw new Error("Failed to fetch orders");
      return r.json();
    },
    refetchInterval: 30000,
  });

  const orders = data?.orders ?? [];

  return (
    <div className="fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-lg font-semibold text-slate-800 mb-1">Download Ration Card</h2>
      <p className="text-sm text-slate-500 mb-6">
        Confirmed orders from{" "}
        <span className="font-medium text-slate-700">{label}</span> — download PDF(s) for printing.
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
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No confirmed orders found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Order #</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Cards</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">PDF(s)</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, i) => {
                  const pdfs: { cardIndex: number; pdfUrl: string }[] = order.rationCardPdfs ?? [];
                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-slate-50/60 transition-colors"
                      style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${i * 30}ms` }}
                    >
                      <TableCell className="font-mono text-xs font-medium text-primary">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{order.customerName}</p>
                        <p className="text-xs text-slate-500">{order.customerPhone}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{order.cardType}</Badge>
                        <span className="text-xs text-slate-500 ml-1">×{order.quantity}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-xs capitalize border bg-blue-100 text-blue-700 border-blue-200">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pdfs.length === 0 ? (
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {pdfs.map((p, idx) => (
                              <a
                                key={p.cardIndex}
                                href={p.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                              >
                                <Download className="w-3 h-3" />
                                {pdfs.length === 1 ? "PDF" : `PDF ${idx + 1}`}
                              </a>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
            {orders.length} order{orders.length !== 1 ? "s" : ""} found
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────── */
/* Print Status Update sub-view                */
/* ─────────────────────────────────────────── */
function PrintStatusView({
  source,
  label,
  onBack,
  toast,
  queryClient,
}: {
  source: "public" | "operator";
  label: string;
  onBack: () => void;
  toast: ReturnType<typeof useToast>["toast"];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { data, isLoading, error } = useQuery<{ orders: any[]; total: number }>({
    queryKey: ["courier-print", source],
    queryFn: async () => {
      const params = new URLSearchParams({ source, status: "processing", limit: "100" });
      const r = await fetch(`/api/orders?${params}`, { headers: getAuthHeader() });
      if (!r.ok) throw new Error("Failed to fetch orders");
      return r.json();
    },
    refetchInterval: 30000,
  });

  const [markingId, setMarkingId] = useState<number | null>(null);

  async function markAsPrinted(orderId: number) {
    setMarkingId(orderId);
    try {
      const r = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { ...getAuthHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "printed" }),
      });
      if (!r.ok) throw new Error("Failed");
      toast({ title: "Order marked as printed!" });
      queryClient.invalidateQueries({ queryKey: ["courier-print", source] });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setMarkingId(null);
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

      <h2 className="text-lg font-semibold text-slate-800 mb-1">Print Status Update</h2>
      <p className="text-sm text-slate-500 mb-6">
        Orders in <span className="font-medium text-blue-700">processing</span> from{" "}
        <span className="font-medium text-slate-700">{label}</span> — mark them as printed once done.
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
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No orders in processing — all caught up!</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Order #</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Cards</TableHead>
                  <TableHead className="text-xs">PDF(s)</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order, i) => {
                  const pdfs: { cardIndex: number; pdfUrl: string }[] = order.rationCardPdfs ?? [];
                  return (
                    <TableRow
                      key={order.id}
                      className="hover:bg-slate-50/60 transition-colors"
                      style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${i * 30}ms` }}
                    >
                      <TableCell className="font-mono text-xs font-medium text-primary">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{order.customerName}</p>
                        <p className="text-xs text-slate-500">{order.customerPhone}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{order.cardType}</Badge>
                        <span className="text-xs text-slate-500 ml-1">×{order.quantity}</span>
                      </TableCell>
                      <TableCell>
                        {pdfs.length === 0 ? (
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <FileText className="w-3 h-3" />
                            {pdfs.length}/{order.quantity} ready
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs text-purple-700 border-purple-300 hover:bg-purple-50"
                          disabled={markingId === order.id}
                          onClick={() => markAsPrinted(order.id)}
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          {markingId === order.id ? "Saving…" : "Mark Printed"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-2 border-t bg-slate-50 text-xs text-slate-500">
            {orders.length} order{orders.length !== 1 ? "s" : ""} in processing
          </div>
        </div>
      )}
    </div>
  );
}
