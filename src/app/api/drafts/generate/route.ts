import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import {
  createDraft,
  getMessagesForOpportunity,
  getOpportunityById,
} from "@/lib/db";
import type { DraftType, Tone } from "@/lib/constants";
import { DRAFT_TYPES, TONES } from "@/lib/constants";
import { generateMockDraft } from "@/lib/mockDraftGenerator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      opportunity_id,
      draft_type,
      tone = "professional",
    } = body as {
      opportunity_id?: string;
      draft_type?: string;
      tone?: string;
    };

    if (!opportunity_id) {
      return NextResponse.json(
        { error: "opportunity_id is required" },
        { status: 400 }
      );
    }

    if (!draft_type || !DRAFT_TYPES.includes(draft_type as DraftType)) {
      return NextResponse.json(
        { error: "draft_type must be reply, follow_up, or scheduling" },
        { status: 400 }
      );
    }

    if (!TONES.includes(tone as Tone)) {
      return NextResponse.json(
        { error: "Invalid tone" },
        { status: 400 }
      );
    }

    const opportunity = await getOpportunityById(opportunity_id);
    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    const messages = await getMessagesForOpportunity(opportunity_id);
    const draftBody = generateMockDraft({
      opportunity,
      messages,
      draftType: draft_type as DraftType,
      tone: tone as Tone,
    });

    const draft = await createDraft({
      opportunity_id,
      draft_type,
      tone,
      body: draftBody,
    });

    return NextResponse.json({ draft });
  } catch (err) {
    return handleApiError(err, "Failed to generate draft");
  }
}
