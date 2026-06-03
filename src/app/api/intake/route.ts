import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { normalizeReviewedExtraction } from "@/lib/ai/extract";
import { mockExtract } from "@/lib/mockExtractor";
import { saveOpportunityFromMessage } from "@/lib/intake/saveMessage";
import type { ExtractedRecruitingData } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, source, extracted } = body as {
      text?: string;
      source?: string;
      extracted?: ExtractedRecruitingData;
    };

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const extractedData = extracted
      ? normalizeReviewedExtraction(extracted)
      : mockExtract(text);

    const result = await saveOpportunityFromMessage({
      text,
      source: source ?? "manual",
      extracted: extractedData,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err, "Failed to process message");
  }
}
