import { handleApiError } from "@/lib/auth/server";
import {
  buildCalendarEvents,
  filterCalendarEvents,
} from "@/lib/calendar/events";
import { generateIcs } from "@/lib/calendar/ical";
import { getOpportunities, getPendingActions } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunity_id");
    const actionId = searchParams.get("action_id");

    const [opportunities, actions] = await Promise.all([
      getOpportunities(),
      getPendingActions(),
    ]);

    let events = buildCalendarEvents(opportunities, actions);
    events = filterCalendarEvents(events, {
      opportunityId,
      actionId,
    });

    if (events.length === 0) {
      return Response.json(
        { error: "No calendar events found for this export." },
        { status: 404 }
      );
    }

    const filename =
      opportunityId || actionId ? "recruiting-event.ics" : "recruiting-os.ics";

    return new Response(generateIcs(events), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err, "Failed to export calendar");
  }
}
