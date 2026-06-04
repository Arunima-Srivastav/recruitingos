import type { DraftType, Tone } from "@/lib/constants";
import { resumeTextForPrompt } from "@/lib/draftContext";
import type { Message, Opportunity, UserDraftContext } from "@/lib/types";

const DRAFT_TYPE_INSTRUCTIONS: Record<DraftType, string> = {
  reply:
    "Write a reply to the recruiter's latest message. Address their questions and show interest.",
  follow_up:
    "Write a polite follow-up on the application or interview process. Ask for a status update.",
  scheduling:
    "Write a reply to schedule a recruiter call or interview. Propose 2-3 specific availability windows (use placeholder times if none were given).",
};

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  concise: "Keep it short: 3-5 sentences max.",
  warm: "Friendly and appreciative, still professional.",
  professional: "Standard professional recruiting tone.",
  enthusiastic: "Positive and motivated, without being over the top.",
};

function latestMessagesContext(messages: Message[], limit = 2): string {
  const sorted = [...messages].sort((a, b) => {
    const aTime = new Date(a.received_at ?? a.created_at).getTime();
    const bTime = new Date(b.received_at ?? b.created_at).getTime();
    return bTime - aTime;
  });

  return sorted
    .slice(0, limit)
    .map((msg, index) => {
      const header = [
        `Message ${index + 1}`,
        msg.sender_name ?? msg.sender_email ?? "Unknown sender",
        msg.source,
        msg.subject ? `Subject: ${msg.subject}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const body = msg.body.trim().slice(0, 2500);
      return `${header}\n${body}`;
    })
    .join("\n\n---\n\n");
}

export const DRAFT_SYSTEM_PROMPT = `You draft recruiting email replies for a student job seeker.

Rules:
- Output ONLY the email body text (greeting, paragraphs, sign-off). No JSON, no markdown fences, no commentary.
- Sign off as "Arunima" unless the context specifies another name.
- Do not claim the email was sent. This is a draft for the student to review and send themselves.
- Be factual: use only details from the opportunity context and messages provided.
- Do not invent offer terms, interview dates, or company facts that are not in the context.
- When resume or highlights are provided, weave in relevant real experience. Do not fabricate roles or employers not listed on the resume.`;

function studentContextBlock(
  draftContext: UserDraftContext | null | undefined
): string | null {
  if (!draftContext) return null;

  const highlights = draftContext.highlights_text?.trim();
  const resume = resumeTextForPrompt(draftContext.resume_text);
  if (!highlights && !resume) return null;

  const lines = ["Student background for personalization:"];
  if (highlights) {
    lines.push(`Highlights to emphasize:\n${highlights}`);
  }
  if (resume) {
    lines.push(`Resume:\n${resume}`);
  }
  return lines.join("\n\n");
}

export function buildDraftUserPrompt(input: {
  opportunity: Opportunity;
  messages: Message[];
  draftType: DraftType;
  tone: Tone;
  draftContext?: UserDraftContext | null;
}): string {
  const { opportunity, messages, draftType, tone, draftContext } = input;
  const messageBlock =
    messages.length > 0
      ? latestMessagesContext(messages)
      : "No prior messages. Use opportunity metadata only.";
  const studentBlock = studentContextBlock(draftContext);

  return [
    `Draft type: ${draftType.replace("_", " ")}`,
    DRAFT_TYPE_INSTRUCTIONS[draftType],
    `Tone: ${tone}. ${TONE_INSTRUCTIONS[tone]}`,
    "",
    studentBlock,
    studentBlock ? "" : null,
    "Opportunity:",
    `Company: ${opportunity.company ?? "Unknown"}`,
    `Role: ${opportunity.role_title ?? "Unknown"}`,
    `Stage: ${opportunity.stage}`,
    opportunity.next_action ? `Next action: ${opportunity.next_action}` : null,
    opportunity.deadline ? `Deadline: ${opportunity.deadline}` : null,
    opportunity.notes ? `Notes: ${opportunity.notes}` : null,
    "",
    "Recent messages (newest first):",
    messageBlock,
  ]
    .filter(Boolean)
    .join("\n");
}
