import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, CreditCard, Zap, Building2, Rocket, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface Price {
  id: string;
  unitAmount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
  metadata: Record<string, string>;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: {
    tier?: string;
    projectLimit?: string;
    promptsPerProject?: string;
    runsPerMonth?: string;
    popular?: string;
  };
  prices: Price[];
}

const PLAN_ICONS: Record<string, typeof Zap> = {
  free: Zap,
  starter: Rocket, // Display: Pro ($29)
  pro: Crown,      // Display: Max ($79)
  // Legacy tier support
  enterprise: Crown,
};

// Map database tier keys to display names
const TIER_DISPLAY_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Pro",     // $29/mo
  pro: "Max",         // $79/mo
  enterprise: "Max",  // Legacy
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "1 project",
    "5 prompts per project",
    "50 AI runs per month",
    "Cost-efficient AI models",
    "Basic analytics",
    "Community support",
  ],
  starter: [ // Display: Pro ($29)
    "3 projects",
    "20 prompts per project",
    "500 AI runs per month",
    "Choose from latest AI models",
    "Advanced analytics",
    "Score history over time",
    "Email alerts",
    "Email support",
  ],
  pro: [ // Display: Max ($79)
    "10 projects",
    "100 prompts per project",
    "2,500 AI runs per month",
    "All premium AI models",
    "Full analytics suite",
    "Score history + competitor comparison",
    "Custom alerts",
    "API access",
    "Priority support",
  ],
  // Legacy tier support
  enterprise: [
    "10 projects",
    "100 prompts per project",
    "2,500 AI runs per month",
    "Full analytics suite",
    "Priority support",
  ],
};

export default function BillingPage() {
  const { toast } = useToast();
  const [location] = useLocation();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({ title: "Subscription successful", description: "Your plan has been upgraded." });
      window.history.replaceState({}, "", "/app/billing");
    } else if (params.get("canceled") === "true") {
      toast({ title: "Checkout canceled", variant: "destructive" });
      window.history.replaceState({}, "", "/app/billing");
    }
  }, [location, toast]);

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["/api/billing/plans"],
  });

  const { data: subscriptionData, isLoading: subLoading } = useQuery<{ 
    subscription: unknown; 
    tier: string; 
    status?: string;
  }>({
    queryKey: ["/api/billing/subscription"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/billing/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Checkout failed", description: error.message, variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Portal access failed", description: error.message, variant: "destructive" });
    },
  });

  const plans = plansData?.plans || [];
  const currentTier = subscriptionData?.tier || "free";
  const hasSubscription = subscriptionData?.subscription !== null;

  const formatPrice = (amount: number, interval?: string) => {
    if (amount === 0) return "Free";
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
    return interval ? `${formatted}/${interval === "month" ? "mo" : "yr"}` : formatted;
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Billing" }]}>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-billing-title">Billing & Plans</h1>
          <p className="text-muted-foreground mt-2">
            Choose the plan that fits your AI visibility tracking needs
          </p>
        </div>

        {hasSubscription && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Subscription
                </CardTitle>
                <CardDescription className="mt-1">
                  You are on the <Badge variant="secondary" className="ml-1">{TIER_DISPLAY_NAMES[currentTier] || currentTier}</Badge> plan
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-subscription"
              >
                Manage Subscription
              </Button>
            </CardHeader>
          </Card>
        )}

        {plansLoading || subLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const tier = plan.metadata?.tier || "free";
              const Icon = PLAN_ICONS[tier] || Zap;
              const features = PLAN_FEATURES[tier] || [];
              const monthlyPrice = plan.prices.find(p => p.recurring?.interval === "month");
              const isCurrentPlan = currentTier === tier;
              const isPopular = plan.metadata?.popular === "true";

              return (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col ${isPopular ? "border-primary" : ""}`}
                  data-testid={`card-plan-${tier}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="mt-4">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="text-center">
                      <span className="text-3xl font-bold">
                        {monthlyPrice ? formatPrice(monthlyPrice.unitAmount) : "Custom"}
                      </span>
                      {monthlyPrice && monthlyPrice.unitAmount > 0 && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isCurrentPlan ? (
                      <Button variant="secondary" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : tier === "free" ? (
                      <Button variant="outline" className="w-full" disabled>
                        Free Tier
                      </Button>
                    ) : monthlyPrice ? (
                      <Button 
                        className="w-full"
                        onClick={() => checkoutMutation.mutate(monthlyPrice.id)}
                        disabled={checkoutMutation.isPending}
                        data-testid={`button-upgrade-${tier}`}
                      >
                        {checkoutMutation.isPending ? "Loading..." : `Upgrade to ${plan.name}`}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" asChild>
                        <a href="mailto:sales@gptrank.ai">Contact Sales</a>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {plans.length === 0 && !plansLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No billing plans available yet. Plans will appear once configured.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
