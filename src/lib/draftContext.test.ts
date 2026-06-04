import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESUME_PROMPT_MAX_LENGTH,
  resumeTextForPrompt,
  trimDraftContextField,
} from "./draftContext";

describe("trimDraftContextField", () => {
  it("returns null for blank input", () => {
    assert.equal(trimDraftContextField("  ", 100), null);
  });

  it("truncates long text", () => {
    assert.equal(trimDraftContextField("a".repeat(20), 10)?.length, 10);
  });
});

describe("resumeTextForPrompt", () => {
  it("truncates resume for the prompt budget", () => {
    const long = "x".repeat(RESUME_PROMPT_MAX_LENGTH + 500);
    const result = resumeTextForPrompt(long);
    assert.ok(result?.includes("...[resume truncated]"));
    assert.ok((result?.length ?? 0) < long.length);
  });
});
