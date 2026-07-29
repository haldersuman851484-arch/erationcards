import React, { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { handleStaffAuthError } from "./lib/staffSession";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "./pages/Home";

const NotFound = lazy(() => import("@/pages/not-found"));
const Order = lazy(() => import("./pages/Order"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const DownloadCard = lazy(() => import("./pages/DownloadCard"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Refund = lazy(() => import("./pages/Refund"));
const Shipping = lazy(() => import("./pages/Shipping"));
const DistrictPage = lazy(() => import("./pages/DistrictPage"));
const GuideDownloadERationCard = lazy(() => import("./pages/guides/DownloadERationCard"));
const GuideRationCardTypes = lazy(() => import("./pages/guides/RationCardTypes"));
const GuideLostRationCard = lazy(() => import("./pages/guides/LostRationCard"));

const OrderUpload = lazy(() => import("./pages/OrderUpload"));
const Receipt = lazy(() => import("./pages/Receipt"));
const OperatorRegister = lazy(() => import("./pages/operator/Register"));
const OperatorLogin = lazy(() => import("./pages/operator/Login"));
const OperatorDashboard = lazy(() => import("./pages/operator/Dashboard"));
const OperatorPlaceOrder = lazy(() => import("./pages/operator/PlaceOrder"));
const OperatorTrackOrder = lazy(
  () => import("./pages/operator/OperatorTrackOrder"),
);
const OperatorDownloadCard = lazy(
  () => import("./pages/operator/OperatorDownloadCard"),
);

const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const ProcessingPanel = lazy(() => import("./pages/processing/ProcessingPanel"));
const PublicCourierDashboard = lazy(
  () => import("./pages/admin/PublicCourierDashboard"),
);
const OperatorCourierDashboard = lazy(
  () => import("./pages/admin/OperatorCourierDashboard"),
);
const ShippingLabel = lazy(() => import("./pages/admin/ShippingLabel"));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleStaffAuthError,
  }),
  mutationCache: new MutationCache({
    onError: handleStaffAuthError,
  }),
});

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return (
    <div key={location} className="page-enter">
      {children}
    </div>
  );
}

function Router() {
  return (
    <>
    <ScrollToTop />
    <PageTransition>
    <Suspense fallback={<PageLoader />}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/order" component={Order} />
      <Route path="/order-upload/:orderNumber" component={OrderUpload} />
      <Route path="/receipt/:orderNumber" component={Receipt} />
      <Route path="/track" component={TrackOrder} />
      <Route path="/download" component={DownloadCard} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/refund" component={Refund} />
      <Route path="/shipping" component={Shipping} />
      <Route path="/pvc-ration-card/:district" component={DistrictPage} />
      <Route path="/guides/download-e-ration-card" component={GuideDownloadERationCard} />
      <Route path="/guides/ration-card-types-west-bengal" component={GuideRationCardTypes} />
      <Route path="/guides/lost-ration-card-west-bengal" component={GuideLostRationCard} />

      <Route path="/operator/register" component={OperatorRegister} />
      <Route path="/operator/login" component={OperatorLogin} />
      <Route path="/operator/dashboard" component={OperatorDashboard} />
      <Route path="/operator/order" component={OperatorPlaceOrder} />
      <Route path="/operator/track" component={OperatorTrackOrder} />
      <Route path="/operator/download" component={OperatorDownloadCard} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />

      <Route path="/processing" component={ProcessingPanel} />
      <Route path="/processing/courier/public" component={PublicCourierDashboard} />
      <Route path="/processing/courier/operator" component={OperatorCourierDashboard} />
      <Route path="/processing/shipping-label/:orderNumber" component={ShippingLabel} />

      {/* Old bookmarked mPanel URLs → new processing paths */}
      <Route path="/admin/courier/public">{() => <Redirect to="/processing/courier/public" />}</Route>
      <Route path="/admin/courier/operator">{() => <Redirect to="/processing/courier/operator" />}</Route>
      <Route path="/admin/shipping-label/:orderNumber">
        {(params) => <Redirect to={`/processing/shipping-label/${params.orderNumber}`} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </PageTransition>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
