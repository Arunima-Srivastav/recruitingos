import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeOpportunityFields,
  pickMergedDeadline,
  pickMergedSource,
  pickMergedStage,
} from "./merge";
import type { Opportunity } from "../types";

function opp(partial: Partial<Opportunity> & Pick<Opportunity, "id">): Opportunity {
  return {
    user_id: "user-1",
    company: null,
    role_title: null,
    source: "manual",
    stage: "New",
    priority_score: 5,
    deadline: null,
    next_action: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...partial,
  };
}

describe("pickMergedStage", () => {
  it("keeps the more advanced stage", () => {
    assert.equal(
      pickMergedStage("New", "Interview Scheduling"),
      "Interview Scheduling"
    );
  });

  it("replaces inactive primary with active secondary", () => {
    assert.equal(pickMergedStage("Rejected", "Recruiter Chat"), "Recruiter Chat");
  });
});

describe("pickMergedDeadline", () => {
  it("returns the earlier deadline", () => {
    assert.equal(
      pickMergedDeadline("2025-06-10T00:00:00Z", "2025-06-01T00:00:00Z"),
      "2025-06-01T00:00:00Z"
    );
  });

  it("returns the non-null deadline when one is missing", () => {
    assert.equal(pickMergedDeadline(null, "2025-06-01T00:00:00Z"), "2025-06-01T00:00:00Z");
  });
});

describe("pickMergedSource", () => {
  it("prefers gmail over discover", () => {
    const primary = opp({ id: "a", source: "discover" });
    const secondary = opp({ id: "b", source: "gmail" });
    assert.equal(pickMergedSource(primary, secondary), "gmail");
  });
});

describe("mergeOpportunityFields", () => {
  it("combines notes and normalizes legacy priority scores", () => {
    const primary = opp({
      id: "a",
      company: "Stripe",
      notes: "Gmail thread",
      priority_score: 80,
      stage: "New",
    });
    const secondary = opp({
      id: "b",
      company: null,
      notes: "Discover listing",
      priority_score: 6,
      stage: "Recruiter Chat",
      source: "gmail",
    });

    const merged = mergeOpportunityFields(primary, secondary);
    assert.equal(merged.company, "Stripe");
    assert.equal(merged.stage, "Recruiter Chat");
    assert.equal(merged.priority_score, 8);
    assert.ok(merged.notes?.includes("Gmail thread"));
    assert.ok(merged.notes?.includes("Discover listing"));
  });
});
