import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Play, RefreshCw, Loader2, Zap, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Job } from "@shared/schema";

interface JobQueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    running: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { variant: "outline", icon: <CheckCircle className="h-3 w-3 text-green-600" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  };

  const { variant, icon } = config[status] || config.pending;

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {status}
    </Badge>
  );
}

function JobsTable({ jobs, loading }: { jobs: Job[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Zap className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No jobs in queue</p>
        <p className="text-xs text-muted-foreground mt-1">Jobs will appear here when scheduled</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead>Error</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
            <TableCell className="font-mono text-sm">{job.type}</TableCell>
            <TableCell>
              <StatusBadge status={job.status} />
            </TableCell>
            <TableCell>{job.attempts}/{job.maxAttempts}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(job.scheduledFor).toLocaleString()}
            </TableCell>
            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
              {job.error || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminPage() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<JobQueueStats>({
    queryKey: ['/api/admin/jobs/stats'],
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['/api/admin/jobs'],
  });

  const processJobsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/jobs/process");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Jobs processed", description: `Processed ${data.processed} jobs.` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/jobs/stats'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to process jobs", description: error.message, variant: "destructive" });
    },
  });

  const seedDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/seed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Seed data created", description: "Sample data has been added." });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to seed data", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AppLayout breadcrumbs={[{ label: "Admin" }, { label: "Job Queue" }]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Job Queue</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor and manage background jobs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => seedDataMutation.mutate()}
              disabled={seedDataMutation.isPending}
              data-testid="button-seed-data"
            >
              {seedDataMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Seed Sample Data
            </Button>
            <Button
              onClick={() => processJobsMutation.mutate()}
              disabled={processJobsMutation.isPending}
              data-testid="button-process-jobs"
            >
              {processJobsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Process Jobs
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-semibold" data-testid="stat-pending-jobs">
                  {stats?.pending ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Running</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-semibold" data-testid="stat-running-jobs">
                  {stats?.running ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-semibold" data-testid="stat-completed-jobs">
                  {stats?.completed ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-semibold" data-testid="stat-failed-jobs">
                  {stats?.failed ?? 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Queue</CardTitle>
            <CardDescription>View all jobs and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            <JobsTable jobs={jobs ?? []} loading={jobsLoading} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
