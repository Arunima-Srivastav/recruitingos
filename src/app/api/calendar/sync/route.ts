import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { buildCalendarEvents } from "@/lib/calendar/events";
import { syncRecruitingEventsToGoogle } from "@/lib/calendar/sync";
import { getOpportunities, getPendingActions } from "@/lib/db";

export async function POST() {
  try {
    const [opportunities, actions] = await Promise.all([
      getOpportunities(),
      getPendingActions(),
    ]);

    const events = buildCalendarEvents(opportunities, actions);
    const result = await syncRecruitingEventsToGoogle(events);

    return NextResponse.json({
      synced: true,
      total: events.length,
      ...result,
    });
  } catch (err) {
    return handleApiError(err, "Failed to sync calendar");
  }
}
