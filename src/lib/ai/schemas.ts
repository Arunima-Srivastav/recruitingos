import { z } from "zod";

export const extractionStageSchema = z.enum([
  "sourced",
  "saved",
  "applied",
  "recruiter_contact",
  "oa",
  "interview",
  "final_round",
  "offer",
  "rejected",
  "archived",
  "unknown",
]);

export const extractionPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

export const aiExtractionSchema = z.object({
  company: z.string().nullable(),
  role: z.string().nullable(),
  stage: extractionStageSchema,
  deadline: z.string().nullable(),
  location: z.string().nullable(),
  recruiterName: z.string().nullable(),
  recruiterEmail: z.string().nullable(),
  nextAction: z.string().nullable(),
  nextActionDate: z.string().nullable(),
  priority: extractionPrioritySchema,
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  explanation: z.string(),
});

export type AiExtraction = z.infer<typeof aiExtractionSchema>;

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
