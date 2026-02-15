import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScoreTooltip } from "@/components/score-tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Prompt } from "@shared/schema";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Globe,
  ChevronDown,
  ChevronRight,
  Play,
  Loader2,
  ExternalLink,
  MessageSquare,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Lightbulb,
} from "lucide-react";

interface MetricsData {
  dateRange: { start: string; end: string; days: number };
  promptCount: number;
  promptCountDelta: number;
  brandMentionRate: number;
  brandMentionCount: number;
  mentionRateDelta: number;
  avgVisibilityScore: number;
  scoreDelta: number;
  topCompetitor: { name: string; mentions: number } | null;
  topCitedDomains: { domain: string; count: number }[];
  competitorMentionRates: Record<string, number>;
  scoreTrend: { date: string; avgScore: number; runCount: number }[];
  competitorScoreTrends?: Record<string, { date: string; avgScore: number }[]>;
  competitors?: { id: string; name: string }[];
  recentRuns: {
    id: string;
    provider: string;
    model: string | null;
    executedAt: string;
    rawResponse: string | null;
    parsedMentions: {
      brandMentioned?: boolean;
      brandMentionCount?: number;
      competitorMentions?: { id: string; name: string; count: number }[];
      citedDomains?: { domain: string; count: number; urls?: string[] }[];
      citedUrls?: string[];
      sentiment?: string;
      topics?: string[];
    } | null;
  }[];
}

const CHART_COLORS = ["hsl(217, 91%, 35%)", "hsl(217, 71%, 55%)", "hsl(217, 51%, 75%)", "hsl(217, 31%, 85%)"];
const COMPETITOR_COLORS = [
  "hsl(0, 70%, 50%)",    // Red
  "hsl(120, 50%, 40%)",  // Green
  "hsl(280, 60%, 50%)",  // Purple
  "hsl(30, 80%, 50%)",   // Orange
  "hsl(180, 60%, 40%)",  // Teal
];

export default function ProjectOverviewPage() {
  const [, params] = useRoute("/app/projects/:id/overview");
  const projectId = params?.id;
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30");
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [showFullResponse, setShowFullResponse] = useState<string | null>(null);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(new Set());

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: prompts = [] } = useQuery<Prompt[]>({
    queryKey: ["/api/projects", projectId, "prompts"],
    enabled: !!projectId,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<MetricsData>({
    queryKey: ["/api/projects", projectId, `metrics?days=${dateRange}`],
    enabled: !!projectId,
  });

  // Auto-select competitors when metrics load (for Pro/Max users with competitor trends)
  useEffect(() => {
    if (metrics?.competitorScoreTrends && Object.keys(metrics.competitorScoreTrends).length > 0) {
      // Auto-select all competitors with data
      setSelectedCompetitors(new Set(Object.keys(metrics.competitorScoreTrends)));
    }
  }, [metrics?.competitorScoreTrends]);

  const runPromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const res = await apiRequest("POST", `/api/prompts/${promptId}/run`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Prompt run completed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to run prompt", description: error.message, variant: "destructive" });
    },
  });

  // Helper component for delta indicators
  const DeltaIndicator = ({ delta, suffix = "" }: { delta: number; suffix?: string }) => {
    if (delta === 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <Minus className="h-3 w-3" />
          No change
        </span>
      );
    }
    const isPositive = delta > 0;
    return (
      <span className={`flex items-center gap-0.5 text-xs ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {isPositive ? "+" : ""}{delta}{suffix} vs prev
      </span>
    );
  };

  if (projectLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/app/projects" }, { label: "Loading..." }]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/app/projects" }, { label: "Not Found" }]}>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Project not found</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const competitorChartData = metrics
    ? Object.entries(metrics.competitorMentionRates).map(([name, count]) => ({
        name,
        mentions: count,
      }))
    : [];

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Projects", href: "/app/projects" },
        { label: project.name, href: `/app/projects/${projectId}` },
        { label: "Overview" },
      ]}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-project-name">
              {project.name} - Analytics
            </h1>
            <p className="text-muted-foreground">AI visibility metrics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/app/projects/${projectId}/recommendations`}>
              <Button variant="outline" data-testid="button-view-recommendations">
                <Lightbulb className="h-4 w-4 mr-2" />
                Recommendations
              </Button>
            </Link>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36" data-testid="select-date-range">
                <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
            </Select>
          </div>
        </div>

        {metricsLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prompt Runs</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-prompt-runs">
                    {metrics?.promptCount || 0}
                  </div>
                  <DeltaIndicator delta={metrics?.promptCountDelta || 0} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Brand Mention Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-mention-rate">
                    {metrics?.brandMentionRate || 0}%
                  </div>
                  <DeltaIndicator delta={metrics?.mentionRateDelta || 0} suffix="%" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Competitor</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold truncate" data-testid="stat-top-competitor">
                    {metrics?.topCompetitor?.name || "None"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics?.topCompetitor?.mentions || 0} mentions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Visibility Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${
                      (metrics?.avgVisibilityScore || 0) >= 70 ? "text-green-600 dark:text-green-400" :
                      (metrics?.avgVisibilityScore || 0) >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                      "text-red-600 dark:text-red-400"
                    }`} data-testid="stat-visibility-score">
                      {metrics?.avgVisibilityScore || 0}
                    </span>
                    <span className="text-muted-foreground text-sm">/ 100</span>
                  </div>
                  <DeltaIndicator delta={metrics?.scoreDelta || 0} suffix=" pts" />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Visibility Score Trend
                  <ScoreTooltip score={metrics?.avgVisibilityScore ?? 0} showMethodology={true} />
                </CardTitle>
                <CardDescription>
                  Daily average visibility scores over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Competitor overlay toggles (Pro/Max only) */}
                {metrics?.competitors && metrics.competitors.length > 0 && Object.keys(metrics.competitorScoreTrends || {}).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm text-muted-foreground mr-2">Compare with:</span>
                    {metrics.competitors.map((comp, idx) => {
                      const hasData = metrics.competitorScoreTrends?.[comp.name];
                      if (!hasData) return null;
                      const isSelected = selectedCompetitors.has(comp.name);
                      return (
                        <Button
                          key={comp.id}
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => {
                            const newSet = new Set(selectedCompetitors);
                            if (isSelected) {
                              newSet.delete(comp.name);
                            } else {
                              newSet.add(comp.name);
                            }
                            setSelectedCompetitors(newSet);
                          }}
                          style={isSelected ? { backgroundColor: COMPETITOR_COLORS[idx % COMPETITOR_COLORS.length] } : undefined}
                          data-testid={`button-toggle-competitor-${comp.id}`}
                        >
                          {comp.name}
                        </Button>
                      );
                    })}
                  </div>
                )}
                {metrics?.competitors && metrics.competitors.length > 0 && 
                 (!metrics?.competitorScoreTrends || Object.keys(metrics.competitorScoreTrends).length === 0) && (
                  <div className="text-sm text-muted-foreground mb-4 p-2 bg-muted/50 rounded">
                    Upgrade to Pro or Max to compare visibility with competitors
                  </div>
                )}
                {metrics?.scoreTrend && metrics.scoreTrend.some(d => d.runCount > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.scoreTrend.map((point) => {
                      const enhanced: Record<string, string | number> = { ...point };
                      // Add competitor scores for selected competitors - align by date string
                      selectedCompetitors.forEach((compName) => {
                        const compTrend = metrics.competitorScoreTrends?.[compName];
                        if (compTrend) {
                          const matchingPoint = compTrend.find(t => t.date === point.date);
                          enhanced[compName] = matchingPoint?.avgScore ?? 0;
                        }
                      });
                      return enhanced;
                    })}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs"
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis 
                        className="text-xs" 
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                        labelFormatter={(val) => new Date(val).toLocaleDateString()}
                        formatter={(value: number, name: string) => [
                          `${value} / 100`,
                          name === "avgScore" ? "Your Brand" : name
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgScore" 
                        stroke="hsl(217, 91%, 35%)" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Your Brand"
                      />
                      {/* Competitor overlay lines */}
                      {Array.from(selectedCompetitors).map((compName, idx) => (
                        <Line
                          key={compName}
                          type="monotone"
                          dataKey={compName}
                          stroke={COMPETITOR_COLORS[(metrics.competitors?.findIndex(c => c.name === compName) ?? 0) % COMPETITOR_COLORS.length]}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                          name={compName}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No visibility data yet</p>
                      <p className="text-sm mt-1">Run prompts to start tracking visibility scores</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Competitor Mentions
                  </CardTitle>
                  <CardDescription>How often competitors are mentioned in AI responses</CardDescription>
                </CardHeader>
                <CardContent>
                  {competitorChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={competitorChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                          }}
                        />
                        <Bar dataKey="mentions" fill="hsl(217, 91%, 35%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      No competitor data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Top Cited Domains
                  </CardTitle>
                  <CardDescription>Sources cited in AI responses</CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics?.topCitedDomains && metrics.topCitedDomains.length > 0 ? (
                    <div className="space-y-3">
                      {metrics.topCitedDomains.slice(0, 8).map((domain, index) => (
                        <div
                          key={domain.domain}
                          className="flex items-center justify-between"
                          data-testid={`row-domain-${index}`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                            <span className="text-sm truncate max-w-[180px]">{domain.domain}</span>
                          </div>
                          <Badge variant="secondary">{domain.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      No citation data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Latest Answers</CardTitle>
                    <CardDescription>Recent AI responses and analysis</CardDescription>
                  </div>
                  {prompts.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => runPromptMutation.mutate(prompts[0].id)}
                      disabled={runPromptMutation.isPending}
                      data-testid="button-run-prompt"
                    >
                      {runPromptMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Prompt
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {metrics?.recentRuns && metrics.recentRuns.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.recentRuns.map((run) => (
                      <Collapsible
                        key={run.id}
                        open={expandedRun === run.id}
                        onOpenChange={(open) => setExpandedRun(open ? run.id : null)}
                      >
                        <div
                          className="p-3 rounded-lg bg-muted/50"
                          data-testid={`card-run-${run.id}`}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between cursor-pointer">
                              <div className="flex items-center gap-3">
                                {expandedRun === run.id ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{run.provider}</Badge>
                                    {run.model && (
                                      <span className="text-xs text-muted-foreground">{run.model}</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(run.executedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {run.parsedMentions?.brandMentioned && (
                                  <Badge variant="default">Brand Mentioned</Badge>
                                )}
                                {run.parsedMentions?.sentiment && (
                                  <Badge
                                    variant={
                                      run.parsedMentions.sentiment === "positive"
                                        ? "default"
                                        : run.parsedMentions.sentiment === "negative"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {run.parsedMentions.sentiment}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-4 pt-4 border-t space-y-4">
                              {run.parsedMentions && (
                                <div className="p-3 rounded-lg bg-background border">
                                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                    Score Breakdown
                                    <ScoreTooltip 
                                      score={Math.min(100, Math.max(0, 
                                        Math.min((run.parsedMentions.brandMentionCount || 0) * 20, 60) +
                                        (run.parsedMentions.sentiment === "positive" ? 20 : run.parsedMentions.sentiment === "negative" ? -10 : 0) +
                                        ((run.parsedMentions.citedDomains?.length || 0) > 0 ? 20 : 0)
                                      ))}
                                      breakdown={{
                                        mentionCount: run.parsedMentions.brandMentionCount,
                                        sentiment: run.parsedMentions.sentiment as "positive" | "negative" | "neutral" | "mixed",
                                        citationScore: (run.parsedMentions.citedDomains?.length || 0) > 0 ? 20 : 0,
                                      }}
                                    />
                                  </p>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Brand mentioned:</span>
                                      <span className={run.parsedMentions.brandMentioned ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                        {run.parsedMentions.brandMentioned ? "Yes" : "No"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Mention count:</span>
                                      <span className="font-medium">{run.parsedMentions.brandMentionCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Sentiment:</span>
                                      <span className={`font-medium ${
                                        run.parsedMentions.sentiment === "positive" ? "text-green-600" :
                                        run.parsedMentions.sentiment === "negative" ? "text-red-600" :
                                        "text-muted-foreground"
                                      }`}>
                                        {run.parsedMentions.sentiment || "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Sources cited:</span>
                                      <span className="font-medium">{run.parsedMentions.citedDomains?.length || 0}</span>
                                    </div>
                                  </div>
                                  {run.parsedMentions.topics && run.parsedMentions.topics.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <span className="text-sm text-muted-foreground">Topics: </span>
                                      {run.parsedMentions.topics.map((topic, i) => (
                                        <Badge key={i} variant="outline" className="mr-1 mb-1">
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {run.rawResponse && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium">AI Response</p>
                                    {run.rawResponse.length > 500 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowFullResponse(
                                          showFullResponse === run.id ? null : run.id
                                        )}
                                      >
                                        {showFullResponse === run.id ? "Show less" : "Show full response"}
                                      </Button>
                                    )}
                                  </div>
                                  <div className={`text-sm text-muted-foreground whitespace-pre-wrap ${showFullResponse !== run.id ? "max-h-32 overflow-hidden" : ""}`}>
                                    {showFullResponse === run.id 
                                      ? run.rawResponse 
                                      : run.rawResponse.slice(0, 500) + (run.rawResponse.length > 500 ? "..." : "")}
                                  </div>
                                </div>
                              )}
                              
                              {run.parsedMentions?.citedDomains &&
                                run.parsedMentions.citedDomains.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">Citations & Sources</p>
                                    <div className="space-y-2">
                                      {run.parsedMentions.citedDomains.map((d) => (
                                        <div key={d.domain} className="flex items-center gap-2 text-sm">
                                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                                          <span className="font-medium">{d.domain}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {d.count}x cited
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              {run.parsedMentions?.competitorMentions &&
                                run.parsedMentions.competitorMentions.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">Competitor Mentions</p>
                                    <div className="flex flex-wrap gap-2">
                                      {run.parsedMentions.competitorMentions.map((c) => (
                                        <Badge key={c.id} variant="secondary">
                                          {c.name} ({c.count}x)
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No prompt runs yet. Create prompts and run them to see analytics.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
