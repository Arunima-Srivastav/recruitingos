import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  companiesMatch,
  normalizeCompany,
  normalizeRole,
  rolesMatch,
} from "./normalize";

describe("normalizeCompany", () => {
  it("strips legal suffixes and punctuation", () => {
    assert.equal(normalizeCompany("Stripe, Inc."), "stripe");
    assert.equal(normalizeCompany("Figma LLC"), "figma");
  });

  it("normalizes ampersands and apostrophes", () => {
    assert.equal(normalizeCompany("Ben & Jerry's"), "ben and jerrys");
  });

  it("returns empty for blank input", () => {
    assert.equal(normalizeCompany(null), "");
    assert.equal(normalizeCompany("   "), "");
  });
});

describe("normalizeRole", () => {
  it("removes seniority and intern noise", () => {
    assert.equal(
      normalizeRole("Senior Software Engineer II"),
      "software engineer"
    );
    assert.equal(
      normalizeRole("Technology Intern - Multiple Teams"),
      "technology multiple teams"
    );
  });

  it("returns empty for blank input", () => {
    assert.equal(normalizeRole(undefined), "");
  });
});

describe("companiesMatch", () => {
  it("matches equivalent company names", () => {
    assert.equal(companiesMatch("Macy's", "Macys"), true);
    assert.equal(companiesMatch("Stripe", "Stripe, Inc."), true);
  });

  it("does not match unrelated companies", () => {
    assert.equal(companiesMatch("Stripe", "Notion"), false);
    assert.equal(companiesMatch(null, "Stripe"), false);
  });
});

describe("rolesMatch", () => {
  it("matches Macy's-style intern title variants", () => {
    assert.equal(
      rolesMatch(
        "Technology Intern - Multiple Teams",
        "Technology Intern"
      ),
      true
    );
    assert.equal(
      rolesMatch(
        "Software Engineer Intern",
        "Software Engineer, New Grad"
      ),
      true
    );
  });

  it("does not match clearly different roles", () => {
    assert.equal(
      rolesMatch("Software Engineer", "Product Manager"),
      false
    );
  });

  it("requires both titles", () => {
    assert.equal(rolesMatch("Engineer", null), false);
  });
});
