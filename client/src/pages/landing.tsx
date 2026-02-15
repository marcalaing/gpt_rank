import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import {
  BarChart3,
  Search,
  Target,
  TrendingUp,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle,
  Loader2,
  Brain,
  Eye,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { SiOpenai } from "react-icons/si";

const freeSearchSchema = z.object({
  brandName: z.string().min(1, "Enter a brand name"),
  prompt: z.string().min(1, "Enter a search prompt"),
  domain: z.string().optional(),
});

type FreeSearchData = z.infer<typeof freeSearchSchema>;

type FreeSearchResult = {
  brandName: string;
  prompt: string;
  score: number;
  provider: { 
    name: string; 
    model: string;
    mentioned: boolean; 
    sentiment: string;
    mentionCount: number;
  };
  summary: string;
  aiResponse?: string;
  citedDomains?: { domain: string; count: number }[];
  competitorMentions?: { name: string; count: number }[];
};

export default function LandingPage() {
  const [searchResult, setSearchResult] = useState<FreeSearchResult | null>(null);

  const form = useForm<FreeSearchData>({
    resolver: zodResolver(freeSearchSchema),
    defaultValues: { brandName: "", prompt: "", domain: "" },
  });

  const searchMutation = useMutation({
    mutationFn: async (data: FreeSearchData) => {
      const res = await apiRequest("POST", "/api/free-search", data);
      return res.json();
    },
    onSuccess: (data) => {
      setSearchResult(data);
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">GPT Rank</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/affiliates" className="text-sm text-muted-foreground hover:text-foreground">
              Affiliates
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-login">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" data-testid="link-get-started">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1 inline" />
              Track Your Visibility Across ChatGPT, Claude, Perplexity & Gemini
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
              Are You <span className="text-primary">Invisible to AI?</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              Millions of people ask ChatGPT, Claude, Perplexity, and Gemini for recommendations every day.
            </p>
            
            <p className="text-2xl font-semibold mb-8">
              Is your brand getting mentioned—or are your competitors winning?
            </p>

            {/* Free Search Tool - Front and Center */}
            <Card className="mt-10 mx-auto max-w-2xl border-2 border-primary/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2 justify-center">
                  <Search className="h-6 w-6 text-primary" />
                  Check Your Brand Visibility — Free, No Signup
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Get an instant visibility score across major AI platforms
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => searchMutation.mutate(data))}
                    className="space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row gap-3">
                      <FormField
                        control={form.control}
                        name="brandName"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Your brand name (e.g., Mondou)"
                                data-testid="input-free-search-brand"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Website (optional)"
                                data-testid="input-free-search-domain"
                                className="h-11"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="prompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Search prompt your customers might ask (e.g., 'What are the best pet stores in Canada?')"
                              data-testid="input-free-search-prompt"
                              className="h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-12 text-base"
                      disabled={searchMutation.isPending}
                      data-testid="button-free-search"
                    >
                      {searchMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Checking AI Models...
                        </>
                      ) : (
                        <>
                          Check My Visibility Now <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      ✓ No credit card required • ✓ Results in 30 seconds
                    </p>
                  </form>
                </Form>

                {searchResult && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-4 border-2 border-primary/20">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-lg">{searchResult.brandName}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          "{searchResult.prompt}"
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">AI Visibility Score</p>
                        <span className={`text-4xl font-bold ${getScoreColor(searchResult.score)}`} data-testid="text-visibility-score">
                          {searchResult.score}<span className="text-2xl">/100</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded bg-background">
                      <SiOpenai className="h-5 w-5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{searchResult.provider.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {searchResult.provider.model}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {searchResult.provider.mentioned ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-muted-foreground">
                                Mentioned {searchResult.provider.mentionCount} time(s) with {searchResult.provider.sentiment} sentiment
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                Not mentioned — Your competitors might be winning
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{searchResult.summary}</p>
                    
                    {searchResult.aiResponse && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">AI Response Preview:</p>
                        <p className="text-sm bg-background p-3 rounded max-h-32 overflow-y-auto" data-testid="text-ai-response">
                          {searchResult.aiResponse.length > 500 
                            ? searchResult.aiResponse.slice(0, 500) + "..." 
                            : searchResult.aiResponse}
                        </p>
                      </div>
                    )}
                    
                    {searchResult.citedDomains && searchResult.citedDomains.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">📎 Cited Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {searchResult.citedDomains.slice(0, 5).map((d) => (
                            <Badge key={d.domain} variant="secondary" className="text-xs">
                              {d.domain} ({d.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {searchResult.competitorMentions && searchResult.competitorMentions.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">🏆 Other Brands AI Recommended:</p>
                        <div className="flex flex-wrap gap-2">
                          {searchResult.competitorMentions.slice(0, 5).map((c) => (
                            <Badge key={c.name} variant="outline" className="text-xs">
                              {c.name} ({c.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t space-y-2">
                      <Link href="/login">
                        <Button className="w-full h-12" size="lg" data-testid="button-get-full-report">
                          See Full Report & Track Over Time <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <p className="text-xs text-center text-muted-foreground">
                        Track across all 4 providers • Monitor competitors • Get alerts
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Social Proof */}
        <section className="border-y bg-muted/30 py-12">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-muted-foreground mb-6">
              Trusted by marketing teams who care about AI visibility
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 grayscale">
              {/* Placeholder for customer logos */}
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                Customer Logo
              </div>
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                Customer Logo
              </div>
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                Customer Logo
              </div>
              <div className="h-12 w-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                Customer Logo
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">How GPT Rank Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Know exactly where you stand—before your competitors do
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
                  Step 1
                </div>
                <h3 className="font-bold text-lg mb-2">Add Your Brand & Prompts</h3>
                <p className="text-sm text-muted-foreground">
                  Tell us your brand and the questions your customers ask AI. ("What's the best CRM?" "Top marketing agencies?")
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
                  Step 2
                </div>
                <h3 className="font-bold text-lg mb-2">We Query All Major AI Models</h3>
                <p className="text-sm text-muted-foreground">
                  GPT Rank automatically checks ChatGPT, Claude, Perplexity, and Gemini to see if they mention your brand—and how.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-3">
                  Step 3
                </div>
                <h3 className="font-bold text-lg mb-2">Get Insights & Take Action</h3>
                <p className="text-sm text-muted-foreground">
                  See your visibility score, track trends, spy on competitors, and optimize your content to rank higher in AI.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Platforms */}
        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">Track Every Major AI Platform</h2>
              <p className="text-lg text-muted-foreground">
                Your customers are asking AI for recommendations. Are they finding you?
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <Card className="p-6 text-center hover:border-primary/50 transition-colors">
                <SiOpenai className="h-10 w-10 mx-auto mb-3 text-foreground" />
                <h3 className="font-semibold text-lg">ChatGPT</h3>
                <p className="text-xs text-muted-foreground mt-1">OpenAI</p>
                <Badge variant="secondary" className="mt-2 text-xs">Most Popular</Badge>
              </Card>
              <Card className="p-6 text-center hover:border-primary/50 transition-colors">
                <Brain className="h-10 w-10 mx-auto mb-3 text-foreground" />
                <h3 className="font-semibold text-lg">Claude</h3>
                <p className="text-xs text-muted-foreground mt-1">Anthropic</p>
                <Badge variant="secondary" className="mt-2 text-xs">Growing Fast</Badge>
              </Card>
              <Card className="p-6 text-center hover:border-primary/50 transition-colors">
                <Search className="h-10 w-10 mx-auto mb-3 text-foreground" />
                <h3 className="font-semibold text-lg">Perplexity</h3>
                <p className="text-xs text-muted-foreground mt-1">AI Search</p>
                <Badge variant="secondary" className="mt-2 text-xs">Citation-Heavy</Badge>
              </Card>
              <Card className="p-6 text-center hover:border-primary/50 transition-colors">
                <Globe className="h-10 w-10 mx-auto mb-3 text-foreground" />
                <h3 className="font-semibold text-lg">Gemini</h3>
                <p className="text-xs text-muted-foreground mt-1">Google</p>
                <Badge variant="secondary" className="mt-2 text-xs">Integrated w/ Search</Badge>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Everything You Need to Win in AI</h2>
              <p className="text-muted-foreground">
                Stop guessing. Start tracking.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Visibility Scoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a clear 0-100 score showing exactly how visible you are. Track changes over time.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Competitor Intelligence</h3>
                  <p className="text-sm text-muted-foreground">
                    See who AI recommends instead of you. Steal their strategies before they steal your customers.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Citation Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Discover which websites AI trusts most. Optimize your backlink strategy accordingly.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Trend Monitoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Watch your AI visibility improve (or tank) over time. Historical data you can actually use.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Smart Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Get notified when your visibility drops, competitors surge, or new opportunities appear.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Stakeholder Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Export beautiful reports to show your boss exactly what's working (and what's not).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">What Marketing Teams Are Saying</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-500">★</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "We had no idea we were invisible to ChatGPT until we used GPT Rank. Now we're mentioned 3x more often."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    JD
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Jane Doe</p>
                    <p className="text-xs text-muted-foreground">CMO, TechCorp</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-500">★</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "Finally, a way to track AI search like we track Google. This is the future of SEO."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    MS
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Mike Smith</p>
                    <p className="text-xs text-muted-foreground">Founder, GrowthAgency</p>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-500">★</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "GPT Rank showed us our competitors were dominating AI search. We fixed it in 2 months."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    SL
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Sarah Lee</p>
                    <p className="text-xs text-muted-foreground">Marketing Director, SaaS Co</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold mb-4">
                Stop Losing Customers to AI Recommendations
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Your competitors are already tracking their AI visibility. Are you?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Link href="/login">
                  <Button size="lg" className="h-14 text-lg px-8" data-testid="button-cta-get-started">
                    Start Tracking for Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg" className="h-14 text-lg px-8" data-testid="button-cta-pricing">
                    View Pricing
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                ✓ Free brand check • ✓ No credit card • ✓ See results in 30 seconds
              </p>
            </div>
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
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
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
