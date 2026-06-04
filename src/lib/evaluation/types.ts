import type { ExtractedRecruitingData } from "@/lib/types";

/** Fields we score in the extraction accuracy harness. */
export const EVAL_FIELDS = [
  "company",
  "role_title",
  "stage",
  "action_type",
  "recruiter_email",
  "recruiter_name",
  "has_deadline",
  "is_time_sensitive",
] as const;

export type EvalField = (typeof EVAL_FIELDS)[number];

export interface ExtractionFixtureExpected {
  company?: string | null;
  role_title?: string | null;
  stage?: string;
  action_type?: string;
  recruiter_email?: string | null;
  recruiter_name?: string | null;
  /** When true/false, checks whether a deadline was extracted (not the exact date). */
  has_deadline?: boolean;
  is_time_sensitive?: boolean;
}

export interface ExtractionFixture {
  id: string;
  description: string;
  sourceType?: string;
  rawText: string;
  expected: ExtractionFixtureExpected;
}

export interface FieldMatchResult {
  field: EvalField;
  expected: unknown;
  actual: unknown;
  pass: boolean;
}

export interface FixtureEvalResult {
  id: string;
  description: string;
  provider: "heuristic" | "ollama";
  fields: FieldMatchResult[];
  passCount: number;
  totalCount: number;
  pass: boolean;
}

export interface EvalReport {
  provider: "heuristic" | "ollama";
  fixtures: FixtureEvalResult[];
  totalFields: number;
  passedFields: number;
  accuracy: number;
  fixturePassCount: number;
  fixtureCount: number;
}

export type ExtractFn = (
  rawText: string,
  sourceType?: string
) => Promise<ExtractedRecruitingData> | ExtractedRecruitingData;
