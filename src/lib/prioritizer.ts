import type { PriorityResult } from "./types";

export const MIN_PRIORITY = 1;
export const MAX_PRIORITY = 10;

interface PriorityInput {
  stage?: string | null;
  action_type?: string | null;
  deadline?: string | null;
  due_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  source?: string | null;
}

const SOURCE_BOOST: Record<string, number> = {
  gmail: 1,
  manual: 0.5,
  linkedin: 0.5,
  job_post: 0.3,
  discover: 0,
  calendar: 0.2,
};

const INACTIVE_STAGES = new Set(["Rejected", "Ghosted"]);

function hoursUntil(dateStr: string): number | null {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return (date.getTime() - Date.now()) / (1000 * 60 * 60);
}

function isWithinHours(dateStr: string | null | undefined, hours: number): boolean {
  if (!dateStr) return false;
  const remaining = hoursUntil(dateStr);
  if (remaining === null) return false;
  return remaining >= 0 && remaining <= hours;
}

function isWithinLastHours(dateStr: string | null | undefined, hours: number): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours <= hours;
}

function clampPriority(score: number): number {
  return Math.min(MAX_PRIORITY, Math.max(MIN_PRIORITY, Math.round(score)));
}

/** Maps legacy 0-100+ stored scores to the current 1-10 scale. */
export function normalizeStoredPriorityScore(stored: number): number {
  if (!Number.isFinite(stored)) return MIN_PRIORITY;
  if (stored <= MAX_PRIORITY) {
    return clampPriority(stored);
  }
  return clampPriority(stored / 10);
}

export function calculatePriority(input: PriorityInput): PriorityResult {
  if (input.stage && INACTIVE_STAGES.has(input.stage)) {
    return { score: MIN_PRIORITY, reasons: ["Inactive opportunity"] };
  }

  let score = 3;
  const reasons: string[] = [];

  const targetDate = input.deadline || input.due_at;

  if (isWithinHours(targetDate, 24)) {
    score += 3;
    reasons.push("Deadline is within 24 hours");
  } else if (isWithinHours(targetDate, 72)) {
    score += 1;
    reasons.push("Deadline is within 3 days");
  }

  if (input.action_type === "reply") {
    score += 3;
    reasons.push("Reply needed");
  } else if (input.stage === "Needs Reply") {
    score += 3;
    reasons.push("Reply needed");
  }

  if (input.stage === "Recruiter Chat") {
    score += 2;
    reasons.push("Active recruiter conversation");
  }

  if (input.stage === "Interview Scheduling") {
    score += 3;
    reasons.push("Scheduling request");
  }

  if (input.stage === "Interviewing" || input.stage === "OA Pending") {
    score += 2;
    reasons.push("Active interview process");
  }

  if (input.action_type === "oa") {
    score += 2;
    reasons.push("Online assessment pending");
  }

  if (isWithinLastHours(input.created_at, 48)) {
    score += 1;
    reasons.push("Recently received");
  }

  if (isWithinLastHours(input.updated_at, 24)) {
    score += 1;
    reasons.push("Recently updated");
  }

  const sourceBoost = SOURCE_BOOST[input.source ?? ""] ?? 0;
  if (sourceBoost > 0) {
    score += sourceBoost;
    if (input.source === "gmail") {
      reasons.push("Gmail thread");
    }
  }

  if (input.stage === "Waiting") {
    score -= 1;
  }

  if (reasons.length === 0) {
    reasons.push("Standard priority");
  }

  return { score: clampPriority(score), reasons };
}

export function getPrimaryReason(reasons: string[]): string {
  return reasons[0] ?? "Standard priority";
}
