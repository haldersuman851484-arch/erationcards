import { useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useGetCurrentOperator,
  getGetCurrentOperatorQueryKey,
  useGetOperatorOrders,
  getGetOperatorOrdersQueryKey,
  useGetOperatorStats,
  getGetOperatorStatsQueryKey,
  useUpdateOrderStatus,
  useLogoutOperator,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Package, Printer, Truck, CheckCircle, Clock, LogOut, IndianRupee, User } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  printed: "bg-purple-100 text-purple-700 border-purple-200",
  dispatched: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const NEXT_STATUS: Record<string, { label: string; value: string }> = {
  pending: { label: "Start Processing", value: "processing" },
  processing: { label: "Mark as Printed", value: "printed" },
  printed: { label: "Mark Dispatched", value: "dispatched" },
  dispatched: { label: "Mark Delivered", value: "delivered" },
};

function getAuthHeader() {
  const token = localStorage.getItem("operatorToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function OperatorDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const updateStatus = useUpdateOrderStatus();
  const logoutOperator = useLogoutOperator();

  useEffect(() => {
    if (opError) {
      setLocation("/operator/login");
    }
  }, [opError, setLocation]);

  function handleStatusUpdate(orderId: number, newStatus: string) {
    updateStatus.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Order status updated!" });
          queryClient.invalidateQueries({ queryKey: getGetOperatorOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOperatorStatsQueryKey() });
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
      }
    );
  }

  function handleLogout() {
    logoutOperator.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("operatorToken");
        setLocation("/operator/login");
      },
    });
  }

  if (opLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">ID</div>
            <span className="font-semibold text-slate-900">Operator Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {operator && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4" />
                <span data-testid="text-operator-name">{operator.name}</span>
              </div>
            )}
            <Button variant="outline" size="sm" data-testid="button-operator-logout" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{operator?.shopName || "My Dashboard"}</h1>
          <p className="text-sm text-slate-500">{operator?.address}, {operator?.district}, {operator?.state}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Assigned", value: stats?.totalAssigned ?? 0, icon: Package, color: "text-slate-600" },
            { label: "Processing", value: stats?.processing ?? 0, icon: Clock, color: "text-blue-500" },
            { label: "Dispatched", value: stats?.dispatched ?? 0, icon: Truck, color: "text-orange-500" },
            { label: "Wallet Balance", value: `₹${stats?.walletBalance ?? 0}`, icon: IndianRupee, color: "text-emerald-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-slate-200 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-2xl font-bold ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Assigned Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="py-12 text-center text-slate-400">Loading orders...</div>
            ) : !orders || orders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No orders assigned yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Card Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const next = NEXT_STATUS[order.status];
                      return (
                        <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                          <TableCell className="font-mono text-xs font-medium text-primary">{order.orderNumber}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{order.customerName}</p>
                            <p className="text-xs text-slate-500">{order.customerPhone}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline">{order.cardType}</Badge></TableCell>
                          <TableCell className="text-sm text-slate-600">{order.district}, {order.state}</TableCell>
                          <TableCell className="font-medium text-sm">₹{order.amount}</TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_BADGE[order.status] || ""} border capitalize text-xs`}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {next && order.status !== "delivered" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-primary text-primary hover:bg-primary hover:text-white"
                                data-testid={`button-update-status-${order.id}`}
                                onClick={() => handleStatusUpdate(order.id, next.value)}
                                disabled={updateStatus.isPending}
                              >
                                {next.label}
                              </Button>
                            ) : (
                              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />Done</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
