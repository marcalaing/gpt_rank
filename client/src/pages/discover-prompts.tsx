import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project } from "@shared/schema";
import {
  Search,
  Sparkles,
  Plus,
  TrendingUp,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface DiscoveredPrompt {
  query: string;
  category: string;
  volumeScore: number;
  aiLikeliness: number;
  intent: "awareness" | "consideration" | "decision";
  relevance: string;
}

interface DiscoverResult {
  prompts: DiscoveredPrompt[];
  brandName: string;
}

export default function DiscoverPromptsPage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [addedPrompts, setAddedPrompts] = useState<Set<string>>(new Set());

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const discoverMutation = useMutation({
    mutationFn: async ({ projectId, searchTerm }: { projectId: string; searchTerm?: string }) => {
      const res = await apiRequest("POST", "/api/discover-prompts", { projectId, searchTerm });
      return res.json() as Promise<DiscoverResult>;
    },
  });

  const addPromptMutation = useMutation({
    mutationFn: async (prompt: DiscoveredPrompt) => {
      const res = await apiRequest("POST", "/api/discover-prompts/add", {
        projectId: selectedProject,
        query: prompt.query,
        volumeScore: prompt.volumeScore,
        aiLikeliness: prompt.aiLikeliness,
        intent: prompt.intent,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add prompt");
      }
      return res.json();
    },
    onSuccess: (_, prompt) => {
      setAddedPrompts(prev => new Set(Array.from(prev).concat(prompt.query)));
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject, "prompts"] });
      toast({ title: "Prompt added to project" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add prompt", description: error.message, variant: "destructive" });
    },
  });

  const handleDiscover = () => {
    if (!selectedProject) {
      toast({ title: "Select a project first", variant: "destructive" });
      return;
    }
    setAddedPrompts(new Set());
    discoverMutation.mutate({ projectId: selectedProject, searchTerm: searchTerm || undefined });
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case "awareness": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "consideration": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "decision": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "";
    }
  };

  const getVolumeColor = (score: number) => {
    if (score >= 7) return "text-green-600 dark:text-green-400";
    if (score >= 4) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Discover Prompts" }]}>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Discover Prompts</h1>
          <p className="text-muted-foreground">
            Find high-value search queries for your brand using AI-powered suggestions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Prompt Ideas
            </CardTitle>
            <CardDescription>
              Select a project and optionally enter a topic to discover relevant prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full md:w-64" data-testid="select-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : projects.length === 0 ? (
                    <SelectItem value="none" disabled>No projects found</SelectItem>
                  ) : (
                    projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Optional: Focus on a specific topic (e.g., 'pricing', 'reviews')"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
                  data-testid="input-search-term"
                />
                <Button 
                  onClick={handleDiscover} 
                  disabled={!selectedProject || discoverMutation.isPending}
                  data-testid="button-discover"
                >
                  {discoverMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Discover
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {discoverMutation.isPending && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {discoverMutation.data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Discovered Prompts for "{discoverMutation.data.brandName}"
              </h2>
              <Badge variant="secondary">{discoverMutation.data.prompts.length} prompts</Badge>
            </div>

            {discoverMutation.data.prompts.map((prompt, idx) => (
              <Card key={idx} className="hover-elevate" data-testid={`card-prompt-${idx}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{prompt.query}</span>
                        <Badge variant="outline" className="text-xs">{prompt.category}</Badge>
                        <Badge className={`text-xs ${getIntentColor(prompt.intent)}`}>
                          {prompt.intent}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{prompt.relevance}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1" title="Volume Score (search demand × AI-likeliness)">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className={`font-medium ${getVolumeColor(prompt.volumeScore)}`}>
                            {prompt.volumeScore}/10
                          </span>
                          <span className="text-muted-foreground">volume</span>
                        </div>
                        <div className="text-muted-foreground" title="AI Likeliness Score">
                          AI-likeliness: {prompt.aiLikeliness}/10
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {addedPrompts.has(prompt.query) ? (
                        <Button size="sm" variant="outline" disabled>
                          <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                          Added
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addPromptMutation.mutate(prompt)}
                          disabled={addPromptMutation.isPending}
                          data-testid={`button-add-prompt-${idx}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add to Project
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {discoverMutation.isError && (
          <Card className="border-destructive">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Failed to discover prompts</p>
                <p className="text-sm text-muted-foreground">
                  {discoverMutation.error?.message || "Please try again"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!discoverMutation.data && !discoverMutation.isPending && !discoverMutation.isError && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">Ready to discover prompts</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Select a project and click "Discover" to generate AI-powered prompt suggestions 
                based on your brand and industry.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
