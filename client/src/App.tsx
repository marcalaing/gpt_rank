import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import PricingPage from "@/pages/pricing";
import AffiliatesPage from "@/pages/affiliates";
import DashboardPage from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import ProjectOverviewPage from "@/pages/project-overview";
import ProjectAlertsPage from "@/pages/project-alerts";
import ProjectSettingsPage from "@/pages/project-settings";
import AdminPage from "@/pages/admin";
import AnalyticsPage from "@/pages/analytics";
import BillingPage from "@/pages/billing";
import DiscoverPromptsPage from "@/pages/discover-prompts";
import RecommendationsPage from "@/pages/recommendations";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect to="/app" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/affiliates" component={AffiliatesPage} />
      <Route path="/login">
        <PublicRoute component={LoginPage} />
      </Route>
      <Route path="/app">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/app/projects">
        <ProtectedRoute component={ProjectsPage} />
      </Route>
      <Route path="/app/projects/:id/overview">
        <ProtectedRoute component={ProjectOverviewPage} />
      </Route>
      <Route path="/app/projects/:id/alerts">
        <ProtectedRoute component={ProjectAlertsPage} />
      </Route>
      <Route path="/app/projects/:id/settings">
        <ProtectedRoute component={ProjectSettingsPage} />
      </Route>
      <Route path="/app/projects/:id">
        <ProtectedRoute component={ProjectDetailPage} />
      </Route>
      <Route path="/app/analytics">
        <ProtectedRoute component={AnalyticsPage} />
      </Route>
      <Route path="/app/admin">
        <ProtectedRoute component={AdminPage} />
      </Route>
      <Route path="/app/billing">
        <ProtectedRoute component={BillingPage} />
      </Route>
      <Route path="/app/discover">
        <ProtectedRoute component={DiscoverPromptsPage} />
      </Route>
      <Route path="/app/projects/:id/recommendations">
        <ProtectedRoute component={RecommendationsPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
