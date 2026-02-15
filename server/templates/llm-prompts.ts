export const ANSWER_SYSTEM_PROMPT = `You are a helpful AI assistant providing accurate, detailed information.

Guidelines:
- Answer concisely but thoroughly
- When discussing products, services, or companies, mention specific names when relevant
- If you reference sources or websites, include them as a bulleted list of URLs at the end of your response
- Format: "Sources:\n- https://example.com\n- https://other.com"
- Be objective and balanced in your assessments`;

export function buildAnswerSystemPrompt(brandNames?: string[], competitorNames?: string[]): string {
  let prompt = ANSWER_SYSTEM_PROMPT;
  
  if (brandNames?.length) {
    prompt += `\n\nThe user is particularly interested in information about: ${brandNames.join(", ")}.`;
  }
  
  if (competitorNames?.length) {
    prompt += `\nFor context, competitors in this space include: ${competitorNames.join(", ")}.`;
  }
  
  return prompt;
}

export interface ExtractionInput {
  rawAnswer: string;
  brandNames: string[];
  competitorNames: string[];
}

export interface ExtractionOutput {
  brandMentioned: boolean;
  brandMentionCount: number;
  competitorMentions: Array<{ name: string; count: number }>;
  topics: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  citedUrls: string[];
}

export const EXTRACTION_SYSTEM_PROMPT = `You are a precise data extraction assistant. Analyze the provided AI response and extract structured information.

Output ONLY valid JSON matching this exact schema (no other text):
{
  "brandMentioned": boolean,
  "brandMentionCount": number,
  "competitorMentions": [{"name": "string", "count": number}],
  "topics": ["topic1", "topic2"],
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "citedUrls": ["url1", "url2"]
}

Rules:
- brandMentioned: true if ANY of the target brand names appear in the text
- brandMentionCount: total count of all brand name mentions (including synonyms)
- competitorMentions: array of competitor names found with their mention counts
- topics: 1-5 main topics/themes discussed (e.g., "pricing", "features", "comparison")
- sentiment: overall sentiment toward the primary brand
- citedUrls: all URLs/links found in the response`;

export function buildExtractionPrompt(input: ExtractionInput): string {
  return `Analyze this AI response for brand visibility metrics.

Target Brand Names to look for: ${input.brandNames.join(", ") || "None specified"}
Competitor Names to look for: ${input.competitorNames.join(", ") || "None specified"}

AI Response to analyze:
"""
${input.rawAnswer}
"""

Extract the structured data as JSON.`;
}

export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    brandMentioned: { type: "boolean" },
    brandMentionCount: { type: "integer", minimum: 0 },
    competitorMentions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          count: { type: "integer", minimum: 0 }
        },
        required: ["name", "count"]
      }
    },
    topics: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 5
    },
    sentiment: {
      type: "string",
      enum: ["positive", "negative", "neutral", "mixed"]
    },
    citedUrls: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["brandMentioned", "brandMentionCount", "competitorMentions", "topics", "sentiment", "citedUrls"]
} as const;
