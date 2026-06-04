import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_PRIORITY,
  MIN_PRIORITY,
  calculatePriority,
  normalizeStoredPriorityScore,
} from "./prioritizer";

describe("calculatePriority", () => {
  it("returns scores on a 1-10 scale", () => {
    const urgent = calculatePriority({
      stage: "Needs Reply",
      action_type: "reply",
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      source: "gmail",
      created_at: new Date().toISOString(),
    });
    assert.ok(urgent.score >= MIN_PRIORITY);
    assert.ok(urgent.score <= MAX_PRIORITY);

    const quiet = calculatePriority({ stage: "Waiting" });
    assert.ok(quiet.score >= MIN_PRIORITY);
    assert.ok(quiet.score <= MAX_PRIORITY);
  });

  it("caps inactive stages at minimum priority", () => {
    const rejected = calculatePriority({ stage: "Rejected" });
    assert.equal(rejected.score, MIN_PRIORITY);
  });
});

describe("normalizeStoredPriorityScore", () => {
  it("keeps values already on the 1-10 scale", () => {
    assert.equal(normalizeStoredPriorityScore(8), 8);
    assert.equal(normalizeStoredPriorityScore(0), MIN_PRIORITY);
  });

  it("maps legacy high scores into 1-10", () => {
    assert.equal(normalizeStoredPriorityScore(80), 8);
    assert.equal(normalizeStoredPriorityScore(100), MAX_PRIORITY);
  });
});
