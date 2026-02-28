# Sprint 1 Engineering Brief — GPTRank v2

## Mission
Transform GPTRank from a manual-setup tool into a frictionless, domain-first experience. Three pillars: (1) one-input free visibility checker, (2) Google OAuth, (3) flatten project/brand hierarchy.

## Repository
`/data/.openclaw/workspace/gpt_rank`

## Architecture
- **Frontend:** React + Vite + Tailwind + shadcn/ui (`client/src/`)
- **Backend:** Express + Drizzle ORM + PostgreSQL (`server/`)
- **Schema:** `shared/schema.ts` (Drizzle + Zod)
- **Deploy:** Railway (backend + DB), will deploy to Vercel later (frontend)
- **Key env vars on Railway:** DATABASE_URL, SESSION_SECRET, AI_INTEGRATIONS_OPENAI_API_KEY

## Key Files (line counts)
- `shared/schema.ts` (342) — DB schema, all tables
- `server/routes.ts` (1890) — all API routes
- `server/storage.ts` (664) — DB queries
- `server/services/brand-onboarding.ts` (174) — domain lookup + query gen (ALREADY EXISTS)
- `client/src/pages/landing.tsx` (647) — landing page with free search
- `client/src/pages/login.tsx` (195) — auth page
- `client/src/pages/dashboard.tsx` (227) — project list
- `client/src/pages/project-detail.tsx` (1481) — main project view
- `client/src/pages/project-overview.tsx` (700) — project overview tab
- `client/src/pages/analytics.tsx` (259) — analytics page
- `server/services/prompt-runner.ts` — runs prompts against AI providers
- `server/providers/` — OpenAI, Claude, Gemini, Perplexity adapters

## Current State
- App is live at https://gptrank-production.up.railway.app/
- Auth works (email/password registration + login)
- Projects → Brands → Competitors → Prompts hierarchy
- Free search on landing requires: brand name + prompt + optional domain (3 inputs)
- brand-onboarding.ts already uses gpt-4o-mini to understand a brand from name+domain and generate 5 queries
- AI search features work (OpenAI key is set)

---

## Phase 1: Free Visibility Checker Revamp (HIGHEST PRIORITY)

### Goal
User enters ONLY their domain (e.g., "mondou.com"). We do everything else automatically and show them instant, actionable results.

### Backend Changes

1. **New endpoint: `POST /api/free-visibility-check`**
   - Input: `{ domain: string }` (just the domain)
   - Flow:
     a. Scrape/fetch the domain's homepage (use fetch + cheerio or just title/meta tags) to extract: brand name, description, industry keywords
     b. Call existing `brand-onboarding.ts` → `understandBrand()` with extracted info
     c. Generate 3-5 prompts via `generateQueries()` (already exists)
     d. Run prompts against ChatGPT ONLY (gpt-4o-mini for free tier — cheapest)
     e. Score and return results
   - Response: visibility score, brand analysis, per-prompt results with scores, competitor mentions, citations
   - **Cost control:** Rate limit to 3 checks per IP per day. Cache results by domain for 24h. Use gpt-4o-mini only.
   - Keep the existing `/api/free-search` endpoint working for backward compat

2. **Domain scraping service** (`server/services/domain-scraper.ts`)
   - Fetch homepage HTML, extract: `<title>`, meta description, OG tags, H1s
   - Timeout: 5 seconds max
   - Fallback: if scrape fails, just use the domain name as brand name
   - NO heavy dependencies — use built-in fetch + regex or a lightweight HTML parser

### Frontend Changes

3. **Landing page (`landing.tsx`) — Simplify free checker**
   - Replace 3-input form with SINGLE input: domain field
   - Big, bold CTA: "Check Your AI Visibility — Free"
   - Placeholder: "Enter your website (e.g., mondou.com)"
   - Show loading state with progress: "Analyzing your website..." → "Generating search queries..." → "Checking AI models..."
   - Results display:
     - Overall visibility score (big number)
     - Brand summary (what we detected)
     - Per-prompt breakdown: query, whether brand was mentioned, score, key competitors found
     - CTA: "Sign up to track this over time, add more prompts, and monitor competitors"
   - The results should be compelling enough to drive signup

### Cost Estimate
- Per free check: ~2 gpt-4o-mini calls (brand understanding + query gen) + 3-5 gpt-4o-mini calls (prompt runs) ≈ 7 calls
- gpt-4o-mini cost: ~$0.15/1M input, $0.60/1M output → each check costs ~$0.001-0.003
- With 3/day/IP rate limit and 24h caching, very manageable

---

## Phase 2: Google OAuth

### Goal
Replace email/password with Google Sign-In as the primary (and initially only) auth method. Capture email for future campaigns.

### Backend Changes

4. **Add Google OAuth to `server/routes.ts`**
   - Use `passport-google-oauth20` or similar
   - Endpoints: `GET /api/auth/google` (redirect), `GET /api/auth/google/callback`
   - On first login: create user + organization automatically (org name = user's name + "'s Workspace")
   - On returning login: match by email, create session
   - Store Google profile ID in users table for matching
   - **Schema change:** Add `googleId` column to users table, make `password` nullable (Google users won't have one)

5. **Environment variables needed:**
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — Marc will need to set up a Google Cloud project
   - `GOOGLE_CALLBACK_URL` — the OAuth redirect URI

### Frontend Changes

6. **Login page (`login.tsx`)**
   - Big "Sign in with Google" button (primary CTA)
   - Keep email/password as secondary option (small link: "or sign in with email")
   - Logo should link back to `/` (home page) — currently doesn't
   - After Google auth, redirect to dashboard

---

## Phase 3: Flatten Project/Brand Hierarchy

### Goal
Remove the Project → Brand indirection. A "project" IS a brand. When you create a project, you're creating a brand tracking entity.

### Schema Changes

7. **Merge brands into projects:**
   - Add to `projects` table: `domain`, `synonyms` (from brands table)
   - The project name IS the brand name
   - Remove `brands` table (or deprecate — mark unused)
   - Update all references: scores, routes, storage queries

8. **Update storage.ts and routes.ts:**
   - Remove brand CRUD endpoints
   - Update project creation to accept domain + synonyms
   - Update scoring logic to use project directly instead of looking up brand
   - Update all frontend pages that reference brands

### Frontend Changes

9. **Dashboard (`dashboard.tsx`):**
   - Project list = brand list
   - Each card shows: brand name, domain, latest visibility score, trend arrow
   
10. **Project detail (`project-detail.tsx`):**
    - Remove "Brands" tab/section
    - Competitors remain as a separate concept (they're OTHER brands you're tracking)

---

## Technical Constraints

- **Budget:** Keep API costs under $5 for this sprint
- **Model:** Use Sonnet. Do NOT spawn sub-agents unless truly necessary — handle everything directly
- **Testing:** Test locally before any Railway deploy. Run `npm run dev` or equivalent
- **Database migrations:** Use Drizzle's `drizzle-kit push` for schema changes. Be careful — this is a production DB
- **Git:** Commit after each phase. Push to main branch
- **Don't break existing functionality** — the app is live

## Priority Order
1. Phase 1 (Free Checker) — this drives signups
2. Phase 3 (Flatten hierarchy) — simplifies everything for Phase 2 and beyond
3. Phase 2 (Google OAuth) — needs Marc to set up Google Cloud credentials, so prep the code but it may not be fully testable

## Environment
- Node.js v22, TypeScript
- Railway Postgres DB (connection via DATABASE_URL)
- GitHub repo: https://github.com/marcalaing/gpt_rank
- GITHUB_TOKEN is available in env for pushing
