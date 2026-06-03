import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { extractRecruitingMessage } from "@/lib/ai/extract";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, sourceType, sourceMetadata } = body as {
      rawText?: string;
      sourceType?: string;
      sourceMetadata?: Record<string, unknown>;
    };

    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json({ error: "rawText is required" }, { status: 400 });
    }

    void sourceMetadata;

    const result = await extractRecruitingMessage(rawText.trim(), sourceType);

    return NextResponse.json({
      extraction: result.data,
      provider: result.provider,
      extraction_status: result.extraction_status,
      needs_review: result.needs_review,
      explanation: result.explanation,
      raw_model_output: result.raw_model_output,
      model: result.model,
    });
  } catch (err) {
    return handleApiError(err, "Failed to extract message");
  }
}
