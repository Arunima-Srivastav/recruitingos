import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guessCompanyFromEventTitle,
  guessStageFromEventTitle,
} from "./pipeline";

describe("guessCompanyFromEventTitle", () => {
  it("uses text before a colon", () => {
    assert.equal(guessCompanyFromEventTitle("Stripe: Phone Screen"), "Stripe");
  });

  it("uses the first word for long titles without a colon", () => {
    const title =
      "Acme Corporation International hiring committee weekly standup meeting notes";
    assert.equal(guessCompanyFromEventTitle(title), "Acme");
  });
});

describe("guessStageFromEventTitle", () => {
  it("maps OA titles to OA Pending", () => {
    assert.equal(
      guessStageFromEventTitle("Databricks HackerRank Assessment"),
      "OA Pending"
    );
  });

  it("maps scheduling-heavy interview titles to Interview Scheduling", () => {
    assert.equal(
      guessStageFromEventTitle(
        "Schedule interview availability on calendar"
      ),
      "Interview Scheduling"
    );
  });

  it("maps interview titles without scheduling focus to Interviewing", () => {
    assert.equal(
      guessStageFromEventTitle("Meta Final Round Interview"),
      "Interviewing"
    );
  });

  it("maps recruiter call titles to Recruiter Chat", () => {
    assert.equal(
      guessStageFromEventTitle("Intro call with recruiter"),
      "Recruiter Chat"
    );
  });

  it("maps offer titles to Offer", () => {
    assert.equal(
      guessStageFromEventTitle("Congratulations - Offer from Notion"),
      "Offer"
    );
  });
});
