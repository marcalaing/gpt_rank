import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/theme-toggle";
import { BarChart3, Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Get started with basic AI visibility tracking",
    tier: "free",
    features: [
      "1 Project",
      "5 Prompts per project",
      "50 AI runs per month",
      "Cost-efficient AI models",
      "Basic analytics",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing brands tracking AI visibility",
    tier: "starter", // Uses legacy tier key for backwards compatibility
    features: [
      "3 Projects",
      "20 Prompts per project",
      "500 AI runs per month",
      "Choose from latest AI models",
      "Advanced analytics",
      "Score history over time",
      "Email alerts",
      "Email support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Max",
    price: "$79",
    period: "/month",
    description: "For agencies managing multiple brands",
    tier: "pro", // Uses legacy tier key for backwards compatibility
    features: [
      "10 Projects",
      "100 Prompts per project",
      "2,500 AI runs per month",
      "All premium AI models",
      "Full analytics suite",
      "Score history + competitor comparison",
      "Custom alerts",
      "API access",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: false,
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
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your brand monitoring needs. Start free, upgrade when you're ready.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg" : ""}`}
              data-testid={`card-pricing-${plan.name.toLowerCase()}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="max-w-2xl mx-auto text-left">
            <AccordionItem value="prompts" data-testid="faq-prompts">
              <AccordionTrigger className="text-left font-semibold">
                What counts as a "prompt"?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                A prompt is a query template you create to check your brand visibility. For example, "What are the best CRM tools for small businesses?" Each prompt can be run across multiple AI providers.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="runs" data-testid="faq-runs">
              <AccordionTrigger className="text-left font-semibold">
                What counts as an "AI run"?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                An AI run is when we query an AI provider with your prompt. Running one prompt across 4 AI providers counts as 4 runs.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="upgrade" data-testid="faq-upgrade">
              <AccordionTrigger className="text-left font-semibold">
                Can I upgrade or downgrade my plan?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes, you can change your plan at any time. Changes take effect at the start of your next billing cycle.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payment" data-testid="faq-payment">
              <AccordionTrigger className="text-left font-semibold">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We accept all major credit cards via Stripe.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="models" data-testid="faq-models">
              <AccordionTrigger className="text-left font-semibold">
                What AI models are available?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Free plans use cost-efficient models for each provider. Pro and Max plans let you choose from the latest AI models including GPT-4, Claude, Gemini, and Perplexity for more accurate visibility tracking.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
