export const MAX_RESUME_TEXT_LENGTH = 12_000;
export const MAX_HIGHLIGHTS_TEXT_LENGTH = 2_000;
export const RESUME_PROMPT_MAX_LENGTH = 4_000;

export function trimDraftContextField(
  value: string | null | undefined,
  maxLength: number
): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength);
}

export function resumeTextForPrompt(
  resumeText: string | null | undefined
): string | null {
  if (!resumeText?.trim()) return null;
  const trimmed = resumeText.trim();
  if (trimmed.length <= RESUME_PROMPT_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, RESUME_PROMPT_MAX_LENGTH)}\n...[resume truncated]`;
}
