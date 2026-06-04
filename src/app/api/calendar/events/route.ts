import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { buildCalendarEvents } from "@/lib/calendar/events";
import { buildPipelineCalendarItems } from "@/lib/calendar/pipeline";
import {
  eventInRange,
  fetchGoogleDisplayEvents,
  getMonthRange,
  mergeDisplayEvents,
} from "@/lib/calendar/sync";
import type { DisplayCalendarEvent } from "@/lib/calendar/types";
import {
  createUserCalendarEvent,
  deleteUserCalendarEvent,
  getCalendarEventLinks,
  getImportedGoogleCalendarEventIds,
  getOpportunities,
  getPendingActions,
  getUserCalendarEvents,
  updateUserCalendarEventGoogleIds,
} from "@/lib/db";
import {
  createCustomGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google/calendar";
import {
  getGoogleConnection,
  getValidGoogleAccessTokenForCalendar,
  hasCalendarScope,
} from "@/lib/google/oauth";

function allDayRangeFromDate(date: string) {
  const startsAt = `${date}T00:00:00.000Z`;
  const endDate = new Date(`${date}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return { startsAt, endsAt: endDate.toISOString() };
}

function eventDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getUTCFullYear());
    const month = Number(searchParams.get("month") ?? now.getUTCMonth() + 1);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    const { rangeStart, rangeEnd } = getMonthRange(year, month);

    const [
      opportunities,
      actions,
      links,
      connection,
      customEvents,
      importedGoogleIds,
    ] = await Promise.all([
      getOpportunities(),
      getPendingActions(),
      getCalendarEventLinks(),
      getGoogleConnection(),
      getUserCalendarEvents(rangeStart.toISOString(), rangeEnd.toISOString()),
      getImportedGoogleCalendarEventIds(),
    ]);

    const recruitingEvents = buildCalendarEvents(opportunities, actions);
    const pipeline = buildPipelineCalendarItems(opportunities, actions, links);

    const recruitingInRange = recruitingEvents.filter((event) =>
      eventInRange(
        { start: event.start.toISOString(), end: event.end.toISOString() },
        rangeStart,
        rangeEnd
      )
    );

    let googleEvents: DisplayCalendarEvent[] = [];
    const calendarScope = hasCalendarScope(connection?.scopes);

    if (connection && calendarScope) {
      const accessToken = await getValidGoogleAccessTokenForCalendar();
      googleEvents = await fetchGoogleDisplayEvents(
        accessToken,
        rangeStart,
        rangeEnd,
        importedGoogleIds
      );
    }

    const events = mergeDisplayEvents(
      recruitingInRange,
      links,
      googleEvents,
      customEvents
    );

    return NextResponse.json({
      year,
      month,
      events,
      pipeline,
      sync: {
        connected: Boolean(connection),
        calendarScope,
        calendarSyncEnabled: Boolean(connection?.calendar_sync_enabled),
        googleEmail: connection?.google_email ?? null,
        lastSyncedAt: connection?.calendar_last_synced_at ?? null,
      },
    });
  } catch (err) {
    return handleApiError(err, "Failed to load calendar events");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      date,
      addToGoogle = false,
    } = body as {
      title?: string;
      description?: string;
      date?: string;
      addToGoogle?: boolean;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const { startsAt, endsAt } = allDayRangeFromDate(date);

    const event = await createUserCalendarEvent({
      title: title.trim(),
      description: description?.trim() ?? null,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: true,
    });

    if (addToGoogle) {
      const accessToken = await getValidGoogleAccessTokenForCalendar();
      const created = await createCustomGoogleCalendarEvent(accessToken, {
        id: event.id,
        title: event.title,
        description: event.description,
        start: new Date(startsAt),
        end: new Date(endsAt),
        allDay: true,
      });
      const updated = await updateUserCalendarEventGoogleIds(
        event.id,
        created.id,
        "primary"
      );
      return NextResponse.json({ event: updated });
    }

    return NextResponse.json({ event });
  } catch (err) {
    return handleApiError(err, "Failed to create calendar event");
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deleted = await deleteUserCalendarEvent(id);
    if (!deleted) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (deleted.google_event_id) {
      try {
        const accessToken = await getValidGoogleAccessTokenForCalendar();
        await deleteGoogleCalendarEvent(
          accessToken,
          deleted.google_event_id,
          deleted.google_calendar_id ?? "primary"
        );
      } catch {
        // Local delete succeeded even if Google delete fails.
      }
    }

    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return handleApiError(err, "Failed to delete calendar event");
  }
}
