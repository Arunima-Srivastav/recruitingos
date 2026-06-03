import { mockExtract } from "@/lib/mockExtractor";
import type { ExtractedRecruitingData } from "@/lib/types";
import { extractWithOllama, isOllamaConfigured } from "./ollama";
import {
  aiExtractionSchema,
  LOW_CONFIDENCE_THRESHOLD,
  type AiExtraction,
} from "./schemas";

export type ExtractionStatus = "success" | "partial" | "failed" | "fallback";
export type ExtractionProvider = "ollama" | "heuristic";

export interface ExtractionResult {
  data: ExtractedRecruitingData;
  provider: ExtractionProvider;
  extraction_status: ExtractionStatus;
  needs_review: boolean;
  explanation: string | null;
  raw_model_output: string | null;
  model: string | null;
  ai_stage: string | null;
  location: string | null;
  next_action_date: string | null;
  priority: string | null;
}

const AI_STAGE_TO_PIPELINE: Record<AiExtraction["stage"], string> = {
  sourced: "New",
  saved: "New",
  applied: "Waiting",
  recruiter_contact: "Needs Reply",
  oa: "OA Pending",
  interview: "Interviewing",
  final_round: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Ghosted",
  unknown: "New",
};

function inferActionType(
  pipelineStage: string,
  nextAction: string | null
): string {
  if (pipelineStage === "OA Pending") return "oa";
  if (pipelineStage === "Needs Reply") return "reply";
  if (pipelineStage === "Interview Scheduling") return "schedule";
  if (
    nextAction &&
    /schedule|availability|calendar|call|chat/i.test(nextAction)
  ) {
    return "schedule";
  }
  return "none";
}

function parseJsonFromModelOutput(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Could not parse JSON from model output");
  }
}

function buildSummary(
  company: string | null,
  role: string | null,
  stage: string
): string {
  return [
    company ?? "Unknown company",
    role ? `— ${role}` : "",
    `(${stage})`,
  ]
    .filter(Boolean)
    .join(" ");
}

function mapAiToExtracted(
  ai: AiExtraction,
  metadata: {
    provider: ExtractionProvider;
    extraction_status: ExtractionStatus;
    raw_model_output: string | null;
    model: string | null;
  }
): ExtractionResult {
  const pipelineStage = AI_STAGE_TO_PIPELINE[ai.stage];
  const needsReview =
    ai.needsReview || ai.confidence < LOW_CONFIDENCE_THRESHOLD;

  const data: ExtractedRecruitingData = {
    company: ai.company,
    role_title: ai.role,
    recruiter_name: ai.recruiterName,
    recruiter_email: ai.recruiterEmail,
    deadline: ai.deadline,
    stage: pipelineStage,
    next_action: ai.nextAction,
    action_type: inferActionType(pipelineStage, ai.nextAction),
    is_time_sensitive:
      ai.priority === "urgent" ||
      ai.priority === "high" ||
      ai.stage === "oa" ||
      ai.stage === "recruiter_contact",
    confidence: ai.confidence,
    short_summary: buildSummary(ai.company, ai.role, pipelineStage),
    provider: metadata.provider,
    extraction_status: metadata.extraction_status,
    needs_review: needsReview,
    explanation: ai.explanation,
    raw_model_output: metadata.raw_model_output,
    model: metadata.model,
    ai_stage: ai.stage,
    location: ai.location,
    next_action_date: ai.nextActionDate,
    priority: ai.priority,
  };

  return {
    data,
    provider: metadata.provider,
    extraction_status: metadata.extraction_status,
    needs_review: needsReview,
    explanation: ai.explanation,
    raw_model_output: metadata.raw_model_output,
    model: metadata.model,
    ai_stage: ai.stage,
    location: ai.location,
    next_action_date: ai.nextActionDate,
    priority: ai.priority,
  };
}

function heuristicFallback(
  rawText: string,
  reason: string,
  rawModelOutput: string | null = null,
  model: string | null = null
): ExtractionResult {
  const heuristic = mockExtract(rawText);
  const data: ExtractedRecruitingData = {
    ...heuristic,
    provider: "heuristic",
    extraction_status: rawModelOutput ? "fallback" : "success",
    needs_review: true,
    explanation: reason,
    raw_model_output: rawModelOutput,
    model,
    ai_stage: null,
    location: null,
    next_action_date: null,
    priority: null,
  };

  return {
    data,
    provider: "heuristic",
    extraction_status: rawModelOutput ? "fallback" : "success",
    needs_review: true,
    explanation: reason,
    raw_model_output: rawModelOutput,
    model,
    ai_stage: null,
    location: null,
    next_action_date: null,
    priority: null,
  };
}

export async function extractRecruitingMessage(
  rawText: string,
  sourceType?: string
): Promise<ExtractionResult> {
  const trimmed = rawText.trim();

  if (!isOllamaConfigured()) {
    return heuristicFallback(
      trimmed,
      "Ollama not configured — used heuristic parser. Set OLLAMA_API_KEY in .env.local for AI extraction."
    );
  }

  try {
    const { rawOutput, model } = await extractWithOllama(trimmed, sourceType);
    const parsed = parseJsonFromModelOutput(rawOutput);
    const validated = aiExtractionSchema.safeParse(parsed);

    if (!validated.success) {
      return heuristicFallback(
        trimmed,
        `AI output failed validation: ${validated.error.issues[0]?.message ?? "invalid JSON"}. Review heuristic fallback.`,
        rawOutput,
        model
      );
    }

    const status: ExtractionStatus =
      validated.data.needsReview ||
      validated.data.confidence < LOW_CONFIDENCE_THRESHOLD
        ? "partial"
        : "success";

    return mapAiToExtracted(validated.data, {
      provider: "ollama",
      extraction_status: status,
      raw_model_output: rawOutput,
      model,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ollama extraction failed";
    return heuristicFallback(
      trimmed,
      `${message}. Review heuristic fallback before saving.`,
      null,
      getModelName()
    );
  }
}

function getModelName(): string | null {
  return process.env.OLLAMA_MODEL ?? "ministral-3:3b";
}

export function normalizeReviewedExtraction(
  input: Partial<ExtractedRecruitingData> & {
    stage?: string;
    role_title?: string | null;
    company?: string | null;
  }
): ExtractedRecruitingData {
  const stage = input.stage ?? "New";
  const company = input.company ?? null;
  const role_title = input.role_title ?? null;
  const next_action = input.next_action ?? null;

  return {
    company,
    role_title,
    recruiter_name: input.recruiter_name ?? null,
    recruiter_email: input.recruiter_email ?? null,
    deadline: input.deadline ?? null,
    stage,
    next_action,
    action_type: input.action_type ?? inferActionType(stage, next_action),
    is_time_sensitive: input.is_time_sensitive ?? false,
    confidence: input.confidence ?? 1,
    short_summary:
      input.short_summary ?? buildSummary(company, role_title, stage),
    provider: input.provider ?? "ollama",
    extraction_status: input.extraction_status ?? "success",
    needs_review: input.needs_review ?? false,
    explanation: input.explanation ?? null,
    raw_model_output: input.raw_model_output ?? null,
    model: input.model ?? null,
    ai_stage: input.ai_stage ?? null,
    location: input.location ?? null,
    next_action_date: input.next_action_date ?? null,
    priority: input.priority ?? null,
  };
}
