import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { OperatorLayout } from "@/components/OperatorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useGetCurrentOperator,
  getGetCurrentOperatorQueryKey,
  useTrackOrder,
  getTrackOrderQueryKey,
  useLogoutOperator,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Package, Printer, Truck, CheckCircle, Clock } from "lucide-react";

const STATUS_STEPS = [
  { key: "pending",    label: "Order Placed",  icon: Clock,       color: "text-amber-500" },
  { key: "processing", label: "Processing",    icon: Package,     color: "text-blue-500" },
  { key: "printed",    label: "Card Printed",  icon: Printer,     color: "text-purple-500" },
  { key: "dispatched", label: "Dispatched",    icon: Truck,       color: "text-orange-500" },
  { key: "delivered",  label: "Delivered",     icon: CheckCircle, color: "text-emerald-500" },
];

const STATUS_BADGE: Record<string, string> = {
  pending:    "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  printed:    "bg-purple-100 text-purple-700 border-purple-200",
  dispatched: "bg-orange-100 text-orange-700 border-orange-200",
  delivered:  "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function getAuthHeader() {
  const token = localStorage.getItem("operatorToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function OperatorTrackOrder() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState("");
  const [rationCardNumber, setRationCardNumber] = useState("");
  const [searchParams, setSearchParams] = useState<{ orderNumber?: string; rationCardNumber?: string } | null>(null);

  const { data: operator, error: opError } = useGetCurrentOperator({
    query: { queryKey: getGetCurrentOperatorQueryKey() },
    request: { headers: getAuthHeader() },
  } as any);

  const logoutOperator = useLogoutOperator();

  useEffect(() => { if (opError) setLocation("/operator/login"); }, [opError, setLocation]);

  const { data: order, isLoading, error } = useTrackOrder(
    searchParams ?? {},
    { query: { enabled: !!searchParams, queryKey: getTrackOrderQueryKey(searchParams ?? {}) } }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber && !rationCardNumber) return;
    setSearchParams({ orderNumber: orderNumber || undefined, rationCardNumber: rationCardNumber || undefined });
  }

  function handleLogout() {
    logoutOperator.mutate(undefined, {
      onSuccess: () => { localStorage.removeItem("operatorToken"); setLocation("/operator/login"); },
    });
  }

  const currentStepIdx = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;

  return (
    <OperatorLayout
      operatorName={operator?.name}
      shopName={operator?.shopName}
      district={operator?.district}
      onLogout={handleLogout}
    >
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Track Order</h1>
          <p className="text-slate-500 text-sm mt-0.5">Search by order number or ration card number.</p>
        </div>

        <Card className="border-0 shadow-sm bg-white mb-5">
          <CardContent className="pt-5">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Order Number</label>
                <Input
                  placeholder="Enter 10-digit order number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ration Card Number</label>
                <Input
                  placeholder="Enter ration card number"
                  value={rationCardNumber}
                  onChange={(e) => setRationCardNumber(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 gap-2"
                disabled={isLoading || (!orderNumber && !rationCardNumber)}
              >
                <Search className="w-4 h-4" />
                {isLoading ? "Searching…" : "Track Order"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardContent className="pt-5 text-center py-8">
              <Package className="w-10 h-10 text-red-300 mx-auto mb-3" />
              <p className="text-red-600 font-medium">Order not found</p>
              <p className="text-sm text-red-500 mt-1">Please check the details and try again.</p>
            </CardContent>
          </Card>
        )}

        {order && (
          <div className="space-y-4" style={{ animation: "fadeIn 0.3s ease" }}>
            <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }`}</style>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Order #{order.orderNumber}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Placed {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge className={`${STATUS_BADGE[order.status] || ""} border capitalize`}>{order.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-slate-500">Customer</p><p className="font-medium text-slate-900">{order.customerName}</p></div>
                  <div><p className="text-xs text-slate-500">Card Type</p><p className="font-medium text-slate-900">{order.cardType}</p></div>
                  <div><p className="text-xs text-slate-500">Ration Card No</p><p className="font-mono text-xs font-medium text-slate-900">{order.rationCardNumber}</p></div>
                  <div><p className="text-xs text-slate-500">Amount</p><p className="font-semibold text-emerald-600">₹{order.amount}</p></div>
                </div>
                {order.trackingNumber && (
                  <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-0.5">Tracking Number</p>
                    <p className="font-mono font-semibold text-primary">{order.trackingNumber}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-700">Order Progress</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-0">
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isDone ? "bg-primary border-primary text-white" : "bg-white border-slate-200 text-slate-300"}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          {idx < STATUS_STEPS.length - 1 && (
                            <div className={`w-0.5 h-7 mt-0.5 ${isDone && idx < currentStepIdx ? "bg-primary" : "bg-slate-200"}`} />
                          )}
                        </div>
                        <div className="pt-1 pb-7">
                          <p className={`text-sm font-medium ${isDone ? "text-slate-900" : "text-slate-400"}`}>{step.label}</p>
                          {isCurrent && <p className="text-xs text-primary">Current status</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </OperatorLayout>
  );
}
