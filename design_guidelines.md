# GPT Rank - AI Visibility Analytics Design Guidelines

## Design Approach

**Selected Approach:** Design System (Linear + Vercel Analytics inspired)  
**Rationale:** This is a data-heavy analytics platform requiring clarity, efficiency, and sophisticated data visualization. Drawing from Linear's clean dashboard aesthetics and Vercel's data presentation approach ensures users can quickly parse metrics and insights.

## Core Design Elements

### Typography
- **Primary Font:** Inter (Google Fonts) - exceptional readability for data tables
- **Headings:** 600 weight, sizes: text-3xl (page titles), text-xl (section headers), text-lg (card titles)
- **Body:** 400 weight, text-sm for dense data, text-base for descriptions
- **Monospace:** JetBrains Mono for API responses, citation URLs, technical data

### Layout System
**Spacing Primitives:** Tailwind units 2, 4, 6, 8, 12, 16
- Component padding: p-6 (cards), p-8 (page containers)
- Section gaps: gap-6 (grids), gap-4 (lists), space-y-8 (page sections)
- Consistent rhythm: mb-4 for labels, mb-8 for section breaks

### Component Library

**Navigation:**
- **Sidebar:** Fixed left sidebar (w-64), organization switcher at top, nested project navigation, bottom user profile
- **Top Bar:** Breadcrumb navigation, global search, notification bell, user avatar

**Dashboard Components:**
- **Stat Cards:** Grid layout (3-4 columns desktop, 1-2 mobile), large number display with trend indicators (↑↓), sparkline charts
- **Data Tables:** Sticky headers, row hover states, sortable columns, pagination, inline actions, expandable rows for citation details
- **Charts:** Time-series line charts (visibility trends), stacked bar charts (provider comparison), radar charts (competitor analysis)
- **Citation Cards:** Compact cards showing source, snippet preview, provider badge, rank position

**Forms:**
- **Prompt Setup:** Multi-step wizard with progress indicator, syntax-highlighted prompt editor, provider selection checkboxes, schedule configuration
- **Brand/Competitor Management:** Inline editing tables, quick-add forms, bulk actions

**Project Views:**
- **Project Dashboard:** Hero metrics section (3 key stats), trend chart full-width, recent results table, competitor comparison section
- **Results Detail:** Split view - left: AI response display (formatted text), right: citation/source breakdown, provider metadata panel

**Data Visualization:**
- Clean, minimalist chart styling
- Subtle grid lines, bold data lines
- Tooltips on hover with precise values
- Time range selectors (7d, 30d, 90d, custom)
- Export functionality buttons

### Responsive Strategy
- **Desktop (lg:):** Full sidebar + multi-column dashboards
- **Tablet (md:):** Collapsible sidebar, 2-column layouts
- **Mobile:** Hidden sidebar (hamburger menu), stacked single-column

### Micro-interactions
- Smooth sidebar collapse/expand
- Table row expansion animations
- Chart data point hover highlights
- Loading skeletons for data fetches
- Toast notifications for background job completions

## Images

**Marketing/Landing Page Only:**
- **Hero Image:** Large dashboard screenshot mockup showing the analytics interface in action (charts, tables, insights). Position: Hero section background with gradient overlay for text legibility
- **Feature Sections:** Screenshots of specific features (prompt editor, competitor tracking, citation analysis) as inline illustrations
- **No images in the application dashboard** - focus on data clarity

## Key Principles
1. **Data First:** Every pixel serves the purpose of surfacing insights quickly
2. **Scanning Efficiency:** Clear visual hierarchy allows rapid information extraction
3. **Professional Polish:** Clean, modern aesthetic that builds trust with marketing teams
4. **Contextual Depth:** Expandable/collapsible sections for progressive disclosure
5. **Action-Oriented:** Every view has clear next steps (run prompt, compare competitors, export data)