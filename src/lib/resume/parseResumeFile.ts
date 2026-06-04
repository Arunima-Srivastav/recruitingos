import { MAX_RESUME_TEXT_LENGTH } from "@/lib/draftContext";

export const MAX_RESUME_UPLOAD_BYTES = 2 * 1024 * 1024;

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown"];
const PDF_EXTENSIONS = [".pdf"];

export function isAllowedResumeFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    PDF_EXTENSIONS.some((ext) => lower.endsWith(ext))
  );
}

export function normalizeExtractedResumeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RESUME_TEXT_LENGTH);
}

export async function parseResumeBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();

  if (PDF_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return parsePdfBuffer(buffer);
  }

  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    const text = buffer.toString("utf-8").trim();
    if (!text) {
      throw new Error("That file appears to be empty.");
    }
    return normalizeExtractedResumeText(text);
  }

  throw new Error("Upload a .pdf, .txt, or .md resume file.");
}

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = result.text?.trim() ?? "";
    if (!text) {
      throw new Error(
        "No text found in this PDF. Try a text-based PDF or paste your resume below."
      );
    }
    return normalizeExtractedResumeText(text);
  } finally {
    await parser.destroy();
  }
}
