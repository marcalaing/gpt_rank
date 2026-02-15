import { storage } from "../storage";
import type { PromptRun, AlertRule, Project } from "@shared/schema";

interface MentionData {
  brandMentioned?: boolean;
  brandMentionCount?: number;
  competitorMentions?: { id: string; name: string; count: number }[];
  citedDomains?: { domain: string; count: number }[];
}

export async function evaluateAlertsForRun(promptRun: PromptRun, project: Project): Promise<void> {
  const rules = await storage.getAlertRulesByProject(project.id);
  if (rules.length === 0) return;

  const mentions = promptRun.parsedMentions as MentionData | null;
  if (!mentions) return;

  const recentRuns = await storage.getPromptRunsByProject(project.id, 50);
  const last7Days = recentRuns.filter(r => {
    if (!r.executedAt) return false;
    const runDate = new Date(r.executedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return runDate >= weekAgo && r.id !== promptRun.id;
  });

  for (const rule of rules) {
    if (!rule.isActive) continue;

    try {
      switch (rule.type) {
        case "brand_mention_drop":
          await evaluateBrandMentionDrop(rule, mentions, last7Days, promptRun.id);
          break;
        case "competitor_spike":
          await evaluateCompetitorSpike(rule, mentions, last7Days, promptRun.id);
          break;
        case "new_domain_cited":
          await evaluateNewDomainCited(rule, mentions, last7Days, promptRun.id);
          break;
      }
    } catch (error) {
      console.error(`Alert evaluation error for rule ${rule.id}:`, error);
    }
  }
}

async function evaluateBrandMentionDrop(
  rule: AlertRule,
  currentMentions: MentionData,
  historicalRuns: PromptRun[],
  promptRunId: string
): Promise<void> {
  if (historicalRuns.length < 3) return;

  const historicalMentionCounts = historicalRuns.map(r => {
    const mentions = r.parsedMentions as MentionData | null;
    const count = mentions?.brandMentionCount ?? (mentions?.brandMentioned ? 1 : 0);
    return typeof count === 'number' && !isNaN(count) ? count : 0;
  });
  
  if (historicalMentionCounts.length === 0) return;
  const avgHistoricalMentions = historicalMentionCounts.reduce((a, b) => a + b, 0) / historicalMentionCounts.length;
  if (isNaN(avgHistoricalMentions)) return;
  const currentMentionCount = currentMentions.brandMentionCount || (currentMentions.brandMentioned ? 1 : 0);

  if (avgHistoricalMentions === 0) return;

  const threshold = rule.threshold || 20;
  const dropPercent = ((avgHistoricalMentions - currentMentionCount) / avgHistoricalMentions) * 100;

  if (dropPercent >= threshold) {
    await storage.createAlertEvent({
      alertRuleId: rule.id,
      promptRunId,
      message: `Brand mentions dropped by ${Math.round(dropPercent)}% compared to 7-day average`,
      metadata: { avgHistoricalMentions, currentMentionCount, dropPercent },
    });
  }
}

async function evaluateCompetitorSpike(
  rule: AlertRule,
  currentMentions: MentionData,
  historicalRuns: PromptRun[],
  promptRunId: string
): Promise<void> {
  if (!currentMentions.competitorMentions || currentMentions.competitorMentions.length === 0) return;
  if (historicalRuns.length < 3) return;

  const historicalCompetitorCounts = new Map<string, number[]>();
  for (const run of historicalRuns) {
    const mentions = run.parsedMentions as MentionData | null;
    if (mentions?.competitorMentions) {
      for (const cm of mentions.competitorMentions) {
        const counts = historicalCompetitorCounts.get(cm.name) || [];
        counts.push(cm.count);
        historicalCompetitorCounts.set(cm.name, counts);
      }
    }
  }

  const threshold = rule.threshold || 50;
  for (const current of currentMentions.competitorMentions) {
    const historicalCounts = historicalCompetitorCounts.get(current.name) || [];
    if (historicalCounts.length === 0) continue;

    const avgHistorical = historicalCounts.reduce((a, b) => a + b, 0) / historicalCounts.length;
    if (avgHistorical === 0) continue;

    const spikePercent = ((current.count - avgHistorical) / avgHistorical) * 100;
    if (spikePercent >= threshold) {
      await storage.createAlertEvent({
        alertRuleId: rule.id,
        promptRunId,
        message: `Competitor "${current.name}" mentions spiked by ${Math.round(spikePercent)}%`,
        metadata: { competitor: current.name, avgHistorical, currentCount: current.count, spikePercent },
      });
    }
  }
}

async function evaluateNewDomainCited(
  rule: AlertRule,
  currentMentions: MentionData,
  historicalRuns: PromptRun[],
  promptRunId: string
): Promise<void> {
  if (!currentMentions.citedDomains || currentMentions.citedDomains.length === 0) return;

  const knownDomains = new Set<string>();
  for (const run of historicalRuns) {
    const mentions = run.parsedMentions as MentionData | null;
    if (mentions?.citedDomains) {
      for (const cd of mentions.citedDomains) {
        knownDomains.add(cd.domain.toLowerCase());
      }
    }
  }

  for (const domain of currentMentions.citedDomains) {
    if (!knownDomains.has(domain.domain.toLowerCase())) {
      await storage.createAlertEvent({
        alertRuleId: rule.id,
        promptRunId,
        message: `New domain cited: ${domain.domain}`,
        metadata: { domain: domain.domain, count: domain.count },
      });
    }
  }
}
