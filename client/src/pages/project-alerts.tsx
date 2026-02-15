import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, AlertRule, AlertEvent } from "@shared/schema";
import { Bell, Plus, Trash2, Check, AlertTriangle, TrendingDown, TrendingUp, Globe } from "lucide-react";

const alertRuleSchema = z.object({
  type: z.enum(["brand_mention_drop", "competitor_spike", "new_domain_cited"]),
  threshold: z.number().min(1).max(100).optional(),
  isActive: z.boolean().default(true),
  notifyEmail: z.boolean().default(true),
});

type AlertRuleFormData = z.infer<typeof alertRuleSchema>;

const ALERT_TYPE_INFO = {
  brand_mention_drop: {
    label: "Brand Mention Drop",
    description: "Alert when brand mentions drop by threshold % vs last 7 days",
    icon: TrendingDown,
    color: "text-orange-500",
  },
  competitor_spike: {
    label: "Competitor Spike",
    description: "Alert when competitor mentions spike by threshold %",
    icon: TrendingUp,
    color: "text-red-500",
  },
  new_domain_cited: {
    label: "New Domain Cited",
    description: "Alert when a previously unseen domain is cited",
    icon: Globe,
    color: "text-blue-500",
  },
};

export default function ProjectAlertsPage() {
  const [, params] = useRoute("/app/projects/:id/alerts");
  const projectId = params?.id;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery<AlertRule[]>({
    queryKey: ["/api/projects", projectId, "alerts", "rules"],
    enabled: !!projectId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<AlertEvent[]>({
    queryKey: ["/api/projects", projectId, "alerts", "events"],
    enabled: !!projectId,
  });

  const form = useForm<AlertRuleFormData>({
    resolver: zodResolver(alertRuleSchema),
    defaultValues: {
      type: "brand_mention_drop",
      threshold: 20,
      isActive: true,
      notifyEmail: true,
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: AlertRuleFormData) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/alerts/rules`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "alerts", "rules"] });
      toast({ title: "Alert rule created" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create rule", description: error.message, variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/alerts/rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "alerts", "rules"] });
      toast({ title: "Alert rule deleted" });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest("POST", `/api/projects/${projectId}/alerts/events/${eventId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "alerts", "events"] });
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

  const unacknowledgedCount = events.filter(e => !e.acknowledged).length;

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Projects", href: "/app/projects" },
        { label: project.name, href: `/app/projects/${projectId}` },
        { label: "Alerts" },
      ]}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Bell className="h-6 w-6" />
              Alerts
              {unacknowledgedCount > 0 && (
                <Badge variant="destructive">{unacknowledgedCount}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">Configure alert rules and view triggered events</p>
          </div>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules" data-testid="tab-rules">
              Rules ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="events" data-testid="tab-events">
              Events ({events.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-semibold">Alert Rules</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-rule">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Alert Rule</DialogTitle>
                    <DialogDescription>
                      Set up automated alerts for visibility changes
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(data => createRuleMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alert Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-alert-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(ALERT_TYPE_INFO).map(([key, info]) => (
                                  <SelectItem key={key} value={key}>
                                    {info.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Threshold (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-threshold"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notifyEmail"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-notify-email"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Email notifications</FormLabel>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createRuleMutation.isPending} data-testid="button-submit-rule">
                        Create Rule
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {rulesLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No alert rules configured</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rules.map(rule => {
                  const info = ALERT_TYPE_INFO[rule.type as keyof typeof ALERT_TYPE_INFO] || {
                    label: rule.type,
                    description: "",
                    icon: Bell,
                    color: "text-muted-foreground",
                  };
                  const Icon = info.icon;

                  return (
                    <Card key={rule.id} data-testid={`card-rule-${rule.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${info.color}`} />
                            <CardTitle className="text-base">{info.label}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                              data-testid={`button-delete-rule-${rule.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>{info.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm">
                          {rule.threshold && (
                            <span>Threshold: {rule.threshold}%</span>
                          )}
                          {rule.notifyEmail && (
                            <Badge variant="outline">Email</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Alert Events</h2>

            {eventsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">No alert events yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {events.map(event => (
                  <Card
                    key={event.id}
                    className={event.acknowledged ? "opacity-60" : ""}
                    data-testid={`card-event-${event.id}`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium">{event.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!event.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeMutation.mutate(event.id)}
                            data-testid={`button-acknowledge-${event.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
