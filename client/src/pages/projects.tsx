import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, FolderKanban, ArrowRight, Loader2, Calendar } from "lucide-react";
import { Link } from "wouter";
import type { Project } from "@shared/schema";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

interface ProjectWithStats extends Project {
  promptCount: number;
  brandCount: number;
  competitorCount: number;
}

function ProjectCard({ project, loading }: { project?: ProjectWithStats; loading?: boolean }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!project) return null;

  return (
    <Card className="hover-elevate group">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate" data-testid={`text-project-name-${project.id}`}>
              {project.name}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {project.description || "No description"}
            </CardDescription>
          </div>
          <Link href={`/app/projects/${project.id}`}>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-view-project-${project.id}`}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {project.promptCount} prompts
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {project.brandCount} brands
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {project.competitorCount} competitors
          </Badge>
        </div>
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();

  const form = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateProjectFormData) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Project created", description: "Your new project is ready." });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create project", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Projects help you organize prompts, brands, and competitors for tracking.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Brand Visibility Q1" data-testid="input-project-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this project tracks..."
                      className="resize-none"
                      data-testid="input-project-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-project">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: projects, isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ['/api/projects'],
  });

  return (
    <AppLayout breadcrumbs={[{ label: "Projects" }]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your AI search tracking projects
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-new-project">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <ProjectCard key={i} loading />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No projects yet</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create your first project to start tracking AI search visibility.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-project">
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </AppLayout>
  );
}
