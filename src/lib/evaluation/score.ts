import type { ExtractedRecruitingData } from "@/lib/types";
import type {
  EvalField,
  ExtractionFixture,
  ExtractionFixtureExpected,
  FieldMatchResult,
  FixtureEvalResult,
  EvalReport,
  ExtractFn,
} from "./types";
import { EVAL_FIELDS } from "./types";

function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function fuzzyTextMatch(
  expected: string | null,
  actual: string | null
): boolean {
  if (expected === null) return actual === null;
  const e = normalizeText(expected);
  const a = normalizeText(actual);
  if (e === null) return a === null;
  if (a === null) return false;
  return a.includes(e) || e.includes(a);
}

function matchField(
  field: EvalField,
  expected: ExtractionFixtureExpected,
  actual: ExtractedRecruitingData
): FieldMatchResult | null {
  if (!(field in expected)) return null;

  switch (field) {
    case "company": {
      const exp = expected.company ?? null;
      return {
        field,
        expected: exp,
        actual: actual.company,
        pass: fuzzyTextMatch(exp, actual.company),
      };
    }
    case "role_title": {
      const exp = expected.role_title ?? null;
      return {
        field,
        expected: exp,
        actual: actual.role_title,
        pass: fuzzyTextMatch(exp, actual.role_title),
      };
    }
    case "stage":
      return {
        field,
        expected: expected.stage,
        actual: actual.stage,
        pass: actual.stage === expected.stage,
      };
    case "action_type":
      return {
        field,
        expected: expected.action_type,
        actual: actual.action_type,
        pass: actual.action_type === expected.action_type,
      };
    case "recruiter_email": {
      const exp = expected.recruiter_email ?? null;
      return {
        field,
        expected: exp,
        actual: actual.recruiter_email,
        pass: fuzzyTextMatch(exp, actual.recruiter_email),
      };
    }
    case "recruiter_name": {
      const exp = expected.recruiter_name ?? null;
      return {
        field,
        expected: exp,
        actual: actual.recruiter_name,
        pass: fuzzyTextMatch(exp, actual.recruiter_name),
      };
    }
    case "has_deadline":
      return {
        field,
        expected: expected.has_deadline,
        actual: actual.deadline != null,
        pass: (actual.deadline != null) === expected.has_deadline,
      };
    case "is_time_sensitive":
      return {
        field,
        expected: expected.is_time_sensitive,
        actual: actual.is_time_sensitive,
        pass: actual.is_time_sensitive === expected.is_time_sensitive,
      };
    default:
      return null;
  }
}

export function scoreFixture(
  fixture: ExtractionFixture,
  actual: ExtractedRecruitingData,
  provider: "heuristic" | "ollama"
): FixtureEvalResult {
  const fields: FieldMatchResult[] = [];

  for (const field of EVAL_FIELDS) {
    const result = matchField(field, fixture.expected, actual);
    if (result) fields.push(result);
  }

  const passCount = fields.filter((f) => f.pass).length;
  const totalCount = fields.length;

  return {
    id: fixture.id,
    description: fixture.description,
    provider,
    fields,
    passCount,
    totalCount,
    pass: passCount === totalCount && totalCount > 0,
  };
}

export async function runExtractEval(
  fixtures: ExtractionFixture[],
  extractFn: ExtractFn,
  provider: "heuristic" | "ollama"
): Promise<EvalReport> {
  const results: FixtureEvalResult[] = [];

  for (const fixture of fixtures) {
    const extracted = await extractFn(fixture.rawText, fixture.sourceType);
    results.push(scoreFixture(fixture, extracted, provider));
  }

  const totalFields = results.reduce((sum, r) => sum + r.totalCount, 0);
  const passedFields = results.reduce((sum, r) => sum + r.passCount, 0);
  const fixturePassCount = results.filter((r) => r.pass).length;

  return {
    provider,
    fixtures: results,
    totalFields,
    passedFields,
    accuracy: totalFields === 0 ? 1 : passedFields / totalFields,
    fixturePassCount,
    fixtureCount: results.length,
  };
}

export function formatEvalReport(report: EvalReport): string {
  const lines: string[] = [
    `Extraction eval (${report.provider})`,
    `Accuracy: ${(report.accuracy * 100).toFixed(1)}% (${report.passedFields}/${report.totalFields} fields)`,
    `Fixtures: ${report.fixturePassCount}/${report.fixtureCount} fully correct`,
    "",
  ];

  for (const fixture of report.fixtures) {
    const status = fixture.pass ? "PASS" : "FAIL";
    lines.push(`[${status}] ${fixture.id} — ${fixture.description}`);
    for (const field of fixture.fields) {
      if (field.pass) continue;
      lines.push(
        `  ✗ ${field.field}: expected ${JSON.stringify(field.expected)}, got ${JSON.stringify(field.actual)}`
      );
    }
  }

  return lines.join("\n");
}
