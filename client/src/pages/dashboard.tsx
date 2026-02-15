import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, BarChart3, FolderKanban, Zap, FileText, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalProjects: number;
  totalPrompts: number;
  totalRuns: number;
  totalCitations: number;
  recentRuns: {
    id: string;
    promptName: string;
    provider: string;
    executedAt: string;
    citationCount: number;
  }[];
}

function StatCard({
  title,
  value,
  description,
  trend,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number | string;
  description?: string;
  trend?: { value: number; positive: boolean };
  icon: React.ElementType;
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
        <div className="text-2xl font-semibold" data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
          {value}
        </div>
        {(description || trend) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={`flex items-center ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend.positive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {trend.value}%
              </span>
            )}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentRunsTable({ runs, loading }: { runs: DashboardStats['recentRuns']; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-md border">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No prompt runs yet</p>
        <p className="text-xs text-muted-foreground mt-1">Create a project and add prompts to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center gap-4 p-3 rounded-md border hover-elevate"
          data-testid={`run-${run.id}`}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{run.promptName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(run.executedAt).toLocaleDateString()} via {run.provider}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {run.citationCount} citations
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Overview of your AI search visibility metrics
            </p>
          </div>
          <Link href="/app/projects">
            <Button data-testid="button-view-projects">
              View Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Projects"
            value={stats?.totalProjects ?? 0}
            icon={FolderKanban}
            loading={isLoading}
          />
          <StatCard
            title="Total Prompts"
            value={stats?.totalPrompts ?? 0}
            icon={FileText}
            loading={isLoading}
          />
          <StatCard
            title="Prompt Runs"
            value={stats?.totalRuns ?? 0}
            description="All time"
            icon={Zap}
            loading={isLoading}
          />
          <StatCard
            title="Citations Found"
            value={stats?.totalCitations ?? 0}
            description="Across all providers"
            icon={BarChart3}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Prompt Runs</CardTitle>
              <CardDescription>Latest AI search queries and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentRunsTable runs={stats?.recentRuns ?? []} loading={isLoading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/app/projects">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-create-project">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Create New Project
                </Button>
              </Link>
              <Link href="/app/admin">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-run-jobs">
                  <Zap className="mr-2 h-4 w-4" />
                  Manage Job Queue
                </Button>
              </Link>
              <Link href="/app/analytics">
                <Button variant="outline" className="w-full justify-start" data-testid="button-quick-analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
