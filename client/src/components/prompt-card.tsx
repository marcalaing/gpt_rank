import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Play, Loader2, Edit2, Save, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Prompt, PromptRun, Score } from "@shared/schema";

interface PromptCardProps {
  prompt: Prompt;
  projectId: string;
}

const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "ChatGPT (4o-mini)", provider: "openai" },
  { value: "gpt-4o", label: "ChatGPT (4o)", provider: "openai" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude (Sonnet 3.5)", provider: "anthropic" },
  { value: "gemini-2.0-flash-exp", label: "Gemini (2.0 Flash)", provider: "gemini" },
  { value: "sonar", label: "Perplexity (Sonar)", provider: "perplexity" },
];

export function PromptCard({ prompt, projectId }: PromptCardProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState(prompt.template);
  const [running, setRunning] = useState(false);

  // Fetch last run for this prompt
  const { data: runs = [] } = useQuery<PromptRun[]>({
    queryKey: ["/api/prompts", prompt.id, "runs"],
    enabled: expanded,
  });

  const lastRun = runs.length > 0 ? runs[0] : null;

  // Fetch last score for this prompt
  const { data: scores = [] } = useQuery<Score[]>({
    queryKey: ["/api/projects", projectId, "scores"],
    enabled: true,
  });

  const promptScores = scores.filter((s: Score) => {
    if (!s.promptRunId) return false;
    return runs.some((r: PromptRun) => r.id === s.promptRunId);
  });
  const lastScore = promptScores.length > 0 ? promptScores[0] : null;

  const updatePromptMutation = useMutation({
    mutationFn: async (data: { template?: string; preferredModel?: string }) => {
      const res = await apiRequest("PATCH", `/api/prompts/${prompt.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      toast({ title: "Prompt updated successfully" });
      setEditing(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update prompt", description: error.message, variant: "destructive" });
    },
  });

  const runPromptMutation = useMutation({
    mutationFn: async () => {
      setRunning(true);
      const res = await apiRequest("POST", `/api/prompts/${prompt.id}/run`);
      return res.json();
    },
    onSuccess: () => {
      setRunning(false);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts", prompt.id, "runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scores"] });
      toast({ title: "Prompt executed successfully" });
    },
    onError: (error: Error) => {
      setRunning(false);
      toast({ title: "Failed to run prompt", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (editedText.trim() !== prompt.template) {
      updatePromptMutation.mutate({ template: editedText.trim() });
    } else {
      setEditing(false);
    }
  };

  const handleModelChange = (model: string) => {
    updatePromptMutation.mutate({ preferredModel: model });
  };

  const selectedModel = prompt.preferredModel || "gpt-4o-mini";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              {prompt.name}
              <Badge variant={prompt.isActive ? "default" : "secondary"} className="ml-2">
                {prompt.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardTitle>
            {lastScore && (
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">Last score: </span>
                <span className={`text-sm font-semibold ${
                  lastScore.score >= 70 ? "text-green-600 dark:text-green-400" :
                  lastScore.score >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-red-600 dark:text-red-400"
                }`}>
                  {Math.round(lastScore.score)}/100
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => runPromptMutation.mutate()}
              disabled={running}
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Prompt Text */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Prompt Text</label>
              {!editing ? (
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditing(true);
                  setEditedText(prompt.template);
                }}>
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updatePromptMutation.isPending}>
                    {updatePromptMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
            </div>
            {editing ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[100px]"
              />
            ) : (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {prompt.template}
              </p>
            )}
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">AI Model</label>
            <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Last Run Details */}
          {lastRun && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium">Last Run</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">Provider:</span> {lastRun.provider}
                  {lastRun.model && <span className="ml-2">({lastRun.model})</span>}
                </p>
                <p>
                  <span className="font-medium">Executed:</span>{" "}
                  {new Date(lastRun.executedAt).toLocaleString()}
                </p>
                {lastRun.cost && (
                  <p>
                    <span className="font-medium">Cost:</span> ${lastRun.cost.toFixed(4)}
                  </p>
                )}
              </div>
              {lastRun.rawResponse && (
                <div className="mt-2">
                  <h5 className="text-xs font-medium mb-1">Response:</h5>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-48 overflow-y-auto">
                    {lastRun.rawResponse}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
