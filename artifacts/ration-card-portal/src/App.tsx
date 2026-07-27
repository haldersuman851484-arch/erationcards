import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "./pages/Home";
import Order from "./pages/Order";
import TrackOrder from "./pages/TrackOrder";
import DownloadCard from "./pages/DownloadCard";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Shipping from "./pages/Shipping";
import DistrictPage from "./pages/DistrictPage";

import OrderUpload from "./pages/OrderUpload";
import OperatorRegister from "./pages/operator/Register";
import OperatorLogin from "./pages/operator/Login";
import OperatorDashboard from "./pages/operator/Dashboard";
import OperatorPlaceOrder from "./pages/operator/PlaceOrder";
import OperatorTrackOrder from "./pages/operator/OperatorTrackOrder";
import OperatorDownloadCard from "./pages/operator/OperatorDownloadCard";

import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import PublicCourierDashboard from "./pages/admin/PublicCourierDashboard";
import OperatorCourierDashboard from "./pages/admin/OperatorCourierDashboard";
import ShippingLabel from "./pages/admin/ShippingLabel";

const queryClient = new QueryClient();

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
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/order" component={Order} />
      <Route path="/order-upload/:orderNumber" component={OrderUpload} />
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

      <Route path="/operator/register" component={OperatorRegister} />
      <Route path="/operator/login" component={OperatorLogin} />
      <Route path="/operator/dashboard" component={OperatorDashboard} />
      <Route path="/operator/order" component={OperatorPlaceOrder} />
      <Route path="/operator/track" component={OperatorTrackOrder} />
      <Route path="/operator/download" component={OperatorDownloadCard} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/courier/public" component={PublicCourierDashboard} />
      <Route path="/admin/courier/operator" component={OperatorCourierDashboard} />
      <Route path="/admin/shipping-label/:orderNumber" component={ShippingLabel} />
      
      <Route component={NotFound} />
    </Switch>
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
