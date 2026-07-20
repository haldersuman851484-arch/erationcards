import { Switch, Route, Router as WouterRouter } from "wouter";
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

import OrderUpload from "./pages/OrderUpload";
import OperatorRegister from "./pages/operator/Register";
import OperatorLogin from "./pages/operator/Login";
import OperatorDashboard from "./pages/operator/Dashboard";
import OperatorPlaceOrder from "./pages/operator/PlaceOrder";
import OperatorTrackOrder from "./pages/operator/OperatorTrackOrder";
import OperatorDownloadCard from "./pages/operator/OperatorDownloadCard";

import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/order" component={Order} />
      <Route path="/order-upload/:orderNumber" component={OrderUpload} />
      <Route path="/track" component={TrackOrder} />
      <Route path="/download" component={DownloadCard} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />

      <Route path="/operator/register" component={OperatorRegister} />
      <Route path="/operator/login" component={OperatorLogin} />
      <Route path="/operator/dashboard" component={OperatorDashboard} />
      <Route path="/operator/order" component={OperatorPlaceOrder} />
      <Route path="/operator/track" component={OperatorTrackOrder} />
      <Route path="/operator/download" component={OperatorDownloadCard} />

      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      
      <Route component={NotFound} />
    </Switch>
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
