import type { RecruitingCalendarEvent } from "./types";

function formatGoogleUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
}

function formatGoogleDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildGoogleCalendarUrl(event: RecruitingCalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description,
  });

  if (event.allDay) {
    params.set(
      "dates",
      `${formatGoogleDate(event.start)}/${formatGoogleDate(event.end)}`
    );
  } else {
    params.set(
      "dates",
      `${formatGoogleUtc(event.start)}/${formatGoogleUtc(event.end)}`
    );
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildCalendarExportUrl(filters?: {
  opportunityId?: string;
  actionId?: string;
}): string {
  const params = new URLSearchParams();
  if (filters?.opportunityId) {
    params.set("opportunity_id", filters.opportunityId);
  }
  if (filters?.actionId) {
    params.set("action_id", filters.actionId);
  }
  const query = params.toString();
  return query ? `/api/calendar/export?${query}` : "/api/calendar/export";
}
