import type { Brand, Competitor } from "@shared/schema";

export interface ExtractionResult {
  brandMentioned: boolean;
  brandMentionCount: number;
  competitorMentions: { id: string; name: string; count: number }[];
  citedDomains: { domain: string; count: number; urls: string[] }[];
  sentiment: "positive" | "neutral" | "negative";
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function fuzzyMatch(text: string, term: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term);
  
  if (normalizedText.includes(normalizedTerm)) {
    return true;
  }
  
  const words = normalizedTerm.split(" ");
  if (words.length > 1) {
    return words.every(word => normalizedText.includes(word));
  }
  
  return false;
}

function countMentions(text: string, terms: string[]): number {
  const normalizedText = normalizeText(text);
  let count = 0;
  
  for (const term of terms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    
    const regex = new RegExp(`\\b${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = normalizedText.match(regex);
    count += matches?.length || 0;
  }
  
  return count;
}

function extractDomains(text: string): { domain: string; url: string }[] {
  const urlRegex = /https?:\/\/[^\s\)>\]"']+/gi;
  const matches = text.match(urlRegex) || [];
  
  return matches.map(url => {
    try {
      const cleanUrl = url.replace(/[.,;:!?]+$/, '');
      const parsed = new URL(cleanUrl);
      return {
        domain: parsed.hostname.replace(/^www\./, ''),
        url: cleanUrl,
      };
    } catch {
      return null;
    }
  }).filter((item): item is { domain: string; url: string } => item !== null);
}

function analyzeSentiment(text: string, brandTerms: string[]): "positive" | "neutral" | "negative" {
  const positiveWords = ["best", "excellent", "great", "recommended", "popular", "leading", "top", "trusted", "reliable", "powerful", "innovative", "outstanding", "superior", "preferred"];
  const negativeWords = ["worst", "bad", "poor", "avoid", "limited", "outdated", "expensive", "unreliable", "complicated", "difficult", "lacks", "missing", "weak"];
  
  const normalizedText = normalizeText(text);
  let positiveScore = 0;
  let negativeScore = 0;
  
  for (const term of brandTerms) {
    const termIndex = normalizedText.indexOf(normalizeText(term));
    if (termIndex === -1) continue;
    
    const contextStart = Math.max(0, termIndex - 100);
    const contextEnd = Math.min(normalizedText.length, termIndex + term.length + 100);
    const context = normalizedText.slice(contextStart, contextEnd);
    
    for (const word of positiveWords) {
      if (context.includes(word)) positiveScore++;
    }
    for (const word of negativeWords) {
      if (context.includes(word)) negativeScore++;
    }
  }
  
  if (positiveScore > negativeScore + 1) return "positive";
  if (negativeScore > positiveScore + 1) return "negative";
  return "neutral";
}

export function extractFromResponse(
  rawText: string,
  brands: Brand[],
  competitors: Competitor[]
): ExtractionResult {
  const brandTerms: string[] = [];
  for (const brand of brands) {
    brandTerms.push(brand.name);
    if (brand.synonyms) {
      brandTerms.push(...brand.synonyms);
    }
  }
  
  const brandMentionCount = countMentions(rawText, brandTerms);
  const brandMentioned = brandMentionCount > 0;
  
  const competitorMentions: ExtractionResult["competitorMentions"] = [];
  for (const competitor of competitors) {
    const terms = [competitor.name, ...(competitor.synonyms || [])];
    const count = countMentions(rawText, terms);
    if (count > 0) {
      competitorMentions.push({
        id: competitor.id,
        name: competitor.name,
        count,
      });
    }
  }
  
  competitorMentions.sort((a, b) => b.count - a.count);
  
  const domainResults = extractDomains(rawText);
  const domainMap = new Map<string, { count: number; urls: string[] }>();
  for (const { domain, url } of domainResults) {
    const existing = domainMap.get(domain);
    if (existing) {
      existing.count++;
      if (!existing.urls.includes(url)) {
        existing.urls.push(url);
      }
    } else {
      domainMap.set(domain, { count: 1, urls: [url] });
    }
  }
  
  const citedDomains = Array.from(domainMap.entries())
    .map(([domain, data]) => ({ domain, ...data }))
    .sort((a, b) => b.count - a.count);
  
  const sentiment = analyzeSentiment(rawText, brandTerms);
  
  return {
    brandMentioned,
    brandMentionCount,
    competitorMentions,
    citedDomains,
    sentiment,
  };
}
