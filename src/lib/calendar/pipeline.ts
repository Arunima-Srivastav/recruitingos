import type { ActionWithOpportunity, Opportunity } from "@/lib/types";
import { CALENDAR_SCHEDULING_STAGES } from "@/lib/constants";
import type { CalendarEventLink } from "./types";
import { recruitingEventKey } from "@/lib/google/calendar";

export interface PipelineCalendarItem {
  id: string;
  itemType: "opportunity" | "action";
  opportunityId: string;
  title: string;
  company: string | null;
  role: string | null;
  stage: string;
  date: string | null;
  onCalendar: boolean;
  syncedToGoogle: boolean;
}

const SCHEDULING_TEXT =
  /schedule|availability|calendar|call|chat|meet|book a time|phone screen|interview/i;

function isSchedulingStage(stage: string): boolean {
  return (CALENDAR_SCHEDULING_STAGES as readonly string[]).includes(stage);
}

function isSchedulingOpportunity(opportunity: Opportunity): boolean {
  if (!isSchedulingStage(opportunity.stage)) return false;

  if (
    opportunity.stage === "Recruiter Chat" ||
    opportunity.stage === "Interview Scheduling"
  ) {
    return true;
  }

  if (opportunity.stage === "Needs Reply") {
    return SCHEDULING_TEXT.test(
      `${opportunity.next_action ?? ""} ${opportunity.notes ?? ""}`
    );
  }

  if (opportunity.stage === "Interviewing") {
    return Boolean(opportunity.deadline);
  }

  return false;
}

function isSchedulingAction(action: ActionWithOpportunity): boolean {
  if (action.status !== "pending") return false;
  if (action.action_type === "oa") return false;

  const stage = action.opportunity?.stage ?? "New";
  if (!isSchedulingStage(stage)) return false;

  if (action.action_type === "schedule" || action.action_type === "reply") {
    return true;
  }

  return SCHEDULING_TEXT.test(action.title);
}

export function buildPipelineCalendarItems(
  opportunities: Opportunity[],
  actions: ActionWithOpportunity[],
  links: CalendarEventLink[]
): PipelineCalendarItem[] {
  const syncedKeys = new Set(
    links.map((link) => recruitingEventKey(link.source_kind, link.source_id))
  );

  const items: PipelineCalendarItem[] = [];
  const seenOpportunityIds = new Set<string>();

  for (const opportunity of opportunities) {
    if (!isSchedulingOpportunity(opportunity)) continue;

    seenOpportunityIds.add(opportunity.id);
    items.push({
      id: opportunity.id,
      itemType: "opportunity",
      opportunityId: opportunity.id,
      title:
        opportunity.stage === "Recruiter Chat"
          ? `Recruiter call: ${opportunity.company ?? "Opportunity"}`
          : `${opportunity.company ?? "Opportunity"} · ${opportunity.role_title ?? "Role TBD"}`,
      company: opportunity.company,
      role: opportunity.role_title,
      stage: opportunity.stage,
      date: opportunity.deadline,
      onCalendar: Boolean(opportunity.deadline),
      syncedToGoogle: syncedKeys.has(
        recruitingEventKey("deadline", opportunity.id)
      ),
    });
  }

  for (const action of actions) {
    if (!isSchedulingAction(action)) continue;

    const opp = action.opportunity;
    if (opp && seenOpportunityIds.has(opp.id)) {
      // Opportunity row is the primary scheduling target; skip the paired action
      // unless it already has its own due date on the calendar.
      if (!action.due_at) continue;
      const parentOpp = opportunities.find((o) => o.id === opp.id);
      if (parentOpp?.deadline && action.due_at === parentOpp.deadline) continue;
    }

    items.push({
      id: action.id,
      itemType: "action",
      opportunityId: action.opportunity_id ?? opp?.id ?? action.id,
      title: action.title,
      company: opp?.company ?? null,
      role: opp?.role_title ?? null,
      stage: opp?.stage ?? "New",
      date: action.due_at,
      onCalendar: Boolean(action.due_at),
      syncedToGoogle: syncedKeys.has(recruitingEventKey("action", action.id)),
    });
  }

  return items.sort((a, b) => {
    if (a.onCalendar !== b.onCalendar) return a.onCalendar ? 1 : -1;
    return (a.company ?? a.title).localeCompare(b.company ?? b.title);
  });
}

export function guessCompanyFromEventTitle(title: string): string {
  const trimmed = title.trim();
  const colon = trimmed.split(":")[0]?.trim();
  if (colon && colon.length <= 40) return colon;
  const dash = trimmed.split(/\s[-–—]\s/)[0]?.trim();
  if (dash && dash.length <= 40) return dash;
  const first = trimmed.split(/\s+/)[0];
  return first || trimmed.slice(0, 40);
}

export function guessStageFromEventTitle(title: string): string {
  const lower = title.toLowerCase();
  if (/interview|screen|onsite|final round|phone screen/.test(lower)) {
    return isSchedulingFocusedTitle(lower)
      ? "Interview Scheduling"
      : "Interviewing";
  }
  if (/schedule|availability|call|chat|meet|calendar|book a time/.test(lower)) {
    return "Recruiter Chat";
  }
  if (/assessment|oa|hackerrank|codesignal/.test(lower)) return "OA Pending";
  if (/offer|congratulations/.test(lower)) return "Offer";
  return "Recruiter Chat";
}

function isSchedulingFocusedTitle(lower: string): boolean {
  const scheduling = ["available", "schedule", "chat", "call", "meet", "calendar"];
  const interview = ["interview", "final round", "technical interview", "phone screen"];
  const schedCount = scheduling.filter((k) => lower.includes(k)).length;
  const intCount = interview.filter((k) => lower.includes(k)).length;
  return schedCount >= intCount && schedCount > 0;
}
