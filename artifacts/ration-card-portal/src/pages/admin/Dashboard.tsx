import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetCurrentAdmin,
  getGetCurrentAdminQueryKey,
  useGetOrderStats,
  getGetOrderStatsQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useListRecentOrders,
  getListRecentOrdersQueryKey,
  useListOperators,
  getListOperatorsQueryKey,
  useAssignOrderToOperator,
  useUpdateOrderStatus,
  useUpdateOrderPaymentStatus,
  useLogoutAdmin,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Package, Clock, Printer, Truck, CheckCircle, CheckCircle2, XCircle, ImageIcon, LogOut, IndianRupee, Users, Shield } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  printed: "bg-purple-100 text-purple-700 border-purple-200",
  dispatched: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function getAuthHeader() {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: admin, isLoading: adminLoading, error: adminError } = useGetCurrentAdmin({
    query: { queryKey: getGetCurrentAdminQueryKey() },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: stats } = useGetOrderStats({
    query: { queryKey: getGetOrderStatsQueryKey(), enabled: !!admin },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: ordersData, isLoading: ordersLoading } = useListOrders(
    statusFilter ? { status: statusFilter } : {},
    {
      query: {
        queryKey: getListOrdersQueryKey(statusFilter ? { status: statusFilter } : {}),
        enabled: !!admin,
      },
      request: { headers: getAuthHeader() },
    } as any
  );

  const { data: recentOrders } = useListRecentOrders({
    query: { queryKey: getListRecentOrdersQueryKey(), enabled: !!admin },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: operators } = useListOperators({
    query: { queryKey: getListOperatorsQueryKey(), enabled: !!admin },
    request: { headers: getAuthHeader() },
  } as any);

  const assignOrder = useAssignOrderToOperator();
  const updateStatus = useUpdateOrderStatus();
  const updatePaymentStatus = useUpdateOrderPaymentStatus({
    request: { headers: getAuthHeader() },
  } as any);
  const logoutAdmin = useLogoutAdmin();

  useEffect(() => {
    if (adminError) setLocation("/admin/login");
  }, [adminError, setLocation]);

  function handlePaymentStatus(orderId: number, paymentStatus: "confirmed" | "rejected") {
    updatePaymentStatus.mutate(
      { id: orderId, data: { paymentStatus } },
      {
        onSuccess: () => {
          toast({ title: paymentStatus === "confirmed" ? "Payment confirmed!" : "Payment rejected." });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
        },
        onError: () => toast({ title: "Failed to update payment status", variant: "destructive" }),
      }
    );
  }

  function handleAssign(orderId: number, operatorId: string) {
    assignOrder.mutate(
      { id: orderId, data: { operatorId: parseInt(operatorId) } },
      {
        onSuccess: () => {
          toast({ title: "Order assigned successfully!" });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
        },
        onError: () => toast({ title: "Failed to assign order", variant: "destructive" }),
      }
    );
  }

  function handleLogout() {
    logoutAdmin.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("adminToken");
        setLocation("/admin/login");
      },
    });
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500">Loading admin dashboard...</div>
      </div>
    );
  }

  const orders = ordersData?.orders ?? [];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold">Admin Dashboard</span>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs ml-1">Manager</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-300 text-sm">{admin?.email}</span>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" data-testid="button-admin-logout" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: Package, color: "text-slate-700" },
            { label: "Pending", value: stats?.pendingOrders ?? 0, icon: Clock, color: "text-yellow-600" },
            { label: "In Progress", value: (stats?.processingOrders ?? 0) + (stats?.printedOrders ?? 0), icon: Printer, color: "text-blue-600" },
            { label: "Delivered", value: stats?.deliveredOrders ?? 0, icon: CheckCircle, color: "text-emerald-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 shadow-sm bg-white">
              <CardContent className="pt-5 pb-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-3xl font-bold ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</p>
                <IndianRupee className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-600" data-testid="stat-revenue">₹{stats?.totalRevenue?.toLocaleString("en-IN") ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Today: ₹{stats?.todayRevenue ?? 0} ({stats?.todayOrders ?? 0} orders)</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-start mb-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Operators</p>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold text-primary">{operators?.length ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Registered printing partners</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">All Orders</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="printed">Printed</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="py-12 text-center text-slate-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type / Qty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                        <TableCell className="font-mono text-xs font-medium text-primary">{order.orderNumber}</TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{order.customerName}</p>
                          <p className="text-xs text-slate-500">{order.customerPhone}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{order.cardType}</Badge>
                          <span className="text-xs text-slate-500 ml-1">x{order.quantity}</span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">₹{order.amount}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_BADGE[order.status] || ""} border capitalize text-xs`}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 min-w-[140px]">
                            {order.paymentScreenshotUrl && (
                              <a
                                href={order.paymentScreenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                                data-testid={`link-screenshot-${order.id}`}
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                View Screenshot
                              </a>
                            )}
                            {order.paymentStatus === "pending" ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  data-testid={`button-confirm-payment-${order.id}`}
                                  onClick={() => handlePaymentStatus(order.id, "confirmed")}
                                  disabled={updatePaymentStatus.isPending}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-0.5" /> Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                  data-testid={`button-reject-payment-${order.id}`}
                                  onClick={() => handlePaymentStatus(order.id, "rejected")}
                                  disabled={updatePaymentStatus.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-0.5" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <Badge
                                className={`text-xs border w-fit ${order.paymentStatus === "confirmed" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : order.paymentStatus === "rejected" ? "bg-red-100 text-red-700 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                              >
                                {order.paymentStatus ?? "—"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {operators && operators.length > 0 ? (
                            <Select
                              value={order.operatorId ? String(order.operatorId) : ""}
                              onValueChange={(v) => handleAssign(order.id, v)}
                            >
                              <SelectTrigger className="w-36 h-7 text-xs" data-testid={`select-operator-${order.id}`}>
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.id} value={String(op.id)}>{op.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-slate-400">No operators</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))}
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
