import * as cheerio from "cheerio";
import { logger } from "../lib/logger";

export interface DomainMetadata {
  brandName: string;
  description: string | null;
  title: string | null;
  keywords: string[];
}

/**
 * Scrape a domain's homepage to extract brand metadata
 * @param domain - Domain to scrape (e.g., "mondou.com")
 * @returns Extracted metadata or fallback values
 */
export async function scrapeDomain(domain: string): Promise<DomainMetadata> {
  // Normalize domain - remove protocol if present, add https
  const normalizedDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "");
  const url = `https://${normalizedDomain}`;

  try {
    logger.info("Scraping domain", { domain, url });

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GPTRank/1.0; +https://gptrank.com)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata
    const title = $("title").first().text().trim() || null;
    const metaDescription = 
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null;

    const metaKeywords = 
      $('meta[name="keywords"]').attr("content")?.trim() || "";

    // Extract H1s for additional context
    const h1s: string[] = [];
    $("h1").each((_, el) => {
      const text = $(el).text().trim();
      if (text) h1s.push(text);
    });

    // Derive brand name from title or domain
    let brandName = normalizedDomain.split(".")[0] || normalizedDomain;
    
    if (title) {
      // Try to extract brand name from title (usually first part before separator)
      const titleParts = title.split(/[\|–—-]/);
      if (titleParts.length > 0 && titleParts[0].trim().length > 0) {
        brandName = titleParts[0].trim();
      }
    }

    // Extract keywords
    const keywords: string[] = [];
    if (metaKeywords) {
      keywords.push(...metaKeywords.split(",").map(k => k.trim()).filter(Boolean));
    }
    if (h1s.length > 0) {
      keywords.push(...h1s);
    }

    const result: DomainMetadata = {
      brandName,
      description: metaDescription,
      title,
      keywords: keywords.slice(0, 10), // Limit to 10 keywords
    };

    logger.info("Domain scraping successful", { domain, result });
    return result;

  } catch (error) {
    logger.warn("Domain scraping failed, using fallback", { 
      domain, 
      error: error instanceof Error ? error.message : String(error) 
    });

    // Fallback: use domain name as brand name
    const fallbackBrand = normalizedDomain
      .split(".")[0]
      ?.replace(/[-_]/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || normalizedDomain;

    return {
      brandName: fallbackBrand,
      description: null,
      title: null,
      keywords: [],
    };
  }
}
