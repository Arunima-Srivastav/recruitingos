import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOpportunityUrlMap,
  findDuplicateByExtracted,
  findDuplicatesForOpportunity,
  matchOpportunities,
} from "./match";
import type { Message, Opportunity } from "../types";

function opp(
  partial: Partial<Opportunity> & Pick<Opportunity, "id">
): Opportunity {
  return {
    user_id: "user-1",
    company: null,
    role_title: null,
    source: "manual",
    stage: "New",
    priority_score: 0,
    deadline: null,
    next_action: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...partial,
  };
}

describe("matchOpportunities", () => {
  it("returns null for the same opportunity id", () => {
    const input = {
      id: "a",
      company: "Macy's",
      role_title: "Technology Intern",
    };
    assert.equal(matchOpportunities(input, input), null);
  });

  it("matches on company and role", () => {
    const match = matchOpportunities(
      {
        id: "a",
        company: "Macy's",
        role_title: "Technology Intern - Multiple Teams",
      },
      {
        id: "b",
        company: "Macys",
        role_title: "Technology Intern",
      }
    );
    assert.ok(match);
    assert.equal(match?.opportunityId, "b");
    assert.equal(match?.reason, "company_role");
  });

  it("matches on shared apply URL even when titles differ", () => {
    const url = "https://jobs.example.com/role/123";
    const match = matchOpportunities(
      {
        id: "a",
        company: "Acme",
        role_title: "Role A",
        applyUrls: [url],
      },
      {
        id: "b",
        company: "Other Co",
        role_title: "Role B",
        applyUrls: [url],
      }
    );
    assert.ok(match);
    assert.equal(match?.reason, "apply_url");
  });

  it("returns null when company and role and URLs differ", () => {
    const match = matchOpportunities(
      { id: "a", company: "Stripe", role_title: "Engineer" },
      { id: "b", company: "Notion", role_title: "Designer" }
    );
    assert.equal(match, null);
  });
});

describe("buildOpportunityUrlMap", () => {
  it("collects normalized URLs per opportunity from message bodies", () => {
    const messages: Message[] = [
      {
        id: "m1",
        opportunity_id: "opp-1",
        user_id: "user-1",
        source: "discover",
        sender_name: null,
        sender_email: null,
        subject: null,
        body: "Apply: https://jobs.example.com/role/1?utm_source=email",
        received_at: null,
        extracted_json: null,
        external_message_id: null,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    const map = buildOpportunityUrlMap(messages);
    assert.deepEqual(map.get("opp-1"), ["https://jobs.example.com/role/1"]);
  });
});

describe("findDuplicatesForOpportunity", () => {
  it("finds other opportunities that match the target", () => {
    const target = opp({
      id: "target",
      company: "Macy's",
      role_title: "Technology Intern - Multiple Teams",
    });
    const others = [
      target,
      opp({
        id: "gmail",
        company: "Macy's",
        role_title: "Technology Intern",
        source: "gmail",
      }),
      opp({ id: "other", company: "Ramp", role_title: "Engineer" }),
    ];

    const duplicates = findDuplicatesForOpportunity(target, others, new Map());
    assert.equal(duplicates.length, 1);
    assert.equal(duplicates[0]?.opportunityId, "gmail");
    assert.equal(duplicates[0]?.reason, "company_role");
  });
});

describe("findDuplicateByExtracted", () => {
  it("detects an existing opportunity from new import text", () => {
    const existing = opp({
      id: "discover-1",
      company: "Macy's",
      role_title: "Technology Intern - Multiple Teams",
      source: "discover",
    });
    const text = [
      "Company: Macy's",
      "Role: Technology Intern",
      "Apply: https://jobs.example.com/macys-intern",
    ].join("\n");

    const match = findDuplicateByExtracted(
      "Macy's",
      "Technology Intern",
      text,
      [existing],
      new Map()
    );

    assert.ok(match);
    assert.equal(match?.opportunityId, "discover-1");
  });

  it("returns null when nothing matches", () => {
    const match = findDuplicateByExtracted(
      "Ramp",
      "Software Engineer",
      "Apply: https://jobs.example.com/ramp",
      [opp({ id: "x", company: "Stripe", role_title: "PM" })],
      new Map()
    );
    assert.equal(match, null);
  });
});
