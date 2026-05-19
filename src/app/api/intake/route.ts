import { NextResponse } from "next/server";
import {
  createAction,
  createMessage,
  createOpportunity,
} from "@/lib/db";
import { mockExtract } from "@/lib/mockExtractor";
import { calculatePriority } from "@/lib/prioritizer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, source } = body as { text?: string; source?: string };

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const extracted = mockExtract(text);
    const priority = calculatePriority({
      stage: extracted.stage,
      action_type: extracted.action_type,
      deadline: extracted.deadline,
      created_at: new Date().toISOString(),
    });

    const opportunity = await createOpportunity({
      company: extracted.company,
      role_title: extracted.role_title,
      source: source ?? "manual",
      stage: extracted.stage,
      priority_score: priority.score,
      deadline: extracted.deadline,
      next_action: extracted.next_action,
      notes: extracted.short_summary,
    });

    await createMessage({
      opportunity_id: opportunity.id,
      source: source ?? "manual",
      sender_name: extracted.recruiter_name,
      sender_email: extracted.recruiter_email,
      subject: null,
      body: text.trim(),
      received_at: new Date().toISOString(),
      extracted_json: extracted,
      external_message_id: null,
    });

    if (
      extracted.next_action &&
      extracted.action_type &&
      extracted.action_type !== "none"
    ) {
      const actionPriority = calculatePriority({
        stage: extracted.stage,
        action_type: extracted.action_type,
        deadline: extracted.deadline,
        due_at: extracted.deadline,
        created_at: new Date().toISOString(),
      });

      await createAction({
        opportunity_id: opportunity.id,
        action_type: extracted.action_type,
        title: extracted.next_action,
        description: extracted.short_summary,
        due_at: extracted.deadline,
        priority_score: actionPriority.score,
      });
    }

    return NextResponse.json({ opportunity_id: opportunity.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
