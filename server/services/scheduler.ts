import { storage } from "../storage";
import { runPromptOnce } from "./prompt-runner";
import type { Prompt, Job } from "@shared/schema";

const CONCURRENCY_LIMIT_PER_ORG = 3;
const CONCURRENCY_LIMIT_PER_PROJECT = 2;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MULTIPLIER = 2;
const MAX_JOBS_PER_TICK = 10;
const MAX_RETRY_ATTEMPTS = 5;

function getNextRunTime(cadence: "daily" | "weekly", lastRunAt: Date | null): Date {
  const now = new Date();
  if (!lastRunAt) {
    return now;
  }
  
  const next = new Date(lastRunAt);
  if (cadence === "daily") {
    next.setDate(next.getDate() + 1);
  } else {
    next.setDate(next.getDate() + 7);
  }
  
  return next > now ? next : now;
}

function getBackoffDelay(attempts: number): number {
  return BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempts);
}

export interface EnqueueResult {
  enqueuedCount: number;
  skippedBudget: number;
  skippedConcurrency: number;
}

export async function enqueueDuePrompts(): Promise<EnqueueResult> {
  const now = new Date();
  let enqueuedCount = 0;
  let skippedBudget = 0;
  let skippedConcurrency = 0;

  const duePrompts = await storage.getDuePrompts(now);

  for (const prompt of duePrompts) {
    const project = await storage.getProject(prompt.projectId);
    if (!project) continue;

    if (project.monthlyBudgetHard && project.currentMonthUsage && 
        project.currentMonthUsage >= project.monthlyBudgetHard) {
      skippedBudget++;
      console.log(`Hard budget limit reached for project ${project.name}. Prompt ${prompt.id} skipped.`);
      await storage.createAuditLog({
        projectId: project.id,
        entityType: "prompt",
        entityId: prompt.id,
        action: "budget_change",
        metadata: { 
          reason: "Hard budget limit reached",
          budgetLimit: project.monthlyBudgetHard,
          currentUsage: project.currentMonthUsage
        },
      });
      continue;
    }

    const runningJobsForProject = await storage.getRunningJobsForProject(prompt.projectId);
    if (runningJobsForProject >= CONCURRENCY_LIMIT_PER_PROJECT) {
      skippedConcurrency++;
      continue;
    }

    const runningJobsForOrg = await storage.getRunningJobsForOrg(project.organizationId);
    if (runningJobsForOrg >= CONCURRENCY_LIMIT_PER_ORG) {
      skippedConcurrency++;
      continue;
    }

    await storage.createJob({
      type: "prompt_run",
      payload: { promptId: prompt.id, provider: "openai" },
      status: "pending",
      scheduledFor: now,
      projectId: prompt.projectId,
      organizationId: project.organizationId,
    });

    const nextRun = getNextRunTime(prompt.cadence || "weekly", now);
    await storage.updatePromptSchedule(prompt.id, now, nextRun);
    
    enqueuedCount++;
  }

  return { enqueuedCount, skippedBudget, skippedConcurrency };
}

export interface ProcessResult {
  processedCount: number;
  failedCount: number;
  retriedCount: number;
}

export async function processJobs(limit: number = MAX_JOBS_PER_TICK): Promise<ProcessResult> {
  const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let processedCount = 0;
  let failedCount = 0;
  let retriedCount = 0;

  const jobs = await storage.lockPendingJobs(limit, workerId);

  for (const job of jobs) {
    let currentAttempts = job.attempts || 0;
    
    try {
      if (job.projectId) {
        const runningForProject = await storage.getRunningJobsForProject(job.projectId);
        if (runningForProject >= CONCURRENCY_LIMIT_PER_PROJECT) {
          await storage.releaseJobLock(job.id);
          continue;
        }
      }
      if (job.organizationId) {
        const runningForOrg = await storage.getRunningJobsForOrg(job.organizationId);
        if (runningForOrg >= CONCURRENCY_LIMIT_PER_ORG) {
          await storage.releaseJobLock(job.id);
          continue;
        }
      }

      await storage.updateJobStatus(job.id, "running");
      currentAttempts = await storage.incrementJobAttempts(job.id);

      if (job.type === "prompt_run") {
        const payload = job.payload as { promptId: string; provider: string; model?: string };
        const result = await runPromptOnce(
          payload.promptId,
          payload.provider as "openai" | "anthropic" | "perplexity" | "gemini",
          payload.model
        );

        if (result.success) {
          await storage.updateJobStatus(job.id, "completed");
          processedCount++;

          if (result.promptRun.cost && job.projectId) {
            await storage.incrementProjectUsage(job.projectId, result.promptRun.cost);
          }
        } else {
          throw new Error(result.error || "Unknown error");
        }
      } else {
        await storage.updateJobStatus(job.id, "completed");
        processedCount++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const maxAttempts = job.maxAttempts || MAX_RETRY_ATTEMPTS;
      
      if (currentAttempts < maxAttempts) {
        const backoffDelay = getBackoffDelay(currentAttempts);
        const retryAt = new Date(Date.now() + backoffDelay);
        await storage.scheduleJobRetry(job.id, retryAt, errorMessage);
        retriedCount++;
      } else {
        await storage.updateJobStatus(job.id, "failed", errorMessage);
        failedCount++;
      }
    }
  }

  return { processedCount, failedCount, retriedCount };
}

export async function runCronTick(): Promise<{ enqueue: EnqueueResult; process: ProcessResult }> {
  const enqueue = await enqueueDuePrompts();
  const process = await processJobs();
  return { enqueue, process };
}
