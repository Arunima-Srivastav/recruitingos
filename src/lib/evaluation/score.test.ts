import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExtractedRecruitingData } from "@/lib/types";
import { scoreFixture } from "./score";
import type { ExtractionFixture } from "./types";

const baseExtracted: ExtractedRecruitingData = {
  company: "Stripe",
  role_title: "Software Engineer",
  recruiter_name: "Alex",
  recruiter_email: "alex@stripe.com",
  deadline: "2026-03-28T00:00:00.000Z",
  stage: "OA Pending",
  next_action: "Complete OA",
  action_type: "oa",
  is_time_sensitive: true,
  confidence: 0.9,
  short_summary: "Stripe · Software Engineer (OA Pending)",
};

describe("scoreFixture", () => {
  it("passes when all labeled fields match", () => {
    const fixture: ExtractionFixture = {
      id: "test",
      description: "test",
      rawText: "x",
      expected: {
        company: "Stripe",
        stage: "OA Pending",
        has_deadline: true,
      },
    };

    const result = scoreFixture(fixture, baseExtracted, "heuristic");
    assert.equal(result.pass, true);
    assert.equal(result.passCount, result.totalCount);
  });

  it("fails on stage mismatch", () => {
    const fixture: ExtractionFixture = {
      id: "test",
      description: "test",
      rawText: "x",
      expected: { stage: "Rejected" },
    };

    const result = scoreFixture(fixture, baseExtracted, "heuristic");
    assert.equal(result.pass, false);
    assert.equal(result.fields[0]?.field, "stage");
  });

  it("uses fuzzy match for company names", () => {
    const fixture: ExtractionFixture = {
      id: "test",
      description: "test",
      rawText: "x",
      expected: { company: "stripe" },
    };

    const result = scoreFixture(
      fixture,
      { ...baseExtracted, company: "Stripe" },
      "heuristic"
    );
    assert.equal(result.fields[0]?.pass, true);
  });

  it("ignores unlabeled fields", () => {
    const fixture: ExtractionFixture = {
      id: "test",
      description: "test",
      rawText: "x",
      expected: { stage: "OA Pending" },
    };

    const result = scoreFixture(fixture, baseExtracted, "heuristic");
    assert.equal(result.totalCount, 1);
  });
});
