import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
  FolderKanban,
  Zap,
  AlertCircle,
  Plus,
  ArrowRight,
  Play,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  overallVisibilityScore: number;
  scoreTrend: { date: string; score: number }[];
  brandMentionRate: number;
  activeProjects: number;
  activePrompts: number;
  projects: {
    id: string;
    name: string;
    domain: string | null;
    currentScore: number | null;
    scoreDelta: number | null;
    lastRunAt: string | null;
    promptCount: number;
  }[];
  recentRuns: {
    id: string;
    promptId: string;
    promptName: string;
    projectId: string;
    projectName: string;
    provider: string;
    score: number;
    executedAt: string;
  }[];
  recentAlerts: {
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }[];
  usage: {
    currentMonthSpend: number;
    budgetLimit: number | null;
    subscriptionTier: string;
  } | null;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading,
  trend,
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  loading?: boolean;
  trend?: React.ReactNode;
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
          {description && <Skeleton className="h-3 w-32" />}
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
        <div className="text-2xl font-semibold mb-1">{value}</div>
        {trend && <div className="mb-1">{trend}</div>}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function ProjectCard({
  project,
  onClick,
  onRunAll,
}: {
  project: DashboardStats["projects"][0];
  onClick: () => void;
  onRunAll?: () => void;
}) {
  const getScoreVariant = (score: number | null) => {
    if (score === null) return "secondary";
    if (score >= 70) return "default";
    if (score >= 40) return "secondary";
    return "destructive";
  };

  const getTrendIcon = (delta: number | null) => {
    if (delta === null || delta === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (delta > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            {project.domain && (
              <CardDescription className="text-xs truncate mt-1">{project.domain}</CardDescription>
            )}
          </div>
          {project.currentScore !== null && (
            <Badge variant={getScoreVariant(project.currentScore)} className="shrink-0">
              {project.currentScore}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {getTrendIcon(project.scoreDelta)}
            <span>{project.promptCount} {project.promptCount === 1 ? 'prompt' : 'prompts'}</span>
          </div>
          {project.lastRunAt && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(project.lastRunAt), { addSuffix: true })}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {project.promptCount > 0 && onRunAll && (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onRunAll();
              }}
            >
              <Play className="h-3 w-3 mr-1" />
              Run All
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onClick}
          >
            View
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer border-dashed hover:border-solid hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center h-full min-h-[180px] p-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Plus className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium">Create Project</p>
        <p className="text-xs text-muted-foreground mt-1">Start tracking a new brand</p>
      </CardContent>
    </Card>
  );
}

function RecentRunCard({ run }: { run: DashboardStats["recentRuns"][0] }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
        <Zap className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{run.promptName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {run.projectName} · {run.provider}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(run.executedAt), { addSuffix: true })}
        </p>
      </div>
      <Badge variant="outline" className={`shrink-0 ${getScoreColor(run.score)}`}>
        {run.score}
      </Badge>
    </div>
  );
}

function AlertCard({ alert }: { alert: DashboardStats["recentAlerts"][0] }) {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "score_drop":
      case "brand_mention_drop":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "competitor_gain":
      case "competitor_spike":
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0">
        {getAlertIcon(alert.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const runAllPromptsMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/run-all`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to run prompts");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Prompts queued",
        description: "All prompts have been queued for execution",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Prepare sparkline data
  const sparklineData = stats?.scoreTrend || [];

  return (
    <AppLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your AI search visibility command center
            </p>
          </div>
        </div>

        {/* Analytics Snapshot Hero */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Overall Visibility"
            value={stats?.overallVisibilityScore ?? 0}
            description="Average across all projects"
            icon={Target}
            loading={isLoading}
            trend={
              sparklineData.length > 0 && (
                <div className="h-8 -mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          />
          <StatCard
            title="Brand Mention Rate"
            value={`${stats?.brandMentionRate ?? 0}%`}
            description="Prompts with brand mentions"
            icon={BarChart3}
            loading={isLoading}
          />
          <StatCard
            title="Active Projects"
            value={stats?.activeProjects ?? 0}
            description="Projects being tracked"
            icon={FolderKanban}
            loading={isLoading}
          />
          <StatCard
            title="Active Prompts"
            value={stats?.activePrompts ?? 0}
            description="Prompts ready to run"
            icon={Zap}
            loading={isLoading}
          />
        </div>

        {/* Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Projects</h2>
          </div>
          {isLoading ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-3 w-48 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats?.projects && stats.projects.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stats.projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => navigate(`/app/projects/${project.id}`)}
                  onRunAll={
                    project.promptCount > 0
                      ? () => runAllPromptsMutation.mutate(project.id)
                      : undefined
                  }
                />
              ))}
              <CreateProjectCard onClick={() => navigate("/app/projects")} />
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium mb-1">No projects yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Create your first project to start tracking AI search visibility
                </p>
                <Button onClick={() => navigate("/app/projects")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Prompt Runs</CardTitle>
              <CardDescription>Latest AI search queries across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : stats?.recentRuns && stats.recentRuns.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentRuns.map((run) => (
                    <RecentRunCard key={run.id} run={run} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Zap className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No prompt runs yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run prompts from your projects to see results here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Alerts</CardTitle>
                  <CardDescription>Recent notifications and events</CardDescription>
                </div>
                <Link href="/app/alerts">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : stats?.recentAlerts && stats.recentAlerts.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No alerts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set up alert rules to get notified about important changes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage & Budget Bar */}
        {stats?.usage && stats.usage.budgetLimit !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Usage & Budget</CardTitle>
              <CardDescription>Current month API spend and limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current spend</span>
                  <span className="font-medium">
                    ${stats.usage.currentMonthSpend.toFixed(2)} / ${stats.usage.budgetLimit.toFixed(2)}
                  </span>
                </div>
                <Progress
                  value={(stats.usage.currentMonthSpend / stats.usage.budgetLimit) * 100}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {Math.round((stats.usage.currentMonthSpend / stats.usage.budgetLimit) * 100)}% used
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {stats.usage.subscriptionTier}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
