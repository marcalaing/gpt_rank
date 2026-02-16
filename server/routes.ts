import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { registerSchema, loginSchema, insertProjectSchema, insertBrandSchema, insertCompetitorSchema, insertPromptSchema, freeSearchSchema, insertAlertRuleSchema } from "@shared/schema";
import { z } from "zod";
import { isStripeAvailable } from "./stripeStatus";
import { getTierLimits } from "./webhookHandlers";

const budgetUpdateSchema = z.object({
  monthlyBudgetSoft: z.number().min(0).optional().nullable(),
  monthlyBudgetHard: z.number().min(0).optional().nullable(),
});

// Session type augmentation
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Helper to verify project belongs to user's organization
async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const orgs = await storage.getOrganizationsByUser(userId);
  if (orgs.length === 0) return false;
  
  const project = await storage.getProject(projectId);
  if (!project) return false;
  
  return orgs.some(org => org.id === project.organizationId);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Validate SESSION_SECRET in production
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in production');
  }

  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "gpt-rank-secret-key-dev-only",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Free brand visibility search (public endpoint) - Uses real AI
  app.post("/api/free-search", async (req, res) => {
    try {
      const data = freeSearchSchema.parse(req.body);
      const { brandName, prompt, domain } = data;
      
      // Import OpenAI client
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      // Build system prompt for AI
      const systemPrompt = `You are a knowledgeable assistant. Answer the user's question thoroughly but concisely. 
When mentioning brands, companies, or products, be specific and name them explicitly.
If you know of relevant sources or websites, include them as citations at the end of your response.`;
      
      // Query AI with the user's prompt
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
      
      const aiResponse = completion.choices[0]?.message?.content || "";
      
      // Analyze response for brand mentions
      const brandLower = brandName.toLowerCase();
      const brandSynonyms = domain ? [brandName, domain.replace(/\.(com|ca|org|net)$/i, '')] : [brandName];
      
      // Check if brand is mentioned
      let brandMentionCount = 0;
      for (const synonym of brandSynonyms) {
        const regex = new RegExp(synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = aiResponse.match(regex);
        if (matches) brandMentionCount += matches.length;
      }
      const brandMentioned = brandMentionCount > 0;
      
      // Extract URLs from response
      const urlRegex = /https?:\/\/[^\s\)>\]"']+/gi;
      const urls = aiResponse.match(urlRegex) || [];
      const citedDomains: { domain: string; count: number }[] = [];
      const domainMap = new Map<string, number>();
      
      for (const url of urls) {
        try {
          const parsed = new URL(url.replace(/[.,;:!?]+$/, ''));
          const d = parsed.hostname.replace(/^www\./, '');
          domainMap.set(d, (domainMap.get(d) || 0) + 1);
        } catch {}
      }
      domainMap.forEach((count, domain) => citedDomains.push({ domain, count }));
      
      // Extract other brand/company mentions
      const companyPatterns = [
        /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Inc|LLC|Ltd|Corp|Company|Co)\b/g,
        /\b([A-Z][a-zA-Z]{2,})\b/g,
      ];
      
      const competitorMentions: { name: string; count: number }[] = [];
      const mentionMap = new Map<string, number>();
      
      for (const pattern of companyPatterns) {
        const matches = Array.from(aiResponse.matchAll(pattern));
        for (const match of matches) {
          const name = match[1] || match[0];
          if (name.length >= 3 && !brandSynonyms.some(s => s.toLowerCase() === name.toLowerCase())) {
            mentionMap.set(name, (mentionMap.get(name) || 0) + 1);
          }
        }
      }
      
      // Get top competitor mentions (excluding common words)
      const commonWords = new Set(['The', 'And', 'For', 'With', 'From', 'That', 'This', 'They', 'When', 'What', 'How', 'Why', 'Can', 'Will', 'May', 'Are', 'Has', 'Have', 'Its', 'Not', 'But']);
      mentionMap.forEach((count, name) => {
        if (count >= 1 && !commonWords.has(name)) {
          competitorMentions.push({ name, count });
        }
      });
      competitorMentions.sort((a, b) => b.count - a.count);
      
      // Determine sentiment (simplified)
      const positiveWords = ['best', 'excellent', 'great', 'recommend', 'top', 'leading', 'popular', 'quality', 'trusted'];
      const negativeWords = ['worst', 'poor', 'avoid', 'issue', 'problem', 'bad', 'limited'];
      
      let positiveScore = 0;
      let negativeScore = 0;
      const responseLower = aiResponse.toLowerCase();
      
      positiveWords.forEach(w => { if (responseLower.includes(w)) positiveScore++; });
      negativeWords.forEach(w => { if (responseLower.includes(w)) negativeScore++; });
      
      const sentiment = positiveScore > negativeScore ? "positive" : negativeScore > positiveScore ? "negative" : "neutral";
      
      // Calculate visibility score (0-100)
      // Based on: brand mentioned, position in response, sentiment, citation of brand domain
      let score = 0;
      
      if (brandMentioned) {
        score += 40; // Base score for being mentioned
        score += Math.min(brandMentionCount * 10, 30); // Up to 30 points for multiple mentions
        if (sentiment === "positive") score += 15;
        else if (sentiment === "neutral") score += 5;
        
        // Bonus if brand's domain is cited
        if (domain && citedDomains.some(d => d.domain.includes(domain.replace(/^www\./, '')))) {
          score += 15;
        }
      }
      
      score = Math.min(100, Math.max(0, score));
      
      // Only return the provider we actually queried
      const provider = {
        name: "ChatGPT",
        model: "gpt-4o-mini",
        mentioned: brandMentioned,
        sentiment,
        mentionCount: brandMentionCount,
      };
      
      // Generate summary
      const summary = !brandMentioned
        ? `${brandName} was not mentioned in the AI response for this query. This may indicate low visibility for this specific topic.`
        : brandMentionCount > 2
          ? `Great visibility! ${brandName} was mentioned ${brandMentionCount} times with ${sentiment} sentiment. The AI recognizes your brand in this context.`
          : `${brandName} was mentioned ${brandMentionCount} time(s). There's potential to improve visibility for this query.`;
      
      res.json({
        brandName,
        prompt,
        score,
        provider,
        summary,
        aiResponse,
        citedDomains: citedDomains.slice(0, 10),
        competitorMentions: competitorMentions.slice(0, 10),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Free search error:", error);
      res.status(500).json({ error: "Search failed. Please try again." });
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      // Create default organization for user
      const org = await storage.createOrganization({
        name: `${data.name}'s Organization`,
        slug: `org-${user.id.slice(0, 8)}`,
      });
      await storage.addOrganizationMember({
        userId: user.id,
        organizationId: org.id,
        role: "admin",
      });

      req.session.userId = user.id;
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Registration error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: "Registration failed",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Login error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: "Login failed",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  });

  // Dashboard
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  // Analytics API
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.session.userId!);
      
      if (projects.length === 0) {
        return res.json({
          totalScores: 0,
          averageScore: 0,
          providerBreakdown: [],
          recentScores: [],
          topCitedDomains: [],
        });
      }

      const allScores: Array<{ score: number; provider: string; calculatedAt: Date; brandName?: string }> = [];
      const providerScores: Record<string, number[]> = {};
      const domainCounts: Record<string, number> = {};

      for (const project of projects) {
        const scores = await storage.getScoresByProject(project.id);
        const brands = await storage.getBrandsByProject(project.id);
        const brandMap = new Map(brands.map(b => [b.id, b.name]));
        
        for (const score of scores) {
          allScores.push({
            score: score.score,
            provider: score.provider,
            calculatedAt: score.calculatedAt,
            brandName: score.entityType === 'brand' ? brandMap.get(score.entityId) : undefined,
          });
          
          if (!providerScores[score.provider]) {
            providerScores[score.provider] = [];
          }
          providerScores[score.provider].push(score.score);
        }

        const prompts = await storage.getPromptsByProject(project.id);
        for (const prompt of prompts) {
          const runs = await storage.getPromptRunsByPrompt(prompt.id);
          for (const run of runs) {
            const citations = await storage.getCitationsByRun(run.id);
            for (const citation of citations) {
              const domain = citation.domain || 'unknown';
              domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            }
          }
        }
      }

      const providerBreakdown = Object.entries(providerScores).map(([provider, scores]) => ({
        provider,
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count: scores.length,
      }));

      const topCitedDomains = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      const recentScores = allScores
        .sort((a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())
        .slice(0, 20)
        .map(s => ({
          score: s.score,
          provider: s.provider,
          brandName: s.brandName,
          calculatedAt: s.calculatedAt,
        }));

      const totalScores = allScores.length;
      const averageScore = totalScores > 0 
        ? Math.round(allScores.reduce((a, b) => a + b.score, 0) / totalScores)
        : 0;

      res.json({
        totalScores,
        averageScore,
        providerBreakdown,
        recentScores,
        topCitedDomains,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Projects - only returns user's organization projects
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjectsWithStats(req.session.userId!);
      res.json(projects);
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ error: "Failed to get projects" });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      if (orgs.length === 0) {
        return res.status(400).json({ error: "No organization found" });
      }

      const org = orgs[0];
      const tier = org.subscriptionTier || "free";
      const limits = getTierLimits(tier);
      
      const existingProjects = await storage.getProjectsByOrganization(org.id);
      if (existingProjects.length >= limits.projectLimit) {
        return res.status(403).json({ 
          error: `Project limit reached. Your ${tier} plan allows ${limits.projectLimit} project(s). Upgrade to create more.` 
        });
      }

      const data = insertProjectSchema.omit({ organizationId: true }).parse(req.body);
      const project = await storage.createProject({
        ...data,
        organizationId: org.id,
      });
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create project error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      // Verify user has access to this project
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      // Verify user has access to this project
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete project error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Brands - with authorization check
  app.get("/api/projects/:projectId/brands", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const brands = await storage.getBrandsByProject(req.params.projectId);
      res.json(brands);
    } catch (error) {
      console.error("Get brands error:", error);
      res.status(500).json({ error: "Failed to get brands" });
    }
  });

  app.post("/api/projects/:projectId/brands", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = insertBrandSchema.omit({ projectId: true }).parse(req.body);
      const brand = await storage.createBrand({
        ...data,
        projectId: req.params.projectId,
      });
      
      // Audit log
      await storage.createAuditLog({
        projectId: req.params.projectId,
        userId: req.session.userId!,
        entityType: "brand",
        entityId: brand.id,
        action: "create",
        newValue: { name: brand.name, domain: brand.domain },
      });
      
      // Run brand onboarding in background (don't block response)
      const runOnboarding = async () => {
        try {
          const { runBrandOnboarding } = await import("./services/brand-onboarding");
          const { runPromptOnce } = await import("./services/prompt-runner");
          
          const result = await runBrandOnboarding(brand.name, brand.domain);
          
          // Check tier limits for prompts
          const orgs = await storage.getOrganizationsByUser(req.session.userId!);
          const org = orgs[0];
          const tier = org?.subscriptionTier || "free";
          const limits = getTierLimits(tier);
          
          const existingPrompts = await storage.getPromptsByProject(req.params.projectId);
          const remainingSlots = limits.promptsPerProject - existingPrompts.length;
          
          if (remainingSlots <= 0) {
            console.log("Brand onboarding: No prompt slots available");
            return;
          }
          
          const queriesToCreate = result.queries.slice(0, remainingSlots);
          const { estimateVolumeScore } = await import("./services/volume-score");
          
          // Create prompts from generated queries with volume scores
          for (const query of queriesToCreate) {
            // Estimate volume score for each query
            let volumeScore = 5;
            let aiLikeliness = 5;
            try {
              const volumeResult = await estimateVolumeScore(query.query);
              volumeScore = volumeResult.volumeScore;
              aiLikeliness = volumeResult.aiLikeliness;
            } catch (volError) {
              console.error("Failed to estimate volume:", volError);
            }
            
            const prompt = await storage.createPrompt({
              name: query.query.substring(0, 50) + (query.query.length > 50 ? "..." : ""),
              template: query.query,
              projectId: req.params.projectId,
              isActive: true,
              scheduleEnabled: false,
              tags: [query.intent, "auto-generated"],
              volumeScore,
              aiLikeliness,
            });
            
            // Run visibility scoring for the prompt
            try {
              await runPromptOnce(prompt.id, "openai", "gpt-4o-mini");
            } catch (runError) {
              console.error("Failed to run prompt:", runError);
            }
          }
          
          console.log(`Brand onboarding complete: created ${queriesToCreate.length} prompts for ${brand.name}`);
        } catch (onboardingError) {
          console.error("Brand onboarding failed:", onboardingError);
        }
      };
      
      // Start onboarding without awaiting
      runOnboarding();
      
      res.json({ ...brand, onboardingStarted: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create brand error:", error);
      res.status(500).json({ error: "Failed to create brand" });
    }
  });

  // Competitors - with authorization check
  app.get("/api/projects/:projectId/competitors", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const competitors = await storage.getCompetitorsByProject(req.params.projectId);
      res.json(competitors);
    } catch (error) {
      console.error("Get competitors error:", error);
      res.status(500).json({ error: "Failed to get competitors" });
    }
  });

  app.post("/api/projects/:projectId/competitors", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const data = insertCompetitorSchema.omit({ projectId: true }).parse(req.body);
      const competitor = await storage.createCompetitor({
        ...data,
        projectId: req.params.projectId,
      });
      
      // Audit log
      await storage.createAuditLog({
        projectId: req.params.projectId,
        userId: req.session.userId!,
        entityType: "competitor",
        entityId: competitor.id,
        action: "create",
        newValue: { name: competitor.name, domain: competitor.domain },
      });
      
      res.json(competitor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create competitor error:", error);
      res.status(500).json({ error: "Failed to create competitor" });
    }
  });

  // Prompts - with authorization check
  app.get("/api/projects/:projectId/prompts", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const prompts = await storage.getPromptsByProject(req.params.projectId);
      res.json(prompts);
    } catch (error) {
      console.error("Get prompts error:", error);
      res.status(500).json({ error: "Failed to get prompts" });
    }
  });

  app.post("/api/projects/:projectId/prompts", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      const org = orgs[0];
      const tier = org?.subscriptionTier || "free";
      const limits = getTierLimits(tier);
      
      const existingPrompts = await storage.getPromptsByProject(req.params.projectId);
      if (existingPrompts.length >= limits.promptsPerProject) {
        return res.status(403).json({ 
          error: `Prompt limit reached. Your ${tier} plan allows ${limits.promptsPerProject} prompt(s) per project. Upgrade to create more.` 
        });
      }

      const data = insertPromptSchema.omit({ projectId: true }).parse(req.body);
      const prompt = await storage.createPrompt({
        ...data,
        projectId: req.params.projectId,
      });
      res.json(prompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Create prompt error:", error);
      res.status(500).json({ error: "Failed to create prompt" });
    }
  });

  // Admin - Job Queue
  app.get("/api/admin/jobs", requireAuth, async (_req, res) => {
    try {
      const jobs = await storage.getJobs(50);
      res.json(jobs);
    } catch (error) {
      console.error("Get jobs error:", error);
      res.status(500).json({ error: "Failed to get jobs" });
    }
  });

  app.get("/api/admin/jobs/stats", requireAuth, async (_req, res) => {
    try {
      const stats = await storage.getJobStats();
      res.json(stats);
    } catch (error) {
      console.error("Get job stats error:", error);
      res.status(500).json({ error: "Failed to get job stats" });
    }
  });

  app.post("/api/admin/jobs/process", requireAuth, async (_req, res) => {
    try {
      const pendingJobs = await storage.getPendingJobs(5);
      let processed = 0;

      for (const job of pendingJobs) {
        await storage.updateJobStatus(job.id, "running");
        
        try {
          // Increment attempts
          await storage.incrementJobAttempts(job.id);
          
          // Simulate job processing - in production this calls AI provider APIs
          await new Promise((resolve) => setTimeout(resolve, 100));
          
          await storage.updateJobStatus(job.id, "completed");
          processed++;
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          await storage.updateJobStatus(job.id, "failed", error);
        }
      }

      res.json({ processed, total: pendingJobs.length });
    } catch (error) {
      console.error("Process jobs error:", error);
      res.status(500).json({ error: "Failed to process jobs" });
    }
  });

  // Seed data endpoint
  app.post("/api/admin/seed", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const orgs = await storage.getOrganizationsByUser(userId);
      
      if (orgs.length === 0) {
        return res.status(400).json({ error: "No organization found" });
      }

      const orgId = orgs[0].id;

      // Create sample projects
      const project1 = await storage.createProject({
        name: "Brand Visibility Q1 2025",
        description: "Track our brand visibility across AI search platforms for Q1",
        organizationId: orgId,
      });

      const project2 = await storage.createProject({
        name: "Competitor Analysis",
        description: "Monitor competitor mentions and citations",
        organizationId: orgId,
      });

      // Add brands to project1
      await storage.createBrand({ name: "Acme Corp", domain: "acme.com", projectId: project1.id });
      await storage.createBrand({ name: "Acme Products", domain: "products.acme.com", projectId: project1.id });

      // Add competitors to project1
      await storage.createCompetitor({ name: "Competitor A", domain: "competitora.com", projectId: project1.id });
      await storage.createCompetitor({ name: "Competitor B", domain: "competitorb.com", projectId: project1.id });

      // Add prompts
      const prompt1 = await storage.createPrompt({
        name: "Best enterprise software",
        template: "What are the best enterprise software solutions in 2025?",
        projectId: project1.id,
        isActive: true,
        scheduleEnabled: false,
      });

      await storage.createPrompt({
        name: "Top CRM tools",
        template: "What are the top CRM tools for small businesses?",
        projectId: project1.id,
        isActive: true,
        scheduleEnabled: true,
        scheduleCron: "0 9 * * *",
      });

      // Add sample prompt run with citations
      const run = await storage.createPromptRun({
        promptId: prompt1.id,
        provider: "openai",
        rawResponse: "Based on my analysis, the top enterprise software solutions include Salesforce, Microsoft Dynamics, SAP, and Oracle Cloud...",
        responseMetadata: { tokens: 256, model: "gpt-4", latencyMs: 1200 },
      });

      await storage.createCitation({
        promptRunId: run.id,
        url: "https://example.com/enterprise-software",
        title: "Enterprise Software Guide 2025",
        snippet: "A comprehensive guide to enterprise software...",
        position: 1,
        domain: "example.com",
      });

      await storage.createCitation({
        promptRunId: run.id,
        url: "https://techblog.com/saas-trends",
        title: "SaaS Trends Report",
        snippet: "The latest trends in SaaS and enterprise...",
        position: 2,
        domain: "techblog.com",
      });

      // Add sample jobs
      await storage.createJob({
        type: "prompt_run",
        payload: { promptId: prompt1.id, provider: "openai" },
        status: "pending",
        scheduledFor: new Date(),
      });

      await storage.createJob({
        type: "prompt_run",
        payload: { promptId: prompt1.id, provider: "anthropic" },
        status: "pending",
        scheduledFor: new Date(Date.now() + 60000),
      });

      res.json({ success: true, message: "Seed data created successfully" });
    } catch (error) {
      console.error("Seed data error:", error);
      res.status(500).json({ error: "Failed to create seed data" });
    }
  });

  // Dev-only: Run a prompt once
  app.post("/api/dev/run-prompt", requireAuth, async (req, res) => {
    try {
      const { promptId, provider = "openai", model } = req.body;
      
      if (!promptId) {
        return res.status(400).json({ error: "promptId is required" });
      }

      const prompt = await storage.getPrompt(promptId);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      const hasAccess = await verifyProjectAccess(req.session.userId!, prompt.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { runPromptOnce } = await import("./services/prompt-runner");
      const result = await runPromptOnce(promptId, provider, model);

      if (result.success) {
        res.json({
          success: true,
          promptRun: result.promptRun,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Run prompt error:", error);
      res.status(500).json({ error: "Failed to run prompt" });
    }
  });

  // Metrics API - Get project analytics for date range
  app.get("/api/projects/:projectId/metrics", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { days = "30" } = req.query;
      const daysNum = parseInt(days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const promptRuns = await storage.getPromptRunsByProject(req.params.projectId, 100);
      const projectScores = await storage.getScoresByProject(req.params.projectId, startDate);
      const brands = await storage.getBrandsByProject(req.params.projectId);
      const competitors = await storage.getCompetitorsByProject(req.params.projectId);

      const runsInRange = promptRuns.filter(r => {
        if (!r.executedAt) return false;
        const runDate = new Date(r.executedAt);
        return !isNaN(runDate.getTime()) && runDate >= startDate;
      });
      const promptCount = runsInRange.length;

      let brandMentionCount = 0;
      const competitorMentionMap = new Map<string, number>();
      const domainMap = new Map<string, number>();

      for (const run of runsInRange) {
        const mentions = run.parsedMentions as {
          brandMentioned?: boolean;
          brandMentionCount?: number;
          competitorMentions?: { id: string; name: string; count: number }[];
          citedDomains?: { domain: string; count: number }[];
        } | null;

        if (mentions) {
          if (mentions.brandMentioned) brandMentionCount++;
          
          if (mentions.competitorMentions) {
            for (const cm of mentions.competitorMentions) {
              competitorMentionMap.set(cm.name, (competitorMentionMap.get(cm.name) || 0) + cm.count);
            }
          }
          
          if (mentions.citedDomains) {
            for (const cd of mentions.citedDomains) {
              domainMap.set(cd.domain, (domainMap.get(cd.domain) || 0) + cd.count);
            }
          }
        }
      }

      const brandMentionRate = promptCount > 0 ? (brandMentionCount / promptCount) * 100 : 0;

      const topCompetitor = Array.from(competitorMentionMap.entries())
        .sort((a, b) => b[1] - a[1])[0];

      const topDomains = Array.from(domainMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      const avgScore = projectScores.length > 0
        ? projectScores.reduce((sum, s) => sum + s.score, 0) / projectScores.length
        : 0;

      // Calculate previous period data for delta comparison
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysNum);
      const prevScores = await storage.getScoresByProject(req.params.projectId, prevStartDate, startDate);
      const prevAvgScore = prevScores.length > 0
        ? prevScores.reduce((sum, s) => sum + s.score, 0) / prevScores.length
        : 0;
      const scoreDelta = avgScore - prevAvgScore;

      // Calculate previous period prompt runs for delta
      const prevRuns = promptRuns.filter(r => {
        if (!r.executedAt) return false;
        const runDate = new Date(r.executedAt);
        return !isNaN(runDate.getTime()) && runDate >= prevStartDate && runDate < startDate;
      });
      const promptCountDelta = promptCount - prevRuns.length;

      // Calculate previous period mention rate
      let prevMentionCount = 0;
      for (const run of prevRuns) {
        const mentions = run.parsedMentions as { brandMentioned?: boolean } | null;
        if (mentions?.brandMentioned) prevMentionCount++;
      }
      const prevMentionRate = prevRuns.length > 0 ? (prevMentionCount / prevRuns.length) * 100 : 0;
      const mentionRateDelta = brandMentionRate - prevMentionRate;

      // Calculate daily score trend (brand scores only)
      const scoreTrend: { date: string; avgScore: number; runCount: number }[] = [];
      const dailyScores = new Map<string, { total: number; count: number }>();
      
      const brandScores = projectScores.filter(s => s.entityType === "brand");
      for (const score of brandScores) {
        const date = new Date(score.calculatedAt).toISOString().split('T')[0];
        const existing = dailyScores.get(date) || { total: 0, count: 0 };
        existing.total += score.score;
        existing.count++;
        dailyScores.set(date, existing);
      }
      
      // Fill in missing dates with zeros
      for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const data = dailyScores.get(dateStr);
        scoreTrend.push({
          date: dateStr,
          avgScore: data ? Math.round((data.total / data.count) * 10) / 10 : 0,
          runCount: data?.count || 0,
        });
      }

      // Calculate competitor score trends (for Pro/Max tier overlay)
      const competitorScoreTrends: Record<string, { date: string; avgScore: number }[]> = {};
      
      // Get tier from the project's organization (not user's first org)
      const project = await storage.getProject(req.params.projectId);
      let isPaidTier = false;
      if (project?.organizationId) {
        const org = await storage.getOrganization(project.organizationId);
        const tier = org?.subscriptionTier || "free";
        isPaidTier = ["starter", "pro"].includes(tier); // starter = Pro ($29), pro = Max ($79)
      }
      
      if (isPaidTier && competitors.length > 0) {
        for (const competitor of competitors) {
          const competitorDailyScores = new Map<string, { total: number; count: number }>();
          
          // Calculate mention-based "score" for competitors based on parsedMentions
          for (const run of runsInRange) {
            const mentions = run.parsedMentions as {
              competitorMentions?: { id: string; name: string; count: number }[];
            } | null;
            
            if (mentions?.competitorMentions) {
              const mention = mentions.competitorMentions.find(
                m => m.name.toLowerCase() === competitor.name.toLowerCase()
              );
              if (mention) {
                const date = new Date(run.executedAt).toISOString().split('T')[0];
                const existing = competitorDailyScores.get(date) || { total: 0, count: 0 };
                existing.total += Math.min(mention.count * 20, 60); // Use same mention scoring as brand
                existing.count++;
                competitorDailyScores.set(date, existing);
              }
            }
          }
          
          const trend: { date: string; avgScore: number }[] = [];
          for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const data = competitorDailyScores.get(dateStr);
            trend.push({
              date: dateStr,
              avgScore: data ? Math.round((data.total / data.count) * 10) / 10 : 0,
            });
          }
          
          if (trend.some(t => t.avgScore > 0)) {
            competitorScoreTrends[competitor.name] = trend;
          }
        }
      }

      res.json({
        dateRange: { start: startDate.toISOString(), end: new Date().toISOString(), days: daysNum },
        promptCount,
        promptCountDelta,
        brandMentionRate: Math.round(brandMentionRate * 10) / 10,
        brandMentionCount,
        mentionRateDelta: Math.round(mentionRateDelta * 10) / 10,
        avgVisibilityScore: Math.round(avgScore * 10) / 10,
        scoreDelta: Math.round(scoreDelta * 10) / 10,
        topCompetitor: topCompetitor ? { name: topCompetitor[0], mentions: topCompetitor[1] } : null,
        topCitedDomains: topDomains,
        competitorMentionRates: Object.fromEntries(competitorMentionMap),
        scoreTrend,
        competitorScoreTrends: isPaidTier ? competitorScoreTrends : undefined, // Pro/Max only
        competitors: isPaidTier ? competitors.map(c => ({ id: c.id, name: c.name })) : [], // Pro/Max only for overlay
        recentRuns: runsInRange.slice(0, 10).map(run => ({
          id: run.id,
          provider: run.provider,
          model: run.model,
          executedAt: run.executedAt,
          rawResponse: run.rawResponse,
          parsedMentions: run.parsedMentions,
        })),
      });
    } catch (error) {
      console.error("Get metrics error:", error);
      res.status(500).json({ error: "Failed to get metrics" });
    }
  });

  // Discover Prompts API
  app.post("/api/discover-prompts", requireAuth, async (req, res) => {
    try {
      const { projectId, searchTerm } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ error: "Project ID required" });
      }

      const hasAccess = await verifyProjectAccess(req.session.userId!, projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const brands = await storage.getBrandsByProject(projectId);
      const firstBrand = brands[0];
      
      if (!firstBrand) {
        return res.status(400).json({ error: "No brand found in project. Add a brand first." });
      }

      const { discoverPrompts } = await import("./services/discover-prompts");
      const prompts = await discoverPrompts({
        brandName: firstBrand.name,
        industry: firstBrand.domain || "Technology",
        searchTerm,
      });

      res.json({ prompts, brandName: firstBrand.name });
    } catch (error) {
      console.error("Discover prompts error:", error);
      res.status(500).json({ error: "Failed to discover prompts" });
    }
  });

  // Get recommendations for a project
  app.get("/api/projects/:projectId/recommendations", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { generateRecommendations } = await import("./services/recommendations");
      const recommendations = await generateRecommendations(req.params.projectId);

      res.json(recommendations);
    } catch (error) {
      console.error("Get recommendations error:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Add discovered prompt to project
  app.post("/api/discover-prompts/add", requireAuth, async (req, res) => {
    try {
      const { projectId, query, volumeScore, aiLikeliness, intent } = req.body;
      
      if (!projectId || !query) {
        return res.status(400).json({ error: "Project ID and query required" });
      }

      const hasAccess = await verifyProjectAccess(req.session.userId!, projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check tier limits
      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      const org = orgs[0];
      const tier = org?.subscriptionTier || "free";
      const limits = getTierLimits(tier);

      const existingPrompts = await storage.getPromptsByProject(projectId);
      if (existingPrompts.length >= limits.promptsPerProject) {
        return res.status(403).json({ 
          error: `Prompt limit reached (${limits.promptsPerProject}). Upgrade for more prompts.` 
        });
      }

      // Check if prompt already exists
      const exists = existingPrompts.some(p => 
        p.template.toLowerCase().trim() === query.toLowerCase().trim()
      );
      if (exists) {
        return res.status(400).json({ error: "This prompt already exists in your project" });
      }

      const prompt = await storage.createPrompt({
        name: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
        template: query,
        projectId,
        isActive: true,
        scheduleEnabled: false,
        tags: [intent || "discovered", "from-discover"],
        volumeScore: volumeScore || 5,
        aiLikeliness: aiLikeliness || 5,
      });

      res.json(prompt);
    } catch (error) {
      console.error("Add discovered prompt error:", error);
      res.status(500).json({ error: "Failed to add prompt" });
    }
  });

  // Cron endpoint - trigger job scheduling and processing
  app.post("/api/cron/tick", async (req, res) => {
    try {
      const { runCronTick } = await import("./services/scheduler");
      const result = await runCronTick();
      res.json({
        success: true,
        enqueued: result.enqueue.enqueuedCount,
        skippedBudget: result.enqueue.skippedBudget,
        skippedConcurrency: result.enqueue.skippedConcurrency,
        processed: result.process.processedCount,
        failed: result.process.failedCount,
        retried: result.process.retriedCount,
      });
    } catch (error) {
      console.error("Cron tick error:", error);
      res.status(500).json({ error: "Cron tick failed" });
    }
  });

  // Alert Rules API
  app.get("/api/projects/:projectId/alerts/rules", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      const rules = await storage.getAlertRulesByProject(req.params.projectId);
      res.json(rules);
    } catch (error) {
      console.error("Get alert rules error:", error);
      res.status(500).json({ error: "Failed to get alert rules" });
    }
  });

  app.post("/api/projects/:projectId/alerts/rules", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validatedData = insertAlertRuleSchema.omit({ projectId: true }).parse(req.body);
      const rule = await storage.createAlertRule({
        ...validatedData,
        projectId: req.params.projectId,
      });
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Create alert rule error:", error);
      res.status(500).json({ error: "Failed to create alert rule" });
    }
  });

  app.delete("/api/projects/:projectId/alerts/rules/:ruleId", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteAlertRule(req.params.ruleId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete alert rule error:", error);
      res.status(500).json({ error: "Failed to delete alert rule" });
    }
  });

  // Alert Events API
  app.get("/api/projects/:projectId/alerts/events", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      const events = await storage.getAlertEventsByProject(req.params.projectId);
      res.json(events);
    } catch (error) {
      console.error("Get alert events error:", error);
      res.status(500).json({ error: "Failed to get alert events" });
    }
  });

  app.post("/api/projects/:projectId/alerts/events/:eventId/acknowledge", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.acknowledgeAlertEvent(req.params.eventId);
      res.json({ success: true });
    } catch (error) {
      console.error("Acknowledge alert event error:", error);
      res.status(500).json({ error: "Failed to acknowledge alert event" });
    }
  });

  // Global notifications (all alerts across all projects for user)
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      if (orgs.length === 0) {
        return res.json([]);
      }
      
      const allEvents: Array<{ id: string; message: string; createdAt: Date; acknowledged: boolean }> = [];
      
      for (const org of orgs) {
        const projects = await storage.getProjectsByOrganization(org.id);
        for (const project of projects) {
          const events = await storage.getAlertEventsByProject(project.id);
          allEvents.push(...events.map(e => ({
            id: e.id,
            message: e.message,
            createdAt: e.createdAt,
            acknowledged: e.acknowledged,
          })));
        }
      }
      
      // Sort by date, newest first
      allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(allEvents.slice(0, 50));
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  // Prompt Templates API
  app.get("/api/prompt-templates", requireAuth, async (req, res) => {
    try {
      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      const orgId = orgs[0]?.id;
      const templates = await storage.getPromptTemplates(orgId);
      res.json(templates);
    } catch (error) {
      console.error("Get prompt templates error:", error);
      res.status(500).json({ error: "Failed to get prompt templates" });
    }
  });

  // Bulk import prompts
  app.post("/api/projects/:projectId/prompts/bulk", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { prompts: promptData } = req.body;
      if (!Array.isArray(promptData)) {
        return res.status(400).json({ error: "prompts must be an array" });
      }

      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      const org = orgs[0];
      const tier = org?.subscriptionTier || "free";
      const limits = getTierLimits(tier);
      
      const existingPrompts = await storage.getPromptsByProject(req.params.projectId);
      const remainingSlots = limits.promptsPerProject - existingPrompts.length;
      
      if (remainingSlots <= 0) {
        return res.status(403).json({ 
          error: `Prompt limit reached. Your ${tier} plan allows ${limits.promptsPerProject} prompt(s) per project.` 
        });
      }
      
      const toImport = promptData.slice(0, remainingSlots);

      const created = [];
      for (const p of toImport) {
        if (!p.name || !p.template) continue;
        const prompt = await storage.createPrompt({
          name: p.name,
          template: p.template,
          tags: p.tags || null,
          locale: p.locale || "en",
          projectId: req.params.projectId,
          isActive: p.isActive !== false,
          scheduleEnabled: p.scheduleEnabled || false,
          scheduleCron: p.scheduleCron || null,
        });
        created.push(prompt);
      }

      const skipped = promptData.length - toImport.length;
      res.json({ 
        created: created.length, 
        prompts: created,
        skipped,
        message: skipped > 0 ? `${skipped} prompt(s) skipped due to plan limit` : undefined
      });
    } catch (error) {
      console.error("Bulk import prompts error:", error);
      res.status(500).json({ error: "Failed to bulk import prompts" });
    }
  });

  // Auto-tag prompt
  app.post("/api/prompts/:promptId/auto-tag", requireAuth, async (req, res) => {
    try {
      const prompt = await storage.getPrompt(req.params.promptId);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      
      const hasAccess = await verifyProjectAccess(req.session.userId!, prompt.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { suggestTagsForPrompt } = await import("./services/auto-tagger");
      const suggestion = await suggestTagsForPrompt(prompt.template);
      
      const existingTags = prompt.tags || [];
      const newTags = Array.from(new Set([...existingTags, ...suggestion.tags]));
      
      const updatedPrompt = await storage.updatePrompt(prompt.id, { tags: newTags });
      
      res.json({ 
        prompt: updatedPrompt,
        suggestion,
      });
    } catch (error) {
      console.error("Auto-tag prompt error:", error);
      res.status(500).json({ error: "Failed to auto-tag prompt" });
    }
  });

  // Run prompt manually
  app.post("/api/prompts/:promptId/run", requireAuth, async (req, res) => {
    try {
      const prompt = await storage.getPrompt(req.params.promptId);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      
      const hasAccess = await verifyProjectAccess(req.session.userId!, prompt.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const project = await storage.getProject(prompt.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check budget limits
      if (project.monthlyBudgetHard && project.currentMonthUsage !== null) {
        if (project.currentMonthUsage >= project.monthlyBudgetHard) {
          return res.status(403).json({ 
            error: "Monthly budget limit reached. Increase your budget limit in project settings to continue." 
          });
        }
      }

      // Check tier limits
      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      const org = orgs[0];
      const tier = org?.subscriptionTier || "free";
      const limits = getTierLimits(tier);
      
      if (limits.runsPerMonth !== Infinity) {
        const currentMonthRuns = await storage.getMonthlyRunCountByOrg(org.id);
        if (currentMonthRuns >= limits.runsPerMonth) {
          return res.status(403).json({ 
            error: `Monthly run limit reached. Your ${tier} plan allows ${limits.runsPerMonth} runs per month.` 
          });
        }
      }

      // Run the prompt using the prompt runner service
      const { runPromptOnce } = await import("./services/prompt-runner");
      const result = await runPromptOnce(req.params.promptId, "openai", "gpt-4o-mini");
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to run prompt" });
      }

      // Update project usage tracking
      if (result.promptRun.cost) {
        const newUsage = (project.currentMonthUsage || 0) + result.promptRun.cost;
        await storage.updateProject(project.id, { currentMonthUsage: newUsage });
        
        // Check soft budget and create alert if needed
        if (project.monthlyBudgetSoft && newUsage >= project.monthlyBudgetSoft) {
          const alertRules = await storage.getAlertRulesByProject(project.id);
          const budgetAlert = alertRules.find(r => r.type === "budget_exceeded" && r.isActive);
          if (budgetAlert) {
            await storage.createAlertEvent({
              alertRuleId: budgetAlert.id,
              promptRunId: result.promptRun.id,
              message: `Monthly budget soft limit reached: $${newUsage.toFixed(2)} of $${project.monthlyBudgetSoft} spent`,
              metadata: { currentUsage: newUsage, softLimit: project.monthlyBudgetSoft },
            });
          }
        }
      }

      // Create audit log entry
      await storage.createAuditLog({
        projectId: prompt.projectId,
        userId: req.session.userId!,
        entityType: "prompt_run",
        entityId: result.promptRun.id,
        action: "create",
        newValue: { promptId: prompt.id, provider: "openai", model: "gpt-4o-mini" },
      });

      res.json({
        success: true,
        promptRun: result.promptRun,
      });
    } catch (error) {
      console.error("Run prompt error:", error);
      res.status(500).json({ error: "Failed to run prompt" });
    }
  });

  // Audit Log API
  app.get("/api/projects/:projectId/audit-log", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      const logs = await storage.getAuditLogsByProject(req.params.projectId);
      res.json(logs);
    } catch (error) {
      console.error("Get audit log error:", error);
      res.status(500).json({ error: "Failed to get audit log" });
    }
  });

  // Project Usage & Budget API
  app.get("/api/projects/:projectId/usage", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      const project = await storage.getProject(req.params.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json({
        currentMonthUsage: project.currentMonthUsage || 0,
        monthlyBudgetSoft: project.monthlyBudgetSoft,
        monthlyBudgetHard: project.monthlyBudgetHard,
        usageResetAt: project.usageResetAt,
      });
    } catch (error) {
      console.error("Get project usage error:", error);
      res.status(500).json({ error: "Failed to get project usage" });
    }
  });

  // Update project budget limits
  app.put("/api/projects/:projectId/budget", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const project = await storage.getProject(req.params.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Parse and validate budget values - treat NaN/undefined as null
      const parseSoftLimit = req.body.monthlyBudgetSoft;
      const parseHardLimit = req.body.monthlyBudgetHard;
      
      const monthlyBudgetSoft = (typeof parseSoftLimit === 'number' && !isNaN(parseSoftLimit)) 
        ? parseSoftLimit : null;
      const monthlyBudgetHard = (typeof parseHardLimit === 'number' && !isNaN(parseHardLimit)) 
        ? parseHardLimit : null;

      // Store previous values for audit log
      const previousValue = { 
        monthlyBudgetSoft: project.monthlyBudgetSoft, 
        monthlyBudgetHard: project.monthlyBudgetHard 
      };

      // Update project first
      const updated = await storage.updateProject(req.params.projectId, {
        monthlyBudgetSoft,
        monthlyBudgetHard,
      });

      // Create audit log entry after successful update
      await storage.createAuditLog({
        projectId: req.params.projectId,
        userId: req.session.userId!,
        entityType: "project",
        entityId: req.params.projectId,
        action: "budget_change",
        previousValue,
        newValue: { monthlyBudgetSoft, monthlyBudgetHard },
      });

      res.json({
        success: true,
        project: updated,
      });
    } catch (error) {
      console.error("Update project budget error:", error);
      res.status(500).json({ error: "Failed to update project budget" });
    }
  });

  app.patch("/api/projects/:projectId/budget", requireAuth, async (req, res) => {
    try {
      const hasAccess = await verifyProjectAccess(req.session.userId!, req.params.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = budgetUpdateSchema.parse(req.body);
      const { monthlyBudgetSoft, monthlyBudgetHard } = validatedData;
      
      const project = await storage.updateProject(req.params.projectId, {
        monthlyBudgetSoft: monthlyBudgetSoft ?? null,
        monthlyBudgetHard: monthlyBudgetHard ?? null,
      });

      await storage.createAuditLog({
        projectId: req.params.projectId,
        userId: req.session.userId!,
        entityType: "project",
        entityId: req.params.projectId,
        action: "budget_change",
        newValue: { monthlyBudgetSoft, monthlyBudgetHard },
      });

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Update project budget error:", error);
      res.status(500).json({ error: "Failed to update project budget" });
    }
  });

  // Stripe billing routes
  app.get("/api/billing/status", async (_req, res) => {
    res.json({ available: isStripeAvailable() });
  });

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    if (!isStripeAvailable()) {
      return res.status(503).json({ error: "Billing not configured" });
    }
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      console.error("Get publishable key error:", error);
      res.status(500).json({ error: "Failed to get Stripe key" });
    }
  });

  app.get("/api/billing/plans", async (_req, res) => {
    if (!isStripeAvailable()) {
      return res.json({ plans: [], billingAvailable: false });
    }
    try {
      const { stripeService } = await import("./stripeService");
      const rows = await stripeService.listProductsWithPrices(true);
      
      const productsMap = new Map();
      for (const row of rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: [],
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unitAmount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }

      const products = Array.from(productsMap.values()).sort((a, b) => {
        const orderA = parseInt(a.metadata?.order || "99");
        const orderB = parseInt(b.metadata?.order || "99");
        return orderA - orderB;
      });

      res.json({ plans: products, billingAvailable: true });
    } catch (error) {
      console.error("Get billing plans error:", error);
      res.status(500).json({ error: "Failed to get billing plans" });
    }
  });

  app.get("/api/billing/subscription", requireAuth, async (req, res) => {
    try {
      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      if (orgs.length === 0) {
        return res.json({ subscription: null, tier: "free", billingAvailable: isStripeAvailable() });
      }

      const org = orgs[0];
      if (!isStripeAvailable() || !org.stripeSubscriptionId) {
        return res.json({ subscription: null, tier: org.subscriptionTier || "free", billingAvailable: isStripeAvailable() });
      }

      const { stripeService } = await import("./stripeService");
      const subscription = await stripeService.getSubscription(org.stripeSubscriptionId);
      res.json({ 
        subscription, 
        tier: org.subscriptionTier || "free",
        status: org.subscriptionStatus,
        billingAvailable: true,
      });
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  app.post("/api/billing/checkout", requireAuth, async (req, res) => {
    if (!isStripeAvailable()) {
      return res.status(503).json({ error: "Billing is not configured yet. Connect Stripe to enable paid plans." });
    }
    try {
      const { stripeService } = await import("./stripeService");
      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "Price ID required" });
      }

      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      if (orgs.length === 0) {
        return res.status(400).json({ error: "No organization found" });
      }

      const org = orgs[0];
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      let customerId = org.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, org.id, org.name);
        await storage.updateOrganization(org.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/app/billing?success=true`,
        `${baseUrl}/app/billing?canceled=true`,
        { orgId: org.id }
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Create checkout session error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/billing/portal", requireAuth, async (req, res) => {
    if (!isStripeAvailable()) {
      return res.status(503).json({ error: "Billing is not configured yet" });
    }
    try {
      const { stripeService } = await import("./stripeService");
      const orgs = await storage.getOrganizationsByUser(req.session.userId!);
      if (orgs.length === 0 || !orgs[0].stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const org = orgs[0];
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripeService.createCustomerPortalSession(
        org.stripeCustomerId!,
        `${baseUrl}/app/billing`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Create portal session error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  return httpServer;
}
