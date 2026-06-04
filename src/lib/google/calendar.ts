import type { RecruitingCalendarEvent } from "@/lib/calendar/types";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const RECRUITINGOS_UID_KEY = "recruitingos_uid";
const RECRUITINGOS_CUSTOM_ID_KEY = "recruitingos_custom_id";

export interface GoogleCalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  htmlLink?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

interface GoogleEventListResponse {
  items?: GoogleCalendarEventItem[];
}

function recruitingEventBody(event: RecruitingCalendarEvent) {
  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description,
    extendedProperties: {
      private: {
        [RECRUITINGOS_UID_KEY]: event.uid,
        recruitingos_source_kind: event.kind,
        recruitingos_source_id: event.sourceId,
        recruitingos_opportunity_id: event.opportunityId ?? "",
      },
    },
  };

  if (event.allDay) {
    const startDate = event.start.toISOString().slice(0, 10);
    const endDate = event.end.toISOString().slice(0, 10);
    body.start = { date: startDate };
    body.end = { date: endDate };
  } else {
    body.start = { dateTime: event.start.toISOString() };
    body.end = { dateTime: event.end.toISOString() };
  }

  return body;
}

function isRecruitingOsGoogleEvent(item: GoogleCalendarEventItem): boolean {
  const props = item.extendedProperties?.private;
  return Boolean(props?.[RECRUITINGOS_UID_KEY] || props?.[RECRUITINGOS_CUSTOM_ID_KEY]);
}

export interface CustomCalendarEventInput {
  id: string;
  title: string;
  description?: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
}

function customEventBody(event: CustomCalendarEventInput) {
  const body: Record<string, unknown> = {
    summary: event.title,
    description: event.description ?? "",
    extendedProperties: {
      private: {
        [RECRUITINGOS_CUSTOM_ID_KEY]: event.id,
      },
    },
  };

  if (event.allDay) {
    body.start = { date: event.start.toISOString().slice(0, 10) };
    body.end = { date: event.end.toISOString().slice(0, 10) };
  } else {
    body.start = { dateTime: event.start.toISOString() };
    body.end = { dateTime: event.end.toISOString() };
  }

  return body;
}

export async function createCustomGoogleCalendarEvent(
  accessToken: string,
  event: CustomCalendarEventInput,
  calendarId = "primary"
): Promise<{ id: string; htmlLink?: string }> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(customEventBody(event)),
    }
  );

  const data = (await res.json()) as GoogleCalendarEventItem & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? "Failed to create Google Calendar event");
  }

  return { id: data.id, htmlLink: data.htmlLink };
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarId = "primary"
): Promise<GoogleCalendarEventItem[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = (await res.json()) as GoogleEventListResponse & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? "Failed to load Google Calendar events");
  }

  return data.items ?? [];
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: RecruitingCalendarEvent,
  calendarId = "primary"
): Promise<string> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recruitingEventBody(event)),
    }
  );

  const data = (await res.json()) as GoogleCalendarEventItem & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message ?? "Failed to create Google Calendar event");
  }

  return data.id;
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  googleEventId: string,
  event: RecruitingCalendarEvent,
  calendarId = "primary"
): Promise<void> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recruitingEventBody(event)),
    }
  );

  if (!res.ok) {
    const data = (await res.json()) as { error?: { message?: string } };
    throw new Error(data.error?.message ?? "Failed to update Google Calendar event");
  }
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  googleEventId: string,
  calendarId = "primary"
): Promise<void> {
  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    const data = (await res.json()) as { error?: { message?: string } };
    throw new Error(data.error?.message ?? "Failed to delete Google Calendar event");
  }
}

export function googleEventToDisplay(
  item: GoogleCalendarEventItem,
  importedToPipeline = false
) {
  const allDay = Boolean(item.start.date);
  const start = item.start.dateTime ?? item.start.date ?? "";
  const end = item.end.dateTime ?? item.end.date ?? start;

  return {
    id: `google-${item.id}`,
    source: "google" as const,
    title: item.summary || "Untitled event",
    description: item.description,
    start: allDay ? `${start}T00:00:00.000Z` : start,
    end: allDay ? `${end}T00:00:00.000Z` : end,
    allDay,
    googleEventId: item.id,
    googleHtmlLink: item.htmlLink,
    syncedToGoogle: false,
    canImportToPipeline: !importedToPipeline,
    importedToPipeline,
  };
}

export function filterExternalGoogleEvents(items: GoogleCalendarEventItem[]) {
  return items.filter((item) => !isRecruitingOsGoogleEvent(item));
}

export function recruitingEventKey(kind: string, sourceId: string): string {
  return `${kind}:${sourceId}`;
}
