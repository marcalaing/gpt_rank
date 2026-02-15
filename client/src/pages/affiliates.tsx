import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BarChart3,
  ArrowRight,
  DollarSign,
  Users,
  TrendingUp,
  Gift,
  Clock,
  Zap,
} from "lucide-react";

export default function AffiliatesPage() {
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
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/affiliates" className="text-sm font-medium">
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

      <main>
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              Affiliate Program
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Earn <span className="text-primary">30% Recurring</span> Commission
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our affiliate program and earn 30% recurring commission for every customer you refer to GPT Rank, for as long as they remain a subscriber.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" data-testid="button-affiliate-join">
                  Become an Affiliate <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-4xl font-bold text-primary">30%</CardTitle>
                  <CardDescription>Recurring Commission</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Earn 30% of every payment for as long as your referral remains a paying customer.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-4xl font-bold text-primary">90</CardTitle>
                  <CardDescription>Day Cookie</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your referral link stays active for 90 days, so you get credit even if they sign up later.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-4xl font-bold text-primary">$50</CardTitle>
                  <CardDescription>Min Payout</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Low minimum payout threshold. Get paid via PayPal or bank transfer monthly.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">How It Works</h2>
              <p className="mt-2 text-muted-foreground">
                Start earning in 3 simple steps
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-semibold mb-2">Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  Create your free affiliate account and get your unique referral link.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-semibold mb-2">Share</h3>
                <p className="text-sm text-muted-foreground">
                  Share your link with your audience through blog posts, social media, or email.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="font-semibold mb-2">Earn</h3>
                <p className="text-sm text-muted-foreground">
                  Earn 30% recurring commission on every payment from your referrals.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Earning Potential</h2>
              <p className="mt-2 text-muted-foreground">
                See how much you could earn per referral annually
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Free</CardTitle>
                  <CardDescription>$0/month subscription</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per month (30%)</span>
                      <span className="font-semibold">$0</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-muted-foreground">Annual total</span>
                      <span className="font-bold text-muted-foreground">$0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-primary">
                <CardHeader>
                  <Badge className="w-fit mb-2">Most Popular</Badge>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>$29/month subscription</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per month (30%)</span>
                      <span className="font-semibold">$8.70</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-muted-foreground">Annual total</span>
                      <span className="font-bold text-primary">$104.40</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Max</CardTitle>
                  <CardDescription>$79/month subscription</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per month (30%)</span>
                      <span className="font-semibold">$23.70</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="text-muted-foreground">Annual total</span>
                      <span className="font-bold text-primary">$284.40</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Why Promote GPT Rank?</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Growing Market</h3>
                  <p className="text-sm text-muted-foreground">
                    AI search is the future. Marketing teams need tools to track their brand visibility across AI platforms.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">High Conversion</h3>
                  <p className="text-sm text-muted-foreground">
                    Our free brand check tool converts visitors to paying customers at an above-average rate.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Marketing Materials</h3>
                  <p className="text-sm text-muted-foreground">
                    We provide banners, email templates, and content to help you promote GPT Rank effectively.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Recurring Revenue</h3>
                  <p className="text-sm text-muted-foreground">
                    SaaS subscriptions mean recurring revenue. Earn every month your referrals stay subscribed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Earning?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join our affiliate program today and start earning 30% recurring commission on every referral.
            </p>
            <Link href="/login">
              <Button size="lg" data-testid="button-affiliate-cta">
                Join Affiliate Program <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
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
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
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
