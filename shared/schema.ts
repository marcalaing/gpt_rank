import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const providerEnum = pgEnum("provider", ["openai", "anthropic", "perplexity", "gemini"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "running", "completed", "failed"]);
export const alertTypeEnum = pgEnum("alert_type", ["score_drop", "competitor_gain", "mention_spike", "new_citation", "brand_mention_drop", "competitor_spike", "new_domain_cited", "budget_exceeded"]);
export const cadenceEnum = pgEnum("cadence", ["daily", "weekly"]);
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "budget_change", "subscription_change"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  organizationMembers: many(organizationMembers),
}));

// Subscription tier enum
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "starter", "pro", "enterprise"]);

// Organizations table (multi-tenant)
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("free"),
  subscriptionStatus: text("subscription_status"), // active, canceled, past_due
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  projects: many(projects),
}));

// Organization Members (join table)
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // admin, member
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
}));

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  monthlyBudgetSoft: real("monthly_budget_soft"), // soft limit in dollars
  monthlyBudgetHard: real("monthly_budget_hard"), // hard limit in dollars
  currentMonthUsage: real("current_month_usage").default(0), // current month spend
  usageResetAt: timestamp("usage_reset_at"), // when to reset monthly usage
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  brands: many(brands),
  competitors: many(competitors),
  prompts: many(prompts),
  scores: many(scores),
}));

// Brands table (with synonyms)
export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain"),
  synonyms: text("synonyms").array(), // alternative names/spellings
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brandsRelations = relations(brands, ({ one }) => ({
  project: one(projects, { fields: [brands.projectId], references: [projects.id] }),
}));

// Competitors table (with synonyms)
export const competitors = pgTable("competitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  domain: text("domain"),
  synonyms: text("synonyms").array(), // alternative names/spellings
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const competitorsRelations = relations(competitors, ({ one }) => ({
  project: one(projects, { fields: [competitors.projectId], references: [projects.id] }),
}));

// Prompts table (with tags, locale, enhanced schedule)
export const prompts = pgTable("prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  template: text("template").notNull(),
  tags: text("tags").array(), // for categorization
  locale: text("locale").default("en"), // language/region
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  scheduleEnabled: boolean("schedule_enabled").notNull().default(false),
  scheduleCron: text("schedule_cron"), // cron expression
  cadence: cadenceEnum("cadence").default("weekly"), // daily or weekly
  lastRunAt: timestamp("last_run_at"), // last scheduled run time
  nextRunAt: timestamp("next_run_at"), // next scheduled run time
  volumeScore: integer("volume_score"), // 1-10 search demand score
  aiLikeliness: integer("ai_likeliness"), // 1-10 AI search likelihood
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  project: one(projects, { fields: [prompts.projectId], references: [projects.id] }),
  runs: many(promptRuns),
}));

// Provider Models table
export const providerModels = pgTable("provider_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: providerEnum("provider").notNull(),
  modelId: text("model_id").notNull(), // e.g., "gpt-4o", "claude-3-opus"
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prompt Runs table (with model, cost fields)
export const promptRuns = pgTable("prompt_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptId: varchar("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  provider: providerEnum("provider").notNull(),
  model: text("model"), // specific model used
  rawResponse: text("raw_response"),
  parsedMentions: jsonb("parsed_mentions"), // extracted brand/competitor mentions
  responseMetadata: jsonb("response_metadata"), // tokens, timing, cost, etc.
  cost: real("cost"), // API cost in dollars
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const promptRunsRelations = relations(promptRuns, ({ one, many }) => ({
  prompt: one(prompts, { fields: [promptRuns.promptId], references: [prompts.id] }),
  citations: many(citations),
  scores: many(scores),
}));

// Citations table (sources mentioned in responses)
export const citations = pgTable("citations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptRunId: varchar("prompt_run_id").notNull().references(() => promptRuns.id, { onDelete: "cascade" }),
  url: text("url"),
  title: text("title"),
  snippet: text("snippet"),
  position: integer("position"), // rank in the response
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const citationsRelations = relations(citations, ({ one }) => ({
  promptRun: one(promptRuns, { fields: [citations.promptRunId], references: [promptRuns.id] }),
}));

// Scores table (visibility scores for brands)
export const scores = pgTable("scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  promptRunId: varchar("prompt_run_id").references(() => promptRuns.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // "brand" or "competitor"
  entityId: varchar("entity_id").notNull(), // brand or competitor ID
  provider: providerEnum("provider").notNull(),
  score: real("score").notNull(), // 0-100 visibility score
  mentionCount: integer("mention_count").default(0),
  sentimentScore: real("sentiment_score"), // -1 to 1
  positionScore: real("position_score"), // how early mentioned (0-100)
  citationScore: real("citation_score"), // how many citations point to entity
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const scoresRelations = relations(scores, ({ one }) => ({
  project: one(projects, { fields: [scores.projectId], references: [projects.id] }),
  promptRun: one(promptRuns, { fields: [scores.promptRunId], references: [promptRuns.id] }),
}));

// Alert Rules table
export const alertRules = pgTable("alert_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: alertTypeEnum("type").notNull(),
  threshold: real("threshold"), // e.g., score drops below 50
  isActive: boolean("is_active").notNull().default(true),
  notifyEmail: boolean("notify_email").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Alert Events table
export const alertEvents = pgTable("alert_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertRuleId: varchar("alert_rule_id").notNull().references(() => alertRules.id, { onDelete: "cascade" }),
  promptRunId: varchar("prompt_run_id").references(() => promptRuns.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  acknowledged: boolean("acknowledged").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Job Queue table (DB-backed job queue)
export const jobQueue = pgTable("job_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // prompt_run, score_calculation, etc.
  payload: jsonb("payload").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  error: text("error"),
  scheduledFor: timestamp("scheduled_for").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }), // for concurrency limiting
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // for concurrency limiting
  lockedAt: timestamp("locked_at"), // for job locking
  lockedBy: text("locked_by"), // worker identifier
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Log table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type").notNull(), // prompt, competitor, brand, project, subscription
  entityId: varchar("entity_id"),
  action: auditActionEnum("action").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prompt Templates table (library of reusable templates)
export const promptTemplates = pgTable("prompt_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // SEO, product_comparison, best_x_for_y
  template: text("template").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false), // system templates vs user-created
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // null for system templates
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true, createdAt: true });
export const insertCompetitorSchema = createInsertSchema(competitors).omit({ id: true, createdAt: true });
export const insertPromptSchema = createInsertSchema(prompts).omit({ id: true, createdAt: true });
export const insertProviderModelSchema = createInsertSchema(providerModels).omit({ id: true, createdAt: true });
export const insertPromptRunSchema = createInsertSchema(promptRuns).omit({ id: true, executedAt: true });
export const insertCitationSchema = createInsertSchema(citations).omit({ id: true, createdAt: true });
export const insertScoreSchema = createInsertSchema(scores).omit({ id: true, calculatedAt: true });
export const insertAlertRuleSchema = createInsertSchema(alertRules).omit({ id: true, createdAt: true });
export const insertAlertEventSchema = createInsertSchema(alertEvents).omit({ id: true, createdAt: true });
export const insertJobSchema = createInsertSchema(jobQueue).omit({ id: true, createdAt: true, startedAt: true, completedAt: true, lockedAt: true, lockedBy: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertPromptTemplateSchema = createInsertSchema(promptTemplates).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Prompt = typeof prompts.$inferSelect;
export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type ProviderModel = typeof providerModels.$inferSelect;
export type InsertProviderModel = z.infer<typeof insertProviderModelSchema>;
export type PromptRun = typeof promptRuns.$inferSelect;
export type InsertPromptRun = z.infer<typeof insertPromptRunSchema>;
export type Citation = typeof citations.$inferSelect;
export type InsertCitation = z.infer<typeof insertCitationSchema>;
export type Score = typeof scores.$inferSelect;
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = z.infer<typeof insertAlertRuleSchema>;
export type AlertEvent = typeof alertEvents.$inferSelect;
export type InsertAlertEvent = z.infer<typeof insertAlertEventSchema>;
export type Job = typeof jobQueue.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = z.infer<typeof insertPromptTemplateSchema>;

// Login schema (for auth)
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

// Free search schema
export const freeSearchSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  prompt: z.string().min(1, "Search prompt is required"),
  domain: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type FreeSearchInput = z.infer<typeof freeSearchSchema>;

// Re-export chat models for integration
export * from "./models/chat";
