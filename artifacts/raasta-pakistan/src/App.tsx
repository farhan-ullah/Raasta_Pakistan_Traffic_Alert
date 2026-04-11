import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import Traffic from "@/pages/traffic";
import Offers from "@/pages/offers";
import OfferDetail from "@/pages/offer-detail";
import Merchants from "@/pages/merchants";
import MerchantProfile from "@/pages/merchant-profile";
import PoliceDashboard from "@/pages/police";
import NewIncident from "@/pages/police/new-incident";
import MerchantPortal from "@/pages/merchant-portal";
import DashboardSummary from "@/pages/dashboard";
import CitizenReport from "@/pages/report";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/traffic" component={Traffic} />
        <Route path="/offers" component={Offers} />
        <Route path="/offers/:id" component={OfferDetail} />
        <Route path="/merchants" component={Merchants} />
        <Route path="/merchants/:id" component={MerchantProfile} />
        <Route path="/report" component={CitizenReport} />
        <Route path="/police" component={PoliceDashboard} />
        <Route path="/police/new-incident" component={NewIncident} />
        <Route path="/merchant-portal" component={MerchantPortal} />
        <Route path="/dashboard" component={DashboardSummary} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
