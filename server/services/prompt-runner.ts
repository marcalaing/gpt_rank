import { storage } from "../storage";
import { getProviderAdapter } from "../providers";
import { extractWithLLM } from "./llm-extraction";
import { getTierLimits } from "../webhookHandlers";
import { logger, trackError } from "../lib/logger";
import type { PromptRun, InsertPromptRun, InsertCitation, InsertScore } from "@shared/schema";

export interface RunPromptResult {
  promptRun: PromptRun;
  success: boolean;
  error?: string;
  limitExceeded?: boolean;
}

export async function runPromptOnce(
  promptId: string,
  provider: "openai" | "anthropic" | "perplexity" | "gemini",
  model?: string
): Promise<RunPromptResult> {
  const startTime = Date.now();
  let promptRunId: string | null = null;

  try {
    const prompt = await storage.getPrompt(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    const project = await storage.getProject(prompt.projectId);
    if (!project) {
      throw new Error(`Project not found: ${prompt.projectId}`);
    }

    const org = await storage.getOrganization(project.organizationId);
    if (org) {
      const tier = org.subscriptionTier || "free";
      const limits = getTierLimits(tier);
      
      if (limits.runsPerMonth !== Infinity) {
        const currentMonthRuns = await storage.getMonthlyRunCountByOrg(org.id);
        if (currentMonthRuns >= limits.runsPerMonth) {
          return {
            promptRun: {} as PromptRun,
            success: false,
            error: `Monthly run limit reached. Your ${tier} plan allows ${limits.runsPerMonth} runs per month.`,
            limitExceeded: true,
          };
        }
      }
    }

    const competitors = await storage.getCompetitorsByProject(prompt.projectId);

    const competitorNames = competitors.flatMap(c => [c.name, ...(c.synonyms || [])]);

    const insertData: InsertPromptRun = {
      promptId,
      provider,
      model: model || null,
      rawResponse: null,
      parsedMentions: null,
      responseMetadata: null,
      cost: null,
    };
    const promptRun = await storage.createPromptRun(insertData);
    promptRunId = promptRun.id;

    const adapter = getProviderAdapter(provider, model);
    
    const response = await adapter.runPrompt(prompt.template, {
      competitorNames,
      locale: prompt.locale || "en",
    });

    // Use LLM-based extraction with regex fallback
    const extraction = await extractWithLLM(response.rawText, [], competitors, true);

    const endTime = Date.now();
    const duration = endTime - startTime;

    const parsedMentionsData = {
      brandMentioned: extraction.brandMentioned,
      brandMentionCount: extraction.brandMentionCount,
      competitorMentions: extraction.competitorMentions,
      citedDomains: extraction.citedDomains,
      sentiment: extraction.sentiment,
      topics: extraction.topics,
      extractionMethod: extraction.extractionMethod,
    };
    
    const responseMetadataData = {
      usage: response.usage,
      costEstimate: response.costEstimate,
      duration,
      citationCount: response.citations?.length || 0,
    };

    const updatedRun = await storage.updatePromptRun(promptRunId, {
      rawResponse: response.rawText,
      parsedMentions: parsedMentionsData,
      responseMetadata: responseMetadataData,
      cost: response.costEstimate || null,
    });

    if (response.citations && response.citations.length > 0) {
      for (const citation of response.citations) {
        const citationData: InsertCitation = {
          promptRunId,
          url: citation.url || null,
          title: citation.title || null,
          snippet: citation.snippet || null,
          position: citation.position,
          domain: citation.domain || null,
        };
        await storage.createCitation(citationData);
      }
    }

    // Brand scoring removed - brands no longer supported

    return {
      promptRun: updatedRun || promptRun,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    trackError(error, { promptId, provider, model, promptRunId });

    if (promptRunId) {
      await storage.updatePromptRun(promptRunId, {
        rawResponse: null,
        responseMetadata: { error: errorMessage },
      });
    }

    return {
      promptRun: {} as PromptRun,
      success: false,
      error: errorMessage,
    };
  }
}
