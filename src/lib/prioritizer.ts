import type { PriorityResult } from "./types";

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
  gmail: 12,
  manual: 6,
  linkedin: 6,
  job_post: 4,
  discover: 0,
  calendar: 2,
};

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

export function calculatePriority(input: PriorityInput): PriorityResult {
  let score = 0;
  const reasons: string[] = [];

  const targetDate = input.deadline || input.due_at;

  if (isWithinHours(targetDate, 24)) {
    score += 50;
    reasons.push("Deadline is within 24 hours");
  } else if (isWithinHours(targetDate, 72)) {
    score += 20;
    reasons.push("Deadline is within 3 days");
  }

  if (input.action_type === "reply") {
    score += 30;
    reasons.push("Reply needed");
  } else if (input.stage === "Needs Reply") {
    score += 30;
    reasons.push("Reply needed");
  }

  if (input.stage === "Recruiter Chat") {
    score += 22;
    reasons.push("Active recruiter conversation");
  }

  if (input.stage === "Interview Scheduling") {
    score += 30;
    reasons.push("Scheduling request");
  }

  if (input.stage === "Interviewing" || input.stage === "OA Pending") {
    score += 18;
    reasons.push("Active interview process");
  }

  if (input.action_type === "oa") {
    score += 25;
    reasons.push("Online assessment pending");
  }

  if (isWithinLastHours(input.created_at, 48)) {
    score += 10;
    reasons.push("Recently received");
  }

  if (isWithinLastHours(input.updated_at, 24)) {
    score += 8;
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
    score -= 10;
  }

  if (input.stage === "Rejected" || input.stage === "Ghosted") {
    score -= 50;
  }

  if (reasons.length === 0) {
    reasons.push("Standard priority");
  }

  return { score: Math.max(score, 0), reasons };
}

export function getPrimaryReason(reasons: string[]): string {
  return reasons[0] ?? "Standard priority";
}
