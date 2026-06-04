import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAllowedResumeFilename,
  normalizeExtractedResumeText,
  parseResumeBuffer,
} from "./parseResumeFile";

describe("isAllowedResumeFilename", () => {
  it("allows pdf and text extensions", () => {
    assert.equal(isAllowedResumeFilename("resume.pdf"), true);
    assert.equal(isAllowedResumeFilename("resume.TXT"), true);
    assert.equal(isAllowedResumeFilename("resume.docx"), false);
  });
});

describe("normalizeExtractedResumeText", () => {
  it("collapses extra blank lines and truncates", () => {
    const result = normalizeExtractedResumeText("Hello\n\n\n\nWorld");
    assert.equal(result, "Hello\n\nWorld");
  });
});

describe("parseResumeBuffer", () => {
  it("reads plain text files", async () => {
    const text = await parseResumeBuffer(
      Buffer.from("Software Engineer\nPython, TypeScript"),
      "resume.txt"
    );
    assert.ok(text.includes("Software Engineer"));
  });

  it("rejects unknown extensions", async () => {
    await assert.rejects(
      () => parseResumeBuffer(Buffer.from("data"), "resume.docx"),
      /Upload a .pdf/
    );
  });
});
