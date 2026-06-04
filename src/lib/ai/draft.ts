import type { DraftType, Tone } from "@/lib/constants";
import { generateMockDraft } from "@/lib/mockDraftGenerator";
import type { Message, Opportunity, UserDraftContext } from "@/lib/types";
import { DRAFT_SYSTEM_PROMPT, buildDraftUserPrompt } from "./draftPrompts";
import { chatWithOllama, getOllamaConfig, isOllamaConfigured } from "./ollama";

export type DraftProvider = "ollama" | "template";

export interface GenerateDraftResult {
  body: string;
  provider: DraftProvider;
  model?: string;
}

export function sanitizeDraftBody(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/^```(?:\w+)?\s*([\s\S]*?)```$/);
  if (fence) {
    text = fence[1].trim();
  }
  return text;
}

export async function generateDraftBody(input: {
  opportunity: Opportunity;
  messages: Message[];
  draftType: DraftType;
  tone: Tone;
  draftContext?: UserDraftContext | null;
}): Promise<GenerateDraftResult> {
  const fallback = (): GenerateDraftResult => ({
    body: generateMockDraft(input),
    provider: "template",
  });

  if (!isOllamaConfigured()) {
    return fallback();
  }

  const config = getOllamaConfig();
  if (!config) return fallback();

  try {
    const { content, model } = await chatWithOllama(
      config,
      DRAFT_SYSTEM_PROMPT,
      buildDraftUserPrompt(input),
      { json: false }
    );

    const body = sanitizeDraftBody(content);
    if (!body || body.length < 20) {
      return fallback();
    }

    return { body, provider: "ollama", model };
  } catch {
    return fallback();
  }
}
