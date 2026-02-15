import OpenAI from "openai";
import { logger } from "../lib/logger";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface DiscoveredPrompt {
  query: string;
  category: string;
  volumeScore: number;
  aiLikeliness: number;
  intent: "awareness" | "consideration" | "decision";
  relevance: string;
}

const DISCOVER_PROMPTS_SYSTEM = `You are a search behavior analyst specializing in AI assistant queries. 
Given a brand, its industry, and optionally a search term, generate 10 high-value search queries that potential customers might ask AI assistants (ChatGPT, Claude, Perplexity).

For each query, provide:
1. The query text (natural, conversational)
2. A category (e.g., "Product Research", "Comparison", "How-to", "Buying Guide", "Reviews", "Alternatives")
3. Search demand score (1-10): How often this type of query is searched
4. AI-likeliness score (1-10): How likely users would ask an AI vs Google
   - 10: Personalized advice, comparisons, multi-step plans
   - 7-9: How-to, troubleshooting, strategy
   - 4-6: General explanations, light research
   - 1-3: Navigational, single-fact lookups
5. Intent: awareness, consideration, or decision
6. Relevance: Brief explanation of why this query matters for the brand

Output ONLY valid JSON array:
[
  {
    "query": "Query text here",
    "category": "Category",
    "searchDemand": 7,
    "aiLikeliness": 8,
    "intent": "consideration",
    "relevance": "Why this matters"
  }
]

Generate exactly 10 queries, prioritizing high-value queries where AI assistants are likely to mention brands.`;

export interface DiscoverInput {
  brandName: string;
  industry: string;
  geography?: string;
  searchTerm?: string;
}

export async function discoverPrompts(input: DiscoverInput): Promise<DiscoveredPrompt[]> {
  try {
    const userPrompt = `Brand: ${input.brandName}
Industry: ${input.industry}
Geography: ${input.geography || "Global"}
${input.searchTerm ? `Focus area/search term: ${input.searchTerm}` : "Generate diverse high-value queries"}

Generate 10 prompts that potential customers might ask AI assistants in this space.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: DISCOVER_PROMPTS_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
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
      .filter((p: unknown): p is Record<string, unknown> =>
        typeof p === "object" && p !== null && typeof (p as Record<string, unknown>).query === "string"
      )
      .slice(0, 10)
      .map((p) => ({
        query: String(p.query),
        category: String(p.category || "General"),
        volumeScore: Math.round(
          (Number(p.searchDemand) || 5) * ((Number(p.aiLikeliness) || 5) / 10)
        ),
        aiLikeliness: Number(p.aiLikeliness) || 5,
        intent: (["awareness", "consideration", "decision"].includes(String(p.intent))
          ? String(p.intent)
          : "awareness") as "awareness" | "consideration" | "decision",
        relevance: String(p.relevance || "Relevant to your brand"),
      }));
  } catch (error) {
    logger.error("Failed to discover prompts", { input, error: String(error) });
    
    // Return fallback prompts
    return [
      {
        query: `What is ${input.brandName} and what do they offer?`,
        category: "Brand Awareness",
        volumeScore: 6,
        aiLikeliness: 7,
        intent: "awareness",
        relevance: "Basic brand discovery query",
      },
      {
        query: `Best ${input.industry.toLowerCase()} companies in 2025`,
        category: "Comparison",
        volumeScore: 8,
        aiLikeliness: 9,
        intent: "awareness",
        relevance: "Industry overview where your brand should appear",
      },
      {
        query: `${input.brandName} vs competitors - which is better?`,
        category: "Comparison",
        volumeScore: 7,
        aiLikeliness: 9,
        intent: "consideration",
        relevance: "Direct comparison query",
      },
      {
        query: `Is ${input.brandName} worth it? Honest review`,
        category: "Reviews",
        volumeScore: 6,
        aiLikeliness: 8,
        intent: "decision",
        relevance: "Pre-purchase research query",
      },
      {
        query: `Top alternatives to ${input.brandName}`,
        category: "Alternatives",
        volumeScore: 5,
        aiLikeliness: 8,
        intent: "consideration",
        relevance: "Competitor visibility tracking",
      },
    ];
  }
}
