import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, AuditLog } from "@shared/schema";
import { Settings, DollarSign, History, Save, AlertTriangle } from "lucide-react";

const budgetSchema = z.object({
  monthlyBudgetSoft: z.number().min(0).optional(),
  monthlyBudgetHard: z.number().min(0).optional(),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface UsageData {
  currentMonthUsage: number;
  monthlyBudgetSoft: number | null;
  monthlyBudgetHard: number | null;
  usageResetAt: string | null;
}

export default function ProjectSettingsPage() {
  const [, params] = useRoute("/app/projects/:id/settings");
  const projectId = params?.id;
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ["/api/projects", projectId, "usage"],
    enabled: !!projectId,
  });

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/projects", projectId, "audit-log"],
    enabled: !!projectId,
  });

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    values: {
      monthlyBudgetSoft: usage?.monthlyBudgetSoft || undefined,
      monthlyBudgetHard: usage?.monthlyBudgetHard || undefined,
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (data: BudgetFormData) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}/budget`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "usage"] });
      toast({ title: "Budget updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update budget", description: error.message, variant: "destructive" });
    },
  });

  if (projectLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/app/projects" }, { label: "Loading..." }]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
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

  const usagePercent = usage?.monthlyBudgetHard
    ? Math.min(100, (usage.currentMonthUsage / usage.monthlyBudgetHard) * 100)
    : 0;

  const softLimitWarning = usage?.monthlyBudgetSoft && usage.currentMonthUsage >= usage.monthlyBudgetSoft;
  const hardLimitReached = usage?.monthlyBudgetHard && usage.currentMonthUsage >= usage.monthlyBudgetHard;

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Projects", href: "/app/projects" },
        { label: project.name, href: `/app/projects/${projectId}` },
        { label: "Settings" },
      ]}
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Settings className="h-6 w-6" />
            Project Settings
          </h1>
          <p className="text-muted-foreground">Manage usage limits and view audit history</p>
        </div>

        <Tabs defaultValue="usage">
          <TabsList>
            <TabsTrigger value="usage" data-testid="tab-usage">
              <DollarSign className="h-4 w-4 mr-2" />
              Usage & Limits
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <History className="h-4 w-4 mr-2" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Usage</CardTitle>
                <CardDescription>API usage for the current billing period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {usageLoading ? (
                  <Skeleton className="h-20" />
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-3xl font-bold" data-testid="text-current-usage">
                          ${(usage?.currentMonthUsage || 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {usage?.monthlyBudgetHard
                            ? `of $${usage.monthlyBudgetHard.toFixed(2)} limit`
                            : "No limit set"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hardLimitReached && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Hard Limit Reached
                          </Badge>
                        )}
                        {softLimitWarning && !hardLimitReached && (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Soft Limit Warning
                          </Badge>
                        )}
                      </div>
                    </div>
                    {usage?.monthlyBudgetHard && (
                      <Progress value={usagePercent} className="h-2" />
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Limits</CardTitle>
                <CardDescription>
                  Set spending limits for this project. Soft limit triggers a warning, hard limit stops scheduled runs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(data => updateBudgetMutation.mutate(data))} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="monthlyBudgetSoft"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Soft Limit ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="50.00"
                                {...field}
                                value={field.value || ""}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-soft-limit"
                              />
                            </FormControl>
                            <FormDescription>Warning threshold</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="monthlyBudgetHard"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hard Limit ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="100.00"
                                {...field}
                                value={field.value || ""}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                data-testid="input-hard-limit"
                              />
                            </FormControl>
                            <FormDescription>Stops scheduled runs</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" disabled={updateBudgetMutation.isPending} data-testid="button-save-budget">
                      <Save className="h-4 w-4 mr-2" />
                      Save Limits
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>History of changes made to this project</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No audit entries yet</p>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map(log => (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                        data-testid={`row-audit-${log.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">{log.action}</Badge>
                            <span className="text-sm font-medium">{log.entityType}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
