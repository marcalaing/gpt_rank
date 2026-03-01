# Sprint 2A Engineering Brief — GPTRank Dashboard Rework

## Mission
Two goals: (1) Flatten the Project/Brand hierarchy so Project = Brand, and (2) Redesign the dashboard to show analytics-first with actionable sections.

## Repository
`/data/.openclaw/workspace/gpt_rank`

## Architecture
- **Frontend:** React + Vite + Tailwind + shadcn/ui + Recharts (`client/src/`)
- **Backend:** Express + Drizzle ORM + PostgreSQL (`server/`)
- **Schema:** `shared/schema.ts` (Drizzle + Zod)
- **Deploy:** Railway (auto-deploys from GitHub push)
- **Public DB URL:** `postgresql://postgres:bFeSsesFwHKnKrGhGcitBlCwxmOJqsTL@hopper.proxy.rlwy.net:45730/railway`

## Key Files
- `shared/schema.ts` (344) — DB schema
- `server/routes.ts` (2157) — all API routes  
- `server/storage.ts` (676) — DB queries
- `client/src/pages/dashboard.tsx` (227) — main dashboard
- `client/src/pages/project-detail.tsx` (1481) — project view with tabs
- `client/src/pages/project-overview.tsx` (700) — analytics/overview tab
- `client/src/pages/analytics.tsx` (259) — standalone analytics page
- `client/src/components/app-sidebar.tsx` (161) — navigation sidebar
- `client/src/pages/projects.tsx` — project list
- `client/src/pages/login.tsx` (195) — auth page (logo should link to `/`)

## Current Data Model
```
Organization → Projects → Brands (1:many)
                       → Competitors (1:many)
                       → Prompts (1:many) → PromptRuns → Scores, Citations
```

The `brands` table has: id, name, domain, synonyms, projectId
The `projects` table has: id, name, description, organizationId, budget fields

## Phase 1: Flatten Project/Brand Hierarchy

### Goal
A project IS a brand. Remove the extra indirection.

### Database Changes
1. Add columns to `projects` table:
   - `domain` (text, nullable)
   - `synonyms` (text array, nullable)
   
2. Migrate existing data:
   - For each project, find its first/primary brand
   - Copy brand's `domain` and `synonyms` to the project
   - If a project has multiple brands, keep the first one (this is unlikely given our usage)

3. Update schema.ts:
   - Add `domain` and `synonyms` fields to `projects` table definition
   - Update `insertProjectSchema` to include domain/synonyms
   - Keep the `brands` table definition for now (don't drop it) but remove the relation from `projectsRelations`

### Backend Changes
4. **`server/storage.ts`:**
   - Remove brand CRUD methods (createBrand, getBrandsByProject, updateBrand, deleteBrand)
   - Update project creation to accept domain + synonyms
   - Update any scoring/analytics logic that looks up brands — use project.name and project.domain instead

5. **`server/routes.ts`:**
   - Remove brand-related endpoints (POST/GET/PUT/DELETE /api/projects/:id/brands/*)
   - Update project creation endpoint to accept domain, synonyms
   - Update the free-visibility-check endpoint and brand-onboarding flow to create projects directly (no brand sub-entity)
   - Update scoring/analytics endpoints that reference brands — use project fields instead
   - Update the metrics endpoint to use project.name for brand mentions instead of looking up brands

6. **`server/services/brand-onboarding.ts`:**
   - Keep as-is (it returns brand insight + queries, doesn't touch DB)

### Frontend Changes
7. **Project creation flow:**
   - When creating a project, ask for: brand name (= project name), domain, optional synonyms
   - Remove any "Add Brand" UI within projects

8. **`project-detail.tsx`:**
   - Remove "Brands" tab/section entirely
   - Competitors remain (they're external entities you're tracking)

9. **`projects.tsx` (project list):**
   - Show domain next to project name
   - Show latest visibility score if available

### Migration Script
```sql
-- Add columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS synonyms TEXT[];

-- Migrate data from first brand per project
UPDATE projects p SET 
  domain = b.domain,
  synonyms = b.synonyms
FROM (
  SELECT DISTINCT ON (project_id) project_id, domain, synonyms 
  FROM brands 
  ORDER BY project_id, created_at ASC
) b
WHERE p.id = b.project_id;
```

Run this via drizzle-kit push after updating schema.ts, then manually run the data migration SQL.

---

## Phase 2: Dashboard Redesign

### Goal
The dashboard should show a snapshot of analytics FIRST, then actionable sections. Currently it's just stats + recent runs + quick actions.

### New Dashboard Layout (top to bottom):

**1. Analytics Snapshot (hero section)**
- Overall visibility score across all projects (big number, color-coded)
- Score trend sparkline (last 30 days)
- Brand mention rate across all projects
- Number of active prompts / projects

**2. Project Cards (replaces "View Projects" button)**
- Grid of project cards, each showing:
  - Project name + domain
  - Current visibility score (color-coded)
  - Trend arrow (up/down/flat vs last period)
  - Last run date
  - Quick "Run All" button
- Link to project detail on click
- "Create New Project" card at the end

**3. Recent Prompts (last 3 runs across all projects)**
- Compact list showing: prompt text (truncated), project name, score, provider, date
- Link to full details

**4. Alerts Section**
- Recent alert events (if any)
- "No alerts" placeholder if empty

**5. Usage & Budget**
- Current month API usage across all projects
- Budget utilization bar if budgets are set
- Subscription tier badge

### Backend Changes
10. **Update `/api/dashboard/stats` endpoint:**
    - Return: aggregate visibility score, score trend (last 30 days), mention rate, per-project summaries with scores
    - Include recent alerts
    - Include usage/budget info

### Frontend Changes  
11. **Rewrite `dashboard.tsx`:**
    - Implement the new layout as described above
    - Use Recharts sparkline for the trend
    - Project cards should be clickable, linking to `/app/projects/:id`

### Sidebar Updates
12. **`app-sidebar.tsx`:**
    - Analytics should be a top-level nav item (already is ✓)
    - Competitors should be accessible from within project detail (already is via tabs)
    - Add "Alerts" to the main nav if not present
    - Remove "Discover" from main nav → it should be accessible from within projects (prompt discovery)

### Small Fixes
13. **Login page (`login.tsx`):** Logo/brand should link back to `/` (homepage)
14. **Sign-in page:** "Sign in with Google" should be the primary button, email/password secondary

---

## Technical Constraints

- **Budget:** Keep inference costs under $5
- **Model:** Use Sonnet. Do NOT spawn sub-agents.
- **Database:** Use the public DATABASE_URL for migrations: `postgresql://postgres:bFeSsesFwHKnKrGhGcitBlCwxmOJqsTL@hopper.proxy.rlwy.net:45730/railway`
- **Migrations:** After updating schema.ts, run `DATABASE_URL="postgresql://postgres:bFeSsesFwHKnKrGhGcitBlCwxmOJqsTL@hopper.proxy.rlwy.net:45730/railway" npx drizzle-kit push --force` then run the data migration SQL via psql or a script
- **Git:** Commit after each phase. Push to GitHub after both phases.
- **GitHub:** Extract token from `/data/.openclaw/.env` — the GITHUB_TOKEN line has a comment after it, extract only the token (before any whitespace/`#`)
- **Testing:** Run `npm run check` (TypeScript) before committing. Test locally if possible.
- **Don't break existing functionality** — the free visibility checker and Google OAuth must keep working

## Priority Order
1. Phase 1 (Flatten hierarchy) — structural change everything depends on
2. Phase 2 (Dashboard redesign) — the user-facing payoff

## Deliverables
After completing, report:
- What was built per phase
- Commits pushed
- DB migration status
- Any blockers
- Test results
