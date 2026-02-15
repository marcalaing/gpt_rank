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
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              AI Visibility Analytics
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Track Your Brand Visibility{" "}
              <span className="text-primary">Across AI Search</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Monitor how ChatGPT, Perplexity, Claude, and Gemini represent your brand. 
              Understand citations, track competitors, and optimize your AI presence.
            </p>

            <Card className="mt-12 mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 justify-center">
                  <Search className="h-5 w-5" />
                  Free Brand Visibility Check
                </CardTitle>
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
                                placeholder="Brand name (e.g., Mondou)"
                                data-testid="input-free-search-brand"
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
                                placeholder="Domain (optional)"
                                data-testid="input-free-search-domain"
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
                              placeholder="Search prompt (e.g., What are the best pet stores in Canada?)"
                              data-testid="input-free-search-prompt"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={searchMutation.isPending}
                      data-testid="button-free-search"
                    >
                      {searchMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          Analyze Visibility <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                {searchResult && (
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="font-semibold">{searchResult.brandName}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                          "{searchResult.prompt}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">AI Visibility Score:</span>
                        <span className={`text-2xl font-bold ${getScoreColor(searchResult.score)}`} data-testid="text-visibility-score">
                          {searchResult.score}/100
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
                              <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Not mentioned in response</span>
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
                        <p className="text-xs font-medium text-muted-foreground mb-2">Cited Sources:</p>
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
                        <p className="text-xs font-medium text-muted-foreground mb-2">Other Brands Mentioned:</p>
                        <div className="flex flex-wrap gap-2">
                          {searchResult.competitorMentions.slice(0, 5).map((c) => (
                            <Badge key={c.name} variant="outline" className="text-xs">
                              {c.name} ({c.count})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <Link href="/login">
                        <Button className="w-full" data-testid="button-get-full-report">
                          Get Full Report <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">How GPT Rank Works</h2>
              <p className="mt-2 text-muted-foreground">
                Track your brand across all major AI platforms
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Set Up Your Brand</h3>
                <p className="text-sm text-muted-foreground">
                  Add your brand name, domains, and synonyms. Define prompts that matter to your business.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Query AI Models</h3>
                <p className="text-sm text-muted-foreground">
                  We run your prompts across ChatGPT, Claude, Perplexity, and Gemini to see how they represent your brand.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Track & Optimize</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor visibility scores, analyze citations, compare against competitors, and improve your AI presence.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">AI Platforms We Track</h2>
              <p className="mt-2 text-muted-foreground">
                Monitor your brand across all major AI search and chat platforms
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <Card className="p-6 text-center">
                <SiOpenai className="h-8 w-8 mx-auto mb-3 text-foreground" />
                <h3 className="font-semibold">ChatGPT</h3>
                <p className="text-xs text-muted-foreground mt-1">OpenAI</p>
              </Card>
              <Card className="p-6 text-center">
                <Brain className="h-8 w-8 mx-auto mb-3 text-foreground" />
                <h3 className="font-semibold">Claude</h3>
                <p className="text-xs text-muted-foreground mt-1">Anthropic</p>
              </Card>
              <Card className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto mb-3 text-foreground" />
                <h3 className="font-semibold">Perplexity</h3>
                <p className="text-xs text-muted-foreground mt-1">AI Search</p>
              </Card>
              <Card className="p-6 text-center">
                <Globe className="h-8 w-8 mx-auto mb-3 text-foreground" />
                <h3 className="font-semibold">Gemini</h3>
                <p className="text-xs text-muted-foreground mt-1">Google</p>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Key Features</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Visibility Scoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a clear score of how visible your brand is across AI platforms.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Competitor Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor how competitors are represented compared to your brand.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Citation Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    See which sources AI models cite when discussing your brand.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Trend Monitoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Track how your visibility changes over time with historical data.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Alert System</h3>
                  <p className="text-sm text-muted-foreground">
                    Get notified when your visibility score drops or competitors gain.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Detailed Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Export comprehensive reports for stakeholders and strategy planning.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Track Your AI Visibility?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join marketing teams using GPT Rank to monitor and optimize their brand presence across AI platforms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" data-testid="button-cta-get-started">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" data-testid="button-cta-pricing">
                  View Pricing
                </Button>
              </Link>
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
