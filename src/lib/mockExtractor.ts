import type { ExtractedRecruitingData } from "./types";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const KNOWN_ROLES = [
  "Software Engineer",
  "Machine Learning Engineer",
  "Product Manager",
];

const COMPANY_PATTERNS = [
  /(?:at|from|join)\s+([A-Z][A-Za-z0-9&.\- ]{1,40}?)(?:\s+team|\s+for|\.|,|\n|$)/i,
  /([A-Z][A-Za-z0-9&.\- ]{1,40}?)\s+team/i,
  /(?:I['']m|I am)\s+a\s+recruiter\s+at\s+([A-Z][A-Za-z0-9&.\- ]{1,40})/i,
];

const ROLE_PATTERNS = [
  /for\s+(?:our|the)\s+([A-Za-z0-9 /\-]+?)\s+role/i,
  /([A-Za-z0-9 /\-]+?)\s+internship/i,
  /([A-Za-z0-9 /\-]+?)\s+intern\b/i,
  /([A-Za-z0-9 /\-]+?)\s+new\s+grad/i,
];

function extractCompany(text: string): string | null {
  for (const pattern of COMPANY_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const company = match[1].trim().replace(/\s+/g, " ");
      if (company.length > 1 && company.length < 50) return company;
    }
  }
  return null;
}

function extractRole(text: string): string | null {
  for (const known of KNOWN_ROLES) {
    if (text.toLowerCase().includes(known.toLowerCase())) return known;
  }
  for (const pattern of ROLE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const role = match[1].trim().replace(/\s+/g, " ");
      if (role.length > 2 && role.length < 80) return role;
    }
  }
  return null;
}

function extractRecruiterName(text: string): string | null {
  const patterns = [
    /(?:Hi|Hello|Hey),?\s+I'm\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:Hi|Hello),?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+here/,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+from\s+[A-Z]/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractDeadline(text: string): string | null {
  const patterns = [
    /(?:by|before|due)\s+([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
    /(?:by|before|due)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /deadline[:\s]+([A-Za-z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i,
    /complete\s+(?:the\s+)?(?:OA|assessment)\s+by\s+([^.!\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = new Date(match[1].trim());
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }
  return null;
}

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function isSchedulingFocused(text: string): boolean {
  const scheduling = ["available", "schedule", "chat", "call", "meet", "calendar"];
  const interview = ["interview", "final round", "technical interview"];
  const schedCount = scheduling.filter((k) => text.toLowerCase().includes(k)).length;
  const intCount = interview.filter((k) => text.toLowerCase().includes(k)).length;
  return schedCount >= intCount && schedCount > 0;
}

function classifyStageAndAction(text: string): {
  stage: string;
  action_type: string;
  next_action: string | null;
} {
  const lower = text.toLowerCase();

  if (
    containsAny(lower, [
      "unfortunately",
      "not moving forward",
      "rejected",
      "other candidates",
    ])
  ) {
    return {
      stage: "Rejected",
      action_type: "none",
      next_action: null,
    };
  }

  if (containsAny(lower, ["offer", "congratulations"])) {
    return {
      stage: "Offer",
      action_type: "none",
      next_action: "Review offer details and respond",
    };
  }

  if (
    containsAny(lower, [
      "online assessment",
      "oa",
      "coding challenge",
      "hackerrank",
      "codesignal",
      "deadline",
    ])
  ) {
    return {
      stage: "OA Pending",
      action_type: "oa",
      next_action: "Complete online assessment before deadline",
    };
  }

  if (
    containsAny(lower, [
      "interview",
      "final round",
      "technical interview",
      "phone screen",
      "onsite",
    ])
  ) {
    if (isSchedulingFocused(text)) {
      return {
        stage: "Interview Scheduling",
        action_type: "schedule",
        next_action: "Reply with availability to schedule interview",
      };
    }
    return {
      stage: "Interviewing",
      action_type: "none",
      next_action: "Prepare for upcoming interview",
    };
  }

  if (
    containsAny(lower, [
      "available",
      "schedule",
      "chat",
      "call",
      "meet",
      "calendar",
      "book a time",
      "quick call",
    ])
  ) {
    return {
      stage: "Recruiter Chat",
      action_type: "schedule",
      next_action: "Book time with recruiter",
    };
  }

  if (
    containsAny(lower, [
      "would you be interested",
      "are you interested",
      "reply",
    ]) ||
    (text.includes("?") && containsAny(lower, ["interested", "role", "opportunity"]))
  ) {
    return {
      stage: "Needs Reply",
      action_type: "reply",
      next_action: "Reply to recruiter message",
    };
  }

  return {
    stage: "New",
    action_type: "none",
    next_action: "Review new recruiting message",
  };
}

export function mockExtract(text: string): ExtractedRecruitingData {
  const trimmed = text.trim();
  const company = extractCompany(trimmed);
  const role_title = extractRole(trimmed);
  const recruiter_email =
    trimmed.match(EMAIL_REGEX)?.[0] ?? null;
  const recruiter_name = extractRecruiterName(trimmed);
  const deadline = extractDeadline(trimmed);
  const { stage, action_type, next_action } = classifyStageAndAction(trimmed);

  let confidence = 0.5;
  if (company) confidence += 0.15;
  if (role_title) confidence += 0.15;
  if (recruiter_email) confidence += 0.1;
  confidence = Math.min(confidence, 0.95);

  const short_summary = [
    company ? company : "Unknown company",
    role_title ? `· ${role_title}` : "",
    `(${stage})`,
  ].join(" ");

  return {
    company,
    role_title,
    recruiter_name,
    recruiter_email,
    deadline,
    stage,
    next_action,
    action_type,
    is_time_sensitive:
      action_type === "oa" ||
      stage === "Interview Scheduling" ||
      stage === "Needs Reply",
    confidence,
    short_summary: short_summary.trim(),
  };
}
