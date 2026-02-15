import OpenAI from "openai";
import { logger } from "../lib/logger";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface BrandInsight {
  description: string;
  products: string[];
  services: string[];
  geography: string;
  industry: string;
}

export interface GeneratedQuery {
  query: string;
  intent: string;
}

export interface OnboardingResult {
  insight: BrandInsight;
  queries: GeneratedQuery[];
}

const BRAND_UNDERSTANDING_PROMPT = `You are a business analyst helping understand a brand's market position.

Given a brand name and optional domain, provide a concise analysis of:
1. What the brand/company does (1-2 sentences)
2. Main products they offer (list up to 5)
3. Main services they offer (list up to 5)
4. Primary operating geography (e.g., "United States", "Global", "Europe")
5. Industry/vertical (e.g., "SaaS", "E-commerce", "Healthcare")

Output ONLY valid JSON:
{
  "description": "Brief description of the brand",
  "products": ["product1", "product2"],
  "services": ["service1", "service2"],
  "geography": "Primary market",
  "industry": "Industry vertical"
}

If you don't have information about the brand, make reasonable inferences from the name and domain.`;

const QUERY_GENERATION_PROMPT = `You are a search behavior analyst. Based on the brand context provided, generate 5 search queries that potential customers would most likely ask AI assistants (like ChatGPT, Claude, Perplexity) when researching products/services in this space.

Focus on queries that:
- Are discovery-oriented (not navigational like "Company login")
- Would likely mention or discuss the brand in AI responses
- Represent different stages of the buyer journey (awareness, consideration, decision)
- Are conversational and natural for AI assistants

Output ONLY valid JSON array:
[
  {"query": "The search query text", "intent": "awareness|consideration|decision"},
  ...
]

Generate exactly 5 queries.`;

async function understandBrand(brandName: string, domain?: string | null): Promise<BrandInsight> {
  try {
    const userPrompt = domain 
      ? `Brand: ${brandName}\nDomain: ${domain}`
      : `Brand: ${brandName}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: BRAND_UNDERSTANDING_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      description: parsed.description || `${brandName} is a company in the ${parsed.industry || 'technology'} space.`,
      products: Array.isArray(parsed.products) ? parsed.products.slice(0, 5) : [],
      services: Array.isArray(parsed.services) ? parsed.services.slice(0, 5) : [],
      geography: parsed.geography || "Global",
      industry: parsed.industry || "Technology",
    };
  } catch (error) {
    logger.error("Failed to understand brand", { brandName, error: String(error) });
    return {
      description: `${brandName} is a company.`,
      products: [],
      services: [],
      geography: "Global",
      industry: "Technology",
    };
  }
}

async function generateQueries(brandName: string, insight: BrandInsight): Promise<GeneratedQuery[]> {
  try {
    const contextPrompt = `Brand: ${brandName}
Description: ${insight.description}
Products: ${insight.products.join(", ") || "N/A"}
Services: ${insight.services.join(", ") || "N/A"}
Industry: ${insight.industry}
Geography: ${insight.geography}

Generate 5 search queries that would help track this brand's visibility in AI search.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: QUERY_GENERATION_PROMPT },
        { role: "user", content: contextPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    return parsed
      .filter((q: unknown): q is { query: string; intent: string } => 
        typeof q === "object" && 
        q !== null && 
        typeof (q as Record<string, unknown>).query === "string"
      )
      .slice(0, 5)
      .map(q => ({
        query: q.query,
        intent: q.intent || "awareness",
      }));
  } catch (error) {
    logger.error("Failed to generate queries", { brandName, error: String(error) });
    return [
      { query: `What is ${brandName} and what do they offer?`, intent: "awareness" },
      { query: `Best ${insight.industry.toLowerCase()} companies in ${insight.geography}`, intent: "awareness" },
      { query: `${brandName} vs competitors comparison`, intent: "consideration" },
      { query: `Is ${brandName} worth it? Reviews and alternatives`, intent: "decision" },
      { query: `Top ${insight.products[0] || insight.industry.toLowerCase()} providers 2025`, intent: "awareness" },
    ];
  }
}

export async function runBrandOnboarding(brandName: string, domain?: string | null): Promise<OnboardingResult> {
  logger.info("Starting brand onboarding", { brandName, domain });
  
  const insight = await understandBrand(brandName, domain);
  logger.info("Brand insight generated", { brandName, insight });
  
  const queries = await generateQueries(brandName, insight);
  logger.info("Queries generated", { brandName, queryCount: queries.length });
  
  return { insight, queries };
}
