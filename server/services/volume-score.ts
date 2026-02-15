import OpenAI from "openai";
import { logger } from "../lib/logger";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface VolumeScoreResult {
  volumeScore: number; // 1-10 overall directional volume
  aiLikeliness: number; // 1-10 how likely to be asked to AI vs traditional search
  reasoning: string;
}

const VOLUME_SCORE_PROMPT = `You are a search behavior analyst. Estimate the search demand and AI-likeliness of a query.

Provide scores on a 1-10 scale:

**Search Demand (1-10):** How often this topic/query is searched
- 1-3: Niche or very specific topics with low search volume
- 4-6: Moderate interest topics
- 7-10: Popular, high-demand topics

**AI-Likeliness (1-10):** How likely someone would ask an AI assistant vs traditional search
- 10: Personalized advice, "best for me", comparisons, synthesis, multi-step plans, templates, writing tasks
- 7-9: "How to", troubleshooting, strategy, "examples of", "checklist"
- 4-6: General explanations/definitions, light research
- 1-3: Navigational ("login", "pricing"), single-fact lookups, ultra-local/store-hours

Output ONLY valid JSON:
{
  "searchDemand": number (1-10),
  "aiLikeliness": number (1-10),
  "reasoning": "Brief 1-sentence explanation"
}`;

export async function estimateVolumeScore(query: string): Promise<VolumeScoreResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: VOLUME_SCORE_PROMPT },
        { role: "user", content: `Query: "${query}"` },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const searchDemand = Math.max(1, Math.min(10, Math.round(parsed.searchDemand || 5)));
    const aiLikeliness = Math.max(1, Math.min(10, Math.round(parsed.aiLikeliness || 5)));
    
    // Directional Prompt Volume Score = round(searchDemand * (aiLikeliness / 10))
    const volumeScore = Math.max(1, Math.min(10, Math.round(searchDemand * (aiLikeliness / 10))));

    return {
      volumeScore,
      aiLikeliness,
      reasoning: parsed.reasoning || "",
    };
  } catch (error) {
    logger.error("Failed to estimate volume score", { query, error: String(error) });
    return {
      volumeScore: 5,
      aiLikeliness: 5,
      reasoning: "Unable to estimate",
    };
  }
}

export async function estimateVolumeScoreBatch(queries: string[]): Promise<VolumeScoreResult[]> {
  const results: VolumeScoreResult[] = [];
  
  for (const query of queries) {
    const result = await estimateVolumeScore(query);
    results.push(result);
  }
  
  return results;
}
