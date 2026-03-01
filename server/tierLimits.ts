/**
 * Subscription tier limits and model access control
 */

export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";

export interface TierLimits {
  maxProjects: number;
  maxPromptsPerProject: number;
  maxRunsPerMonth: number;
  allowedProviders: string[];
  allowedModels: Record<string, string[]>; // provider -> model ids
  features: {
    historicalTracking: boolean;
    competitorTracking: boolean;
    emailAlerts: boolean;
    whiteLabeling: boolean;
    apiAccess: boolean;
    dedicatedSupport: boolean;
  };
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxProjects: 1,
    maxPromptsPerProject: 5,
    maxRunsPerMonth: 50,
    allowedProviders: ["openai"],
    allowedModels: {
      openai: ["gpt-4o-mini"], // Only ChatGPT mini for free tier
    },
    features: {
      historicalTracking: false,
      competitorTracking: false,
      emailAlerts: false,
      whiteLabeling: false,
      apiAccess: false,
      dedicatedSupport: false,
    },
  },
  starter: {
    maxProjects: 3,
    maxPromptsPerProject: 20,
    maxRunsPerMonth: 500,
    allowedProviders: ["openai", "anthropic", "gemini", "perplexity"],
    allowedModels: {
      openai: ["gpt-4o-mini", "gpt-4o"],
      anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
      gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
      perplexity: ["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online"],
    },
    features: {
      historicalTracking: true,
      competitorTracking: true,
      emailAlerts: true,
      whiteLabeling: false,
      apiAccess: false,
      dedicatedSupport: false,
    },
  },
  pro: {
    maxProjects: 10,
    maxPromptsPerProject: 100,
    maxRunsPerMonth: 2500,
    allowedProviders: ["openai", "anthropic", "gemini", "perplexity"],
    allowedModels: {
      openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
      anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
      gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
      perplexity: ["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-huge-128k-online"],
    },
    features: {
      historicalTracking: true,
      competitorTracking: true,
      emailAlerts: true,
      whiteLabeling: true,
      apiAccess: true,
      dedicatedSupport: false,
    },
  },
  enterprise: {
    maxProjects: 999,
    maxPromptsPerProject: 999,
    maxRunsPerMonth: 10000,
    allowedProviders: ["openai", "anthropic", "gemini", "perplexity"],
    allowedModels: {
      openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o1-preview", "o1-mini"],
      anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
      gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
      perplexity: ["llama-3.1-sonar-small-128k-online", "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-huge-128k-online"],
    },
    features: {
      historicalTracking: true,
      competitorTracking: true,
      emailAlerts: true,
      whiteLabeling: true,
      apiAccess: true,
      dedicatedSupport: true,
    },
  },
};

/**
 * Check if a tier can access a specific provider
 */
export function canAccessProvider(tier: SubscriptionTier, provider: string): boolean {
  return TIER_LIMITS[tier].allowedProviders.includes(provider);
}

/**
 * Check if a tier can use a specific model
 */
export function canAccessModel(tier: SubscriptionTier, provider: string, modelId: string): boolean {
  const limits = TIER_LIMITS[tier];
  if (!limits.allowedProviders.includes(provider)) {
    return false;
  }
  const allowedModels = limits.allowedModels[provider];
  return allowedModels ? allowedModels.includes(modelId) : false;
}

/**
 * Get all allowed models for a tier
 */
export function getAllowedModels(tier: SubscriptionTier): Record<string, string[]> {
  return TIER_LIMITS[tier].allowedModels;
}

/**
 * Get tier limits
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier];
}

/**
 * Get user-friendly model name (for UI display)
 */
export function getModelDisplayName(provider: string, modelId: string): string {
  const names: Record<string, Record<string, string>> = {
    openai: {
      "gpt-4o-mini": "ChatGPT 4o Mini",
      "gpt-4o": "ChatGPT 4o",
      "gpt-4-turbo": "ChatGPT 4 Turbo",
      "o1-preview": "ChatGPT o1 Preview",
      "o1-mini": "ChatGPT o1 Mini",
    },
    anthropic: {
      "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
      "claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
      "claude-3-opus-20240229": "Claude 3 Opus",
    },
    gemini: {
      "gemini-1.5-flash": "Gemini 1.5 Flash",
      "gemini-1.5-pro": "Gemini 1.5 Pro",
      "gemini-pro": "Gemini Pro",
    },
    perplexity: {
      "llama-3.1-sonar-small-128k-online": "Perplexity Small",
      "llama-3.1-sonar-large-128k-online": "Perplexity Large",
      "llama-3.1-sonar-huge-128k-online": "Perplexity Huge",
    },
  };

  return names[provider]?.[modelId] || modelId;
}
