import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  useGetCurrentAdmin,
  getGetCurrentAdminQueryKey,
  useGetOrderStats,
  getGetOrderStatsQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useGetOrder,
  useListOperators,
  getListOperatorsQueryKey,
  useAssignOrderToOperator,
  useUpdateOrderStatus,
  useUpdateOrderPaymentStatus,
  useLogoutAdmin,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Clock, Printer, Truck, CheckCircle, CheckCircle2, XCircle,
  ImageIcon, LogOut, IndianRupee, Users, Shield, Search, X, MapPin,
  Phone, CreditCard, Calendar, Hash,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  printed: "bg-purple-100 text-purple-700 border-purple-200",
  dispatched: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function getAuthHeader() {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: admin, isLoading: adminLoading, error: adminError } = useGetCurrentAdmin({
    query: { queryKey: getGetCurrentAdminQueryKey() },
    request: { headers: getAuthHeader() },
  } as any);

  const { data: stats } = useGetOrderStats({
    query: { queryKey: getGetOrderStatsQueryKey(), enabled: !!admin },
    request: { headers: getAuthHeader() },
  } as any);

  const listParams = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  const { data: ordersData, isLoading: ordersLoading } = useListOrders(
    listParams,
    {
      query: {
        queryKey: getListOrdersQueryKey(listParams),
        enabled: !!admin,
      },
      request: { headers: getAuthHeader() },
    } as any
  );

  const { data: selectedOrder } = useGetOrder(
    selectedOrderId ?? 0,
    {
      query: { enabled: !!selectedOrderId && detailOpen },
      request: { headers: getAuthHeader() },
    } as any
  );

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

  const openDetail = useCallback((orderId: number) => {
    setSelectedOrderId(orderId);
    setDetailOpen(true);
  }, []);

  function handlePaymentStatus(orderId: number, paymentStatus: "confirmed" | "rejected") {
    updatePaymentStatus.mutate(
      { id: orderId, data: { paymentStatus } },
      {
        onSuccess: () => {
          toast({ title: paymentStatus === "confirmed" ? "Payment confirmed!" : "Payment rejected." });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          if (selectedOrderId === orderId) {
            queryClient.invalidateQueries({ queryKey: ["/api/orders/", orderId] });
          }
        },
        onError: () => toast({ title: "Failed to update payment status", variant: "destructive" }),
      }
    );
  }

  function handleStatusUpdate(orderId: number, status: string) {
    updateStatus.mutate(
      { id: orderId, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Order status updated." });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: ["/api/orders/", orderId] });
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
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
  const pendingDeliveries = (stats?.pendingOrders ?? 0) + (stats?.processingOrders ?? 0) + (stats?.printedOrders ?? 0) + (stats?.dispatchedOrders ?? 0);

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
            <span className="text-slate-300 text-sm hidden sm:block">{admin?.email}</span>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" data-testid="button-admin-logout" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: Package, color: "text-slate-700", testId: "stat-total-orders" },
            { label: "Pending Payment", value: stats?.pendingOrders ?? 0, icon: Clock, color: "text-amber-600", testId: "stat-pending" },
            { label: "Pending Delivery", value: pendingDeliveries, icon: Truck, color: "text-blue-600", testId: "stat-pending-delivery" },
            { label: "Delivered", value: stats?.deliveredOrders ?? 0, icon: CheckCircle, color: "text-emerald-600", testId: "stat-delivered" },
          ].map(({ label, value, icon: Icon, color, testId }) => (
            <Card key={label} className="border-0 shadow-sm bg-white">
              <CardContent className="pt-5 pb-4">
                <div className="flex justify-between items-start mb-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-3xl font-bold ${color}`} data-testid={testId}>{value}</p>
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
              <p className="text-xs text-slate-400 mt-1">Today: ₹{stats?.todayRevenue ?? 0} · {stats?.todayOrders ?? 0} orders</p>
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

        {/* Orders Table */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle className="text-base">All Orders {ordersData ? <span className="text-slate-400 font-normal text-sm ml-1">({ordersData.total})</span> : null}</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    data-testid="input-admin-search"
                    placeholder="Search name, phone, order #"
                    className="pl-8 h-8 text-xs"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setSearchInput("")}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs shrink-0" data-testid="select-status-filter">
                    <SelectValue placeholder="All statuses" />
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="py-12 text-center text-slate-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>{debouncedSearch || statusFilter ? "No orders match your search" : "No orders yet"}</p>
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
                      <TableHead>Delivery</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        data-testid={`row-order-${order.id}`}
                        className="hover:bg-slate-50/60 cursor-pointer"
                        onClick={() => openDetail(order.id)}
                      >
                        <TableCell className="font-mono text-xs font-medium text-primary">{order.orderNumber}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5 min-w-[130px]">
                            {order.paymentScreenshotUrl && (
                              <a
                                href={order.paymentScreenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                                data-testid={`link-screenshot-${order.id}`}
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                Screenshot
                              </a>
                            )}
                            {order.paymentStatus === "pending" ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                  data-testid={`button-confirm-payment-${order.id}`}
                                  onClick={() => handlePaymentStatus(order.id, "confirmed")}
                                  disabled={updatePaymentStatus.isPending}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-0.5" /> Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                  data-testid={`button-reject-payment-${order.id}`}
                                  onClick={() => handlePaymentStatus(order.id, "rejected")}
                                  disabled={updatePaymentStatus.isPending}
                                >
                                  <XCircle className="w-3 h-3 mr-0.5" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <Badge className={`text-xs border w-fit capitalize ${PAYMENT_STATUS_BADGE[order.paymentStatus ?? ""] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                {order.paymentStatus ?? "—"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {operators && operators.length > 0 ? (
                            <Select
                              value={order.operatorId ? String(order.operatorId) : ""}
                              onValueChange={(v) => handleAssign(order.id, v)}
                            >
                              <SelectTrigger className="w-32 h-7 text-xs" data-testid={`select-operator-${order.id}`}>
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {operators.map((op) => (
                                  <SelectItem key={op.id} value={String(op.id)}>{op.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                            data-testid={`button-view-order-${order.id}`}
                            onClick={(e) => { e.stopPropagation(); openDetail(order.id); }}
                          >
                            View
                          </Button>
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

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Hash className="w-4 h-4 text-primary" />
              Order Details
              {selectedOrder && (
                <span className="font-mono text-primary">{selectedOrder.orderNumber}</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder
                ? `Placed on ${new Date(selectedOrder.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
                : "Loading order details…"}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-5 mt-1">
              {/* Customer Info */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Customer</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Name</p>
                      <p className="font-medium text-slate-900">{selectedOrder.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="font-medium text-slate-900">{selectedOrder.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Ration Card No</p>
                      <p className="font-mono text-slate-900 text-xs">{selectedOrder.rationCardNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Card Type · Qty</p>
                      <p className="font-medium text-slate-900">{selectedOrder.cardType} × {selectedOrder.quantity}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Family Cards */}
              {selectedOrder.familyCards && selectedOrder.familyCards.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Family Cards ({selectedOrder.familyCards.length})</h3>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 text-xs">
                          <TableHead className="py-2">Name</TableHead>
                          <TableHead className="py-2">Ration Card No</TableHead>
                          <TableHead className="py-2">Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.familyCards.map((fc, i) => (
                          <TableRow key={i} className="text-xs">
                            <TableCell className="py-2">{(fc as any).customerName}</TableCell>
                            <TableCell className="py-2 font-mono">{(fc as any).rationCardNumber}</TableCell>
                            <TableCell className="py-2">{(fc as any).cardType}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              )}

              {/* Delivery Address */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Delivery Address</h3>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm space-y-0.5">
                  {selectedOrder.deliveryName && <p className="font-medium text-slate-900">{selectedOrder.deliveryName}</p>}
                  <p className="text-slate-700">{selectedOrder.address}</p>
                  {selectedOrder.postOffice && <p className="text-slate-600">P.O.: {selectedOrder.postOffice}</p>}
                  <p className="text-slate-600">{selectedOrder.district}, {selectedOrder.state} — {selectedOrder.pincode}</p>
                </div>
              </section>

              {/* Payment */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5" /> Payment</h3>
                <div className="flex flex-wrap gap-3 items-start">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm flex-1 min-w-[160px]">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Amount</span>
                      <span className="font-semibold text-primary">₹{selectedOrder.amount}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Method</span>
                      <span className="capitalize">{selectedOrder.paymentMethod ?? "UPI"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Status</span>
                      <Badge className={`text-xs border capitalize ${PAYMENT_STATUS_BADGE[selectedOrder.paymentStatus ?? ""] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {selectedOrder.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                  {selectedOrder.paymentScreenshotUrl && (
                    <div className="shrink-0">
                      <p className="text-xs text-slate-500 mb-1.5">Payment Screenshot</p>
                      <a href={selectedOrder.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={selectedOrder.paymentScreenshotUrl}
                          alt="Payment screenshot"
                          className="w-28 h-28 object-cover rounded-lg border border-slate-200 shadow-sm hover:opacity-90 transition-opacity"
                          data-testid={`img-screenshot-${selectedOrder.id}`}
                        />
                      </a>
                    </div>
                  )}
                </div>
                {selectedOrder.paymentStatus === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      data-testid={`button-dialog-confirm-payment`}
                      onClick={() => handlePaymentStatus(selectedOrder.id, "confirmed")}
                      disabled={updatePaymentStatus.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700 border-red-300 hover:bg-red-50"
                      data-testid={`button-dialog-reject-payment`}
                      onClick={() => handlePaymentStatus(selectedOrder.id, "rejected")}
                      disabled={updatePaymentStatus.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Reject Payment
                    </Button>
                  </div>
                )}
              </section>

              {/* Delivery Status Update */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Delivery Status</h3>
                <div className="flex items-center gap-3">
                  <Badge className={`${STATUS_BADGE[selectedOrder.status] || ""} border capitalize text-sm px-3 py-1`}>
                    {selectedOrder.status}
                  </Badge>
                  <span className="text-slate-400 text-xs">→ Update to:</span>
                  <Select
                    value=""
                    onValueChange={(v) => handleStatusUpdate(selectedOrder.id, v)}
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-dialog-status">
                      <SelectValue placeholder="Change status…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="printed">Printed</SelectItem>
                      <SelectItem value="dispatched">Dispatched</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedOrder.trackingNumber && (
                  <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-200 text-xs">
                    <span className="text-slate-500">Tracking: </span>
                    <span className="font-mono font-medium text-primary">{selectedOrder.trackingNumber}</span>
                  </div>
                )}
                {selectedOrder.notes && (
                  <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-200">{selectedOrder.notes}</p>
                )}
              </section>

              <div className="flex items-center gap-2 text-xs text-slate-400 pt-1 border-t border-slate-100">
                <Calendar className="w-3.5 h-3.5" />
                Created: {new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
                <span className="ml-auto">Updated: {new Date(selectedOrder.updatedAt).toLocaleString("en-IN")}</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
