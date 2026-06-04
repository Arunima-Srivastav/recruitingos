import type { PriorityResult } from "./types";

interface PriorityInput {
  stage?: string | null;
  action_type?: string | null;
  deadline?: string | null;
  due_at?: string | null;
  created_at?: string | null;
}

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

  if (input.stage === "Interview Scheduling") {
    score += 30;
    reasons.push("Scheduling request");
  }

  if (input.action_type === "oa") {
    score += 25;
    reasons.push("Online assessment pending");
  }

  if (isWithinLastHours(input.created_at, 48)) {
    score += 10;
    reasons.push("Recently received");
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
