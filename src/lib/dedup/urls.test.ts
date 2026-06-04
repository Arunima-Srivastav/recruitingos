import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractApplyUrls,
  normalizeApplyUrl,
  urlsOverlap,
} from "./urls";

describe("normalizeApplyUrl", () => {
  it("strips utm params and trailing slashes", () => {
    const a = normalizeApplyUrl(
      "https://Jobs.Example.com/role/1/?utm_source=email&utm_campaign=x"
    );
    const b = normalizeApplyUrl("https://jobs.example.com/role/1");
    assert.equal(a, b);
  });
});

describe("extractApplyUrls", () => {
  it("dedupes normalized URLs from text", () => {
    const urls = extractApplyUrls(
      "Apply: https://jobs.example.com/a?utm_source=1\nAlso: https://jobs.example.com/a/"
    );
    assert.equal(urls.length, 1);
    assert.equal(urls[0], "https://jobs.example.com/a");
  });
});

describe("urlsOverlap", () => {
  it("returns true when lists share a URL", () => {
    const url = "https://jobs.example.com/role/99";
    assert.equal(urlsOverlap([url], [url]), true);
  });

  it("returns false when either list is empty", () => {
    assert.equal(urlsOverlap([], ["https://example.com"]), false);
  });
});
