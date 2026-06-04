import {
  createAction,
  createMessage,
  createOpportunity,
  getOpportunityById,
  updateOpportunityStage,
} from "@/lib/db";
import { calculatePriority } from "@/lib/prioritizer";
import type { ExtractedRecruitingData } from "@/lib/types";

export interface SaveMessageInput {
  text: string;
  source?: string;
  extracted: ExtractedRecruitingData;
  subject?: string | null;
  snippet?: string | null;
  externalMessageId?: string | null;
  receivedAt?: string | null;
}

export async function appendMessageToOpportunity(
  opportunityId: string,
  input: SaveMessageInput
): Promise<{ opportunity_id: string; linked: true }> {
  const source = input.source ?? "manual";
  const extracted = input.extracted;
  const existing = await getOpportunityById(opportunityId);
  if (!existing) {
    throw new Error("Opportunity not found");
  }

  await createMessage({
    opportunity_id: opportunityId,
    source,
    sender_name: extracted.recruiter_name,
    sender_email: extracted.recruiter_email,
    subject: input.subject ?? null,
    body: input.text.trim(),
    snippet: input.snippet ?? null,
    received_at: input.receivedAt ?? new Date().toISOString(),
    extracted_json: extracted,
    external_message_id: input.externalMessageId ?? null,
    extraction_status: extracted.extraction_status ?? null,
    extraction_confidence: extracted.confidence ?? null,
    needs_review: extracted.needs_review ?? false,
  });

  if (extracted.stage && extracted.stage !== existing.stage) {
    await updateOpportunityStage(opportunityId, extracted.stage);
  }

  return { opportunity_id: opportunityId, linked: true };
}

export async function saveOpportunityFromMessage(
  input: SaveMessageInput
): Promise<{ opportunity_id: string; linked?: boolean }> {
  const source = input.source ?? "manual";
  const extracted = input.extracted;

  const priority = calculatePriority({
    stage: extracted.stage,
    action_type: extracted.action_type,
    deadline: extracted.deadline,
    created_at: new Date().toISOString(),
    source,
  });

  const opportunity = await createOpportunity({
    company: extracted.company,
    role_title: extracted.role_title,
    source,
    stage: extracted.stage,
    priority_score: priority.score,
    deadline: extracted.deadline,
    next_action: extracted.next_action,
    notes: extracted.short_summary,
  });

  await createMessage({
    opportunity_id: opportunity.id,
    source,
    sender_name: extracted.recruiter_name,
    sender_email: extracted.recruiter_email,
    subject: input.subject ?? null,
    body: input.text.trim(),
    snippet: input.snippet ?? null,
    received_at: input.receivedAt ?? new Date().toISOString(),
    extracted_json: extracted,
    external_message_id: input.externalMessageId ?? null,
    extraction_status: extracted.extraction_status ?? null,
    extraction_confidence: extracted.confidence ?? null,
    needs_review: extracted.needs_review ?? false,
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
      source,
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

  return { opportunity_id: opportunity.id };
}
