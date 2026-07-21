import { useState } from "react";
import { Navbar, Footer, BRAND } from "@/components/layout";
import { useSeo } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrackOrder, getTrackOrderQueryKey } from "@workspace/api-client-react";
import { Search, Package, Printer, Truck, CheckCircle, Clock, MessageCircle, MapPin, CalendarClock, ExternalLink } from "lucide-react";

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

export default function TrackOrder() {
  useSeo({
    title: "Track Your PVC Ration Card Order Status",
    description: "Enter your order number or ration card number to check the real-time printing and delivery status of your PVC ration card.",
    canonical: "https://erationcards.in/track",
  });
  const [orderNumber, setOrderNumber] = useState("");
  const [rationCardNumber, setRationCardNumber] = useState("");
  const [searchParams, setSearchParams] = useState<{ orderNumber?: string; rationCardNumber?: string } | null>(null);

  const { data: order, isLoading, error } = useTrackOrder(
    searchParams ?? {},
    { query: { enabled: !!searchParams, queryKey: getTrackOrderQueryKey(searchParams ?? {}) } }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber && !rationCardNumber) return;
    setSearchParams({
      orderNumber: orderNumber || undefined,
      rationCardNumber: rationCardNumber || undefined,
    });
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

                  {order.status === "dispatched" && (
                    <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5" data-testid="estimated-delivery">
                      <CalendarClock className="w-4 h-4 text-orange-500 shrink-0" />
                      <p className="text-sm text-orange-700 font-medium">Expected in 5–7 working days</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader><CardTitle className="text-base">Order Progress</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {STATUS_STEPS.map((step, idx) => {
                      const isDone = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      const Icon = step.icon;
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

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
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
