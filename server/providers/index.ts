import { ProviderAdapter } from "./types";
import { createOpenAIAdapter } from "./openai-adapter";

export * from "./types";
export { createOpenAIAdapter } from "./openai-adapter";

export function getProviderAdapter(provider: string, model?: string): ProviderAdapter {
  switch (provider) {
    case "openai":
      return createOpenAIAdapter(model);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
