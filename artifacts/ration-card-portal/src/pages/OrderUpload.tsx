import { useState, useRef, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, CheckCircle2, Download, ExternalLink, FileText,
  Clock, AlertCircle, Loader2, CreditCard,
} from "lucide-react";

const GOVT_DOWNLOAD_URL = "https://wbpds.wb.gov.in/E_Card_Download.aspx";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CardEntry {
  cardIndex: number;
  name: string;
  rationCardNumber: string;
  cardType: string;
  pdfUrl?: string;
  originalFilename?: string;
}

interface OrderData {
  orderNumber: string;
  customerName: string;
  cardType: string;
  rationCardNumber: string;
  familyCards: { customerName: string; rationCardNumber: string; cardType: string }[];
  rationCardPdfs: { cardIndex: number; pdfUrl: string; uploadedAt: string; originalFilename?: string }[];
  amount: number;
  quantity: number;
  createdAt: string;
}

export default function OrderUpload() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber ?? "";
  const [, setLocation] = useLocation();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  async function fetchOrder() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/orders/track?orderNumber=${encodeURIComponent(orderNumber)}`);
      if (!res.ok) throw new Error("Order not found");
      const data = await res.json();
      setOrder(data);
    } catch {
      setError("Could not load order. Please check your order number.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (orderNumber) fetchOrder(); }, [orderNumber]);

  function buildCardList(o: OrderData): CardEntry[] {
    const pdfs = o.rationCardPdfs ?? [];
    const mainPdf = pdfs.find((p) => p.cardIndex === 0);
    const list: CardEntry[] = [
      {
        cardIndex: 0,
        name: o.customerName,
        rationCardNumber: o.rationCardNumber,
        cardType: o.cardType,
        pdfUrl: mainPdf?.pdfUrl,
        originalFilename: mainPdf?.originalFilename,
      },
      ...((o.familyCards ?? []).map((fc, i) => {
        const pdf = pdfs.find((p) => p.cardIndex === i + 1);
        return {
          cardIndex: i + 1,
          name: fc.customerName,
          rationCardNumber: fc.rationCardNumber,
          cardType: fc.cardType,
          pdfUrl: pdf?.pdfUrl,
          originalFilename: pdf?.originalFilename,
        };
      })),
    ];
    return list;
  }

  async function handleUpload(cardIndex: number, file: File) {
    if (!order) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      alert("Only PDF files are allowed. Please choose the e-ration card PDF file — photos or images cannot be used.");
      return;
    }
    setUploadingIdx(cardIndex);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      fd.append("cardIndex", String(cardIndex));
      const res = await fetch(`${BASE}/api/orders/${encodeURIComponent(orderNumber)}/upload-card-pdf`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        let msg = "Upload failed. Please try again.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* non-JSON error body */ }
        throw new Error(msg);
      }
      const { pdfUrl, originalFilename } = await res.json();
      setOrder((prev) => {
        if (!prev) return prev;
        const existing = (prev.rationCardPdfs ?? []).filter((p) => p.cardIndex !== cardIndex);
        return {
          ...prev,
          rationCardPdfs: [
            ...existing,
            { cardIndex, pdfUrl, uploadedAt: new Date().toISOString(), originalFilename },
          ],
        };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploadingIdx(null);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch { return iso; }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-slate-500 text-sm">Loading order details…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-slate-700 font-medium">{error || "Order not found"}</p>
          <Button onClick={() => setLocation("/order")} className="bg-primary hover:bg-primary/90">Place New Order</Button>
        </div>
      </div>
    );
  }

  const cards = buildCardList(order);
  const uploadedCount = cards.filter((c) => c.pdfUrl).length;
  const allUploaded = uploadedCount === cards.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @keyframes popIn { 0%{opacity:0;transform:scale(0.95) translateY(10px)} 100%{opacity:1;transform:none} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .card-row { animation: fadeUp 0.3s ease both; }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">PVC Card Portal</span>
          </div>
          <Link href={`/receipt/${orderNumber}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" data-testid="button-download-receipt">
              <Download className="w-3.5 h-3.5" /> Download Receipt
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-5" style={{ animation: "popIn 0.35s ease both" }}>

        {/* Order Header */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-0">
          <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-wide mb-1">
            {order.customerName}
          </h1>
          <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
            <span className="font-mono font-semibold text-primary">Order #{order.orderNumber}</span>
            <span className="text-slate-300">•</span>
            <span>{formatDate(order.createdAt)}</span>
            <span className="text-slate-300">•</span>
            <Badge variant="outline" className="text-xs border-slate-300">₹{order.amount}</Badge>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{cards.length} Card{cards.length !== 1 ? "s" : ""}</span>
            <span className="text-xs text-slate-400">({uploadedCount}/{cards.length} PDFs uploaded)</span>
          </div>
          {allUploaded && (
            <div className="mt-3 flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 font-semibold">All PDFs uploaded! Your order is now queued for processing.</p>
            </div>
          )}
        </div>

        {/* Card Rows */}
        <div className="space-y-3">
          {cards.map((card, i) => {
            const isUploading = uploadingIdx === card.cardIndex;
            const uploaded = !!card.pdfUrl;
            return (
              <div
                key={card.cardIndex}
                className="bg-white rounded-2xl p-4 shadow-sm border-0 flex items-center gap-4"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Card Holder Name</p>
                  <p className="font-bold text-slate-900 text-sm">{card.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ration Number: <span className="font-mono font-medium">{card.rationCardNumber}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Ration Type: <span className="font-medium text-slate-700">{card.cardType}</span>
                  </p>
                  {uploaded && (
                    <a
                      href={`${BASE}${card.pdfUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-emerald-600 mt-1 hover:underline min-w-0"
                      data-testid={`link-pdf-${card.cardIndex}`}
                    >
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{card.originalFilename ?? "Uploaded"}</span>
                      <span className="shrink-0">· View</span>
                    </a>
                  )}
                </div>

                <div className="shrink-0">
                  <input
                    ref={(el) => { fileRefs.current[card.cardIndex] = el; }}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(card.cardIndex, file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    className={`h-9 gap-1.5 text-xs font-semibold transition-all ${
                      uploaded
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-primary hover:bg-primary/90 text-white"
                    }`}
                    disabled={isUploading}
                    onClick={() => fileRefs.current[card.cardIndex]?.click()}
                  >
                    {isUploading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                    ) : uploaded ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Re-upload</>
                    ) : (
                      <><Upload className="w-3.5 h-3.5" /> Upload PDF</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Process note */}
        {!allUploaded && (
          <div className="text-center py-1">
            <p className="text-sm text-primary font-semibold">
              This order will be processed after all PDFs are uploaded
            </p>
          </div>
        )}

        {/* Instruction note */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Note:</span> Please upload the original PDF file which you have downloaded from the official WB government website (<span className="font-mono">wbpds.wb.gov.in</span>). Do not change the file name or make any modification in the PDF file.
            </p>
          </div>
        </div>

        {/* Download e-Card section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="font-bold text-slate-900 text-sm">Download e-Ration Card</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Download your official digital e-Ration card from the West Bengal government portal. You'll need it to upload here for PVC card printing.
          </p>
          <a href={GOVT_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
            <Button className="w-full bg-primary hover:bg-primary/90 gap-2 h-11">
              <FileText className="w-4 h-4" />
              Open wbpds.wb.gov.in
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </Button>
          </a>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {["Open portal", "Enter card number + OTP", "Download PDF"].map((step, i) => (
              <div key={step} className="bg-slate-50 rounded-lg p-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mx-auto mb-1">{i + 1}</div>
                <p className="text-xs text-slate-600 leading-tight">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment pending notice */}
        <div className="bg-slate-100 rounded-xl p-4 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600">
            <p className="font-semibold mb-0.5">Payment verification pending</p>
            <p>Our team is reviewing your payment screenshot. Your card will be printed once payment is confirmed and all PDFs are uploaded. Delivery in 5–7 working days.</p>
          </div>
        </div>

        <div className="h-4" />
      </main>
    </div>
  );
}
