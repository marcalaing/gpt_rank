import OpenAI from "openai";
import { logger } from "../lib/logger";
import { storage } from "../storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface GapAnalysis {
  topic: string;
  yourBrandScore: number;
  competitorScore: number;
  gap: number;
  opportunity: string;
  priority: "high" | "medium" | "low";
}

export interface ContentBrief {
  title: string;
  targetQuery: string;
  suggestedTopics: string[];
  citedSources: string[];
  contentType: string;
  estimatedImpact: "high" | "medium" | "low";
  outline: string[];
}

export interface Recommendation {
  type: "gap" | "content" | "citation" | "topic";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionItems: string[];
}

export interface RecommendationsResult {
  gapAnalysis: GapAnalysis[];
  contentBriefs: ContentBrief[];
  recommendations: Recommendation[];
  topCitedDomains: { domain: string; count: number; topics: string[] }[];
}

const CONTENT_BRIEF_PROMPT = `You are a content strategist specializing in AI visibility optimization. 
Given a brand's visibility data, competitor information, and citation patterns, generate a content brief that will help improve the brand's visibility in AI search results.

Analyze the data and create a detailed content brief with:
1. A compelling title for the content piece
2. Target search query this content should rank for
3. Key topics to cover (5-7 bullet points)
4. Content type recommendation (blog post, guide, comparison page, FAQ, etc.)
5. A content outline (5-8 main sections)
6. Estimated impact on visibility (high/medium/low)

Output ONLY valid JSON:
{
  "title": "Content title",
  "targetQuery": "Target search query",
  "suggestedTopics": ["topic1", "topic2"],
  "contentType": "Blog Post",
  "outline": ["Section 1", "Section 2"],
  "estimatedImpact": "high"
}`;

export async function generateRecommendations(projectId: string): Promise<RecommendationsResult> {
  try {
    const brands = await storage.getBrandsByProject(projectId);
    const competitors = await storage.getCompetitorsByProject(projectId);
    const promptRuns = await storage.getPromptRunsByProject(projectId, 50);
    
    const brand = brands[0];
    if (!brand) {
      // Return empty results with helpful recommendation
      return {
        gapAnalysis: [],
        contentBriefs: [],
        recommendations: [{
          type: "gap",
          title: "Set up your brand first",
          description: "Add a brand to this project to start getting visibility recommendations.",
          priority: "high",
          actionItems: [
            "Go to project settings and add your brand name",
            "Include your website domain for better tracking",
            "Add brand synonyms if your brand has alternate names",
          ],
        }],
        topCitedDomains: [],
      };
    }

    // Analyze mention patterns
    let brandMentions = 0;
    const competitorMentions: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    const citationDomains: Record<string, { count: number; topics: Set<string> }> = {};

    for (const run of promptRuns) {
      const mentions = run.parsedMentions as {
        brandMentioned?: boolean;
        brandMentionCount?: number;
        competitorMentions?: { name: string; count: number }[];
        topics?: string[];
        citedUrls?: string[];
      } | null;

      if (mentions?.brandMentioned) {
        brandMentions += mentions.brandMentionCount || 1;
      }

      if (mentions?.competitorMentions) {
        for (const comp of mentions.competitorMentions) {
          competitorMentions[comp.name] = (competitorMentions[comp.name] || 0) + comp.count;
        }
      }

      if (mentions?.topics) {
        for (const topic of mentions.topics) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      }

      if (mentions?.citedUrls) {
        for (const url of mentions.citedUrls) {
          try {
            const domain = new URL(url).hostname.replace("www.", "");
            if (!citationDomains[domain]) {
              citationDomains[domain] = { count: 0, topics: new Set() };
            }
            citationDomains[domain].count++;
            if (mentions.topics) {
              mentions.topics.forEach(t => citationDomains[domain].topics.add(t));
            }
          } catch {
            // Invalid URL
          }
        }
      }
    }

    // Calculate gap analysis
    const gapAnalysis: GapAnalysis[] = [];
    const topCompetitors = Object.entries(competitorMentions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [compName, compMentions] of topCompetitors) {
      const gap = compMentions - brandMentions;
      if (gap > 0) {
        gapAnalysis.push({
          topic: `${compName} visibility`,
          yourBrandScore: brandMentions,
          competitorScore: compMentions,
          gap,
          opportunity: `${compName} is mentioned ${gap} more times. Consider creating content that positions ${brand.name} alongside ${compName}.`,
          priority: gap > 5 ? "high" : gap > 2 ? "medium" : "low",
        });
      }
    }

    // Generate content briefs using LLM
    const contentBriefs: ContentBrief[] = [];
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topTopics.length > 0) {
      try {
        const briefContext = `Brand: ${brand.name}
Industry/Domain: ${brand.domain || "Technology"}
Top topics in AI responses: ${topTopics.map(([t, c]) => `${t} (${c} mentions)`).join(", ")}
Top competitors: ${topCompetitors.map(([n, c]) => `${n} (${c} mentions)`).join(", ")}
Brand mentions: ${brandMentions}
Top cited domains: ${Object.entries(citationDomains)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 5)
  .map(([d, data]) => `${d} (${data.count} citations)`)
  .join(", ")}

Generate a content brief to improve visibility for this brand.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: CONTENT_BRIEF_PROMPT },
            { role: "user", content: briefContext },
          ],
          temperature: 0.7,
          max_tokens: 800,
        });

        const content = response.choices[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          contentBriefs.push({
            title: parsed.title || "Visibility Improvement Content",
            targetQuery: parsed.targetQuery || `best ${brand.domain || "technology"} companies`,
            suggestedTopics: Array.isArray(parsed.suggestedTopics) ? parsed.suggestedTopics : [],
            citedSources: Object.entries(citationDomains)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 5)
              .map(([d]) => d),
            contentType: parsed.contentType || "Blog Post",
            estimatedImpact: parsed.estimatedImpact || "medium",
            outline: Array.isArray(parsed.outline) ? parsed.outline : [],
          });
        }
      } catch (error) {
        logger.error("Failed to generate content brief", { error: String(error) });
      }
    }

    // Generate recommendations
    const recommendations: Recommendation[] = [];

    // Citation-based recommendations
    const topDomains = Object.entries(citationDomains)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    if (topDomains.length > 0) {
      const isBrandCited = topDomains.some(([d]) => 
        d.includes(brand.name.toLowerCase()) || 
        (brand.domain && d.includes(brand.domain.toLowerCase()))
      );

      if (!isBrandCited) {
        recommendations.push({
          type: "citation",
          title: "Get cited by authoritative sources",
          description: `Your brand is not appearing in the top cited sources. The most cited domains are: ${topDomains.slice(0, 3).map(([d]) => d).join(", ")}.`,
          priority: "high",
          actionItems: [
            "Create authoritative content that other sites will reference",
            "Pitch guest posts to high-authority domains",
            "Build backlinks from industry publications",
            "Update your website with comprehensive, citable information",
          ],
        });
      }
    }

    // Gap-based recommendations
    if (gapAnalysis.length > 0) {
      const topGap = gapAnalysis[0];
      recommendations.push({
        type: "gap",
        title: `Close the gap with ${topGap.topic.replace(" visibility", "")}`,
        description: topGap.opportunity,
        priority: topGap.priority,
        actionItems: [
          `Create comparison content: "${brand.name} vs ${topGap.topic.replace(" visibility", "")}"`,
          "Highlight unique differentiators in your messaging",
          "Target the same search queries as competitors",
          "Improve brand presence in industry discussions",
        ],
      });
    }

    // Topic-based recommendations
    if (topTopics.length > 0) {
      const underrepresentedTopics = Object.entries(topicCounts)
        .filter(([_, count]) => count <= 2)
        .slice(0, 3);

      if (underrepresentedTopics.length > 0) {
        recommendations.push({
          type: "topic",
          title: "Expand topic coverage",
          description: `Your brand has limited visibility in these topics: ${underrepresentedTopics.map(([t]) => t).join(", ")}. Creating content around these topics could improve AI visibility.`,
          priority: "medium",
          actionItems: underrepresentedTopics.map(([topic]) => 
            `Create comprehensive content about "${topic}"`
          ),
        });
      }
    }

    // Low visibility warning
    if (brandMentions < 3 && promptRuns.length >= 5) {
      recommendations.push({
        type: "gap",
        title: "Improve overall brand visibility",
        description: `Your brand was only mentioned ${brandMentions} times across ${promptRuns.length} AI queries. This indicates low visibility.`,
        priority: "high",
        actionItems: [
          "Create more content that AI systems can reference",
          "Ensure your website has clear, structured information",
          "Build authority through backlinks and citations",
          "Target informational queries where AI provides recommendations",
        ],
      });
    }

    return {
      gapAnalysis,
      contentBriefs,
      recommendations,
      topCitedDomains: topDomains.map(([domain, data]) => ({
        domain,
        count: data.count,
        topics: Array.from(data.topics),
      })),
    };
  } catch (error) {
    logger.error("Failed to generate recommendations", { projectId, error: String(error) });
    throw error;
  }
}
