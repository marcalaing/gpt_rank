import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/theme-toggle";
import { BarChart3, Check, ArrowRight, Sparkles, Zap, Rocket } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for trying out AI visibility tracking",
    tier: "free",
    icon: Sparkles,
    features: [
      "1 Brand/Project",
      "5 Search prompts",
      "50 AI checks per month",
      "ChatGPT (gpt-4o-mini) only",
      "Visibility scores & insights",
      "Community support",
    ],
    limitations: [
      "Single brand tracking only",
      "No historical data",
      "Limited to ChatGPT model",
    ],
    cta: "Start Free — No Card Required",
    popular: false,
    highlight: "Great for testing the waters",
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For serious marketers tracking brand visibility",
    tier: "starter",
    icon: Zap,
    features: [
      "3 Brands/Projects",
      "20 Search prompts per brand",
      "500 AI checks per month",
      "ChatGPT, Claude, Gemini & Perplexity",
      "Full visibility analytics",
      "Historical trend tracking",
      "Competitor mentions",
      "Citation analysis",
      "Email alerts when visibility drops",
      "Priority email support",
    ],
    limitations: [],
    cta: "Start 7-Day Free Trial",
    popular: true,
    highlight: "Most popular for growing brands",
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    description: "For agencies managing multiple client brands",
    tier: "pro",
    icon: Rocket,
    features: [
      "10 Brands/Projects",
      "100 Search prompts per brand",
      "2,500 AI checks per month",
      "All AI models + latest versions",
      "Advanced analytics dashboard",
      "Multi-month trend analysis",
      "Full competitor intelligence",
      "Deep citation & source analysis",
      "Custom alert rules",
      "White-label reports for clients",
      "API access for integrations",
      "Priority phone & chat support",
    ],
    limitations: [],
    cta: "Start 7-Day Free Trial",
    popular: false,
    highlight: "Best for agencies",
  },
  {
    name: "Enterprise",
    price: "$299",
    period: "/month",
    description: "For large organizations with custom needs",
    tier: "enterprise",
    icon: Rocket,
    features: [
      "Unlimited Brands/Projects",
      "Unlimited Search prompts",
      "10,000+ AI checks per month",
      "All AI models + beta access",
      "Custom analytics & reporting",
      "Dedicated success manager",
      "Custom integrations",
      "SLA guarantees",
      "Team training & onboarding",
      "White-label platform option",
      "Custom data retention",
      "24/7 priority support",
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
    highlight: "Custom solutions at scale",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">GPT Rank</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <Link href="/pricing" className="text-sm font-medium">
              Pricing
            </Link>
            <Link href="/affiliates" className="text-sm text-muted-foreground hover:text-foreground">
              Affiliates
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl font-bold mb-4">Start Free, Scale as You Grow</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track your AI visibility with zero commitment. No credit card required to start.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-16">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.popular ? "border-primary shadow-xl scale-105" : "border-border"
                }`}
                data-testid={`card-pricing-${plan.name.toLowerCase()}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  <div className="pt-6">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-lg">{plan.period}</span>
                  </div>
                  {plan.name === "Free" && (
                    <p className="text-xs text-muted-foreground pt-2">Forever free • No card needed</p>
                  )}
                  {plan.name !== "Free" && (
                    <p className="text-xs text-muted-foreground pt-2">7-day free trial • Cancel anytime</p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-primary mb-3">{plan.highlight}</p>
                  </div>
                  
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <div className="mb-4 pb-4 border-t pt-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Limitations:</p>
                      {plan.limitations.map((limitation) => (
                        <p key={limitation} className="text-xs text-muted-foreground mb-1">
                          • {limitation}
                        </p>
                      ))}
                    </div>
                  )}

                  <Link href="/login">
                    <Button
                      className="w-full h-12"
                      size="lg"
                      variant={plan.popular ? "default" : "outline"}
                      data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Value Props */}
        <div className="border-y py-12 mb-16">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Why Teams Choose GPT Rank</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">0</div>
                <p className="text-sm font-semibold mb-1">Credit Card Required</p>
                <p className="text-xs text-muted-foreground">Start tracking for free. Upgrade when you're ready.</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">4</div>
                <p className="text-sm font-semibold mb-1">AI Platforms Tracked</p>
                <p className="text-xs text-muted-foreground">ChatGPT, Claude, Perplexity & Gemini in one dashboard.</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">30s</div>
                <p className="text-sm font-semibold mb-1">Setup Time</p>
                <p className="text-xs text-muted-foreground">Add your brand, run a search, see your visibility score.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mb-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 font-semibold">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">Brands/Projects</td>
                  <td className="text-center py-3 px-4 text-sm text-muted-foreground">1</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">3</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">10</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">Prompts per brand</td>
                  <td className="text-center py-3 px-4 text-sm text-muted-foreground">5</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">20</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">100</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">AI checks per month</td>
                  <td className="text-center py-3 px-4 text-sm text-muted-foreground">50</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">500</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">2,500</td>
                  <td className="text-center py-3 px-4 text-sm font-semibold">10,000+</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">AI Model Selection</td>
                  <td className="text-center py-3 px-4 text-sm text-muted-foreground">ChatGPT only</td>
                  <td className="text-center py-3 px-4 text-sm">All models</td>
                  <td className="text-center py-3 px-4 text-sm">All + latest</td>
                  <td className="text-center py-3 px-4 text-sm">All + beta</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">Historical Tracking</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">Competitor Tracking</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">Email Alerts</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">White-label Reports</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">API Access</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-sm">Dedicated Support</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4">—</td>
                  <td className="text-center py-3 px-4"><Check className="h-4 w-4 text-primary mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="max-w-3xl mx-auto">
            <AccordionItem value="free-tier" data-testid="faq-free-tier">
              <AccordionTrigger className="text-left font-semibold">
                Is the free tier really free forever?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! You can track one brand with 5 prompts and 50 AI checks per month, forever. No credit card required. It's perfect for testing GPT Rank and seeing your initial visibility score.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="prompts" data-testid="faq-prompts">
              <AccordionTrigger className="text-left font-semibold">
                What counts as a "prompt"?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                A prompt is a question your customers might ask AI, like "What are the best CRM tools for small businesses?" You create these once, and we run them regularly to track your visibility over time.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="runs" data-testid="faq-runs">
              <AccordionTrigger className="text-left font-semibold">
                What counts as an "AI check"?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Each time we query one AI provider (ChatGPT, Claude, Perplexity, or Gemini) with your prompt, that's one AI check. So running 1 prompt across all 4 providers = 4 AI checks.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="trial" data-testid="faq-trial">
              <AccordionTrigger className="text-left font-semibold">
                How does the 7-day free trial work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sign up for Pro or Max and get full access for 7 days—no charge. If you love it, you'll be billed after the trial ends. If not, cancel anytime during the trial with zero charge.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="upgrade" data-testid="faq-upgrade">
              <AccordionTrigger className="text-left font-semibold">
                Can I upgrade or downgrade my plan?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Absolutely. You can change your plan anytime. Upgrades take effect immediately. Downgrades take effect at the start of your next billing cycle, so you don't lose what you've already paid for.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="payment" data-testid="faq-payment">
              <AccordionTrigger className="text-left font-semibold">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, Amex, Discover) via Stripe. All payments are secure and encrypted.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="models" data-testid="faq-models">
              <AccordionTrigger className="text-left font-semibold">
                What's the difference between "basic" and "latest" AI models?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Free plans use cost-efficient models from each provider that still give accurate results. Pro and Max plans let you choose the newest, most advanced models like GPT-4o, Claude 3.5 Sonnet, and Gemini Pro for even more precise tracking.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="agencies" data-testid="faq-agencies">
              <AccordionTrigger className="text-left font-semibold">
                I'm an agency managing multiple clients. Which plan is best?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                The Max plan is built for agencies. You get 10 projects (one per client), white-label reports to send to clients, and API access for custom integrations. Plus priority support when you need help fast.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="cancel" data-testid="faq-cancel">
              <AccordionTrigger className="text-left font-semibold">
                What happens if I cancel?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                You keep access until the end of your billing period. After that, your account downgrades to the free tier, so you can still track one brand. Your historical data is preserved for 90 days if you decide to come back.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center bg-muted/30 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Track Your AI Visibility?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start with the free tier and see exactly where your brand stands in AI search today.
          </p>
          <Link href="/login">
            <Button size="lg" className="h-14 text-lg px-8">
              Start Free — No Card Required <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Takes 30 seconds • See results immediately
          </p>
        </div>
      </main>

      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-semibold">GPT Rank</span>
            </div>
            <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <Link href="/affiliates" className="hover:text-foreground">
                Affiliates
              </Link>
              <Link href="/login" className="hover:text-foreground">
                Sign In
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              2025 GPT Rank. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
