import { STAGES } from "../constants";
import { normalizeStoredPriorityScore } from "../prioritizer";
import type { Opportunity } from "../types";

const STAGE_RANK = new Map(STAGES.map((stage, index) => [stage, index]));

function stageRank(stage: string): number {
  return STAGE_RANK.get(stage as (typeof STAGES)[number]) ?? 0;
}

export function pickMergedStage(primary: string, secondary: string): string {
  const inactive = new Set(["Rejected", "Ghosted"]);
  if (inactive.has(primary) && !inactive.has(secondary)) return secondary;
  if (inactive.has(secondary) && !inactive.has(primary)) return primary;
  return stageRank(primary) >= stageRank(secondary) ? primary : secondary;
}

export function pickMergedDeadline(
  a: string | null,
  b: string | null
): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

export function pickMergedSource(primary: Opportunity, secondary: Opportunity): string {
  const rank: Record<string, number> = {
    gmail: 3,
    manual: 2,
    discover: 1,
    job_post: 2,
    linkedin: 2,
    calendar: 1,
  };
  const primaryRank = rank[primary.source] ?? 0;
  const secondaryRank = rank[secondary.source] ?? 0;
  return secondaryRank > primaryRank ? secondary.source : primary.source;
}

export function mergeOpportunityFields(
  primary: Opportunity,
  secondary: Opportunity
): Partial<Opportunity> {
  const notes = [primary.notes, secondary.notes]
    .filter((n): n is string => Boolean(n?.trim()))
    .join("\n\n");

  const nextAction =
    stageRank(primary.stage) >= stageRank(secondary.stage)
      ? primary.next_action ?? secondary.next_action
      : secondary.next_action ?? primary.next_action;

  return {
    company: primary.company ?? secondary.company,
    role_title: primary.role_title ?? secondary.role_title,
    source: pickMergedSource(primary, secondary),
    stage: pickMergedStage(primary.stage, secondary.stage),
    priority_score: Math.max(
      normalizeStoredPriorityScore(primary.priority_score),
      normalizeStoredPriorityScore(secondary.priority_score)
    ),
    deadline: pickMergedDeadline(primary.deadline, secondary.deadline),
    next_action: nextAction,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };
}
