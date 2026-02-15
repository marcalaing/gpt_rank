import { GoogleGenerativeAI } from "@google/generative-ai";
import pRetry from "p-retry";
import { ProviderAdapter, ProviderResponse, ProviderContext, ParsedCitation } from "./types";
import { buildAnswerSystemPrompt } from "../templates/llm-prompts";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gemini-2.0-flash": { input: 0.00001, output: 0.00004 },
  "gemini-2.0-flash-exp": { input: 0, output: 0 }, // Free during preview
  "gemini-1.5-pro": { input: 0.00125, output: 0.00375 },
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
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
  const costs = MODEL_COSTS[model] || MODEL_COSTS["gemini-2.0-flash"];
  return (usage.promptTokens / 1000) * costs.input + (usage.completionTokens / 1000) * costs.output;
}

export class GeminiAdapter implements ProviderAdapter {
  name = "gemini";
  private model: string;

  constructor(model: string = "gemini-2.0-flash") {
    this.model = model;
  }

  async runPrompt(promptText: string, context?: ProviderContext): Promise<ProviderResponse> {
    const systemPrompt = buildAnswerSystemPrompt(context?.brandNames, context?.competitorNames);
    
    // Gemini combines system and user prompts
    const fullPrompt = `${systemPrompt}\n\nUser: ${promptText}`;

    // Wrap API call with retry logic for transient failures
    const response = await pRetry(
      async () => {
        const model = genAI.getGenerativeModel({ model: this.model });
        const result = await model.generateContent(fullPrompt);
        return await result.response;
      },
      {
        retries: 1, // 1 retry = 2 total attempts
        minTimeout: 1000, // 1 second before retry
        maxTimeout: 2000, // 2 seconds max backoff
        onFailedAttempt: (error) => {
          console.warn(
            `Gemini API call failed (attempt ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber})`
          );
        },
        // Only retry on specific transient errors
        shouldRetry: (error: any) => {
          // Retry on rate limits, server errors, and timeout
          const retryableStatusCodes = [429, 500, 502, 503, 504];
          const statusCode = error?.status || error?.response?.status;
          // Also check for specific Gemini error types
          const errorMessage = error?.message?.toLowerCase() || '';
          const isRetryable = retryableStatusCodes.includes(statusCode) ||
                             errorMessage.includes('resource exhausted') ||
                             errorMessage.includes('unavailable');
          return isRetryable;
        },
      }
    );

    const rawText = response.text();
    const citations = extractUrlsFromText(rawText);

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
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

export function createGeminiAdapter(model?: string): ProviderAdapter {
  return new GeminiAdapter(model);
}
