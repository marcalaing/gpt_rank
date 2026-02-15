export interface ProviderResponse {
  rawText: string;
  citations?: ParsedCitation[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costEstimate?: number;
}

export interface ParsedCitation {
  url?: string;
  title?: string;
  domain?: string;
  snippet?: string;
  position: number;
}

export interface ProviderContext {
  brandNames?: string[];
  competitorNames?: string[];
  locale?: string;
}

export interface ProviderAdapter {
  name: string;
  runPrompt(promptText: string, context?: ProviderContext): Promise<ProviderResponse>;
}
