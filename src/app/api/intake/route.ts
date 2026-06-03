import { NextResponse } from "next/server";
import {
  createAction,
  createMessage,
  createOpportunity,
} from "@/lib/db";
import { normalizeReviewedExtraction } from "@/lib/ai/extract";
import { mockExtract } from "@/lib/mockExtractor";
import { calculatePriority } from "@/lib/prioritizer";
import type { ExtractedRecruitingData } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, source, extracted } = body as {
      text?: string;
      source?: string;
      extracted?: ExtractedRecruitingData;
    };

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const extractedData = extracted
      ? normalizeReviewedExtraction(extracted)
      : mockExtract(text);

    const priority = calculatePriority({
      stage: extractedData.stage,
      action_type: extractedData.action_type,
      deadline: extractedData.deadline,
      created_at: new Date().toISOString(),
    });

    const opportunity = await createOpportunity({
      company: extractedData.company,
      role_title: extractedData.role_title,
      source: source ?? "manual",
      stage: extractedData.stage,
      priority_score: priority.score,
      deadline: extractedData.deadline,
      next_action: extractedData.next_action,
      notes: extractedData.short_summary,
    });

    await createMessage({
      opportunity_id: opportunity.id,
      source: source ?? "manual",
      sender_name: extractedData.recruiter_name,
      sender_email: extractedData.recruiter_email,
      subject: null,
      body: text.trim(),
      received_at: new Date().toISOString(),
      extracted_json: extractedData,
      external_message_id: null,
    });

    if (
      extractedData.next_action &&
      extractedData.action_type &&
      extractedData.action_type !== "none"
    ) {
      const actionPriority = calculatePriority({
        stage: extractedData.stage,
        action_type: extractedData.action_type,
        deadline: extractedData.deadline,
        due_at: extractedData.deadline,
        created_at: new Date().toISOString(),
      });

      await createAction({
        opportunity_id: opportunity.id,
        action_type: extractedData.action_type,
        title: extractedData.next_action,
        description: extractedData.short_summary,
        due_at: extractedData.deadline,
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
