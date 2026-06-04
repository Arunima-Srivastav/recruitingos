/** Default Ollama Cloud model for message extraction (Mistral family only). */
export const OLLAMA_EXTRACTION_MODEL = "ministral-3:3b";

const MISTRAL_MODEL_PATTERN = /mistral/i;

/** Returns a Mistral-family model name. Non-Mistral values (e.g. Gemma) are ignored. */
export function getOllamaExtractionModel(): string {
  const configured = process.env.OLLAMA_MODEL?.trim();
  if (configured && MISTRAL_MODEL_PATTERN.test(configured)) {
    return configured;
  }
  return OLLAMA_EXTRACTION_MODEL;
}
