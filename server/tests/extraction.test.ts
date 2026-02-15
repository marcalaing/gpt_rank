import { extractFromResponse } from "../services/extraction";
import type { Brand, Competitor } from "../../shared/schema";

const mockBrands: Brand[] = [
  {
    id: "brand1",
    projectId: "proj1",
    name: "Acme Corp",
    domain: "acme.com",
    synonyms: ["Acme", "Acme Inc"],
    createdAt: new Date(),
  },
];

const mockCompetitors: Competitor[] = [
  {
    id: "comp1",
    projectId: "proj1",
    name: "Competitor A",
    domain: "competitor-a.com",
    synonyms: ["CompA"],
    createdAt: new Date(),
  },
  {
    id: "comp2",
    projectId: "proj1",
    name: "Beta Systems",
    domain: "beta.com",
    synonyms: [],
    createdAt: new Date(),
  },
];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

export function runExtractionTests(): boolean {
  console.log("=== Running Extraction Tests ===\n");
  let passed = 0;
  let failed = 0;

  const runTest = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  };

  console.log("Brand Mention Detection:");
  
  runTest("detects brand mentioned in text", () => {
    const text = "Acme Corp is a leading provider of enterprise solutions.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.brandMentioned === true, "Expected brandMentioned to be true");
    assert(result.brandMentionCount > 0, "Expected brandMentionCount > 0");
  });

  runTest("detects brand synonyms", () => {
    const text = "Acme provides excellent customer service.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.brandMentioned === true, "Expected synonym to be detected");
  });

  runTest("returns false when brand not mentioned", () => {
    const text = "This is a generic response about software.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.brandMentioned === false, "Expected brandMentioned to be false");
    assert(result.brandMentionCount === 0, "Expected brandMentionCount to be 0");
  });

  runTest("counts multiple mentions", () => {
    const text = "Acme Corp is great. I recommend Acme for enterprise needs. Acme Inc also offers consulting.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.brandMentionCount >= 3, `Expected >= 3 mentions, got ${result.brandMentionCount}`);
  });

  console.log("\nCompetitor Mention Detection:");

  runTest("detects competitor mentions", () => {
    const text = "Compared to Competitor A, Acme Corp offers better pricing.";
    const result = extractFromResponse(text, mockBrands, mockCompetitors);
    assert(result.competitorMentions.length > 0, "Expected competitor mentions");
    assert(result.competitorMentions[0].name === "Competitor A", "Expected Competitor A");
  });

  runTest("detects competitor synonyms", () => {
    const text = "CompA is a strong player in the market.";
    const result = extractFromResponse(text, mockBrands, mockCompetitors);
    assert(result.competitorMentions.some(c => c.id === "comp1"), "Expected competitor by synonym");
  });

  console.log("\nCitation/URL Extraction:");

  runTest("extracts URLs from text", () => {
    const text = "Check out https://example.com/article for more info.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.citedDomains.length === 1, "Expected 1 domain");
    assert(result.citedDomains[0].domain === "example.com", "Expected example.com");
  });

  runTest("groups multiple URLs from same domain", () => {
    const text = "See https://example.com/page1 and https://example.com/page2";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.citedDomains.length === 1, "Expected 1 domain");
    assert(result.citedDomains[0].count === 2, "Expected count of 2");
  });

  runTest("removes www prefix from domains", () => {
    const text = "Check https://www.example.com/page";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.citedDomains[0].domain === "example.com", "Expected www to be removed");
  });

  console.log("\nSentiment Analysis:");

  runTest("detects positive sentiment", () => {
    const text = "Acme Corp is the best solution available. Their excellent service is recommended.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.sentiment === "positive", `Expected positive, got ${result.sentiment}`);
  });

  runTest("detects negative sentiment", () => {
    const text = "Acme Corp has poor customer service and outdated features. Users should avoid this.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.sentiment === "negative", `Expected negative, got ${result.sentiment}`);
  });

  runTest("returns neutral for balanced text", () => {
    const text = "Acme Corp provides enterprise software solutions for businesses.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.sentiment === "neutral", `Expected neutral, got ${result.sentiment}`);
  });

  console.log("\nEdge Cases:");

  runTest("handles empty text", () => {
    const result = extractFromResponse("", mockBrands, mockCompetitors);
    assert(result.brandMentioned === false, "Expected brandMentioned false for empty");
    assert(result.competitorMentions.length === 0, "Expected no competitors for empty");
  });

  runTest("case insensitive matching", () => {
    const text = "ACME CORP and acme corp and Acme Corp are all the same.";
    const result = extractFromResponse(text, mockBrands, []);
    assert(result.brandMentionCount >= 3, `Expected >= 3 mentions, got ${result.brandMentionCount}`);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const success = runExtractionTests();
  process.exit(success ? 0 : 1);
}
