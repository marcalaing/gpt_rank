# Provider Implementation Test Guide

## Quick Test Commands

To test each provider individually, you can use these manual tests:

### 1. Test OpenAI (Existing)
```bash
curl -X POST http://localhost:5000/api/dev/run-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "YOUR_PROMPT_ID",
    "provider": "openai",
    "model": "gpt-4o-mini"
  }'
```

### 2. Test Claude (New)
```bash
# First, set your API key
export ANTHROPIC_API_KEY="sk-ant-..."

curl -X POST http://localhost:5000/api/dev/run-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "YOUR_PROMPT_ID",
    "provider": "anthropic",
    "model": "claude-3-5-haiku-20241022"
  }'
```

### 3. Test Perplexity (New)
```bash
# First, set your API key
export PERPLEXITY_API_KEY="pplx-..."

curl -X POST http://localhost:5000/api/dev/run-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "YOUR_PROMPT_ID",
    "provider": "perplexity",
    "model": "llama-3.1-sonar-small-128k-online"
  }'
```

### 4. Test Gemini (New)
```bash
# First, set your API key
export GOOGLE_AI_API_KEY="..."

curl -X POST http://localhost:5000/api/dev/run-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "promptId": "YOUR_PROMPT_ID",
    "provider": "gemini",
    "model": "gemini-2.0-flash"
  }'
```

---

## Error Messages to Expect

### Missing API Key
If you try to use a provider without setting the API key, you'll get:

**Claude:**
```json
{
  "error": "Anthropic API key not configured. Set ANTHROPIC_API_KEY in your environment."
}
```

**Perplexity:**
```json
{
  "error": "Perplexity API key not configured. Set PERPLEXITY_API_KEY in your environment."
}
```

**Gemini:**
```json
{
  "error": "Google AI API key not configured. Set GOOGLE_AI_API_KEY in your environment."
}
```

---

## What to Verify

For each successful test, check:

1. ✅ **Response received** - `rawResponse` field contains text
2. ✅ **Citations extracted** - URLs found in response
3. ✅ **Usage tracked** - `promptTokens`, `completionTokens`, `totalTokens` recorded
4. ✅ **Cost calculated** - `costEstimate` is present and reasonable
5. ✅ **Brand extraction works** - `parsedMentions` contains brand/competitor data
6. ✅ **Score calculated** - Visibility score computed and saved
7. ✅ **Database records created** - Check `promptRuns`, `citations`, and `scores` tables

---

## Sample Expected Response Structure

```json
{
  "promptRun": {
    "id": "...",
    "promptId": "...",
    "provider": "anthropic",
    "model": "claude-3-5-haiku-20241022",
    "rawResponse": "When looking for CRM tools...",
    "parsedMentions": {
      "brandMentioned": true,
      "brandMentionCount": 3,
      "competitorMentions": [
        { "id": "...", "name": "Salesforce", "count": 2 },
        { "id": "...", "name": "Pipedrive", "count": 1 }
      ],
      "citedDomains": [
        { "domain": "hubspot.com", "count": 2, "urls": [...] }
      ],
      "sentiment": "positive",
      "topics": ["features", "pricing", "integrations"],
      "extractionMethod": "llm"
    },
    "responseMetadata": {
      "usage": {
        "promptTokens": 234,
        "completionTokens": 567,
        "totalTokens": 801
      },
      "costEstimate": 0.00367,
      "duration": 2345,
      "citationCount": 5
    },
    "cost": 0.00367,
    "executedAt": "2026-02-15T21:30:00.000Z"
  },
  "success": true
}
```

---

## Integration Test Script

Create a simple Node.js test script:

```javascript
// test-providers.js
import { getProviderAdapter } from './server/providers/index.js';

async function testProvider(provider, model) {
  console.log(`\n=== Testing ${provider} (${model}) ===`);
  
  try {
    const adapter = getProviderAdapter(provider, model);
    const response = await adapter.runPrompt(
      "What are the best CRM tools for small businesses?",
      {
        brandNames: ["HubSpot"],
        competitorNames: ["Salesforce", "Pipedrive"]
      }
    );
    
    console.log("✅ Success!");
    console.log(`- Response length: ${response.rawText.length} chars`);
    console.log(`- Citations found: ${response.citations?.length || 0}`);
    console.log(`- Tokens used: ${response.usage?.totalTokens || 'N/A'}`);
    console.log(`- Cost: $${response.costEstimate?.toFixed(5) || 'N/A'}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run tests
async function runTests() {
  // Test each provider if API key is set
  if (process.env.OPENAI_API_KEY) {
    await testProvider("openai", "gpt-4o-mini");
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    await testProvider("anthropic", "claude-3-5-haiku-20241022");
  }
  
  if (process.env.PERPLEXITY_API_KEY) {
    await testProvider("perplexity", "llama-3.1-sonar-small-128k-online");
  }
  
  if (process.env.GOOGLE_AI_API_KEY) {
    await testProvider("gemini", "gemini-2.0-flash");
  }
}

runTests().catch(console.error);
```

Run with:
```bash
tsx test-providers.js
```

---

## Database Verification

Check that records are created correctly:

```sql
-- View recent prompt runs
SELECT 
  id,
  provider,
  model,
  cost,
  (response_metadata->>'costEstimate')::numeric as cost_estimate,
  executed_at
FROM prompt_runs
ORDER BY executed_at DESC
LIMIT 10;

-- View citations by provider
SELECT 
  pr.provider,
  COUNT(c.id) as citation_count,
  COUNT(DISTINCT c.domain) as unique_domains
FROM citations c
JOIN prompt_runs pr ON c.prompt_run_id = pr.id
GROUP BY pr.provider;

-- View average costs by provider
SELECT 
  provider,
  model,
  COUNT(*) as run_count,
  AVG(cost) as avg_cost,
  SUM(cost) as total_cost
FROM prompt_runs
WHERE cost IS NOT NULL
GROUP BY provider, model
ORDER BY provider, avg_cost;
```

---

## Troubleshooting

### Issue: "Unsupported provider: X"
**Cause:** Provider name doesn't match enum  
**Fix:** Use exact names: `openai`, `anthropic`, `perplexity`, `gemini`

### Issue: API key error despite setting env var
**Cause:** Environment variable not loaded  
**Fix:** Restart server after setting env vars, or use `.env` file

### Issue: TypeScript errors
**Cause:** Types not matching  
**Fix:** Run `npm install` and verify all packages installed

### Issue: No citations extracted
**Cause:** Response doesn't contain URLs  
**Fix:** Normal for some responses. Try different prompts that ask for sources.

### Issue: Cost is null or 0
**Cause:** Usage metadata not returned by provider  
**Fix:** Check if provider's API includes usage in response. Gemini 2.0 Flash should include this.

---

## Production Checklist

Before deploying to production with new providers:

- [ ] Set all desired API keys in production environment
- [ ] Test each provider with real prompts
- [ ] Verify cost tracking is accurate
- [ ] Check citation extraction works
- [ ] Confirm brand/competitor extraction functions correctly
- [ ] Test error handling (remove API key temporarily and verify graceful failure)
- [ ] Monitor first few runs for each provider
- [ ] Set up alerts for unexpected costs
- [ ] Document which provider to use when (pricing, features, speed)

---

**Last Updated:** February 15, 2026
