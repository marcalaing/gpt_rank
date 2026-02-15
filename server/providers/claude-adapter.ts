import Anthropic from "@anthropic-ai/sdk";
import pRetry from "p-retry";
import { ProviderAdapter, ProviderResponse, ProviderContext, ParsedCitation } from "./types";
import { buildAnswerSystemPrompt } from "../templates/llm-prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku-20241022": { input: 0.001, output: 0.005 },
  "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
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
  const costs = MODEL_COSTS[model] || MODEL_COSTS["claude-3-5-haiku-20241022"];
  return (usage.promptTokens / 1000) * costs.input + (usage.completionTokens / 1000) * costs.output;
}

export class ClaudeAdapter implements ProviderAdapter {
  name = "anthropic";
  private model: string;

  constructor(model: string = "claude-3-5-haiku-20241022") {
    this.model = model;
  }

  async runPrompt(promptText: string, context?: ProviderContext): Promise<ProviderResponse> {
    const systemPrompt = buildAnswerSystemPrompt(context?.brandNames, context?.competitorNames);

    // Wrap API call with retry logic for transient failures
    const response = await pRetry(
      async () => {
        return await anthropic.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: promptText }],
        });
      },
      {
        retries: 1, // 1 retry = 2 total attempts
        minTimeout: 1000, // 1 second before retry
        maxTimeout: 2000, // 2 seconds max backoff
        onFailedAttempt: (error) => {
          console.warn(
            `Claude API call failed (attempt ${error.attemptNumber}/${error.retriesLeft + error.attemptNumber})`
          );
        },
        // Only retry on specific transient errors
        shouldRetry: (error: any) => {
          // Retry on rate limits, server errors, and timeout
          const retryableStatusCodes = [429, 500, 502, 503, 504];
          const statusCode = error?.status || error?.response?.status;
          return retryableStatusCodes.includes(statusCode);
        },
      }
    );

    const rawText = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : '';
    
    const citations = extractUrlsFromText(rawText);
    
    const usage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    const costEstimate = estimateCost(this.model, usage);

    return {
      rawText,
      citations,
      usage,
      costEstimate,
    };
  }
}

export function createClaudeAdapter(model?: string): ProviderAdapter {
  return new ClaudeAdapter(model);
}
