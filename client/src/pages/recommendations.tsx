import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Project } from "@shared/schema";
import {
  Lightbulb,
  TrendingUp,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Globe,
  Target,
  ArrowRight,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface GapAnalysis {
  topic: string;
  yourBrandScore: number;
  competitorScore: number;
  gap: number;
  opportunity: string;
  priority: "high" | "medium" | "low";
}

interface ContentBrief {
  title: string;
  targetQuery: string;
  suggestedTopics: string[];
  citedSources: string[];
  contentType: string;
  estimatedImpact: "high" | "medium" | "low";
  outline: string[];
}

interface Recommendation {
  type: "gap" | "content" | "citation" | "topic";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionItems: string[];
}

interface RecommendationsData {
  gapAnalysis: GapAnalysis[];
  contentBriefs: ContentBrief[];
  recommendations: Recommendation[];
  topCitedDomains: { domain: string; count: number; topics: string[] }[];
}

export default function RecommendationsPage() {
  const [, params] = useRoute("/app/projects/:id/recommendations");
  const projectId = params?.id;
  const [expandedBrief, setExpandedBrief] = useState<number | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: recommendations, isLoading: recsLoading, refetch } = useQuery<RecommendationsData>({
    queryKey: ["/api/projects", projectId, "recommendations"],
    enabled: !!projectId,
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "gap": return <TrendingUp className="h-4 w-4" />;
      case "content": return <FileText className="h-4 w-4" />;
      case "citation": return <Globe className="h-4 w-4" />;
      case "topic": return <Target className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (projectLoading) {
    return (
      <AppLayout breadcrumbs={[{ label: "Projects", href: "/app/projects" }, { label: "Loading..." }]}>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Projects", href: "/app/projects" },
        { label: project?.name || "Project", href: `/app/projects/${projectId}` },
        { label: "Recommendations" },
      ]}
    >
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Recommendations</h1>
            <p className="text-muted-foreground">
              AI-powered insights to improve your brand's visibility
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={recsLoading}>
            {recsLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh Analysis
          </Button>
        </div>

        {recsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : recommendations ? (
          <Tabs defaultValue="recommendations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">
                Recommendations ({recommendations.recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="gaps" data-testid="tab-gaps">
                Gap Analysis ({recommendations.gapAnalysis.length})
              </TabsTrigger>
              <TabsTrigger value="briefs" data-testid="tab-briefs">
                Content Briefs ({recommendations.contentBriefs.length})
              </TabsTrigger>
              <TabsTrigger value="citations" data-testid="tab-citations">
                Top Citations ({recommendations.topCitedDomains.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-4">
              {recommendations.recommendations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No recommendations yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Run more prompts to generate AI-powered recommendations
                    </p>
                  </CardContent>
                </Card>
              ) : (
                recommendations.recommendations.map((rec, idx) => (
                  <Card key={idx} data-testid={`card-recommendation-${idx}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-muted">
                          {getTypeIcon(rec.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base">{rec.title}</CardTitle>
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority} priority
                            </Badge>
                          </div>
                          <CardDescription className="mt-1">{rec.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Action Items:</p>
                        <ul className="space-y-1.5">
                          {rec.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="gaps" className="space-y-4">
              {recommendations.gapAnalysis.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No competitive gaps found</h3>
                    <p className="text-sm text-muted-foreground">
                      Add competitors and run prompts to analyze visibility gaps
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {recommendations.gapAnalysis.map((gap, idx) => (
                    <Card key={idx} data-testid={`card-gap-${idx}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{gap.topic}</span>
                            <Badge className={getPriorityColor(gap.priority)}>
                              {gap.priority}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Gap: <span className="font-medium text-red-600 dark:text-red-400">-{gap.gap}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Your Brand</span>
                              <span>{gap.yourBrandScore}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: `${Math.min((gap.yourBrandScore / (gap.competitorScore || 1)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Competitor</span>
                              <span>{gap.competitorScore}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full w-full" />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{gap.opportunity}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="briefs" className="space-y-4">
              {recommendations.contentBriefs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No content briefs available</h3>
                    <p className="text-sm text-muted-foreground">
                      Run more prompts to generate content recommendations
                    </p>
                  </CardContent>
                </Card>
              ) : (
                recommendations.contentBriefs.map((brief, idx) => (
                  <Card key={idx} data-testid={`card-brief-${idx}`}>
                    <Collapsible open={expandedBrief === idx} onOpenChange={() => setExpandedBrief(expandedBrief === idx ? null : idx)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <CardTitle className="text-base">{brief.title}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">{brief.contentType}</Badge>
                                  <Badge className={getPriorityColor(brief.estimatedImpact)}>
                                    {brief.estimatedImpact} impact
                                  </Badge>
                                </CardDescription>
                              </div>
                            </div>
                            {expandedBrief === idx ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-2">Target Query:</p>
                            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              "{brief.targetQuery}"
                            </p>
                          </div>

                          {brief.suggestedTopics.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Topics to Cover:</p>
                              <div className="flex flex-wrap gap-2">
                                {brief.suggestedTopics.map((topic, i) => (
                                  <Badge key={i} variant="secondary">{topic}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {brief.outline.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Content Outline:</p>
                              <ol className="space-y-1.5 text-sm">
                                {brief.outline.map((section, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                                    <span>{section}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {brief.citedSources.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Reference Sources:</p>
                              <div className="flex flex-wrap gap-2">
                                {brief.citedSources.map((source, i) => (
                                  <Badge key={i} variant="outline" className="font-mono text-xs">
                                    {source}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="citations" className="space-y-4">
              {recommendations.topCitedDomains.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No citations found</h3>
                    <p className="text-sm text-muted-foreground">
                      Run prompts to discover which sources AI systems cite
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {recommendations.topCitedDomains.map((domain, idx) => (
                    <Card key={idx} data-testid={`card-domain-${idx}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`https://${domain.domain}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium hover:underline flex items-center gap-1"
                            >
                              {domain.domain}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <Badge variant="secondary">{domain.count} citations</Badge>
                        </div>
                        {domain.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {domain.topics.slice(0, 4).map((topic, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                            {domain.topics.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{domain.topics.length - 4} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">Failed to load recommendations</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Please try refreshing the analysis
              </p>
              <Button onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
