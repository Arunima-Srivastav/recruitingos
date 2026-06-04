import type { DraftType, Tone } from "./constants";
import type { Message, Opportunity } from "./types";

interface DraftContext {
  opportunity: Opportunity;
  messages: Message[];
  draftType: DraftType;
  tone: Tone;
}

function getRecruiterName(messages: Message[]): string {
  for (const msg of messages) {
    const extracted = msg.extracted_json as { recruiter_name?: string } | null;
    if (extracted?.recruiter_name) return extracted.recruiter_name;
    if (msg.sender_name) return msg.sender_name;
  }
  return "there";
}

function applyTone(body: string, tone: Tone): string {
  switch (tone) {
    case "concise":
      return body
        .replace(/I hope you're doing well\. /, "")
        .replace(/I'd be grateful for any updates when you have a chance\./, "Any updates would be appreciated.")
        .replace(/\n\nI['']m available:[\s\S]*?Please let me know if any of those times work\./, "\n\nI'm free Tue after 2pm, Wed 10-12, or Thu after 3pm. Let me know what works.");
    case "warm":
      return body
        .replace("Thank you for reaching out.", "Thanks so much for reaching out. Really appreciate it!")
        .replace("I hope you're doing well.", "Hope you're having a great week!");
    case "enthusiastic":
      return body
        .replace("I'd be interested", "I'm very excited and would love")
        .replace("I'd be happy to schedule", "I'd love to schedule")
        .replace("Thank you for reaching out.", "Thank you so much for reaching out. This sounds like an amazing opportunity!");
    case "professional":
    default:
      return body;
  }
}

export function generateMockDraft(ctx: DraftContext): string {
  const company = ctx.opportunity.company ?? "your company";
  const role = ctx.opportunity.role_title ?? "the role";
  const recruiter = getRecruiterName(ctx.messages);

  let body = "";

  switch (ctx.draftType) {
    case "reply":
      body = `Hi ${recruiter},

Thank you for reaching out. I'd be interested in learning more about the ${role} opportunity at ${company}.

Best,
Arunima`;
      break;
    case "follow_up":
      body = `Hi ${recruiter},

I hope you're doing well. I wanted to follow up on my application/interview for the ${role} role at ${company}. I'd be grateful for any updates when you have a chance.

Best,
Arunima`;
      break;
    case "scheduling":
      body = `Hi ${recruiter},

Thank you for reaching out. I'd be happy to schedule a time to chat about the ${role} opportunity at ${company}.

I'm available:
- Tuesday after 2:00 PM
- Wednesday between 10:00 AM and 12:00 PM
- Thursday after 3:00 PM

Please let me know if any of those times work.

Best,
Arunima`;
      break;
  }

  return applyTone(body, ctx.tone);
}
