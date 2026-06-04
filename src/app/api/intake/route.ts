import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { normalizeReviewedExtraction } from "@/lib/ai/extract";
import { mockExtract } from "@/lib/mockExtractor";
import { buildOpportunityUrlMap, findDuplicatesForOpportunity } from "@/lib/dedup/match";
import {
  getAllMessagesForUser,
  getOpportunities,
  getOpportunityById,
} from "@/lib/db";
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

    const [opportunities, messages, created] = await Promise.all([
      getOpportunities(),
      getAllMessagesForUser(),
      getOpportunityById(result.opportunity_id),
    ]);

    const possible_duplicates =
      created != null
        ? findDuplicatesForOpportunity(
            created,
            opportunities,
            buildOpportunityUrlMap(messages)
          )
        : [];

    return NextResponse.json({
      ...result,
      possible_duplicates,
    });
  } catch (err) {
    return handleApiError(err, "Failed to process message");
  }
}
