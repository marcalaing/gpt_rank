import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Search,
  Target,
  TrendingUp,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle,
  Loader2,
  Brain,
  Eye,
  Sparkles,
  Award,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const domainSchema = z.object({
  domain: z.string()
    .min(3, "Enter a valid domain")
    .max(100)
    .regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/, "Enter a valid domain (e.g., example.com)"),
});

type DomainData = z.infer<typeof domainSchema>;

type QueryResult = {
  query: string;
  intent: string;
  brandMentioned: boolean;
  mentionCount: number;
  score: number;
  citedDomains: string[];
  responseSnippet?: string;
  error?: string;
};

type VisibilityResult = {
  domain: string;
  brandName: string;
  brandInsight: {
    description: string;
    industry: string;
    geography: string;
  };
  overallScore: number;
  summary: string;
  totalQueries: number;
  totalMentions: number;
  mentionRate: number;
  queryResults: QueryResult[];
};

export default function LandingPage() {
  const [searchResult, setSearchResult] = useState<VisibilityResult | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>("");

  const form = useForm<DomainData>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: "" },
  });

  const searchMutation = useMutation({
    mutationFn: async (data: DomainData) => {
      setLoadingStage("Analyzing your website...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingStage("Understanding your brand...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingStage("Generating search queries...");
      const res = await apiRequest("POST", "/api/free-visibility-check", data);
      
      setLoadingStage("Checking AI models...");
      return res.json();
    },
    onSuccess: (data) => {
      setSearchResult(data);
      setLoadingStage("");
    },
    onError: () => {
      setLoadingStage("");
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 70) return "default";
    if (score >= 40) return "secondary";
    return "destructive";
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

            {/* Free Visibility Checker - Single Input */}
            <Card className="mt-10 mx-auto max-w-2xl border-2 border-primary/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2 justify-center">
                  <Eye className="h-6 w-6 text-primary" />
                  Check Your AI Visibility — Free
                </CardTitle>
                <CardDescription>
                  Enter your domain. We'll analyze your brand and check how AI models respond.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => searchMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter your website (e.g., mondou.com)"
                                data-testid="input-domain"
                                className="h-12 text-lg"
                                disabled={searchMutation.isPending}
                                {...field}
                              />
                              <Button
                                type="submit"
                                size="lg"
                                disabled={searchMutation.isPending}
                                data-testid="button-check-visibility"
                              >
                                {searchMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Checking...
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Check Now
                                  </>
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Loading Progress */}
                    {searchMutation.isPending && loadingStage && (
                      <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{loadingStage}</span>
                        </div>
                        <Progress value={
                          loadingStage.includes("Analyzing") ? 25 :
                          loadingStage.includes("Understanding") ? 50 :
                          loadingStage.includes("Generating") ? 75 : 90
                        } className="h-2" />
                      </div>
                    )}

                    {searchMutation.error && (
                      <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">Check failed</p>
                          <p className="text-destructive/80">
                            {searchMutation.error instanceof Error ? searchMutation.error.message : "Please try again"}
                          </p>
                        </div>
                      </div>
                    )}
                  </form>
                </Form>

                {/* Results */}
                {searchResult && (
                  <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Overall Score */}
                    <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">{searchResult.brandName}</h3>
                      </div>
                      <div className={`text-5xl font-bold mb-2 ${getScoreColor(searchResult.overallScore)}`}>
                        {searchResult.overallScore}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">Overall Visibility Score</p>
                      <p className="text-sm max-w-md mx-auto">{searchResult.summary}</p>
                      
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                        <div>
                          <div className="text-2xl font-bold">{searchResult.totalQueries}</div>
                          <div className="text-xs text-muted-foreground">Queries Tested</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{searchResult.mentionRate}%</div>
                          <div className="text-xs text-muted-foreground">Mention Rate</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{searchResult.totalMentions}</div>
                          <div className="text-xs text-muted-foreground">Total Mentions</div>
                        </div>
                      </div>
                    </div>

                    {/* Brand Insight */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          Brand Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>{searchResult.brandInsight.description}</p>
                        <div className="flex gap-2 pt-2">
                          <Badge variant="outline">{searchResult.brandInsight.industry}</Badge>
                          <Badge variant="outline">
                            <Globe className="h-3 w-3 mr-1" />
                            {searchResult.brandInsight.geography}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Query Results */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Results by Query
                      </h3>
                      {searchResult.queryResults.map((result, idx) => (
                        <Card key={idx} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium mb-1">{result.query}</p>
                                <Badge variant="outline" className="text-xs">
                                  {result.intent}
                                </Badge>
                              </div>
                              <Badge variant={getScoreBadgeVariant(result.score)} className="text-lg font-bold px-3 py-1">
                                {result.score}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-xs text-muted-foreground">
                              {result.brandMentioned ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Mentioned {result.mentionCount}x</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Not mentioned</span>
                                </div>
                              )}
                              
                              {result.citedDomains.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Cited: {result.citedDomains.slice(0, 2).join(", ")}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* CTA */}
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                      <CardContent className="p-6 text-center">
                        <h3 className="text-lg font-semibold mb-2">Want to Track This Over Time?</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Sign up to monitor your AI visibility, track competitors, and get actionable insights to improve your rankings.
                        </p>
                        <Link href="/login">
                          <Button size="lg">
                            Get Started Free
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why GPT Rank?</h2>
              <p className="text-lg text-muted-foreground">
                The only platform built specifically to track and improve your brand's visibility in AI-powered search.
              </p>
            </div>

            <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="mb-2">
                    <Eye className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Real-Time Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Monitor how ChatGPT, Claude, Perplexity, and Gemini mention your brand across hundreds of relevant queries.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-2">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Competitor Intelligence</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    See who's winning in AI search, track their mentions, and identify opportunities to outrank them.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-2">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>Actionable Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Get specific recommendations on how to improve your AI visibility and drive more organic discovery.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold mb-4">
                Start Tracking Your AI Visibility Today
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join brands who are already optimizing for the AI-powered future of search.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg">
                    <Zap className="h-4 w-4 mr-2" />
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>© 2025 GPT Rank. All rights reserved.</span>
            </div>
            <nav className="flex gap-6">
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
              <Link href="/affiliates" className="hover:text-foreground">
                Affiliates
              </Link>
              <a href="mailto:support@gptrank.com" className="hover:text-foreground">
                Contact
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
