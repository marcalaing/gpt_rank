import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreTooltip } from "@/components/score-tooltip";
import { BarChart3, TrendingUp, Globe, Zap } from "lucide-react";

interface AnalyticsData {
  totalScores: number;
  averageScore: number;
  providerBreakdown: { provider: string; averageScore: number; count: number }[];
  recentScores: { score: number; provider: string; brandName?: string; calculatedAt: string }[];
  topCitedDomains: { domain: string; count: number }[];
}

function ScoreBar({ score, showTooltip = false }: { score: number; showTooltip?: boolean }) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return "bg-green-500";
    if (s >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getScoreColor(score)} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium w-10 text-right">{score}</span>
      {showTooltip && <ScoreTooltip score={score} />}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: typeof BarChart3;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  const hasData = analytics && analytics.totalScores > 0;

  return (
    <AppLayout breadcrumbs={[{ label: "Analytics" }]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track visibility trends across AI search providers
          </p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Scores"
            value={analytics?.totalScores ?? 0}
            description="All visibility scores recorded"
            icon={BarChart3}
            loading={isLoading}
          />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
              <div className="flex items-center gap-1">
                <ScoreTooltip score={analytics?.averageScore ?? 0} showMethodology={true} />
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{analytics?.averageScore ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all providers</p>
            </CardContent>
          </Card>
          <StatCard
            title="Providers Tracked"
            value={analytics?.providerBreakdown?.length ?? 0}
            description="AI platforms with data"
            icon={Zap}
            loading={isLoading}
          />
          <StatCard
            title="Domains Cited"
            value={analytics?.topCitedDomains?.length ?? 0}
            description="Unique sources found"
            icon={Globe}
            loading={isLoading}
          />
        </div>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : !hasData ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No Analytics Data Yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Once you run prompts across AI providers, you'll see visibility trends, 
                citation analysis, and provider comparisons here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Provider Performance</CardTitle>
                <CardDescription>Average visibility scores by AI platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.providerBreakdown.map((provider) => (
                  <div key={provider.provider} className="space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">{provider.provider}</span>
                      <Badge variant="secondary">{provider.count} scores</Badge>
                    </div>
                    <ScoreBar score={provider.averageScore} showTooltip={true} />
                  </div>
                ))}
                {analytics.providerBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No provider data yet
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Cited Domains</CardTitle>
                <CardDescription>Most frequently cited sources in AI responses</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topCitedDomains.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topCitedDomains.map((item, idx) => (
                      <div
                        key={item.domain}
                        className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
                        data-testid={`domain-row-${idx}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {idx + 1}.
                          </span>
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[200px]">{item.domain}</span>
                        </div>
                        <Badge variant="outline">{item.count} citations</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No citations found yet
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Recent Visibility Scores</CardTitle>
                <CardDescription>Latest scores from prompt runs</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.recentScores.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-sm font-medium text-muted-foreground">Brand</th>
                          <th className="text-left py-2 text-sm font-medium text-muted-foreground">Provider</th>
                          <th className="text-left py-2 text-sm font-medium text-muted-foreground">Score</th>
                          <th className="text-left py-2 text-sm font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.recentScores.map((score, idx) => (
                          <tr key={idx} className="border-b last:border-0" data-testid={`score-row-${idx}`}>
                            <td className="py-3">
                              <span className="font-medium">{score.brandName || "Unknown"}</span>
                            </td>
                            <td className="py-3">
                              <Badge variant="outline">{score.provider}</Badge>
                            </td>
                            <td className="py-3">
                              <div className="w-32">
                                <ScoreBar score={score.score} />
                              </div>
                            </td>
                            <td className="py-3 text-sm text-muted-foreground">
                              {new Date(score.calculatedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No scores recorded yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
