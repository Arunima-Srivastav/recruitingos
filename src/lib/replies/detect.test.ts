import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actionNeedsReplyReason,
  detectNeedsReply,
  opportunityNeedsReplyReason,
} from "./detect";
import type { ActionWithOpportunity, Opportunity } from "../types";

function opportunity(
  partial: Partial<Opportunity> & Pick<Opportunity, "id">
): Opportunity {
  return {
    user_id: "user-1",
    company: "Acme",
    role_title: "Engineer",
    source: "gmail",
    stage: "Recruiter Chat",
    priority_score: 7,
    deadline: null,
    next_action: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...partial,
  };
}

function action(
  partial: Partial<ActionWithOpportunity> & Pick<ActionWithOpportunity, "id">
): ActionWithOpportunity {
  return {
    opportunity_id: "opp-1",
    user_id: "user-1",
    action_type: "other",
    title: "Task",
    description: null,
    due_at: null,
    status: "pending",
    priority_score: 7,
    created_at: "2024-01-01T00:00:00Z",
    opportunity: opportunity({ id: "opp-1" }),
    ...partial,
  };
}

describe("actionNeedsReplyReason", () => {
  it("detects explicit reply actions", () => {
    const reason = actionNeedsReplyReason(
      action({ id: "a1", action_type: "reply", title: "Reply to recruiter" })
    );
    assert.equal(reason, "Reply to recruiter");
  });

  it("ignores schedule-only actions without reply wording", () => {
    const reason = actionNeedsReplyReason(
      action({
        id: "a2",
        action_type: "schedule",
        title: "Book phone screen",
        description: "Please share your availability for next week",
      })
    );
    assert.equal(reason, null);
  });

  it("detects reply keywords in generic action text", () => {
    const reason = actionNeedsReplyReason(
      action({
        id: "a3",
        title: "Follow up",
        description: "Please reply if you are still interested",
      })
    );
    assert.equal(reason, "Follow up");
  });

  it("ignores scheduling language unless reply is mentioned", () => {
    const reason = actionNeedsReplyReason(
      action({
        id: "a4",
        title: "Interview prep",
        description: "Let's schedule a call on your calendar next week",
      })
    );
    assert.equal(reason, null);
  });

  it("ignores inactive opportunity stages", () => {
    const reason = actionNeedsReplyReason(
      action({
        id: "a5",
        action_type: "reply",
        opportunity: opportunity({ id: "opp-1", stage: "Rejected" }),
      })
    );
    assert.equal(reason, null);
  });
});

describe("opportunityNeedsReplyReason", () => {
  it("flags Needs Reply stage", () => {
    const reason = opportunityNeedsReplyReason(
      opportunity({
        id: "o1",
        stage: "Needs Reply",
        next_action: "Send thank-you note",
      })
    );
    assert.equal(reason, "Send thank-you note");
  });

  it("returns null for Offer stage", () => {
    assert.equal(
      opportunityNeedsReplyReason(
        opportunity({ id: "o2", stage: "Offer", next_action: "Reply to offer" })
      ),
      null
    );
  });
});

describe("detectNeedsReply", () => {
  it("prefers action-backed items and sorts by priority", () => {
    const opp = opportunity({
      id: "opp-1",
      stage: "Needs Reply",
      next_action: "Should not duplicate",
      priority_score: 3,
    });
    const items = detectNeedsReply(
      [opp],
      [
        action({
          id: "act-1",
          opportunity_id: "opp-1",
          action_type: "reply",
          title: "Reply to Macy's recruiter",
          priority_score: 9,
          opportunity: opp,
        }),
      ]
    );

    assert.equal(items.length, 1);
    assert.equal(items[0]?.actionId, "act-1");
    assert.equal(items[0]?.priorityScore, 9);
  });

  it("includes opportunity-only reply items when no action exists", () => {
    const opp = opportunity({
      id: "opp-2",
      stage: "Recruiter Chat",
      next_action: "Please respond by Friday",
      priority_score: 4,
    });

    const items = detectNeedsReply([opp], []);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.actionId, null);
    assert.equal(items[0]?.reason, "Please respond by Friday");
  });
});
