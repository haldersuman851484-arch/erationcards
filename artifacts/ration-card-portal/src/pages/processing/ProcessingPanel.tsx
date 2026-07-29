import { useEffect, useState, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useUpdateOrderStatus,
  useUpdateOrderPaymentStatus,
  useLogoutAdmin,
  getListPaymentVerificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Clock, Truck, CheckCircle, CheckCircle2, XCircle,
  ImageIcon, LogOut, IndianRupee, Users, Search, X, MapPin,
  Phone, CreditCard, Calendar, Hash, ClipboardList,
  Store, AlertCircle, FileText, Download, Send, RotateCcw,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  processing: "bg-blue-100 text-blue-700 border-blue-200",
  printed: "bg-purple-100 text-purple-700 border-purple-200",
  dispatched: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  returned: "bg-rose-100 text-rose-700 border-rose-200",
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

function AnimatedRow({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <TableRow
      className="hover:bg-slate-50/60 transition-colors"
      style={{
        animation: `fadeSlideIn 0.35s ease both`,
        animationDelay: `${index * 45}ms`,
      }}
    >
      {children}
    </TableRow>
  );
}

/**
 * Processing Panel — the staff order-processing workspace.
 *
 * Employees log in on the same login page with the processing password and
 * land here. Admin partners can open it too. It holds the Public/Operator
 * order tabs (payment confirm/reject, status & dispatch updates, order
 * detail dialog) plus links to the two courier print-status mPanels.
 * Admin-only areas (applications, verification log, reviews, settings)
 * live in the separate admin dashboard which processing staff cannot open.
 */
export default function ProcessingPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("public-orders");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");

  const orderSource: "public" | "operator" = activeTab === "operator-orders" ? "operator" : "public";

  function handleTabChange(tab: string) {
    if (tab !== activeTab) {
      setStatusFilter("");
      setSearchInput("");
    }
    setActiveTab(tab);
  }
  const debouncedSearch = useDebounce(searchInput, 350);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [dispatchForm, setDispatchForm] = useState<{
    orderId: number;
    courier: string;
    tracking: string;
  } | null>(null);

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
    source: orderSource,
  };

  const { data: ordersData, isLoading: ordersLoading } = useListOrders(
    listParams,
    {
      query: { queryKey: getListOrdersQueryKey(listParams), enabled: !!admin },
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

  const updateStatus = useUpdateOrderStatus({
    request: { headers: getAuthHeader() },
  } as any);
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

  function handlePaymentStatus(orderId: number, paymentStatus: "confirmed" | "rejected" | "pending") {
    const successMsg =
      paymentStatus === "confirmed" ? "Payment confirmed!" :
      paymentStatus === "rejected" ? "Payment rejected." :
      "Payment reset to pending.";
    updatePaymentStatus.mutate(
      { id: orderId, data: { paymentStatus } },
      {
        onSuccess: () => {
          toast({ title: successMsg });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getListPaymentVerificationsQueryKey({}) });
        },
        onError: () => toast({ title: "Failed to update payment status", variant: "destructive" }),
      }
    );
  }

  function handleStatusUpdate(
    orderId: number,
    status: string,
    extra?: { courierName?: string; trackingNumber?: string }
  ) {
    updateStatus.mutate(
      { id: orderId, data: { status, ...extra } },
      {
        onSuccess: () => {
          toast({ title: "Order status updated." });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          setDispatchForm(null);
        },
        onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Loading panel…</p>
        </div>
      </div>
    );
  }

  const orders = ordersData?.orders ?? [];
  const pendingDeliveries = (stats?.pendingOrders ?? 0) + (stats?.processingOrders ?? 0) + (stats?.printedOrders ?? 0) + (stats?.dispatchedOrders ?? 0);

  const renderOrdersTable = (source: "public" | "operator") => {
    const isPublic = source === "public";
    const TitleIcon = isPublic ? Users : Store;
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TitleIcon className={`w-4 h-4 ${isPublic ? "text-primary" : "text-indigo-600"}`} /> {isPublic ? "Public Orders" : "Operator Orders"}
            </CardTitle>
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
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {ordersLoading ? (
            <div className="py-14 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-slate-400 text-sm">Loading orders…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <TitleIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>{debouncedSearch || statusFilter ? "No orders match your search" : isPublic ? "No orders yet" : "No operator orders yet"}</p>
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
                    <TableHead>PDF</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, i) => (
                    <AnimatedRow key={order.id} index={i}>
                      <TableCell className="font-mono text-xs font-medium text-primary cursor-pointer" onClick={() => openDetail(order.id)}>{order.orderNumber}</TableCell>
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
                        <Badge data-testid={`badge-order-status-${order.id}`} className={`${STATUS_BADGE[order.status] || ""} border capitalize text-xs`}>{order.status}</Badge>
                        {(() => {
                          const pdfs = (order as any).rationCardPdfs ?? [];
                          const total = order.quantity ?? 1;
                          const uploaded = pdfs.length;
                          if (total === 0) return null;
                          return (
                            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${uploaded >= total ? "text-emerald-600" : "text-amber-600"}`}>
                              <FileText className="w-3 h-3" />
                              {uploaded}/{total} PDF{total !== 1 ? "s" : ""}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1.5 min-w-[130px]">
                          {order.paymentScreenshotUrl && (
                            <button onClick={() => setPreviewImg(order.paymentScreenshotUrl!)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <ImageIcon className="w-3.5 h-3.5" /> Screenshot
                            </button>
                          )}
                          {order.paymentStatus === "pending" ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-6 px-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50" data-testid={`button-confirm-payment-${order.id}`} onClick={() => handlePaymentStatus(order.id, "confirmed")} disabled={updatePaymentStatus.isPending}>
                                <CheckCircle2 className="w-3 h-3 mr-0.5" /> Confirm
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 px-1.5 text-xs text-red-700 border-red-300 hover:bg-red-50" data-testid={`button-reject-payment-${order.id}`} onClick={() => handlePaymentStatus(order.id, "rejected")} disabled={updatePaymentStatus.isPending}>
                                <XCircle className="w-3 h-3 mr-0.5" /> Reject
                              </Button>
                            </div>
                          ) : order.paymentStatus === "rejected" ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="text-xs border w-fit capitalize bg-red-100 text-red-700 border-red-200">Rejected</Badge>
                              <Button size="sm" variant="outline" className="h-6 px-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50" data-testid={`button-reapprove-payment-${order.id}`} onClick={() => handlePaymentStatus(order.id, "confirmed")} disabled={updatePaymentStatus.isPending}>
                                <CheckCircle2 className="w-3 h-3 mr-0.5" /> Re-approve
                              </Button>
                            </div>
                          ) : (
                            <Badge className={`text-xs border w-fit capitalize ${PAYMENT_STATUS_BADGE[order.paymentStatus ?? ""] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{order.paymentStatus ?? "—"}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const pdfs: { cardIndex: number; pdfUrl: string }[] = (order as any).rationCardPdfs ?? [];
                          if (pdfs.length === 0) return <span className="text-xs text-amber-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Pending</span>;
                          return (
                            <div className="flex flex-col gap-1">
                              {pdfs.map((p, idx) => (
                                <a key={p.cardIndex} href={p.pdfUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary font-medium hover:underline whitespace-nowrap">
                                  <Download className="w-3 h-3" />
                                  {pdfs.length === 1 ? "PDF" : `PDF ${idx + 1}`}
                                </a>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">{new Date(order.createdAt).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary hover:bg-primary/10" data-testid={`button-view-order-${order.id}`} onClick={() => openDetail(order.id)}>View</Button>
                      </TableCell>
                    </AnimatedRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.92) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .stat-card { animation: popIn 0.4s ease both; }
        .tab-panel { animation: fadeSlideIn 0.3s ease both; }
      `}</style>

      <div className="min-h-screen bg-slate-100">
        <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span className="font-semibold">Processing Panel</span>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs ml-1">
                {admin?.role === "admin" ? "Manager" : "Staff"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/processing/courier/public" className="text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5" data-testid="link-public-mpanel">
                  <Truck className="w-3.5 h-3.5" /> Public mPanel
                </Link>
                <Link href="/processing/courier/operator" className="text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5" data-testid="link-operator-mpanel">
                  <Truck className="w-3.5 h-3.5" /> Operator mPanel
                </Link>
              </div>
              <span className="text-slate-300 text-sm hidden lg:block">{admin?.email}</span>
              <Button variant="outline" size="sm" className="border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors" data-testid="button-processing-logout" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Courier print-status shortcuts — always visible (header links hide on phones) */}
          <div className="flex sm:hidden gap-2">
            <Link href="/processing/courier/public" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-2 text-sm font-medium text-slate-700 shadow-sm active:scale-[0.99] transition-transform">
              <Truck className="w-4 h-4 text-primary" /> Public mPanel
            </Link>
            <Link href="/processing/courier/operator" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-2 text-sm font-medium text-slate-700 shadow-sm active:scale-[0.99] transition-transform">
              <Truck className="w-4 h-4 text-indigo-600" /> Operator mPanel
            </Link>
          </div>

          {/* Stat Cards — no revenue here: employees must not see money totals */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {[
              { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: Package, color: "text-slate-700", sub: null },
              { label: "Pending Payment", value: stats?.pendingOrders ?? 0, icon: Clock, color: "text-amber-600", sub: null },
              { label: "Pending Delivery", value: pendingDeliveries, icon: Truck, color: "text-blue-600", sub: null },
              { label: "Delivered", value: stats?.deliveredOrders ?? 0, icon: CheckCircle, color: "text-emerald-600", sub: null },
              ...((stats?.returnedOrders ?? 0) > 0
                ? [{ label: "Returned (RTO)", value: stats!.returnedOrders, icon: RotateCcw, color: "text-rose-600", sub: null }]
                : []),
              { label: "Active Operators", value: operators?.length ?? 0, icon: Users, color: "text-primary", sub: "Registered printing partners" },
            ].map(({ label, value, icon: Icon, color, sub }, i) => (
              <Card key={label} className="stat-card border-0 shadow-sm bg-white overflow-hidden" style={{ animationDelay: `${i * 80}ms` }}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-white border border-slate-200 shadow-sm h-11 p-1 flex-wrap">
              <TabsTrigger value="public-orders" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                <Users className="w-4 h-4" /> Public Orders
                {activeTab === "public-orders" && ordersData && <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{ordersData.total}</span>}
              </TabsTrigger>
              <TabsTrigger value="operator-orders" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                <Store className="w-4 h-4" /> Operator Orders
                {activeTab === "operator-orders" && ordersData && <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{ordersData.total}</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="public-orders" className="tab-panel mt-4">
              {renderOrdersTable("public")}
            </TabsContent>

            <TabsContent value="operator-orders" className="tab-panel mt-4">
              {renderOrdersTable("operator")}
            </TabsContent>
          </Tabs>
        </main>

        {/* Order Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Hash className="w-4 h-4 text-primary" />
                Order Details
                {selectedOrder && <span className="font-mono text-primary">{selectedOrder.orderNumber}</span>}
              </DialogTitle>
              <DialogDescription>
                {selectedOrder
                  ? `Placed on ${new Date(selectedOrder.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
                  : "Loading order details…"}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder ? (
              <div className="space-y-5 mt-1">
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Customer</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div><p className="text-xs text-slate-500">Name</p><p className="font-medium text-slate-900">{selectedOrder.customerName}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div><p className="text-xs text-slate-500">Phone</p><p className="font-medium text-slate-900">{selectedOrder.customerPhone}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CreditCard className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div><p className="text-xs text-slate-500">Ration Card No</p><p className="font-mono text-slate-900 text-xs">{selectedOrder.rationCardNumber}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div><p className="text-xs text-slate-500">Card Type · Qty</p><p className="font-medium text-slate-900">{selectedOrder.cardType} × {selectedOrder.quantity}</p></div>
                    </div>
                  </div>
                </section>

                {selectedOrder.familyCards && selectedOrder.familyCards.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Family Cards ({selectedOrder.familyCards.length})</h3>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-slate-50 text-xs"><TableHead className="py-2">Name</TableHead><TableHead className="py-2">Ration Card No</TableHead><TableHead className="py-2">Type</TableHead></TableRow></TableHeader>
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

                {(() => {
                  const allCards = [
                    { cardIndex: 0, name: selectedOrder.customerName, rationCardNumber: selectedOrder.rationCardNumber, cardType: selectedOrder.cardType },
                    ...((selectedOrder.familyCards ?? []) as any[]).map((fc: any, i: number) => ({
                      cardIndex: i + 1,
                      name: fc.customerName,
                      rationCardNumber: fc.rationCardNumber,
                      cardType: fc.cardType,
                    })),
                  ];
                  const pdfs: { cardIndex: number; pdfUrl: string; uploadedAt: string; downloaded?: boolean; downloadedAt?: string | null }[] = (selectedOrder as any).rationCardPdfs ?? [];
                  const uploadedCount = pdfs.length;
                  const total = allCards.length;
                  return (
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Ration Card PDFs
                        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border ${uploadedCount >= total ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {uploadedCount}/{total} uploaded
                        </span>
                      </h3>
                      <div className="rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
                        {allCards.map((card) => {
                          const entry = pdfs.find((p) => p.cardIndex === card.cardIndex);
                          return (
                            <div key={card.cardIndex} className="flex items-center gap-3 px-3 py-2.5 text-xs bg-white hover:bg-slate-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{card.name}</p>
                                <p className="text-slate-500 font-mono">{card.rationCardNumber} · {card.cardType}</p>
                                {entry && (
                                  <p className="text-slate-400 mt-0.5">
                                    Uploaded {new Date(entry.uploadedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                )}
                                {entry && (
                                  entry.downloaded && entry.downloadedAt ? (
                                    <p className="flex items-center gap-1 mt-0.5 text-emerald-600 font-medium">
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                      Downloaded · {new Date(entry.downloadedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  ) : (
                                    <p className="flex items-center gap-1 mt-0.5 text-slate-400">
                                      <Clock className="w-3 h-3 shrink-0" />
                                      Not yet downloaded
                                    </p>
                                  )
                                )}
                              </div>
                              {entry ? (
                                <a
                                  href={entry.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 flex items-center gap-1 text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-md px-2.5 py-1.5 font-semibold transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download
                                </a>
                              ) : (
                                <span className="shrink-0 text-amber-500 flex items-center gap-1 border border-amber-200 bg-amber-50 rounded-md px-2.5 py-1.5">
                                  <AlertCircle className="w-3.5 h-3.5" /> Pending
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })()}

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Delivery Address</h3>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm space-y-0.5">
                    {selectedOrder.deliveryName && <p className="font-medium text-slate-900">{selectedOrder.deliveryName}</p>}
                    <p className="text-slate-700">{selectedOrder.address}</p>
                    {selectedOrder.postOffice && <p className="text-slate-600">P.O.: {selectedOrder.postOffice}</p>}
                    <p className="text-slate-600">{selectedOrder.district}, {selectedOrder.state} — {selectedOrder.pincode}</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5" /> Payment</h3>
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-sm flex-1 min-w-[160px]">
                      <div className="flex justify-between mb-1"><span className="text-slate-500">Amount</span><span className="font-semibold text-primary">₹{selectedOrder.amount}</span></div>
                      <div className="flex justify-between mb-1"><span className="text-slate-500">Method</span><span className="capitalize">{selectedOrder.paymentMethod ?? "UPI"}</span></div>
                      <div className="flex justify-between items-center"><span className="text-slate-500">Status</span>
                        <Badge className={`text-xs border capitalize ${PAYMENT_STATUS_BADGE[selectedOrder.paymentStatus ?? ""] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{selectedOrder.paymentStatus}</Badge>
                      </div>
                    </div>
                    {selectedOrder.paymentScreenshotUrl && (
                      <div className="shrink-0">
                        <p className="text-xs text-slate-500 mb-1.5">Payment Screenshot</p>
                        <a href={selectedOrder.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={selectedOrder.paymentScreenshotUrl} alt="Payment screenshot" className="w-28 h-28 object-cover rounded-lg border border-slate-200 shadow-sm hover:opacity-90 transition-opacity" />
                        </a>
                      </div>
                    )}
                  </div>
                  {selectedOrder.paymentStatus === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50" data-testid="button-dialog-confirm-payment" onClick={() => handlePaymentStatus(selectedOrder.id, "confirmed")} disabled={updatePaymentStatus.isPending}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm Payment
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" data-testid="button-dialog-reject-payment" onClick={() => handlePaymentStatus(selectedOrder.id, "rejected")} disabled={updatePaymentStatus.isPending}>
                        <XCircle className="w-4 h-4 mr-1" /> Reject Payment
                      </Button>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Delivery Status</h3>
                  <div className="flex items-center gap-3">
                    <Badge className={`${STATUS_BADGE[selectedOrder.status] || ""} border capitalize text-sm px-3 py-1`}>{selectedOrder.status}</Badge>
                    <span className="text-slate-400 text-xs">→ Update to:</span>
                    <Select
                      value=""
                      onValueChange={(v) => {
                        if (v === "dispatched") {
                          setDispatchForm({ orderId: selectedOrder.id, courier: "", tracking: "" });
                        } else {
                          setDispatchForm(null);
                          handleStatusUpdate(selectedOrder.id, v);
                        }
                      }}
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-dialog-status"><SelectValue placeholder="Change status…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="printed">Printed</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Courier dispatch form — shown when "Dispatched" is selected */}
                  {dispatchForm && dispatchForm.orderId === selectedOrder.id && (
                    <div className="mt-3 bg-orange-50 rounded-xl p-4 border border-orange-200 space-y-3" data-testid="section-dispatch-form">
                      <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5" /> Mark as Dispatched — enter courier details
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Courier</label>
                          <Select
                            value={dispatchForm.courier}
                            onValueChange={(v) => setDispatchForm((f) => f ? { ...f, courier: v } : f)}
                          >
                            <SelectTrigger className="h-8 text-xs w-full" data-testid="select-dispatch-courier">
                              <SelectValue placeholder="Select courier…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="India Post">India Post</SelectItem>
                              <SelectItem value="Delhivery">Delhivery</SelectItem>
                              <SelectItem value="DTDC">DTDC</SelectItem>
                              <SelectItem value="BlueDart">BlueDart</SelectItem>
                              <SelectItem value="Ecom Express">Ecom Express</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Tracking number</label>
                          <input
                            data-testid="input-dispatch-tracking"
                            type="text"
                            placeholder="e.g. EW123456789IN"
                            className="w-full h-8 rounded-md border border-slate-300 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                            value={dispatchForm.tracking}
                            onChange={(e) => setDispatchForm((f) => f ? { ...f, tracking: e.target.value } : f)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          data-testid="button-confirm-dispatch"
                          disabled={!dispatchForm.courier || updateStatus.isPending}
                          onClick={() => handleStatusUpdate(selectedOrder.id, "dispatched", {
                            courierName: dispatchForm.courier,
                            ...(dispatchForm.tracking ? { trackingNumber: dispatchForm.tracking } : {}),
                          })}
                          className="flex-1 h-8 rounded-md bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" /> Confirm Dispatch
                        </button>
                        <button
                          onClick={() => setDispatchForm(null)}
                          className="h-8 px-3 rounded-md border border-slate-300 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {(selectedOrder.trackingNumber || (selectedOrder as any).courierName) && (
                    <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-200 text-xs flex flex-wrap gap-x-4 gap-y-1">
                      {(selectedOrder as any).courierName && (
                        <span>
                          <span className="text-slate-500">Courier: </span>
                          <span className="font-medium text-slate-800">{(selectedOrder as any).courierName}</span>
                        </span>
                      )}
                      {selectedOrder.trackingNumber && (
                        <span>
                          <span className="text-slate-500">Tracking: </span>
                          <span className="font-mono font-medium text-primary">{selectedOrder.trackingNumber}</span>
                        </span>
                      )}
                    </div>
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

        {/* Screenshot Lightbox */}
        {previewImg && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewImg(null)}
          >
            <div className="relative max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <button
                className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1"
                onClick={() => setPreviewImg(null)}
              >
                <X className="w-5 h-5" /> Close
              </button>
              <img
                src={previewImg}
                alt="Payment screenshot"
                className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
