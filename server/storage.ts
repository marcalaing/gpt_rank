import {
  users,
  organizations,
  organizationMembers,
  projects,
  brands,
  competitors,
  prompts,
  promptRuns,
  citations,
  scores,
  jobQueue,
  alertRules,
  alertEvents,
  auditLogs,
  promptTemplates,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type Project,
  type InsertProject,
  type Brand,
  type InsertBrand,
  type Competitor,
  type InsertCompetitor,
  type Prompt,
  type InsertPrompt,
  type PromptRun,
  type InsertPromptRun,
  type Citation,
  type InsertCitation,
  type Score,
  type InsertScore,
  type Job,
  type InsertJob,
  type AlertRule,
  type InsertAlertRule,
  type AlertEvent,
  type InsertAlertEvent,
  type AuditLog,
  type InsertAuditLog,
  type PromptTemplate,
  type InsertPromptTemplate,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, count, sql, desc, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Organizations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsByUser(userId: string): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<Organization>): Promise<Organization | undefined>;
  addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;

  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOrganization(orgId: string): Promise<Project[]>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Brands
  getBrandsByProject(projectId: string): Promise<Brand[]>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  deleteBrand(id: string): Promise<void>;

  // Competitors
  getCompetitorsByProject(projectId: string): Promise<Competitor[]>;
  createCompetitor(competitor: InsertCompetitor): Promise<Competitor>;
  deleteCompetitor(id: string): Promise<void>;

  // Prompts
  getPrompt(id: string): Promise<Prompt | undefined>;
  getPromptsByProject(projectId: string): Promise<Prompt[]>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: string, data: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: string): Promise<void>;

  // Prompt Runs
  getPromptRun(id: string): Promise<PromptRun | undefined>;
  getPromptRunsByPrompt(promptId: string): Promise<PromptRun[]>;
  getPromptRunsByProject(projectId: string, limit?: number): Promise<PromptRun[]>;
  getMonthlyRunCountByOrg(orgId: string): Promise<number>;
  createPromptRun(run: InsertPromptRun): Promise<PromptRun>;
  updatePromptRun(id: string, data: Partial<PromptRun>): Promise<PromptRun | undefined>;

  // Scores
  getScoresByProject(projectId: string, startDate?: Date, endDate?: Date): Promise<Score[]>;
  createScore(score: InsertScore): Promise<Score>;

  // Citations
  getCitationsByRun(runId: string): Promise<Citation[]>;
  createCitation(citation: InsertCitation): Promise<Citation>;

  // Jobs
  getJob(id: string): Promise<Job | undefined>;
  getJobs(limit?: number): Promise<Job[]>;
  getPendingJobs(limit?: number): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  incrementJobAttempts(id: string): Promise<void>;
  updateJobStatus(id: string, status: string, error?: string): Promise<Job | undefined>;
  getJobStats(): Promise<{ pending: number; running: number; completed: number; failed: number }>;

  // Stats
  getDashboardStats(userId: string): Promise<{
    totalProjects: number;
    totalPrompts: number;
    totalRuns: number;
    totalCitations: number;
    recentRuns: { id: string; promptName: string; provider: string; executedAt: string; citationCount: number }[];
  }>;
  getProjectsWithStats(userId: string): Promise<(Project & { promptCount: number; brandCount: number; competitorCount: number })[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Organizations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    const result = await db
      .select({ organization: organizations })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId));
    return result.map((r) => r.organization);
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async updateOrganization(id: string, data: Partial<Organization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations).set(data).where(eq(organizations.id, id)).returning();
    return updated;
  }

  async addOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db.insert(organizationMembers).values(member).returning();
    return created;
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByOrganization(orgId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.organizationId, orgId));
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    const orgs = await this.getOrganizationsByUser(userId);
    if (orgs.length === 0) return [];
    
    const allProjects: Project[] = [];
    for (const org of orgs) {
      const orgProjects = await this.getProjectsByOrganization(org.id);
      allProjects.push(...orgProjects);
    }
    return allProjects;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Brands
  async getBrandsByProject(projectId: string): Promise<Brand[]> {
    return db.select().from(brands).where(eq(brands.projectId, projectId));
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [created] = await db.insert(brands).values(brand).returning();
    return created;
  }

  async deleteBrand(id: string): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }

  // Competitors
  async getCompetitorsByProject(projectId: string): Promise<Competitor[]> {
    return db.select().from(competitors).where(eq(competitors.projectId, projectId));
  }

  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const [created] = await db.insert(competitors).values(competitor).returning();
    return created;
  }

  async deleteCompetitor(id: string): Promise<void> {
    await db.delete(competitors).where(eq(competitors.id, id));
  }

  // Prompts
  async getPrompt(id: string): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt;
  }

  async getPromptsByProject(projectId: string): Promise<Prompt[]> {
    return db.select().from(prompts).where(eq(prompts.projectId, projectId));
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const [created] = await db.insert(prompts).values(prompt).returning();
    return created;
  }

  async updatePrompt(id: string, data: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const [updated] = await db.update(prompts).set(data).where(eq(prompts.id, id)).returning();
    return updated;
  }

  async deletePrompt(id: string): Promise<void> {
    await db.delete(prompts).where(eq(prompts.id, id));
  }

  // Prompt Runs
  async getPromptRun(id: string): Promise<PromptRun | undefined> {
    const [run] = await db.select().from(promptRuns).where(eq(promptRuns.id, id));
    return run;
  }

  async getPromptRunsByPrompt(promptId: string): Promise<PromptRun[]> {
    return db.select().from(promptRuns).where(eq(promptRuns.promptId, promptId)).orderBy(desc(promptRuns.executedAt));
  }

  async createPromptRun(run: InsertPromptRun): Promise<PromptRun> {
    const [created] = await db.insert(promptRuns).values(run).returning();
    return created;
  }

  async updatePromptRun(id: string, data: Partial<PromptRun>): Promise<PromptRun | undefined> {
    const [updated] = await db.update(promptRuns).set(data).where(eq(promptRuns.id, id)).returning();
    return updated;
  }

  async getPromptRunsByProject(projectId: string, limit = 50): Promise<PromptRun[]> {
    const projectPrompts = await this.getPromptsByProject(projectId);
    const promptIds = projectPrompts.map(p => p.id);
    if (promptIds.length === 0) return [];
    
    const runs = await db
      .select()
      .from(promptRuns)
      .where(sql`${promptRuns.promptId} IN (${sql.join(promptIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(promptRuns.executedAt))
      .limit(limit);
    return runs;
  }

  async getMonthlyRunCountByOrg(orgId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const orgProjects = await this.getProjectsByOrganization(orgId);
    if (orgProjects.length === 0) return 0;
    
    let totalRuns = 0;
    for (const project of orgProjects) {
      const projectPrompts = await this.getPromptsByProject(project.id);
      if (projectPrompts.length === 0) continue;
      
      const promptIds = projectPrompts.map(p => p.id);
      const [result] = await db
        .select({ count: count() })
        .from(promptRuns)
        .where(sql`${promptRuns.promptId} IN (${sql.join(promptIds.map(id => sql`${id}`), sql`, `)}) AND ${promptRuns.executedAt} >= ${startOfMonth}`);
      
      totalRuns += result?.count || 0;
    }
    
    return totalRuns;
  }

  // Scores
  async getScoresByProject(projectId: string, startDate?: Date, endDate?: Date): Promise<Score[]> {
    let query = db.select().from(scores).where(eq(scores.projectId, projectId));
    
    if (startDate && endDate) {
      return db.select().from(scores)
        .where(and(
          eq(scores.projectId, projectId),
          sql`${scores.calculatedAt} >= ${startDate}`,
          sql`${scores.calculatedAt} <= ${endDate}`
        ))
        .orderBy(desc(scores.calculatedAt));
    } else if (startDate) {
      return db.select().from(scores)
        .where(and(
          eq(scores.projectId, projectId),
          sql`${scores.calculatedAt} >= ${startDate}`
        ))
        .orderBy(desc(scores.calculatedAt));
    } else if (endDate) {
      return db.select().from(scores)
        .where(and(
          eq(scores.projectId, projectId),
          sql`${scores.calculatedAt} <= ${endDate}`
        ))
        .orderBy(desc(scores.calculatedAt));
    }
    
    return db.select().from(scores)
      .where(eq(scores.projectId, projectId))
      .orderBy(desc(scores.calculatedAt));
  }

  async createScore(score: InsertScore): Promise<Score> {
    const [created] = await db.insert(scores).values(score).returning();
    return created;
  }

  // Citations
  async getCitationsByRun(runId: string): Promise<Citation[]> {
    return db.select().from(citations).where(eq(citations.promptRunId, runId)).orderBy(citations.position);
  }

  async createCitation(citation: InsertCitation): Promise<Citation> {
    const [created] = await db.insert(citations).values(citation).returning();
    return created;
  }

  // Jobs
  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobQueue).where(eq(jobQueue.id, id));
    return job;
  }

  async getJobs(limit = 100): Promise<Job[]> {
    return db.select().from(jobQueue).orderBy(desc(jobQueue.createdAt)).limit(limit);
  }

  async getPendingJobs(limit = 10): Promise<Job[]> {
    return db
      .select()
      .from(jobQueue)
      .where(and(eq(jobQueue.status, "pending"), lte(jobQueue.scheduledFor, new Date())))
      .orderBy(jobQueue.scheduledFor)
      .limit(limit);
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [created] = await db.insert(jobQueue).values(job).returning();
    return created;
  }

  async updateJobStatus(id: string, status: string, error?: string): Promise<Job | undefined> {
    const updates: Partial<Job> = { status: status as Job["status"] };
    if (status === "running") {
      updates.startedAt = new Date();
    } else if (status === "completed" || status === "failed") {
      updates.completedAt = new Date();
    }
    if (error) {
      updates.error = error;
    }
    const [updated] = await db.update(jobQueue).set(updates).where(eq(jobQueue.id, id)).returning();
    return updated;
  }

  async getJobStats(): Promise<{ pending: number; running: number; completed: number; failed: number }> {
    const stats = await db
      .select({
        status: jobQueue.status,
        count: count(),
      })
      .from(jobQueue)
      .groupBy(jobQueue.status);

    const result = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const stat of stats) {
      result[stat.status as keyof typeof result] = stat.count;
    }
    return result;
  }

  async incrementJobAttempts(id: string): Promise<void> {
    await db
      .update(jobQueue)
      .set({ attempts: sql`${jobQueue.attempts} + 1` })
      .where(eq(jobQueue.id, id));
  }

  // Stats
  async getDashboardStats(userId: string): Promise<{
    totalProjects: number;
    totalPrompts: number;
    totalRuns: number;
    totalCitations: number;
    recentRuns: { id: string; promptName: string; provider: string; executedAt: string; citationCount: number }[];
  }> {
    const userProjects = await this.getProjectsByUser(userId);
    const projectIds = userProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return { totalProjects: 0, totalPrompts: 0, totalRuns: 0, totalCitations: 0, recentRuns: [] };
    }

    let totalPrompts = 0;
    let totalRuns = 0;
    let totalCitations = 0;
    const recentRuns: { id: string; promptName: string; provider: string; executedAt: string; citationCount: number }[] = [];

    for (const projectId of projectIds) {
      const projectPrompts = await this.getPromptsByProject(projectId);
      totalPrompts += projectPrompts.length;

      for (const prompt of projectPrompts) {
        const runs = await this.getPromptRunsByPrompt(prompt.id);
        totalRuns += runs.length;

        for (const run of runs) {
          const runCitations = await this.getCitationsByRun(run.id);
          totalCitations += runCitations.length;

          if (recentRuns.length < 5) {
            recentRuns.push({
              id: run.id,
              promptName: prompt.name,
              provider: run.provider,
              executedAt: run.executedAt.toISOString(),
              citationCount: runCitations.length,
            });
          }
        }
      }
    }

    return {
      totalProjects: projectIds.length,
      totalPrompts,
      totalRuns,
      totalCitations,
      recentRuns,
    };
  }

  async getProjectsWithStats(userId: string): Promise<(Project & { promptCount: number; brandCount: number; competitorCount: number })[]> {
    const userProjects = await this.getProjectsByUser(userId);
    const result: (Project & { promptCount: number; brandCount: number; competitorCount: number })[] = [];

    for (const project of userProjects) {
      const projectPrompts = await this.getPromptsByProject(project.id);
      const projectBrands = await this.getBrandsByProject(project.id);
      const projectCompetitors = await this.getCompetitorsByProject(project.id);

      result.push({
        ...project,
        promptCount: projectPrompts.length,
        brandCount: projectBrands.length,
        competitorCount: projectCompetitors.length,
      });
    }

    return result;
  }

  // Scheduler methods
  async getDuePrompts(now: Date): Promise<Prompt[]> {
    return db.select().from(prompts)
      .where(and(
        eq(prompts.isActive, true),
        eq(prompts.scheduleEnabled, true),
        sql`(${prompts.nextRunAt} IS NULL OR ${prompts.nextRunAt} <= ${now})`
      ));
  }

  async updatePromptSchedule(id: string, lastRunAt: Date, nextRunAt: Date): Promise<void> {
    await db.update(prompts)
      .set({ lastRunAt, nextRunAt })
      .where(eq(prompts.id, id));
  }

  async getRunningJobsForProject(projectId: string): Promise<number> {
    const result = await db.select({ count: count() })
      .from(jobQueue)
      .where(and(
        eq(jobQueue.projectId, projectId),
        eq(jobQueue.status, "running")
      ));
    return result[0]?.count || 0;
  }

  async getRunningJobsForOrg(organizationId: string): Promise<number> {
    const result = await db.select({ count: count() })
      .from(jobQueue)
      .where(and(
        eq(jobQueue.organizationId, organizationId),
        eq(jobQueue.status, "running")
      ));
    return result[0]?.count || 0;
  }

  async lockPendingJobs(limit: number, workerId: string): Promise<Job[]> {
    const now = new Date();
    const pendingJobs = await db.select()
      .from(jobQueue)
      .where(and(
        eq(jobQueue.status, "pending"),
        lte(jobQueue.scheduledFor, now),
        sql`${jobQueue.lockedAt} IS NULL`
      ))
      .orderBy(jobQueue.scheduledFor)
      .limit(limit);
    
    const lockedJobs: Job[] = [];
    for (const job of pendingJobs) {
      const [updated] = await db.update(jobQueue)
        .set({ lockedAt: now, lockedBy: workerId })
        .where(and(
          eq(jobQueue.id, job.id),
          sql`${jobQueue.lockedAt} IS NULL`
        ))
        .returning();
      if (updated) {
        lockedJobs.push(updated);
      }
    }
    return lockedJobs;
  }

  async scheduleJobRetry(id: string, retryAt: Date, error: string): Promise<void> {
    await db.update(jobQueue)
      .set({ 
        status: "pending",
        scheduledFor: retryAt,
        error,
        lockedAt: null,
        lockedBy: null
      })
      .where(eq(jobQueue.id, id));
  }

  async releaseJobLock(id: string): Promise<void> {
    await db.update(jobQueue)
      .set({ 
        lockedAt: null,
        lockedBy: null
      })
      .where(eq(jobQueue.id, id));
  }

  async incrementProjectUsage(projectId: string, amount: number): Promise<void> {
    await db.update(projects)
      .set({ currentMonthUsage: sql`COALESCE(${projects.currentMonthUsage}, 0) + ${amount}` })
      .where(eq(projects.id, projectId));
  }

  // Alert methods
  async getAlertRulesByProject(projectId: string): Promise<AlertRule[]> {
    return db.select().from(alertRules)
      .where(eq(alertRules.projectId, projectId))
      .orderBy(desc(alertRules.createdAt));
  }

  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    const [created] = await db.insert(alertRules).values(rule).returning();
    return created;
  }

  async updateAlertRule(id: string, data: Partial<InsertAlertRule>): Promise<AlertRule | undefined> {
    const [updated] = await db.update(alertRules).set(data).where(eq(alertRules.id, id)).returning();
    return updated;
  }

  async deleteAlertRule(id: string): Promise<void> {
    await db.delete(alertRules).where(eq(alertRules.id, id));
  }

  async getAlertEventsByProject(projectId: string, limit = 50): Promise<AlertEvent[]> {
    const rules = await this.getAlertRulesByProject(projectId);
    const ruleIds = rules.map(r => r.id);
    if (ruleIds.length === 0) return [];
    
    return db.select().from(alertEvents)
      .where(sql`${alertEvents.alertRuleId} IN (${sql.join(ruleIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(desc(alertEvents.createdAt))
      .limit(limit);
  }

  async createAlertEvent(event: InsertAlertEvent): Promise<AlertEvent> {
    const [created] = await db.insert(alertEvents).values(event).returning();
    return created;
  }

  async acknowledgeAlertEvent(id: string): Promise<void> {
    await db.update(alertEvents).set({ acknowledged: true }).where(eq(alertEvents.id, id));
  }

  // Audit log methods
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogsByProject(projectId: string, limit = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs)
      .where(eq(auditLogs.projectId, projectId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // Prompt template methods
  async getPromptTemplates(organizationId?: string): Promise<PromptTemplate[]> {
    if (organizationId) {
      return db.select().from(promptTemplates)
        .where(sql`${promptTemplates.isSystem} = true OR ${promptTemplates.organizationId} = ${organizationId}`)
        .orderBy(promptTemplates.category, promptTemplates.name);
    }
    return db.select().from(promptTemplates)
      .where(eq(promptTemplates.isSystem, true))
      .orderBy(promptTemplates.category, promptTemplates.name);
  }

  async createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate> {
    const [created] = await db.insert(promptTemplates).values(template).returning();
    return created;
  }

  // Project update method
  async updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
