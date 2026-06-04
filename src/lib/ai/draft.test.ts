import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeDraftBody } from "./draft";

describe("sanitizeDraftBody", () => {
  it("strips markdown code fences", () => {
    const raw = "```\nHi Jordan,\n\nThanks for reaching out.\n\nBest,\nArunima\n```";
    assert.equal(
      sanitizeDraftBody(raw),
      "Hi Jordan,\n\nThanks for reaching out.\n\nBest,\nArunima"
    );
  });

  it("trims plain text", () => {
    assert.equal(sanitizeDraftBody("  Hello there  "), "Hello there");
  });
});
