import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import {
  createAction,
  createMessage,
  createOpportunity,
  hasSeedData,
} from "@/lib/db";
import { mockExtract } from "@/lib/mockExtractor";
import { calculatePriority } from "@/lib/prioritizer";

const SEED_MESSAGES = [
  {
    source: "linkedin",
    text: `Hi Arunima,

I'm Sarah, a recruiter at Databricks. We have an opening for our Software Engineering Intern role and your background looks like a great fit.

Would you be available for a quick call next week to chat about the opportunity?

Best,
Sarah Chen
sarah.chen@databricks.com`,
  },
  {
    source: "gmail",
    text: `Subject: Stripe — Online Assessment

Hi Arunima,

Thank you for your interest in the New Grad Software Engineer role at Stripe.

Please complete our online assessment on HackerRank by March 28, 2026. The coding challenge should take about 90 minutes.

Link: https://hackerrank.com/stripe-oa

Best,
Stripe Recruiting
recruiting@stripe.com`,
  },
  {
    source: "gmail",
    text: `Hi Arunima,

Thank you for interviewing with the Google team for the Software Engineer role. We enjoyed our conversation.

We're still finalizing next steps and will follow up soon. No action needed on your end right now.

Best,
Google Recruiting`,
  },
  {
    source: "gmail",
    text: `Hi Arunima,

Thank you for your interest in Meta and for taking the time to interview with us.

Unfortunately, we have decided to move forward with other candidates for the Software Engineer New Grad position. We appreciate your time and wish you the best.

Best,
Meta Recruiting Team`,
  },
  {
    source: "gmail",
    text: `Hi Arunima,

Congratulations! We'd like to invite you to the final round interview for the Machine Learning Engineer role at Anthropic.

Are you available to schedule a technical interview next week? Please reply with your availability.

Best,
Anthropic Recruiting
talent@anthropic.com`,
  },
];

async function seedOne(source: string, text: string) {
  const extracted = mockExtract(text);
  const priority = calculatePriority({
    stage: extracted.stage,
    action_type: extracted.action_type,
    deadline: extracted.deadline,
    created_at: new Date().toISOString(),
  });

  const opportunity = await createOpportunity({
    company: extracted.company,
    role_title: extracted.role_title,
    source,
    stage: extracted.stage,
    priority_score: priority.score,
    deadline: extracted.deadline,
    next_action: extracted.next_action,
    notes: extracted.short_summary,
  });

  await createMessage({
    opportunity_id: opportunity.id,
    source,
    sender_name: extracted.recruiter_name,
    sender_email: extracted.recruiter_email,
    subject: null,
    body: text,
    received_at: new Date().toISOString(),
    extracted_json: extracted,
    external_message_id: null,
  });

  if (
    extracted.next_action &&
    extracted.action_type &&
    extracted.action_type !== "none"
  ) {
    const actionPriority = calculatePriority({
      stage: extracted.stage,
      action_type: extracted.action_type,
      deadline: extracted.deadline,
      due_at: extracted.deadline,
      created_at: new Date().toISOString(),
    });

    await createAction({
      opportunity_id: opportunity.id,
      action_type: extracted.action_type,
      title: extracted.next_action,
      description: extracted.short_summary,
      due_at: extracted.deadline,
      priority_score: actionPriority.score,
    });
  }

  return opportunity.id;
}

export async function POST() {
  try {
    const alreadySeeded = await hasSeedData();
    if (alreadySeeded) {
      return NextResponse.json({
        message: "Demo data already exists",
        seeded: false,
      });
    }

    const ids: string[] = [];
    for (const item of SEED_MESSAGES) {
      const id = await seedOne(item.source, item.text);
      ids.push(id);
    }

    return NextResponse.json({
      message: "Demo data created",
      seeded: true,
      opportunity_ids: ids,
    });
  } catch (err) {
    return handleApiError(err, "Failed to seed demo data");
  }
}
