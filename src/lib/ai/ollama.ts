import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} from "./prompts";
import { getOllamaExtractionModel } from "./model";

export interface OllamaConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getOllamaConfig(): OllamaConfig | null {
  const apiKey = process.env.OLLAMA_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: (process.env.OLLAMA_BASE_URL ?? "https://ollama.com").replace(
      /\/$/,
      ""
    ),
    model: getOllamaExtractionModel(),
  };
}

export function isOllamaConfigured(): boolean {
  return getOllamaConfig() !== null;
}

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

export async function chatWithOllama(
  config: OllamaConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; model: string }> {
  const res = await fetch(`${config.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = (await res.json()) as OllamaChatResponse;

  if (!res.ok) {
    throw new Error(data.error ?? `Ollama request failed (${res.status})`);
  }

  const content = data.message?.content?.trim();
  if (!content) {
    throw new Error("Ollama returned an empty response");
  }

  return { content, model: config.model };
}

export async function extractWithOllama(
  rawText: string,
  sourceType?: string
): Promise<{ rawOutput: string; model: string }> {
  const config = getOllamaConfig();
  if (!config) {
    throw new Error(
      "Ollama is not configured. Set OLLAMA_API_KEY in .env.local."
    );
  }

  const { content, model } = await chatWithOllama(
    config,
    EXTRACTION_SYSTEM_PROMPT,
    buildExtractionUserPrompt(rawText, sourceType)
  );

  return { rawOutput: content, model };
}
