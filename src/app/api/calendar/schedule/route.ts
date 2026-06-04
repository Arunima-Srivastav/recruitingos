import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { buildCalendarEvents } from "@/lib/calendar/events";
import { syncSingleRecruitingEventToGoogle } from "@/lib/calendar/sync";
import {
  getOpportunityById,
  getPendingActions,
  updateActionDueAt,
  updateOpportunityDeadline,
} from "@/lib/db";
import { hasCalendarScope, getGoogleConnection } from "@/lib/google/oauth";

function dateToIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      opportunity_id,
      action_id,
      date,
      sync_to_google = true,
    } = body as {
      opportunity_id?: string;
      action_id?: string;
      date?: string;
      sync_to_google?: boolean;
    };

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (!opportunity_id && !action_id) {
      return NextResponse.json(
        { error: "opportunity_id or action_id is required" },
        { status: 400 }
      );
    }

    const isoDate = dateToIso(date);
    let opportunityId = opportunity_id ?? null;

    if (opportunity_id) {
      await updateOpportunityDeadline(opportunity_id, isoDate);
    }

    if (action_id) {
      const action = await updateActionDueAt(action_id, isoDate);
      opportunityId = action.opportunity_id ?? opportunityId;
    }

    const connection = await getGoogleConnection();
    const canSync =
      sync_to_google && connection && hasCalendarScope(connection.scopes);

    if (canSync) {
      const opportunity = opportunityId
        ? await getOpportunityById(opportunityId)
        : null;
      const actions = await getPendingActions();
      const scopedActions = actions.filter((action) => {
        if (action_id) return action.id === action_id;
        if (opportunityId) return action.opportunity_id === opportunityId;
        return false;
      });

      const events = buildCalendarEvents(
        opportunity ? [opportunity] : [],
        scopedActions
      ).filter(
        (event) =>
          (opportunity_id &&
            event.kind === "deadline" &&
            event.sourceId === opportunity_id) ||
          (action_id &&
            event.kind === "action" &&
            event.sourceId === action_id)
      );

      for (const event of events) {
        await syncSingleRecruitingEventToGoogle(event);
      }
    }

    return NextResponse.json({
      scheduled: true,
      date,
      synced_to_google: Boolean(canSync),
    });
  } catch (err) {
    return handleApiError(err, "Failed to schedule on calendar");
  }
}
