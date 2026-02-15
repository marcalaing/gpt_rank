# GPT Rank - AI Visibility Analytics SaaS

## Overview
An AI visibility analytics platform for marketing teams to track brand representation across AI search systems (ChatGPT, Perplexity, Claude, Gemini, etc.). Set up prompts, track visibility trends, monitor competitors, and analyze citations/sources influencing AI answers.

## Architecture

### Tech Stack
- **Frontend:** React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Session-based with bcrypt password hashing
- **Build:** Vite

### Multi-Tenant Structure
```
Users → Organizations → Projects
                            ├── Brands (with synonyms)
                            ├── Competitors (with synonyms)
                            └── Prompts → PromptRuns → Citations
                                                └── Scores
```

### Job Queue
DB-backed job queue (`job_queue` table) with manual trigger via admin page.
Jobs track: prompt runs, provider queries, citation extraction, score calculation.

## Project Structure
```
├── client/src/
│   ├── components/     # React components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── app-layout.tsx
│   │   ├── app-sidebar.tsx
│   │   └── theme-toggle.tsx
│   ├── pages/          # Route pages
│   │   ├── login.tsx
│   │   ├── landing.tsx
│   │   ├── pricing.tsx
│   │   ├── affiliates.tsx
│   │   ├── dashboard.tsx
│   │   ├── projects.tsx
│   │   ├── project-detail.tsx
│   │   ├── analytics.tsx
│   │   └── admin.tsx
│   ├── lib/            # Utilities
│   └── hooks/          # Custom hooks
├── server/
│   ├── index.ts        # Entry point
│   ├── routes.ts       # API routes
│   ├── storage.ts      # Database operations
│   └── db.ts           # Database connection
├── shared/
│   └── schema.ts       # Drizzle schema + types
└── design_guidelines.md
```

## Stripe Billing Integration
- 3 subscription tiers: Free, Pro ($29/mo), Max ($79/mo)
- Tier limits enforced: projects, prompts/project, runs/month
- Stripe webhook handles subscription sync to organization records
- Customer portal for subscription management
- Billing UI at `/app/billing`

### Tier Limits
| Tier (Display) | DB Key | Projects | Prompts/Project | Runs/Month |
|----------------|--------|----------|-----------------|------------|
| Free | free | 1 | 5 | 50 |
| Pro ($29) | starter | 3 | 20 | 500 |
| Max ($79) | pro | 10 | 100 | 2,500 |

Note: Database uses legacy tier keys (free, starter, pro, enterprise) for backwards compatibility.
Display names on frontend: Free, Pro, Max.

## API Routes

### Auth
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Billing
- `GET /api/billing/plans` - List available plans
- `GET /api/billing/subscription` - Get current subscription
- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/portal` - Create customer portal session
- `POST /api/stripe/webhook` - Stripe webhook handler

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `DELETE /api/projects/:id` - Delete project

### Project Resources
- `GET /api/projects/:id/brands` - List brands
- `POST /api/projects/:id/brands` - Create brand
- `GET /api/projects/:id/competitors` - List competitors
- `POST /api/projects/:id/competitors` - Create competitor
- `GET /api/projects/:id/prompts` - List prompts
- `POST /api/projects/:id/prompts` - Create prompt

### Free Search
- `POST /api/free-search` - Run free brand visibility search (public)

### Admin
- `GET /api/admin/jobs` - List jobs
- `GET /api/admin/jobs/stats` - Job statistics
- `POST /api/admin/jobs/process` - Process pending jobs
- `POST /api/admin/seed` - Seed sample data

### Health
- `GET /api/health` - Health check

## Running Locally

### Development
```bash
npm run dev
```
This starts the Express server on port 5000 with Vite middleware for the frontend.

### Database
```bash
npm run db:push  # Push schema changes
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption secret

## Key Features
1. **Multi-tenant:** Users belong to organizations, organizations have projects
2. **Prompt Tracking:** Create prompts, run them against AI providers, store results
3. **Citation Extraction:** Parse AI responses for source citations (regex + LLM-based)
4. **Score System:** Calculate visibility scores for brands across AI platforms
5. **Job Queue:** DB-backed queue for background processing
6. **Admin Panel:** Manual job triggering and seed data creation
7. **Free Search:** Public landing page with free brand visibility check
8. **Stripe Billing:** Subscription tiers with tier limit enforcement (projects, prompts, runs/month)
9. **Structured Logging:** JSON-formatted logs with error tracking
10. **LLM Templates:** Answer and extraction prompts with strict JSON schema

## LLM Templates

### Answer Template
System prompt instructs the model to:
- Answer concisely but thoroughly
- Mention specific brand/company names when relevant
- Include sources as a bulleted list of URLs

### Extraction Template
Used for structured data extraction from AI responses:
- Output: `{ brandMentioned, brandMentionCount, competitorMentions[], topics[], sentiment, citedUrls[] }`
- Falls back to regex extraction if JSON parsing fails

## Testing

Run extraction tests:
```bash
npx tsx server/tests/extraction.test.ts
```

## Design System
- Font: Inter (sans), JetBrains Mono (code)
- Color scheme: Blue primary (217 91% 35%), neutral grays
- Dark mode support via class toggle
- Linear + Vercel Analytics inspired design
