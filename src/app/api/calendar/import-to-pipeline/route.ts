import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import {
  guessCompanyFromEventTitle,
  guessStageFromEventTitle,
} from "@/lib/calendar/pipeline";
import {
  createAction,
  createMessage,
  createOpportunity,
  getMessageByExternalId,
} from "@/lib/db";
import { calculatePriority } from "@/lib/prioritizer";

function dateToIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      date,
      google_event_id,
      google_html_link,
    } = body as {
      title?: string;
      description?: string;
      date?: string;
      google_event_id?: string;
      google_html_link?: string;
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

    if (google_event_id) {
      const existing = await getMessageByExternalId(`gcal:${google_event_id}`);
      if (existing?.opportunity_id) {
        return NextResponse.json({
          imported: false,
          already_exists: true,
          opportunity_id: existing.opportunity_id,
        });
      }
    }

    const company = guessCompanyFromEventTitle(title);
    const stage = guessStageFromEventTitle(title);
    const isoDate = dateToIso(date);
    const notes = [description, google_html_link ? `Google Calendar: ${google_html_link}` : null]
      .filter(Boolean)
      .join("\n");

    const priority = calculatePriority({
      stage,
      action_type: "task",
      deadline: isoDate,
      created_at: new Date().toISOString(),
    });

    const opportunity = await createOpportunity({
      company,
      role_title: "Role TBD",
      source: "calendar",
      stage,
      priority_score: priority.score,
      deadline: isoDate,
      next_action: title.trim(),
      notes: notes || null,
    });

    await createMessage({
      opportunity_id: opportunity.id,
      source: "calendar",
      sender_name: null,
      sender_email: null,
      subject: title.trim(),
      body: notes || title.trim(),
      received_at: isoDate,
      extracted_json: null,
      external_message_id: google_event_id ? `gcal:${google_event_id}` : null,
    });

    const actionPriority = calculatePriority({
      stage,
      action_type: "task",
      deadline: isoDate,
      due_at: isoDate,
      created_at: new Date().toISOString(),
    });

    await createAction({
      opportunity_id: opportunity.id,
      action_type: "task",
      title: title.trim(),
      description: notes || null,
      due_at: isoDate,
      priority_score: actionPriority.score,
    });

    return NextResponse.json({
      imported: true,
      opportunity_id: opportunity.id,
    });
  } catch (err) {
    return handleApiError(err, "Failed to import event to pipeline");
  }
}
