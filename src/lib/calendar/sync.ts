import type {
  DisplayCalendarEvent,
  RecruitingCalendarEvent,
} from "@/lib/calendar/types";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  filterExternalGoogleEvents,
  googleEventToDisplay,
  listGoogleCalendarEvents,
  recruitingEventKey,
  updateGoogleCalendarEvent,
} from "@/lib/google/calendar";
import type { CalendarEventLink, UserCalendarEvent } from "@/lib/calendar/types";
import {
  deleteCalendarEventLink,
  deleteUserCalendarEvent,
  getCalendarEventLinks,
  upsertCalendarEventLink,
  updateActionDueAt,
  updateOpportunityDeadline,
} from "@/lib/db";
import {
  getValidGoogleAccessTokenForCalendar,
  getGoogleConnection,
  hasCalendarScope,
  updateCalendarSyncMetadata,
} from "@/lib/google/oauth";

export function recruitingToDisplay(
  event: RecruitingCalendarEvent,
  syncedToGoogle = false
): DisplayCalendarEvent {
  return {
    id: event.uid,
    source: "recruiting",
    kind: event.kind,
    sourceId: event.sourceId,
    title: event.title,
    description: event.description,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    allDay: event.allDay,
    opportunityId: event.opportunityId,
    syncedToGoogle,
    canRemoveFromCalendar: true,
  };
}

export function eventInRange(
  event: { start: string; end: string },
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return start <= rangeEnd && end >= rangeStart;
}

export function getMonthRange(year: number, month: number) {
  const rangeStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const rangeEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { rangeStart, rangeEnd };
}

export async function fetchGoogleDisplayEvents(
  accessToken: string,
  rangeStart: Date,
  rangeEnd: Date,
  importedGoogleEventIds: Set<string> = new Set()
): Promise<DisplayCalendarEvent[]> {
  const items = await listGoogleCalendarEvents(
    accessToken,
    rangeStart.toISOString(),
    rangeEnd.toISOString()
  );

  return filterExternalGoogleEvents(items).map((item) =>
    googleEventToDisplay(item, importedGoogleEventIds.has(item.id))
  );
}

export async function syncSingleRecruitingEventToGoogle(
  event: RecruitingCalendarEvent
): Promise<void> {
  const accessToken = await getValidGoogleAccessTokenForCalendar();
  const links = await getCalendarEventLinks();
  const key = recruitingEventKey(event.kind, event.sourceId);
  const existing = links.find(
    (link) => recruitingEventKey(link.source_kind, link.source_id) === key
  );

  if (existing) {
    await updateGoogleCalendarEvent(
      accessToken,
      existing.google_event_id,
      event,
      existing.google_calendar_id
    );
    return;
  }

  const googleEventId = await createGoogleCalendarEvent(accessToken, event);
  await upsertCalendarEventLink({
    source_kind: event.kind,
    source_id: event.sourceId,
    google_event_id: googleEventId,
    google_calendar_id: "primary",
  });
}

export async function syncRecruitingEventsToGoogle(
  events: RecruitingCalendarEvent[]
): Promise<{ created: number; updated: number; removed: number }> {
  const accessToken = await getValidGoogleAccessTokenForCalendar();
  const links = await getCalendarEventLinks();
  const linkByKey = new Map(
    links.map((link) => [recruitingEventKey(link.source_kind, link.source_id), link])
  );
  const activeKeys = new Set(
    events.map((event) => recruitingEventKey(event.kind, event.sourceId))
  );

  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const event of events) {
    const key = recruitingEventKey(event.kind, event.sourceId);
    const existing = linkByKey.get(key);

    if (existing) {
      await updateGoogleCalendarEvent(
        accessToken,
        existing.google_event_id,
        event,
        existing.google_calendar_id
      );
      await upsertCalendarEventLink({
        source_kind: event.kind,
        source_id: event.sourceId,
        google_event_id: existing.google_event_id,
        google_calendar_id: existing.google_calendar_id,
      });
      updated += 1;
      continue;
    }

    const googleEventId = await createGoogleCalendarEvent(accessToken, event);
    await upsertCalendarEventLink({
      source_kind: event.kind,
      source_id: event.sourceId,
      google_event_id: googleEventId,
      google_calendar_id: "primary",
    });
    created += 1;
  }

  for (const link of links) {
    const key = recruitingEventKey(link.source_kind, link.source_id);
    if (activeKeys.has(key)) continue;

    await deleteGoogleCalendarEvent(
      accessToken,
      link.google_event_id,
      link.google_calendar_id
    );
    await deleteCalendarEventLink(link.id);
    removed += 1;
  }

  await updateCalendarSyncMetadata({
    calendarSyncEnabled: true,
    calendarLastSyncedAt: new Date().toISOString(),
  });

  return { created, updated, removed };
}

export function customToDisplay(event: UserCalendarEvent): DisplayCalendarEvent {
  return {
    id: `custom-${event.id}`,
    source: "custom",
    sourceId: event.id,
    title: event.title,
    description: event.description ?? undefined,
    start: event.starts_at,
    end: event.ends_at,
    allDay: event.all_day,
    opportunityId: event.opportunity_id,
    googleEventId: event.google_event_id ?? undefined,
    syncedToGoogle: Boolean(event.google_event_id),
    canDelete: true,
    canRemoveFromCalendar: true,
  };
}

export function mergeDisplayEvents(
  recruiting: RecruitingCalendarEvent[],
  links: CalendarEventLink[],
  google: DisplayCalendarEvent[],
  custom: UserCalendarEvent[] = []
): DisplayCalendarEvent[] {
  const syncedKeys = new Set(
    links.map((link) => recruitingEventKey(link.source_kind, link.source_id))
  );

  const recruitingDisplay = recruiting.map((event) =>
    recruitingToDisplay(
      event,
      syncedKeys.has(recruitingEventKey(event.kind, event.sourceId))
    )
  );

  const customDisplay = custom.map(customToDisplay);

  return [...recruitingDisplay, ...customDisplay, ...google].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
}

async function deleteGoogleEventIfLinked(
  googleEventId: string,
  calendarId = "primary"
): Promise<void> {
  try {
    const connection = await getGoogleConnection();
    if (!connection || !hasCalendarScope(connection.scopes)) return;
    const accessToken = await getValidGoogleAccessTokenForCalendar();
    await deleteGoogleCalendarEvent(accessToken, googleEventId, calendarId);
  } catch {
    // Ignore Google delete failures; local removal still applies.
  }
}

export async function removeEventFromCalendar(input: {
  source: "custom" | "recruiting";
  id: string;
  kind?: "deadline" | "action";
}): Promise<void> {
  if (input.source === "custom") {
    const deleted = await deleteUserCalendarEvent(input.id);
    if (!deleted) throw new Error("Event not found");

    if (deleted.google_event_id) {
      await deleteGoogleEventIfLinked(
        deleted.google_event_id,
        deleted.google_calendar_id ?? "primary"
      );
    }
    return;
  }

  if (!input.kind) {
    throw new Error("kind is required for pipeline calendar events");
  }

  const links = await getCalendarEventLinks();
  const key = recruitingEventKey(input.kind, input.id);
  const link = links.find(
    (row) => recruitingEventKey(row.source_kind, row.source_id) === key
  );

  if (link) {
    await deleteGoogleEventIfLinked(link.google_event_id, link.google_calendar_id);
    await deleteCalendarEventLink(link.id);
  }

  if (input.kind === "deadline") {
    await updateOpportunityDeadline(input.id, null);
    return;
  }

  await updateActionDueAt(input.id, null);
}
