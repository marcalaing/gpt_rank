import OpenAI from "openai";
import pRetry from "p-retry";
import { ProviderAdapter, ProviderResponse, ProviderContext, ParsedCitation } from "./types";
import { buildAnswerSystemPrompt } from "../templates/llm-prompts";

const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "llama-3.1-sonar-small-128k-online": { input: 0.0002, output: 0.0002 },
  "llama-3.1-sonar-large-128k-online": { input: 0.001, output: 0.001 },
  "llama-3.1-sonar-huge-128k-online": { input: 0.005, output: 0.005 },
};

function extractUrlsFromText(text: string): ParsedCitation[] {
  const urlRegex = /https?:\/\/[^\s\)>\]]+/gi;
  const matches = text.match(urlRegex) || [];
  
  return matches.map((url, index) => {
    try {
      const parsed = new URL(url);
      return {
        url: url.replace(/[.,;:!?]+$/, ''),
        domain: parsed.hostname.replace(/^www\./, ''),
        position: index + 1,
      };
    } catch {
      return {
        url,
        position: index + 1,
      };
    }
  });
}

function estimateCost(model: string, usage: { promptTokens: number; completionTokens: number }): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS["llama-3.1-sonar-small-128k-online"];
  return (usage.promptTokens / 1000) * costs.input + (usage.completionTokens / 1000) * costs.output;
}

export class PerplexityAdapter implements ProviderAdapter {
  name = "perplexity";
  private model: string;

  constructor(model: string = "llama-3.1-sonar-small-128k-online") {
    this.model = model;
  }

  async runPrompt(promptText: string, context?: ProviderContext): Promise<ProviderResponse> {
    const systemPrompt = buildAnswerSystemPrompt(context?.brandNames, context?.competitorNames);

    // Wrap API call with retry logic for transient failures
    const response = await pRetry(
      async () => {
        return await perplexity.chat.completions.create({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: promptText },
          ],
        });
      },
      {
        retries: 1, // 1 retry = 2 total attempts
        minTimeout: 1000, // 1 second before retry
        maxTimeout: 2000, // 2 seconds max backoff
        onFailedAttempt: (error) => {
          console.warn(
            `Perplexity API call failed (attempt ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber})`
          );
        },
        // Only retry on specific transient errors
        shouldRetry: (error: any) => {
          // Retry on rate limits, server errors, and timeout
          const retryableStatusCodes = [429, 500, 502, 503, 504];
          const statusCode = error?.response?.status || error?.status;
          return retryableStatusCodes.includes(statusCode);
        },
      }
    );

    const rawText = response.choices[0]?.message?.content || "";
    
    // Perplexity may include citations in metadata - extract from both response and text
    let allCitations: ParsedCitation[] = [];
    
    // Check if Perplexity returns citations in response metadata
    if ((response as any).citations) {
      const citationsFromMeta = (response as any).citations as string[];
      allCitations = citationsFromMeta.map((url: string, index: number) => {
        try {
          const parsed = new URL(url);
          return {
            url: url.replace(/[.,;:!?]+$/, ''),
            domain: parsed.hostname.replace(/^www\./, ''),
            position: index + 1,
          };
        } catch {
          return {
            url,
            position: index + 1,
          };
        }
      });
    }
    
    // Also extract URLs from text content (fallback or additional)
    const textCitations = extractUrlsFromText(rawText);
    
    // Merge and deduplicate citations
    const citationUrls = new Set(allCitations.map(c => c.url));
    for (const citation of textCitations) {
      if (citation.url && !citationUrls.has(citation.url)) {
        allCitations.push(citation);
        citationUrls.add(citation.url);
      }
    }
    
    const usage = response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined;

    const costEstimate = usage ? estimateCost(this.model, usage) : undefined;

    return {
      rawText,
      citations: allCitations,
      usage,
      costEstimate,
    };
  }
}

export function createPerplexityAdapter(model?: string): ProviderAdapter {
  return new PerplexityAdapter(model);
}
