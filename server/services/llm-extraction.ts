import OpenAI from "openai";
import type { Brand, Competitor } from "@shared/schema";
import { extractFromResponse, ExtractionResult } from "./extraction";
import { 
  EXTRACTION_SYSTEM_PROMPT, 
  buildExtractionPrompt, 
  type ExtractionOutput 
} from "../templates/llm-prompts";
import { logger } from "../lib/logger";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface LLMExtractionResult extends ExtractionResult {
  topics: string[];
  extractionMethod: "llm" | "regex";
}

function parseExtractionJSON(content: string): ExtractionOutput | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (
      typeof parsed.brandMentioned !== "boolean" ||
      typeof parsed.brandMentionCount !== "number" ||
      !Array.isArray(parsed.competitorMentions) ||
      !Array.isArray(parsed.topics) ||
      !["positive", "negative", "neutral", "mixed"].includes(parsed.sentiment) ||
      !Array.isArray(parsed.citedUrls)
    ) {
      return null;
    }
    
    return {
      brandMentioned: parsed.brandMentioned,
      brandMentionCount: Math.max(0, Math.floor(parsed.brandMentionCount)),
      competitorMentions: parsed.competitorMentions.filter(
        (m: unknown): m is { name: string; count: number } =>
          typeof m === "object" &&
          m !== null &&
          typeof (m as Record<string, unknown>).name === "string" &&
          typeof (m as Record<string, unknown>).count === "number"
      ),
      topics: parsed.topics.filter((t: unknown): t is string => typeof t === "string").slice(0, 5),
      sentiment: parsed.sentiment,
      citedUrls: parsed.citedUrls.filter((u: unknown): u is string => typeof u === "string"),
    };
  } catch (error) {
    logger.warn("Failed to parse LLM extraction JSON", { error: String(error) });
    return null;
  }
}

function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s\)>\]"']+/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => url.replace(/[.,;:!?]+$/, ''));
}

function convertLLMToExtractionResult(
  llmResult: ExtractionOutput,
  competitors: Competitor[]
): LLMExtractionResult {
  const competitorMentions: ExtractionResult["competitorMentions"] = [];
  
  for (const mention of llmResult.competitorMentions) {
    const competitor = competitors.find(
      c => c.name.toLowerCase() === mention.name.toLowerCase() ||
           (c.synonyms || []).some(s => s.toLowerCase() === mention.name.toLowerCase())
    );
    if (competitor) {
      competitorMentions.push({
        id: competitor.id,
        name: competitor.name,
        count: mention.count,
      });
    } else {
      competitorMentions.push({
        id: "",
        name: mention.name,
        count: mention.count,
      });
    }
  }
  
  const citedDomains: ExtractionResult["citedDomains"] = [];
  const domainMap = new Map<string, { count: number; urls: string[] }>();
  
  for (const url of llmResult.citedUrls) {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.replace(/^www\./, '');
      const existing = domainMap.get(domain);
      if (existing) {
        existing.count++;
        if (!existing.urls.includes(url)) {
          existing.urls.push(url);
        }
      } else {
        domainMap.set(domain, { count: 1, urls: [url] });
      }
    } catch {
      continue;
    }
  }
  
  Array.from(domainMap.entries()).forEach(([domain, data]) => {
    citedDomains.push({ domain, ...data });
  });
  
  const sentiment = llmResult.sentiment === "mixed" ? "neutral" : llmResult.sentiment;
  
  return {
    brandMentioned: llmResult.brandMentioned,
    brandMentionCount: llmResult.brandMentionCount,
    competitorMentions: competitorMentions.sort((a, b) => b.count - a.count),
    citedDomains: citedDomains.sort((a, b) => b.count - a.count),
    sentiment,
    topics: llmResult.topics,
    extractionMethod: "llm",
  };
}

export async function extractWithLLM(
  rawText: string,
  brands: Brand[],
  competitors: Competitor[],
  useFallback: boolean = true
): Promise<LLMExtractionResult> {
  const brandNames = brands.flatMap(b => [b.name, ...(b.synonyms || [])]);
  const competitorNames = competitors.flatMap(c => [c.name, ...(c.synonyms || [])]);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExtractionPrompt({ rawAnswer: rawText, brandNames, competitorNames }) },
      ],
      max_tokens: 500,
      temperature: 0,
    });
    
    const content = response.choices[0]?.message?.content || "";
    const parsed = parseExtractionJSON(content);
    
    if (parsed) {
      logger.info("LLM extraction successful", { 
        brandMentioned: parsed.brandMentioned,
        competitorCount: parsed.competitorMentions.length,
        topicCount: parsed.topics.length,
      });
      return convertLLMToExtractionResult(parsed, competitors);
    }
    
    logger.warn("LLM extraction returned invalid JSON, falling back to regex");
  } catch (error) {
    logger.warn("LLM extraction failed, falling back to regex", { error: String(error) });
  }
  
  if (!useFallback) {
    return {
      brandMentioned: false,
      brandMentionCount: 0,
      competitorMentions: [],
      citedDomains: [],
      sentiment: "neutral",
      topics: [],
      extractionMethod: "regex",
    };
  }
  
  const regexResult = extractFromResponse(rawText, brands, competitors);
  const topics = inferTopicsFromText(rawText);
  
  return {
    ...regexResult,
    topics,
    extractionMethod: "regex",
  };
}

function inferTopicsFromText(text: string): string[] {
  const topicPatterns: Array<{ pattern: RegExp; topic: string }> = [
    { pattern: /\bpric(e|ing|es)\b/i, topic: "pricing" },
    { pattern: /\bfeature(s)?\b/i, topic: "features" },
    { pattern: /\bcompar(e|ison|ing)\b/i, topic: "comparison" },
    { pattern: /\breview(s)?\b/i, topic: "reviews" },
    { pattern: /\balternative(s)?\b/i, topic: "alternatives" },
    { pattern: /\bintegrat(e|ion|ions)\b/i, topic: "integrations" },
    { pattern: /\bsupport\b/i, topic: "support" },
    { pattern: /\bsecurity\b/i, topic: "security" },
    { pattern: /\bperformance\b/i, topic: "performance" },
    { pattern: /\bease of use|user.friendly|usability\b/i, topic: "usability" },
  ];
  
  const found: string[] = [];
  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(text) && !found.includes(topic)) {
      found.push(topic);
    }
    if (found.length >= 5) break;
  }
  
  return found;
}
