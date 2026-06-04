import type { ActionWithOpportunity, Opportunity } from "@/lib/types";
import {
  calculatePriority,
  normalizeStoredPriorityScore,
} from "@/lib/prioritizer";

export interface NeedsReplyItem {
  key: string;
  opportunityId: string;
  actionId: string | null;
  company: string | null;
  role: string | null;
  headline: string;
  reason: string;
  priorityScore: number;
}

const INACTIVE_STAGES = new Set(["Rejected", "Ghosted", "Offer"]);

const REPLY_KEYWORDS =
  /\b(reply|respond|get back|follow up|follow-up|let me know|confirm your interest|are you interested|would you be interested|hear back)\b/i;

const SCHEDULING_KEYWORDS =
  /\b(schedule|availability|calendar|book a time|phone screen|interview slot|set up a call)\b/i;

function textLooksLikeReply(text: string): boolean {
  if (!REPLY_KEYWORDS.test(text)) return false;
  if (SCHEDULING_KEYWORDS.test(text) && !/\breply\b/i.test(text)) return false;
  return true;
}

export function actionNeedsReplyReason(
  action: ActionWithOpportunity
): string | null {
  if (action.status !== "pending") return null;

  const stage = action.opportunity?.stage;
  if (stage && INACTIVE_STAGES.has(stage)) return null;

  if (action.action_type === "reply") return action.title;

  if (action.action_type === "oa" || action.action_type === "schedule") {
    return null;
  }

  const blob = `${action.title} ${action.description ?? ""}`;
  if (textLooksLikeReply(blob)) return action.title;

  return null;
}

export function opportunityNeedsReplyReason(
  opportunity: Opportunity
): string | null {
  if (INACTIVE_STAGES.has(opportunity.stage)) return null;

  if (opportunity.stage === "Needs Reply") {
    return opportunity.next_action ?? "Reply to recruiter message";
  }

  if (
    opportunity.next_action &&
    textLooksLikeReply(opportunity.next_action)
  ) {
    return opportunity.next_action;
  }

  return null;
}

export function detectNeedsReply(
  opportunities: Opportunity[],
  actions: ActionWithOpportunity[]
): NeedsReplyItem[] {
  const items: NeedsReplyItem[] = [];
  const coveredOpportunityIds = new Set<string>();

  for (const action of actions) {
    const reason = actionNeedsReplyReason(action);
    if (!reason) continue;

    const opportunityId =
      action.opportunity_id ?? action.opportunity?.id ?? null;
    if (!opportunityId) continue;

    coveredOpportunityIds.add(opportunityId);
    const opp = action.opportunity;

    const priority = calculatePriority({
      stage: opp?.stage,
      action_type: action.action_type,
      deadline: opp?.deadline,
      due_at: action.due_at,
      created_at: action.created_at,
      updated_at: opp?.updated_at,
      source: opp?.source,
    });

    items.push({
      key: `action-${action.id}`,
      opportunityId,
      actionId: action.id,
      company: opp?.company ?? null,
      role: opp?.role_title ?? null,
      headline: action.title,
      reason,
      priorityScore: Math.max(
        normalizeStoredPriorityScore(action.priority_score),
        priority.score
      ),
    });
  }

  for (const opportunity of opportunities) {
    if (coveredOpportunityIds.has(opportunity.id)) continue;

    const reason = opportunityNeedsReplyReason(opportunity);
    if (!reason) continue;

    const priority = calculatePriority({
      stage: opportunity.stage,
      action_type: "reply",
      deadline: opportunity.deadline,
      created_at: opportunity.created_at,
      updated_at: opportunity.updated_at,
      source: opportunity.source,
    });

    items.push({
      key: `opportunity-${opportunity.id}`,
      opportunityId: opportunity.id,
      actionId: null,
      company: opportunity.company,
      role: opportunity.role_title,
      headline: reason,
      reason,
      priorityScore: Math.max(
        normalizeStoredPriorityScore(opportunity.priority_score),
        priority.score
      ),
    });
  }

  return items.sort((a, b) => b.priorityScore - a.priorityScore);
}
