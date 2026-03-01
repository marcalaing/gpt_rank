# Phase 2: Dashboard Redesign Brief

## Goal
Transform the dashboard from a basic stats page into an analytics-first command center with actionable project cards.

## Current Dashboard (`client/src/pages/dashboard.tsx`, 227 lines)

**Current layout:**
1. Stats cards (4): Total Projects, Total Prompts, Prompt Runs, Citations Found
2. Recent Prompt Runs table
3. Quick Actions card

**Current backend endpoint:** `GET /api/dashboard/stats`
Returns: `{ totalProjects, totalPrompts, totalRuns, totalCitations, recentRuns[] }`

## New Dashboard Layout (Top to Bottom)

### 1. **Analytics Snapshot Hero** (top section)
- **Overall Visibility Score** (big number, 0-100, color-coded)
  - Aggregated across all projects
  - Sparkline trend (last 30 days)
- **Brand Mention Rate** (percentage across all projects)
- **Active Projects** count
- **Active Prompts** count

### 2. **Project Cards Grid** (replaces "View Projects" button)
- Grid of project cards (3-4 per row on desktop)
- Each card shows:
  - Project name
  - Domain (small text below name)
  - **Current visibility score** (large, color-coded: green ≥70, yellow 40-69, red <40)
  - Trend indicator (↑/↓/− vs last week/month)
  - Last run timestamp
  - "Run All Prompts" quick action button (or "View" if no prompts)
- Click card → navigate to `/app/projects/:id`
- **"+ Create Project"** card at end

### 3. **Recent Activity** (2-column grid on desktop, stack on mobile)

**Left: Recent Prompts (last 3 runs across all projects)**
- Compact cards showing:
  - Prompt text (truncated to ~60 chars)
  - Project name
  - Score badge
  - Provider icon/name
  - Timestamp
- Link to full run details

**Right: Alerts**
- Recent alert events (last 5)
- Show: type, message, timestamp
- "No alerts" placeholder if empty
- Link to alerts page

### 4. **Usage & Budget Bar** (bottom section, optional)
- Current month API spend (if tracked)
- Budget utilization bar (if budgets set)
- Subscription tier badge

---

## Backend Changes

### Update `GET /api/dashboard/stats` endpoint (`server/routes.ts`)

**New response schema:**
```typescript
{
  // Aggregate metrics
  overallVisibilityScore: number;        // avg across all projects
  scoreTrend: { date: string; score: number }[];  // last 30 days
  brandMentionRate: number;              // percentage
  activeProjects: number;
  activePrompts: number;
  
  // Per-project summaries
  projects: {
    id: string;
    name: string;
    domain: string | null;
    currentScore: number | null;         // latest avg visibility
    scoreDelta: number | null;           // vs previous period
    lastRunAt: string | null;
    promptCount: number;
  }[];
  
  // Recent activity
  recentRuns: {
    id: string;
    promptId: string;
    promptName: string;
    projectId: string;
    projectName: string;
    provider: string;
    score: number;
    executedAt: string;
  }[];  // last 3 runs across all projects
  
  // Alerts
  recentAlerts: {
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }[];  // last 5 alerts
  
  // Usage (optional, return null if not available)
  usage: {
    currentMonthSpend: number;
    budgetLimit: number | null;
    subscriptionTier: string;
  } | null;
}
```

**Implementation notes:**
- Get all user projects
- For each project, calculate latest avg visibility score from recent runs
- Calculate score delta (compare last 7 days vs previous 7 days)
- Get recent prompt runs (limit 3, across all projects, order by executedAt desc)
- Get recent alert events (limit 5, order by createdAt desc)
- Calculate overall metrics by aggregating project data

---

## Frontend Changes

### Rewrite `client/src/pages/dashboard.tsx`

**Use existing components:**
- Card, CardHeader, CardTitle, CardDescription, CardContent (from shadcn/ui)
- Badge (for scores, tiers)
- Button
- Skeleton (for loading states)
- Recharts: ResponsiveContainer, LineChart, Line (for sparkline)

**Icons:**
- TrendingUp, TrendingDown, Minus (for trend arrows)
- BarChart3, Target, FolderKanban, Zap, AlertCircle
- ArrowRight (for "View" links)

**Layout structure:**
1. Hero section with 4 stat cards (use existing StatCard component pattern)
2. Projects grid (responsive: 1 col mobile, 2 col tablet, 3-4 col desktop)
3. Two-column grid for Recent Activity (stack on mobile)
4. Usage bar at bottom (conditional render if data available)

**Key behaviors:**
- Project cards clickable → navigate via `<Link href={/app/projects/${id}}>`
- "Run All" button → triggers mutation to run all prompts for that project
- Loading states for all sections
- Empty states ("No projects yet", "No recent runs", "No alerts")

---

## Constraints

- **Budget:** Keep under $3 in inference costs
- **No sub-agents**
- **TypeScript:** Must compile (`npm run check`)
- **Existing data:** Work with current DB schema (projects have domain/synonyms now)
- **Don't break:** Login, project detail, analytics pages should stay functional

---

## Steps

1. Read current `dashboard.tsx` to understand structure
2. Read current `/api/dashboard/stats` endpoint in `server/routes.ts`
3. Update backend endpoint to return new schema
4. Rewrite frontend dashboard.tsx with new layout
5. Run `npm run check`
6. Commit: "Phase 2: Dashboard redesign - analytics-first layout"
7. Report changes

---

## Example Project Card Component

```tsx
<Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/app/projects/${project.id}`)}>
  <CardHeader className="pb-3">
    <CardTitle className="text-lg flex items-center justify-between">
      <span>{project.name}</span>
      {project.currentScore !== null && (
        <Badge variant={project.currentScore >= 70 ? "default" : project.currentScore >= 40 ? "secondary" : "destructive"}>
          {project.currentScore}
        </Badge>
      )}
    </CardTitle>
    {project.domain && (
      <CardDescription className="text-xs truncate">{project.domain}</CardDescription>
    )}
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-1 text-muted-foreground">
        {project.scoreDelta > 0 && <TrendingUp className="h-3 w-3 text-green-500" />}
        {project.scoreDelta < 0 && <TrendingDown className="h-3 w-3 text-red-500" />}
        {project.scoreDelta === 0 && <Minus className="h-3 w-3" />}
        <span>{project.promptCount} prompts</span>
      </div>
      {project.lastRunAt && (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(project.lastRunAt))} ago
        </span>
      )}
    </div>
  </CardContent>
</Card>
```
