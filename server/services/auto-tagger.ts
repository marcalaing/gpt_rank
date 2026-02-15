import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const PREDEFINED_CATEGORIES = [
  "product_comparison",
  "best_x_for_y", 
  "how_to",
  "pricing",
  "reviews",
  "features",
  "alternatives",
  "industry",
  "use_case",
  "technical",
  "buying_guide",
  "troubleshooting",
];

export interface TagSuggestion {
  tags: string[];
  category: string;
  confidence: number;
}

export async function suggestTagsForPrompt(promptText: string): Promise<TagSuggestion> {
  try {
    const systemPrompt = `You are a prompt classifier. Analyze the prompt and output ONLY valid JSON (no other text):
{"tags": ["tag1"], "category": "primary_category", "confidence": 0.9}

Available categories: ${PREDEFINED_CATEGORIES.join(", ")}
Choose 1-3 relevant tags.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptText },
      ],
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("Auto-tagger: No JSON found in response:", content);
      return { tags: [], category: "general", confidence: 0 };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === 'string') : [],
      category: typeof parsed.category === 'string' ? parsed.category : "general",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch (error) {
    console.error("Auto-tagger error:", error);
    return {
      tags: [],
      category: "general",
      confidence: 0,
    };
  }
}

export function groupPromptsByTopic(prompts: Array<{ id: string; tags: string[] | null }>): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  
  for (const prompt of prompts) {
    const primaryTag = prompt.tags?.[0] || "uncategorized";
    if (!groups[primaryTag]) {
      groups[primaryTag] = [];
    }
    groups[primaryTag].push(prompt.id);
  }
  
  return groups;
}
