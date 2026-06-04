import type { Action, ActionWithOpportunity, Opportunity } from "@/lib/types";
import type { RecruitingCalendarEvent } from "./types";

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isMidnightUtc(date: Date): boolean {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function opportunityLabel(opp: Opportunity | null | undefined): string {
  const company = opp?.company ?? "Unknown company";
  const role = opp?.role_title ?? "Role TBD";
  return `${company} · ${role}`;
}

function buildDeadlineEvent(
  opportunity: Opportunity,
  appBase: string
): RecruitingCalendarEvent | null {
  if (!opportunity.deadline) return null;

  const start = parseDate(opportunity.deadline);
  if (!start) return null;

  const allDay = isMidnightUtc(start);
  const eventStart = allDay ? startOfUtcDay(start) : start;
  const eventEnd = allDay ? addUtcDays(eventStart, 1) : addUtcHours(eventStart, 1);

  return {
    uid: `deadline-${opportunity.id}@recruitingos`,
    kind: "deadline",
    title: `Deadline: ${opportunityLabel(opportunity)}`,
    description: [
      opportunity.next_action
        ? `Next action: ${opportunity.next_action}`
        : null,
      opportunity.notes,
      `${appBase}/opportunities/${opportunity.id}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: eventStart,
    end: eventEnd,
    allDay,
    opportunityId: opportunity.id,
    sourceId: opportunity.id,
  };
}

function buildActionEvent(
  action: Action | ActionWithOpportunity,
  appBase: string
): RecruitingCalendarEvent | null {
  if (action.status !== "pending" || !action.due_at) return null;

  const start = parseDate(action.due_at);
  if (!start) return null;

  const opp =
    "opportunity" in action ? action.opportunity : null;
  const allDay = isMidnightUtc(start);
  const eventStart = allDay ? startOfUtcDay(start) : start;
  const eventEnd = allDay ? addUtcDays(eventStart, 1) : addUtcHours(eventStart, 1);

  return {
    uid: `action-${action.id}@recruitingos`,
    kind: "action",
    title: `${action.title} (${opportunityLabel(opp)})`,
    description: [
      action.description,
      `Type: ${action.action_type}`,
      action.opportunity_id
        ? `${appBase}/opportunities/${action.opportunity_id}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
    start: eventStart,
    end: eventEnd,
    allDay,
    opportunityId: action.opportunity_id,
    sourceId: action.id,
  };
}

export function buildCalendarEvents(
  opportunities: Opportunity[],
  actions: Array<Action | ActionWithOpportunity>,
  appBase = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
): RecruitingCalendarEvent[] {
  const events: RecruitingCalendarEvent[] = [];

  for (const opportunity of opportunities) {
    const deadlineEvent = buildDeadlineEvent(opportunity, appBase);
    if (deadlineEvent) events.push(deadlineEvent);
  }

  for (const action of actions) {
    const actionEvent = buildActionEvent(action, appBase);
    if (actionEvent) events.push(actionEvent);
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function filterCalendarEvents(
  events: RecruitingCalendarEvent[],
  filters: { opportunityId?: string | null; actionId?: string | null }
): RecruitingCalendarEvent[] {
  let filtered = events;

  if (filters.opportunityId) {
    filtered = filtered.filter(
      (event) => event.opportunityId === filters.opportunityId
    );
  }

  if (filters.actionId) {
    filtered = filtered.filter(
      (event) => event.kind === "action" && event.sourceId === filters.actionId
    );
  }

  return filtered;
}
