import { useState, useRef, useEffect } from "react";
import { Navbar, Footer, BRAND } from "@/components/layout";
import { useSeo } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrackOrder, getTrackOrderQueryKey, useSubmitReview } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Search, Package, Printer, Truck, CheckCircle, Clock, MessageCircle, MapPin, CalendarClock, ExternalLink, Star, CheckCircle2, Upload, FileCheck, ChevronDown, ChevronUp } from "lucide-react";

type PdfEntry = { cardIndex: number; pdfUrl: string; uploadedAt: string };

function addWorkingDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) added++;
  }
  return result;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getDeliveryTimeline(status: string, createdAt: string, updatedAt: string): { label: string; date: string } | null {
  if (status === "delivered" || status === "pending") return null;
  if (status === "dispatched") {
    const dispatchDate = new Date(updatedAt);
    const earliest = addWorkingDays(dispatchDate, 5);
    const latest = addWorkingDays(dispatchDate, 7);
    return {
      label: "Expected delivery",
      date: `${formatDate(earliest)} – ${formatDate(latest)}`,
    };
  }
  const orderDate = new Date(createdAt);
  const daysFromOrder: Record<string, [number, number]> = {
    processing: [8, 12],
    printed: [6, 9],
  };
  const [min, max] = daysFromOrder[status] ?? [8, 12];
  const earliest = addWorkingDays(orderDate, min);
  const latest = addWorkingDays(orderDate, max);
  return {
    label: "Estimated delivery",
    date: `${formatDate(earliest)} – ${formatDate(latest)}`,
  };
}

function getCourierTrackingUrl(trackingNumber: string): { url: string; name: string } | null {
  const tn = trackingNumber.trim().toUpperCase();

  if (/^[A-Z]{2}\d{9}IN$/.test(tn)) {
    return {
      url: `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?TrackId=${tn}`,
      name: "India Post",
    };
  }

  if (/^\d{12,18}$/.test(tn) || /^D\d{10,14}$/.test(tn)) {
    return {
      url: `https://www.delhivery.com/track/package/${tn}`,
      name: "Delhivery",
    };
  }

  if (/^[A-Z]\d{10}$/.test(tn) || /^[A-Z]{2}\d{9}$/.test(tn)) {
    return {
      url: `https://www.dtdc.in/tracking.asp?Tracking_no=${tn}`,
      name: "DTDC",
    };
  }

  if (/^\d{9,11}$/.test(tn)) {
    return {
      url: `https://www.bluedart.com/tracking?trackfor=${tn}`,
      name: "BlueDart",
    };
  }

  if (/^[A-Z]{3}\d{10}$/.test(tn)) {
    return {
      url: `https://ecomexpress.in/tracking/?awb_field=${tn}`,
      name: "Ecom Express",
    };
  }

  return null;
}

/* ── Delhivery live scan timeline ─────────────────────────────────────── */
function DelhiveryScanTimeline({ orderId, trackingNumber }: { orderId: number; trackingNumber: string }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSED_COUNT = 5;

  const { data, isLoading, error } = useQuery<{ scans: { date: string; location: string; status: string; activity: string }[]; awb: string }>({
    queryKey: ["delhivery-tracking", orderId],
    queryFn: async () => {
      const r = await fetch(`/api/orders/${orderId}/tracking`);
      if (!r.ok) throw new Error("Tracking unavailable");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Truck className="w-4 h-4 text-orange-500" />Shipment Tracking</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-slate-400 animate-pulse">Fetching live tracking…</p></CardContent>
      </Card>
    );
  }

  if (error || !data || data.scans.length === 0) {
    // Silent fallback — the tracking number link is already shown above
    return null;
  }

  const scans = data.scans;
  const visible = expanded ? scans : scans.slice(0, COLLAPSED_COUNT);

  return (
    <Card className="border-orange-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-orange-500" />
            Delhivery Tracking
          </div>
          <span className="text-xs font-mono font-normal text-slate-500">{trackingNumber}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visible.map((scan, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <div className={`w-2.5 h-2.5 rounded-full border-2 ${idx === 0 ? "bg-orange-500 border-orange-500" : "bg-white border-slate-300"}`} />
                {idx < visible.length - 1 && <div className="w-px h-6 bg-slate-200 mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className={`text-sm font-medium ${idx === 0 ? "text-slate-900" : "text-slate-600"}`}>
                  {scan.status}{scan.activity && scan.activity !== scan.status ? ` — ${scan.activity}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                  {scan.location && <span className="text-xs text-slate-500"><MapPin className="w-2.5 h-2.5 inline mr-0.5" />{scan.location}</span>}
                  {scan.date && <span className="text-xs text-slate-400">{new Date(scan.date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {scans.length > COLLAPSED_COUNT && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {scans.length} events</>}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Clock, color: "text-yellow-500" },
  { key: "processing", label: "Processing", icon: Package, color: "text-blue-500" },
  { key: "printed", label: "Card Printed", icon: Printer, color: "text-purple-500" },
  { key: "dispatched", label: "Dispatched", icon: Truck, color: "text-orange-500" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "text-emerald-500" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  printed: "bg-purple-100 text-purple-700 border-purple-200",
  dispatched: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          data-testid={`star-rating-${star}`}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300 fill-slate-100"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm text-slate-500 ml-1.5">{value} star{value !== 1 ? "s" : ""}</span>
      )}
    </div>
  );
}

export default function TrackOrder() {
  useSeo({
    title: "Track Your PVC Ration Card Order Status",
    description: "Enter your order number or ration card number to check the real-time printing and delivery status of your PVC ration card.",
    canonical: "https://erationcards.in/track",
  });
  const [orderNumber, setOrderNumber] = useState("");
  const [rationCardNumber, setRationCardNumber] = useState("");
  const [searchParams, setSearchParams] = useState<{ orderNumber?: string; rationCardNumber?: string } | null>(null);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewQuote, setReviewQuote] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [localPdfs, setLocalPdfs] = useState<PdfEntry[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const submitReview = useSubmitReview();

  const { data: order, isLoading, error } = useTrackOrder(
    searchParams ?? {},
    { query: { enabled: !!searchParams, queryKey: getTrackOrderQueryKey(searchParams ?? {}) } }
  );

  useEffect(() => {
    if (order) {
      setLocalPdfs((order as any).rationCardPdfs ?? []);
      setUploadError(null);
    }
  }, [order]);

  async function handlePdfUpload(cardIndex: number, file: File) {
    if (!order) return;
    setUploadingIdx(cardIndex);
    setUploadError(null);
    const fd = new FormData();
    fd.append("pdf", file);
    fd.append("cardIndex", String(cardIndex));
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}/upload-card-pdf`, { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setUploadError((body as any).error ?? "Upload failed. Please try again.");
      } else {
        const data: PdfEntry = await res.json();
        setLocalPdfs((prev) => [
          ...prev.filter((p) => p.cardIndex !== cardIndex),
          data,
        ].sort((a, b) => a.cardIndex - b.cardIndex));
      }
    } catch {
      setUploadError("Upload failed. Please check your connection and try again.");
    } finally {
      setUploadingIdx(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber && !rationCardNumber) return;
    setReviewSubmitted(false);
    setReviewError(null);
    setReviewRating(0);
    setReviewQuote("");
    setSearchParams({
      orderNumber: orderNumber || undefined,
      rationCardNumber: rationCardNumber || undefined,
    });
  }

  function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    if (reviewRating === 0) { setReviewError("Please select a star rating."); return; }
    if (!reviewName.trim()) { setReviewError("Please enter your name."); return; }
    if (reviewQuote.trim().length < 5) { setReviewError("Please write at least a short review."); return; }
    setReviewError(null);
    submitReview.mutate(
      {
        data: {
          orderNumber: order.orderNumber,
          customerName: reviewName.trim(),
          rating: reviewRating,
          quote: reviewQuote.trim(),
        },
      },
      {
        onSuccess: () => setReviewSubmitted(true),
        onError: () => setReviewError("Failed to submit review. Please try again."),
      }
    );
  }

  const currentStepIdx = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;

  const whatsAppUrl = order
    ? `https://wa.me/${BRAND.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I'd like to get updates on my order #${order.orderNumber} (Ration Card: ${order.rationCardNumber}). Please let me know the current status.`
      )}`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-10">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Track Your Order</h1>
          <p className="text-slate-600">Enter your order number or ration card number to check the current status.</p>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-slate-200 shadow-sm mb-8">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Order Number</label>
                  <Input
                    data-testid="input-order-number"
                    placeholder="e.g. PVCABC1234XY"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-sm text-slate-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Ration Card Number</label>
                  <Input
                    data-testid="input-ration-card-number"
                    placeholder="Enter ration card number"
                    value={rationCardNumber}
                    onChange={(e) => setRationCardNumber(e.target.value)}
                  />
                </div>
                <Button type="submit" data-testid="button-track-search" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={isLoading || (!orderNumber && !rationCardNumber)}>
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? "Searching..." : "Track Order"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-200 bg-red-50 shadow-sm">
              <CardContent className="pt-6 text-center">
                <p className="text-red-600 font-medium">Order not found</p>
                <p className="text-sm text-red-500 mt-1">Please check the order number or ration card number and try again.</p>
              </CardContent>
            </Card>
          )}

          {order && (
            <div className="space-y-6" data-testid="order-tracking-result">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg leading-tight" data-testid="text-order-number">Order #{order.orderNumber}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    <Badge className={`${STATUS_BADGE[order.status] || ""} border capitalize shrink-0`} data-testid="status-order">
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-slate-500 mb-0.5">Customer Name</p>
                      <p className="font-medium text-slate-900" data-testid="text-customer-name">{order.customerName}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-slate-500 mb-0.5">Card Type</p>
                      <p className="font-medium text-slate-900">{order.cardType}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-slate-500 mb-0.5">Ration Card No</p>
                      <p className="font-medium text-slate-900 font-mono text-xs break-all">{order.rationCardNumber}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-slate-500 mb-0.5">Amount Paid</p>
                      <p className="font-medium text-emerald-600">₹{order.amount}</p>
                    </div>
                  </div>
                  {order.trackingNumber && (() => {
                    const isShipped = order.status === "dispatched" || order.status === "delivered";
                    const courier = isShipped ? getCourierTrackingUrl(order.trackingNumber) : null;
                    return (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Tracking Number</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-mono font-semibold text-primary break-all" data-testid="text-tracking-number">{order.trackingNumber}</p>
                          {courier && (
                            <a
                              href={courier.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid="link-track-courier"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2 shrink-0"
                            >
                              Track with {courier.name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200" data-testid="delivery-address">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <p className="text-xs text-slate-500 font-medium">Delivery Address</p>
                    </div>
                    <p className="text-sm text-slate-800 leading-snug">
                      {order.address}
                    </p>
                    <p className="text-sm text-slate-800 leading-snug">
                      {order.district}, {order.state} – {order.pincode}
                    </p>
                  </div>

                  {(() => {
                    const timeline = getDeliveryTimeline(order.status, order.createdAt, order.updatedAt);
                    if (!timeline) return null;
                    const isDispatched = order.status === "dispatched";
                    return (
                      <div
                        className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border ${isDispatched ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"}`}
                        data-testid="estimated-delivery"
                      >
                        <CalendarClock className={`w-4 h-4 shrink-0 mt-0.5 ${isDispatched ? "text-orange-500" : "text-blue-500"}`} />
                        <div>
                          <p className={`text-sm font-semibold ${isDispatched ? "text-orange-800" : "text-blue-800"}`}>{timeline.label}</p>
                          <p className={`text-sm font-medium ${isDispatched ? "text-orange-700" : "text-blue-700"}`}>{timeline.date}</p>
                          {!isDispatched && (
                            <p className="text-xs text-slate-500 mt-0.5">Actual date may vary once dispatched</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {(() => {
                const allCards = [
                  { cardIndex: 0, name: order.customerName, cardType: order.cardType },
                  ...((order.familyCards ?? []) as { customerName: string; cardType: string }[]).map((fc, i) => ({
                    cardIndex: i + 1,
                    name: fc.customerName,
                    cardType: fc.cardType,
                  })),
                ];
                const missing = allCards.filter(c => !localPdfs.some(p => p.cardIndex === c.cardIndex));
                if (missing.length === 0) return null;
                return (
                  <Card className="border-amber-200 bg-amber-50 shadow-sm" data-testid="pdf-upload-section">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Upload className="w-4 h-4 text-amber-600" />
                        Upload Your e-Ration Card PDF
                      </CardTitle>
                      <p className="text-xs text-slate-600 mt-0.5">
                        We need your original e-Ration Card PDF (downloaded from food.wb.gov.in) to print your PVC card.
                        {allCards.length > 1 && " Upload a PDF for each card holder below."}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {allCards.map((card) => {
                        const uploaded = localPdfs.some(p => p.cardIndex === card.cardIndex);
                        const isUploading = uploadingIdx === card.cardIndex;
                        return (
                          <div key={card.cardIndex} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">{card.name}</p>
                              <p className="text-xs text-slate-500">{card.cardType}</p>
                            </div>
                            {uploaded ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 shrink-0">
                                <FileCheck className="w-4 h-4" />
                                <span className="text-xs font-medium">Uploaded</span>
                              </div>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  accept=".pdf,image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  ref={(el) => { fileRefs.current[card.cardIndex] = el; }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePdfUpload(card.cardIndex, file);
                                    e.target.value = "";
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
                                  disabled={isUploading}
                                  onClick={() => fileRefs.current[card.cardIndex]?.click()}
                                  data-testid={`button-upload-pdf-${card.cardIndex}`}
                                >
                                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                                  {isUploading ? "Uploading…" : "Upload PDF"}
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {uploadError && (
                        <p className="text-sm text-red-600 pt-1" data-testid="pdf-upload-error">{uploadError}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              <Card className="border-slate-200 shadow-sm">
                <CardHeader><CardTitle className="text-base">Order Progress</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {STATUS_STEPS.map((step, idx) => {
                      const isDone = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      const Icon = step.icon;
                      const stepDate =
                        idx === 0
                          ? formatDate(new Date(order.createdAt))
                          : isCurrent && idx > 0
                          ? formatDate(new Date(order.updatedAt))
                          : isDone && idx > 0
                          ? formatDate(new Date(order.updatedAt))
                          : null;
                      return (
                        <div key={step.key} className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${isDone ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-400"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {idx < STATUS_STEPS.length - 1 && (
                              <div className={`w-0.5 h-8 mt-1 ${isDone && idx < currentStepIdx ? "bg-primary" : "bg-slate-200"}`} />
                            )}
                          </div>
                          <div className="pt-1.5 pb-8">
                            <p className={`text-sm font-medium ${isDone ? "text-slate-900" : "text-slate-400"}`}>{step.label}</p>
                            {isCurrent && <p className="text-xs text-primary mt-0.5">Current status</p>}
                            {isDone && stepDate && idx === 0 && (
                              <p className="text-xs text-slate-400 mt-0.5">{stepDate}</p>
                            )}
                            {isDone && stepDate && isCurrent && idx > 0 && (
                              <p className="text-xs text-slate-400 mt-0.5">{stepDate}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Delhivery live scan timeline — shown when dispatched/delivered with a tracking number */}
              {(order.status === "dispatched" || order.status === "delivered") && order.trackingNumber && (
                <DelhiveryScanTimeline orderId={(order as any).id} trackingNumber={order.trackingNumber} />
              )}

              {whatsAppUrl && order.status !== "delivered" && (
                <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Want updates on WhatsApp?</p>
                        <p className="text-xs text-slate-600 mt-0.5">Tap below to message us your order number and we'll keep you posted.</p>
                      </div>
                      <Button
                        asChild
                        className="shrink-0 w-full sm:w-auto bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0 gap-2"
                        data-testid="button-whatsapp-notify"
                      >
                        <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-4 h-4" />
                          Notify me on WhatsApp
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {(order.status === "dispatched" || order.status === "delivered") && (
                <Card className="border-amber-200 shadow-sm" data-testid="review-section">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      Leave a Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviewSubmitted ? (
                      <div className="flex flex-col items-center gap-3 py-4 text-center" data-testid="review-submitted">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        <p className="font-semibold text-slate-900">Thank you for your review!</p>
                        <p className="text-sm text-slate-500">Your review will appear on the homepage once approved by our team.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleReviewSubmit} className="space-y-4" data-testid="review-form">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                          <Input
                            data-testid="input-review-name"
                            placeholder="Enter your name"
                            value={reviewName}
                            onChange={(e) => setReviewName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
                          <StarRatingInput value={reviewRating} onChange={setReviewRating} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Review</label>
                          <Textarea
                            data-testid="input-review-quote"
                            placeholder="Share your experience with your PVC ration card…"
                            rows={3}
                            value={reviewQuote}
                            onChange={(e) => setReviewQuote(e.target.value)}
                            className="resize-none"
                          />
                        </div>
                        {reviewError && (
                          <p className="text-sm text-red-600" data-testid="review-error">{reviewError}</p>
                        )}
                        <Button
                          type="submit"
                          data-testid="button-submit-review"
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                          disabled={submitReview.isPending}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          {submitReview.isPending ? "Submitting…" : "Submit Review"}
                        </Button>
                        <p className="text-xs text-slate-400 text-center">Reviews are shown on the homepage after approval.</p>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
