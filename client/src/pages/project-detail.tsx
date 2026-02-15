import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Brand, Competitor, Prompt, AlertRule, AlertEvent } from "@shared/schema";
import {
  Plus,
  Trash2,
  Loader2,
  Target,
  Users,
  MessageSquare,
  Settings,
  BarChart3,
  TrendingUp,
  Eye,
  Bell,
  DollarSign,
  Upload,
  FileText,
  Sparkles,
  Tags,
  Play,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PromptTemplate } from "@shared/schema";

const brandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  domain: z.string().optional(),
  synonyms: z.string().optional(),
});

const competitorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  domain: z.string().optional(),
  synonyms: z.string().optional(),
});

const promptSchema = z.object({
  name: z.string().min(1, "Name is required"),
  template: z.string().min(1, "Prompt template is required"),
  tags: z.string().optional(),
  locale: z.string().optional(),
  isActive: z.boolean().default(true),
  scheduleEnabled: z.boolean().default(false),
  scheduleCron: z.string().optional(),
});

type BrandFormData = z.infer<typeof brandSchema>;
type CompetitorFormData = z.infer<typeof competitorSchema>;
type PromptFormData = z.infer<typeof promptSchema>;

export default function ProjectDetailPage() {
  const [, params] = useRoute("/app/projects/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [competitorDialogOpen, setCompetitorDialogOpen] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [groupByTag, setGroupByTag] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: brands = [], isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/projects", projectId, "brands"],
    enabled: !!projectId,
  });

  const { data: competitors = [], isLoading: competitorsLoading } = useQuery<Competitor[]>({
    queryKey: ["/api/projects", projectId, "competitors"],
    enabled: !!projectId,
  });

  const { data: prompts = [], isLoading: promptsLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/projects", projectId, "prompts"],
    enabled: !!projectId,
  });

  const { data: promptTemplates = [] } = useQuery<PromptTemplate[]>({
    queryKey: ["/api/prompt-templates"],
  });

  const { data: alertRules = [], isLoading: alertRulesLoading } = useQuery<AlertRule[]>({
    queryKey: ["/api/projects", projectId, "alerts", "rules"],
    enabled: !!projectId,
  });

  const { data: alertEvents = [], isLoading: alertEventsLoading } = useQuery<AlertEvent[]>({
    queryKey: ["/api/projects", projectId, "alerts", "events"],
    enabled: !!projectId,
  });

  const brandForm = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: { name: "", domain: "", synonyms: "" },
  });

  const competitorForm = useForm<CompetitorFormData>({
    resolver: zodResolver(competitorSchema),
    defaultValues: { name: "", domain: "", synonyms: "" },
  });

  const promptForm = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: { name: "", template: "", tags: "", locale: "en", isActive: true, scheduleEnabled: false, scheduleCron: "" },
  });

  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const synonymsArr = data.synonyms ? data.synonyms.split(",").map(s => s.trim()).filter(s => s) : [];
      const res = await apiRequest("POST", `/api/projects/${projectId}/brands`, {
        name: data.name,
        domain: data.domain || null,
        synonyms: synonymsArr.length > 0 ? synonymsArr : null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      if (data.onboardingStarted) {
        toast({ 
          title: "Brand created", 
          description: "Analyzing your brand and generating search queries. This may take a moment..." 
        });
      } else {
        toast({ title: "Brand created successfully" });
      }
      setBrandDialogOpen(false);
      brandForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create brand", description: error.message, variant: "destructive" });
    },
  });

  const createCompetitorMutation = useMutation({
    mutationFn: async (data: CompetitorFormData) => {
      const synonymsArr = data.synonyms ? data.synonyms.split(",").map(s => s.trim()).filter(s => s) : [];
      const res = await apiRequest("POST", `/api/projects/${projectId}/competitors`, {
        name: data.name,
        domain: data.domain || null,
        synonyms: synonymsArr.length > 0 ? synonymsArr : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "competitors"] });
      toast({ title: "Competitor created successfully" });
      setCompetitorDialogOpen(false);
      competitorForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create competitor", description: error.message, variant: "destructive" });
    },
  });

  const createPromptMutation = useMutation({
    mutationFn: async (data: PromptFormData) => {
      const tagsArr = data.tags ? data.tags.split(",").map(s => s.trim()).filter(s => s) : [];
      const res = await apiRequest("POST", `/api/projects/${projectId}/prompts`, {
        name: data.name,
        template: data.template,
        tags: tagsArr.length > 0 ? tagsArr : null,
        locale: data.locale || "en",
        isActive: data.isActive,
        scheduleEnabled: data.scheduleEnabled,
        scheduleCron: data.scheduleCron || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      toast({ title: "Prompt created successfully" });
      setPromptDialogOpen(false);
      promptForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create prompt", description: error.message, variant: "destructive" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (text: string) => {
      const lines = text.trim().split("\n").filter(line => line.trim());
      const prompts = lines.map(line => {
        const parts = line.split(",").map(p => p.trim());
        return {
          name: parts[0] || "",
          template: parts[1] || parts[0] || "",
          tags: parts[2] ? parts[2].split(";").map(t => t.trim()).filter(t => t) : null,
          locale: "en",
          isActive: true,
          scheduleEnabled: false,
        };
      }).filter(p => p.name);
      
      if (prompts.length === 0) {
        throw new Error("No valid prompts found in input");
      }
      
      const res = await apiRequest("POST", `/api/projects/${projectId}/prompts/bulk`, { prompts });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      toast({ title: `Imported ${data.created} prompts successfully` });
      setBulkImportDialogOpen(false);
      setBulkImportText("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to import prompts", description: error.message, variant: "destructive" });
    },
  });

  const applyTemplate = (template: PromptTemplate) => {
    promptForm.setValue("name", template.name);
    promptForm.setValue("template", template.template);
    if (template.category) {
      promptForm.setValue("tags", template.category);
    }
  };

  const autoTagMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const res = await apiRequest("POST", `/api/prompts/${promptId}/auto-tag`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      toast({ title: "Prompt tagged successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to auto-tag prompt", description: error.message, variant: "destructive" });
    },
  });

  const [runningPromptId, setRunningPromptId] = useState<string | null>(null);

  const runPromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      setRunningPromptId(promptId);
      const res = await apiRequest("POST", `/api/prompts/${promptId}/run`);
      return res.json();
    },
    onSuccess: (data) => {
      setRunningPromptId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      const score = data.promptRun?.parsedMentions?.brandMentioned 
        ? `Brand mentioned! Score calculated.` 
        : `Analysis complete.`;
      toast({ title: "Prompt executed successfully", description: score });
    },
    onError: (error: Error) => {
      setRunningPromptId(null);
      toast({ title: "Failed to run prompt", description: error.message, variant: "destructive" });
    },
  });

  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [newAlertType, setNewAlertType] = useState<string>("score_drop");
  const [newAlertThreshold, setNewAlertThreshold] = useState<string>("50");

  const createAlertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/alerts/rules`, {
        type: newAlertType,
        threshold: parseFloat(newAlertThreshold) || null,
        isActive: true,
        notifyEmail: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "alerts", "rules"] });
      toast({ title: "Alert rule created" });
      setAlertDialogOpen(false);
      setNewAlertType("score_drop");
      setNewAlertThreshold("50");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create alert", description: error.message, variant: "destructive" });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/alerts/rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "alerts", "rules"] });
      toast({ title: "Alert rule deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete alert", description: error.message, variant: "destructive" });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest("POST", `/api/projects/${projectId}/alerts/events/${eventId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "alerts", "events"] });
      toast({ title: "Alert acknowledged" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to acknowledge alert", description: error.message, variant: "destructive" });
    },
  });

  const groupedPrompts = groupByTag 
    ? prompts.reduce((acc, prompt) => {
        const tag = prompt.tags?.[0] || "uncategorized";
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(prompt);
        return acc;
      }, {} as Record<string, Prompt[]>)
    : null;

  if (projectLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/app/projects" }, { label: "Loading..." }]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
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

  return (
    <AppLayout breadcrumbs={[{ label: "Projects", href: "/app/projects" }, { label: project.name }]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-project-name">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="brands" data-testid="tab-brands">
              <Target className="h-4 w-4 mr-2" />
              Brands
            </TabsTrigger>
            <TabsTrigger value="competitors" data-testid="tab-competitors">
              <Users className="h-4 w-4 mr-2" />
              Competitors
            </TabsTrigger>
            <TabsTrigger value="prompts" data-testid="tab-prompts">
              <MessageSquare className="h-4 w-4 mr-2" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Brands</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-brands-count">{brands.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Competitors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-competitors-count">{competitors.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prompts</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-prompts-count">{prompts.length}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Analytics
                    </CardTitle>
                    <Link href={`/app/projects/${projectId}/overview`}>
                      <Button variant="outline" size="sm" data-testid="button-view-analytics">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    AI visibility metrics and citation analysis.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Alerts
                    </CardTitle>
                    <Link href={`/app/projects/${projectId}/alerts`}>
                      <Button variant="outline" size="sm" data-testid="button-view-alerts">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Configure alerts for visibility changes.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Usage & Budget
                    </CardTitle>
                    <Link href={`/app/projects/${projectId}/settings`}>
                      <Button variant="outline" size="sm" data-testid="button-view-settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Set spending limits and view audit log.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="brands" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-semibold">Brands</h2>
              <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-brand">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Brand
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Brand</DialogTitle>
                    <DialogDescription>
                      Add your brand to track its visibility. We'll automatically generate 5 relevant search queries and run initial visibility scoring.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...brandForm}>
                    <form onSubmit={brandForm.handleSubmit((data) => createBrandMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={brandForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your brand name" data-testid="input-brand-name" {...field} />
                            </FormControl>
                            <FormMessage data-testid="error-brand-name" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={brandForm.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain</FormLabel>
                            <FormControl>
                              <Input placeholder="yourbrand.com" data-testid="input-brand-domain" {...field} />
                            </FormControl>
                            <FormMessage data-testid="error-brand-domain" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={brandForm.control}
                        name="synonyms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Synonyms (comma-separated)</FormLabel>
                            <FormControl>
                              <Input placeholder="Alt Name 1, Alt Name 2" data-testid="input-brand-synonyms" {...field} />
                            </FormControl>
                            <FormMessage data-testid="error-brand-synonyms" />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createBrandMutation.isPending} data-testid="button-submit-brand">
                        {createBrandMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Brand
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {brandsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : brands.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No brands yet. Add your brand to start tracking visibility.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand) => (
                  <Card key={brand.id} data-testid={`card-brand-${brand.id}`}>
                    <CardHeader>
                      <CardTitle className="text-base">{brand.name}</CardTitle>
                      {brand.domain && (
                        <CardDescription>{brand.domain}</CardDescription>
                      )}
                    </CardHeader>
                    {brand.synonyms && brand.synonyms.length > 0 && (
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {brand.synonyms.map((syn) => (
                            <Badge key={syn} variant="outline" className="text-xs">
                              {syn}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prompts" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-semibold">Prompts</h2>
                <Button 
                  variant={groupByTag ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setGroupByTag(!groupByTag)}
                  data-testid="button-toggle-group"
                >
                  <Tags className="h-4 w-4 mr-2" />
                  Group by Tag
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-bulk-import">
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Bulk Import Prompts</DialogTitle>
                      <DialogDescription>
                        Paste CSV data with format: name, template, tags (semicolon-separated)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Best CRM tools, What are the best CRM tools for small businesses?, crm;software
Top project management apps, What are the top project management applications?, project;management"
                        className="min-h-[200px] font-mono text-sm"
                        value={bulkImportText}
                        onChange={(e) => setBulkImportText(e.target.value)}
                        data-testid="input-bulk-import"
                      />
                      <Button 
                        onClick={() => bulkImportMutation.mutate(bulkImportText)}
                        disabled={bulkImportMutation.isPending || !bulkImportText.trim()}
                        className="w-full"
                        data-testid="button-submit-bulk-import"
                      >
                        {bulkImportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import Prompts
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-prompt">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Prompt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Prompt</DialogTitle>
                      <DialogDescription>
                        Add a new prompt to track across AI platforms
                      </DialogDescription>
                    </DialogHeader>
                    {promptTemplates.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Use Template</label>
                        <Select onValueChange={(val) => {
                          const template = promptTemplates.find(t => t.id === val);
                          if (template) applyTemplate(template);
                        }}>
                          <SelectTrigger data-testid="select-template">
                            <SelectValue placeholder="Select a template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {promptTemplates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Form {...promptForm}>
                      <form onSubmit={promptForm.handleSubmit((data) => createPromptMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={promptForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Best CRM tools" data-testid="input-prompt-name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={promptForm.control}
                          name="template"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prompt Template</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="What are the best CRM tools for small businesses?"
                                  className="min-h-[100px]"
                                  data-testid="input-prompt-template"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={promptForm.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags (comma-separated)</FormLabel>
                              <FormControl>
                                <Input placeholder="crm, software, b2b" data-testid="input-prompt-tags" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-4">
                          <FormField
                            control={promptForm.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormLabel>Active</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={promptForm.control}
                            name="scheduleEnabled"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormLabel>Scheduled</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={createPromptMutation.isPending}>
                          {createPromptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Prompt
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {promptsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : prompts.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No prompts yet. Add your first prompt to start tracking.</p>
                </CardContent>
              </Card>
            ) : groupByTag && groupedPrompts ? (
              <div className="space-y-4">
                {Object.entries(groupedPrompts).map(([tag, tagPrompts]) => (
                  <Card key={tag}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Badge variant="outline">{tag}</Badge>
                        <span className="text-muted-foreground">({tagPrompts.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <Table>
                      <TableBody>
                        {tagPrompts.map((prompt) => (
                          <TableRow key={prompt.id} data-testid={`row-prompt-${prompt.id}`}>
                            <TableCell className="font-medium">{prompt.name}</TableCell>
                            <TableCell className="max-w-xs truncate">{prompt.template}</TableCell>
                            <TableCell>
                              <Badge variant={prompt.isActive ? "default" : "secondary"}>
                                {prompt.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => autoTagMutation.mutate(prompt.id)}
                                disabled={autoTagMutation.isPending}
                                data-testid={`button-autotag-${prompt.id}`}
                              >
                                <Sparkles className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prompts.map((prompt) => (
                      <TableRow key={prompt.id} data-testid={`row-prompt-${prompt.id}`}>
                        <TableCell className="font-medium">{prompt.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{prompt.template}</TableCell>
                        <TableCell>
                          {prompt.volumeScore !== null && prompt.volumeScore !== undefined ? (
                            <div 
                              className="flex items-center gap-1 cursor-help" 
                              title={`Volume Score: ${prompt.volumeScore}/10\nAI-likeliness: ${prompt.aiLikeliness || 5}/10\n\nMeasures search demand and likelihood of AI mention.`}
                            >
                              <span className={`font-medium ${
                                prompt.volumeScore >= 7 ? "text-green-600 dark:text-green-400" :
                                prompt.volumeScore >= 4 ? "text-yellow-600 dark:text-yellow-400" :
                                "text-muted-foreground"
                              }`}>
                                {prompt.volumeScore}/10
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm" title="Volume score not yet calculated">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {prompt.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={prompt.isActive ? "default" : "secondary"}>
                            {prompt.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {prompt.scheduleEnabled ? (
                            <Badge variant="outline">{prompt.scheduleCron || "Enabled"}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Manual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => runPromptMutation.mutate(prompt.id)}
                              disabled={runningPromptId === prompt.id}
                              title="Run prompt now"
                              data-testid={`button-run-${prompt.id}`}
                            >
                              {runningPromptId === prompt.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => autoTagMutation.mutate(prompt.id)}
                              disabled={autoTagMutation.isPending}
                              title="Auto-tag with AI"
                              data-testid={`button-autotag-${prompt.id}`}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="competitors" className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-semibold">Competitors</h2>
              <Dialog open={competitorDialogOpen} onOpenChange={setCompetitorDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-competitor">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Competitor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Competitor</DialogTitle>
                    <DialogDescription>
                      Track a competitor to compare their AI visibility against your brand
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...competitorForm}>
                    <form onSubmit={competitorForm.handleSubmit((data) => createCompetitorMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={competitorForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Competitor name" data-testid="input-competitor-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={competitorForm.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain</FormLabel>
                            <FormControl>
                              <Input placeholder="competitor.com" data-testid="input-competitor-domain" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={competitorForm.control}
                        name="synonyms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Synonyms (comma-separated)</FormLabel>
                            <FormControl>
                              <Input placeholder="Alt Name 1, Alt Name 2" data-testid="input-competitor-synonyms" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={createCompetitorMutation.isPending}>
                        {createCompetitorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Competitor
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {competitorsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : competitors.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No competitors yet. Add competitors to compare visibility.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {competitors.map((competitor) => (
                  <Card key={competitor.id} data-testid={`card-competitor-${competitor.id}`}>
                    <CardHeader>
                      <CardTitle className="text-base">{competitor.name}</CardTitle>
                      {competitor.domain && (
                        <CardDescription>{competitor.domain}</CardDescription>
                      )}
                    </CardHeader>
                    {competitor.synonyms && competitor.synonyms.length > 0 && (
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {competitor.synonyms.map((syn) => (
                            <Badge key={syn} variant="outline" className="text-xs">
                              {syn}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">Alert Rules</h2>
                <p className="text-sm text-muted-foreground">Get notified when visibility changes</p>
              </div>
              <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-alert">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Alert Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Alert Rule</DialogTitle>
                    <DialogDescription>
                      Set up notifications for visibility changes
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Alert Type</label>
                      <Select value={newAlertType} onValueChange={setNewAlertType}>
                        <SelectTrigger data-testid="select-alert-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="score_drop">Score Drop</SelectItem>
                          <SelectItem value="competitor_gain">Competitor Gain</SelectItem>
                          <SelectItem value="mention_spike">Mention Spike</SelectItem>
                          <SelectItem value="new_citation">New Citation</SelectItem>
                          <SelectItem value="brand_mention_drop">Brand Mention Drop</SelectItem>
                          <SelectItem value="budget_exceeded">Budget Exceeded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Threshold (optional)</label>
                      <Input
                        type="number"
                        placeholder="e.g., 50 for score below 50"
                        value={newAlertThreshold}
                        onChange={(e) => setNewAlertThreshold(e.target.value)}
                        data-testid="input-alert-threshold"
                      />
                      <p className="text-xs text-muted-foreground">
                        For score_drop: alert when score falls below this value
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => createAlertMutation.mutate()}
                      disabled={createAlertMutation.isPending}
                      data-testid="button-save-alert"
                    >
                      {createAlertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Rule
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {alertRulesLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : alertRules.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No alert rules configured</p>
                  <p className="text-sm text-muted-foreground mt-1">Create an alert rule to get notified of visibility changes</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertRules.map((rule) => (
                      <TableRow key={rule.id} data-testid={`row-alert-${rule.id}`}>
                        <TableCell className="font-medium">
                          {rule.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </TableCell>
                        <TableCell>{rule.threshold ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteAlertMutation.mutate(rule.id)}
                            disabled={deleteAlertMutation.isPending}
                            data-testid={`button-delete-alert-${rule.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            <div className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
              {alertEventsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : alertEvents.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">No alert events yet</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertEvents.slice(0, 20).map((event) => (
                        <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {event.message}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(event.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={event.acknowledged ? "secondary" : "default"}>
                              {event.acknowledged ? "Acknowledged" : "New"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {!event.acknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeAlertMutation.mutate(event.id)}
                                disabled={acknowledgeAlertMutation.isPending}
                                data-testid={`button-ack-${event.id}`}
                              >
                                Acknowledge
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Brand Settings
                </CardTitle>
                <CardDescription>
                  Configure your brand names and domains to track
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="font-medium">Brands</h3>
                  <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-brand">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Brand
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Brand</DialogTitle>
                        <DialogDescription>
                          Add a brand name and domain to track across AI platforms
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...brandForm}>
                        <form onSubmit={brandForm.handleSubmit((data) => createBrandMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={brandForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your brand name" data-testid="input-brand-name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={brandForm.control}
                            name="domain"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Domain</FormLabel>
                                <FormControl>
                                  <Input placeholder="yourbrand.com" data-testid="input-brand-domain" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={brandForm.control}
                            name="synonyms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Synonyms (comma-separated)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Alt Name 1, Alt Name 2" data-testid="input-brand-synonyms" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" className="w-full" disabled={createBrandMutation.isPending}>
                            {createBrandMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Brand
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                {brandsLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : brands.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No brands configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <div
                        key={brand.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`item-brand-${brand.id}`}
                      >
                        <div>
                          <p className="font-medium">{brand.name}</p>
                          {brand.domain && (
                            <p className="text-sm text-muted-foreground">{brand.domain}</p>
                          )}
                          {brand.synonyms && brand.synonyms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {brand.synonyms.map((syn) => (
                                <Badge key={syn} variant="outline" className="text-xs">
                                  {syn}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <BudgetSettingsCard projectId={projectId!} />
            <AuditLogCard projectId={projectId!} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function BudgetSettingsCard({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { data: usage } = useQuery<{
    currentMonthUsage: number;
    monthlyBudgetSoft: number | null;
    monthlyBudgetHard: number | null;
    usageResetAt: string | null;
  }>({
    queryKey: ["/api/projects", projectId, "usage"],
    enabled: !!projectId,
  });

  const [softLimit, setSoftLimit] = useState("");
  const [hardLimit, setHardLimit] = useState("");

  const updateBudgetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/projects/${projectId}/budget`, {
        monthlyBudgetSoft: softLimit ? parseFloat(softLimit) : null,
        monthlyBudgetHard: hardLimit ? parseFloat(hardLimit) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "usage"] });
      toast({ title: "Budget updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update budget", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cost Governance
        </CardTitle>
        <CardDescription>
          Set monthly spending limits for AI API calls
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Current Month Usage</p>
            <p className="text-2xl font-bold" data-testid="text-current-usage">
              ${(usage?.currentMonthUsage || 0).toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Soft Limit (Alert)</p>
            <p className="text-2xl font-bold">
              {usage?.monthlyBudgetSoft ? `$${usage.monthlyBudgetSoft}` : "Not set"}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Hard Limit (Block)</p>
            <p className="text-2xl font-bold">
              {usage?.monthlyBudgetHard ? `$${usage.monthlyBudgetHard}` : "Not set"}
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Soft Limit ($)</label>
            <Input
              type="number"
              placeholder="e.g., 10"
              value={softLimit}
              onChange={(e) => setSoftLimit(e.target.value)}
              data-testid="input-budget-soft"
            />
            <p className="text-xs text-muted-foreground">Get an alert when this limit is reached</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hard Limit ($)</label>
            <Input
              type="number"
              placeholder="e.g., 25"
              value={hardLimit}
              onChange={(e) => setHardLimit(e.target.value)}
              data-testid="input-budget-hard"
            />
            <p className="text-xs text-muted-foreground">Block new runs when this limit is reached</p>
          </div>
        </div>
        
        <Button 
          onClick={() => updateBudgetMutation.mutate()}
          disabled={updateBudgetMutation.isPending}
          data-testid="button-save-budget"
        >
          {updateBudgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Budget Settings
        </Button>
      </CardContent>
    </Card>
  );
}

function AuditLogCard({ projectId }: { projectId: string }) {
  const { data: auditLogs = [], isLoading } = useQuery<{
    id: string;
    entityType: string;
    action: string;
    createdAt: string;
    previousValue: unknown;
    newValue: unknown;
  }[]>({
    queryKey: ["/api/projects", projectId, "audit-log"],
    enabled: !!projectId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Audit Log
        </CardTitle>
        <CardDescription>
          Track all changes made to this project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : auditLogs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No audit events recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.slice(0, 20).map((log) => (
                <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                  <TableCell>
                    <Badge variant={log.action === "delete" ? "destructive" : log.action === "create" ? "default" : "secondary"}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.entityType}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
