import { ProviderAdapter } from "./types";
import { createOpenAIAdapter } from "./openai-adapter";
import { createClaudeAdapter } from "./claude-adapter";
import { createPerplexityAdapter } from "./perplexity-adapter";
import { createGeminiAdapter } from "./gemini-adapter";

export * from "./types";
export { createOpenAIAdapter } from "./openai-adapter";
export { createClaudeAdapter } from "./claude-adapter";
export { createPerplexityAdapter } from "./perplexity-adapter";
export { createGeminiAdapter } from "./gemini-adapter";

export function getProviderAdapter(provider: string, model?: string): ProviderAdapter {
  switch (provider) {
    case "openai":
      if (!process.env.OPENAI_API_KEY && !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
      }
      return createOpenAIAdapter(model);
    
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API key not configured. Set ANTHROPIC_API_KEY in your environment.");
      }
      return createClaudeAdapter(model);
    
    case "perplexity":
      if (!process.env.PERPLEXITY_API_KEY) {
        throw new Error("Perplexity API key not configured. Set PERPLEXITY_API_KEY in your environment.");
      }
      return createPerplexityAdapter(model);
    
    case "gemini":
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error("Google AI API key not configured. Set GOOGLE_AI_API_KEY in your environment.");
      }
      return createGeminiAdapter(model);
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
