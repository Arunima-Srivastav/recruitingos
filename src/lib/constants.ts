export const STAGES = [
  "New",
  "Needs Reply",
  "OA Pending",
  "Interview Scheduling",
  "Interviewing",
  "Waiting",
  "Offer",
  "Rejected",
  "Ghosted",
] as const;

export type Stage = (typeof STAGES)[number];

export const SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "gmail", label: "Gmail" },
  { value: "job_post", label: "Job Post" },
] as const;

export const DRAFT_TYPES = ["reply", "follow_up", "scheduling"] as const;
export type DraftType = (typeof DRAFT_TYPES)[number];

export const TONES = [
  "concise",
  "warm",
  "professional",
  "enthusiastic",
] as const;
export type Tone = (typeof TONES)[number];

export const STAGE_COLORS: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  "Needs Reply": "bg-amber-100 text-amber-800",
  "OA Pending": "bg-orange-100 text-orange-800",
  "Interview Scheduling": "bg-blue-100 text-blue-800",
  Interviewing: "bg-indigo-100 text-indigo-800",
  Waiting: "bg-gray-100 text-gray-700",
  Offer: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-700",
  Ghosted: "bg-stone-100 text-stone-600",
};
