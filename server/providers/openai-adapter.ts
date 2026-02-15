import OpenAI from "openai";
import pRetry from "p-retry";
import { ProviderAdapter, ProviderResponse, ProviderContext, ParsedCitation } from "./types";
import { buildAnswerSystemPrompt } from "../templates/llm-prompts";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
  "gpt-5": { input: 0.003, output: 0.012 },
  "gpt-5.1": { input: 0.0035, output: 0.014 },
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
  const costs = MODEL_COSTS[model] || MODEL_COSTS["gpt-4o-mini"];
  return (usage.promptTokens / 1000) * costs.input + (usage.completionTokens / 1000) * costs.output;
}

export class OpenAIAdapter implements ProviderAdapter {
  name = "openai";
  private model: string;

  constructor(model: string = "gpt-4o-mini") {
    this.model = model;
  }

  async runPrompt(promptText: string, context?: ProviderContext): Promise<ProviderResponse> {
    const systemPrompt = buildAnswerSystemPrompt(context?.brandNames, context?.competitorNames);

    // Wrap API call with retry logic for transient failures
    const response = await pRetry(
      async () => {
        return await openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: promptText },
          ],
          max_completion_tokens: 4096,
        });
      },
      {
        retries: 1, // 1 retry = 2 total attempts
        minTimeout: 1000, // 1 second before retry
        maxTimeout: 2000, // 2 seconds max backoff
        onFailedAttempt: (error) => {
          console.warn(
            `OpenAI API call failed (attempt ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber})`
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
    const citations = extractUrlsFromText(rawText);
    
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
      citations,
      usage,
      costEstimate,
    };
  }
}

export function createOpenAIAdapter(model?: string): ProviderAdapter {
  return new OpenAIAdapter(model);
}
