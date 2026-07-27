import { useEffect } from "react";
import { useLocation } from "wouter";
import { OperatorLayout } from "@/components/OperatorLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useGetCurrentOperator, getGetCurrentOperatorQueryKey,
  useGetOperatorOrders, getGetOperatorOrdersQueryKey,
  useGetOperatorStats, getGetOperatorStatsQueryKey,
  useLogoutOperator,
} from "@workspace/api-client-react";
import { Package, Truck, Clock } from "lucide-react";

function getAuthHeader() {
  const token = localStorage.getItem("operatorToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function OperatorDashboard() {
  const [, setLocation] = useLocation();

  const { data: operator, isLoading: opLoading, error: opError } = useGetCurrentOperator({
    query: { queryKey: getGetCurrentOperatorQueryKey() },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: orders, isLoading: ordersLoading } = useGetOperatorOrders(undefined, {
    query: { queryKey: getGetOperatorOrdersQueryKey(), enabled: !!operator },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: stats } = useGetOperatorStats({
    query: { queryKey: getGetOperatorStatsQueryKey(), enabled: !!operator },
    request: { headers: getAuthHeader() },
  } as any);

  const logoutOperator = useLogoutOperator();

  useEffect(() => { if (opError) setLocation("/operator/login"); }, [opError, setLocation]);

  function handleLogout() {
    logoutOperator.mutate(undefined, {
      onSuccess: () => { localStorage.removeItem("operatorToken"); setLocation("/operator/login"); },
    });
  }

  if (opLoading) {
    return (
      <OperatorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-slate-500 text-sm">Loading dashboard…</p>
          </div>
        </div>
      </OperatorLayout>
    );
  }

  if (operator?.status === "pending") {
    return (
      <OperatorLayout operatorName={operator?.name} shopName={operator?.shopName} district={operator?.district} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-[70vh] px-4">
          <style>{`
            @keyframes popIn { 0%{opacity:0;transform:scale(0.9) translateY(12px)} 100%{opacity:1;transform:none} }
            @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.5} 70%{transform:scale(1.4);opacity:0} 100%{transform:scale(1.4);opacity:0} }
          `}</style>
          <div className="max-w-sm w-full text-center space-y-5" style={{ animation: "popIn 0.4s ease both" }}>
            <div className="relative mx-auto w-20 h-20">
              <span className="absolute inset-0 rounded-full bg-amber-400/30" style={{ animation: "pulse-ring 2s ease-out infinite" }} />
              <div className="relative w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-300 flex items-center justify-center">
                <Clock className="w-9 h-9 text-amber-500" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Account Under Review</h1>
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">Hello <strong>{operator.name}</strong>, your application is being reviewed. You'll get full access once admin approves your account.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Your application details:</p>
              <p>Shop: <span className="font-medium">{operator.shopName}</span></p>
              <p>District: <span className="font-medium">{operator.district}</span></p>
              <p>Email: <span className="font-medium">{operator.email}</span></p>
            </div>
            <Button className="w-full bg-rose-500 hover:bg-rose-600 text-white border-rose-500" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout operatorName={operator?.name} shopName={operator?.shopName} district={operator?.district} onLogout={handleLogout}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">{operator?.shopName || "My Dashboard"}</h1>
          <p className="text-sm text-slate-500">{operator?.district}, West Bengal · {operator?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Assigned", value: stats?.totalAssigned ?? 0, icon: Package,     color: "text-slate-600" },
            { label: "Processing",     value: stats?.processing ?? 0,    icon: Clock,        color: "text-blue-500" },
            { label: "Dispatched",     value: stats?.dispatched ?? 0,    icon: Truck,        color: "text-orange-500" },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <Card key={label} className="border-0 shadow-sm bg-white" style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${i * 60}ms` }}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-2xl font-bold ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders table */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assigned Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="w-7 h-7 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-slate-400 text-sm">Loading orders…</p>
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="py-14 text-center">
                <Package className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-slate-400 font-medium">No orders assigned yet</p>
                <p className="text-xs text-slate-400 mt-1">Admin will assign orders to you shortly.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Card Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, i) => {
                      return (
                        <TableRow key={order.id} data-testid={`row-order-${order.id}`} style={{ animation: "fadeSlideIn 0.3s ease both", animationDelay: `${i * 40}ms` }}>
                          <TableCell className="font-mono text-xs font-medium text-primary">{order.orderNumber}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{order.customerName}</p>
                            <p className="text-xs text-slate-500">{order.customerPhone}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{order.cardType}</Badge></TableCell>
                          <TableCell className="text-sm text-slate-600">{order.district}</TableCell>
                          <TableCell className="font-medium text-sm">₹{order.amount}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OperatorLayout>
  );
}
