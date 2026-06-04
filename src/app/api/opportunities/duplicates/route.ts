import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import {
  buildOpportunityUrlMap,
  findDuplicatesForOpportunity,
} from "@/lib/dedup/match";
import {
  getAllMessagesForUser,
  getOpportunities,
  getOpportunityById,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get("opportunity_id");

    if (!opportunityId) {
      return NextResponse.json(
        { error: "opportunity_id is required" },
        { status: 400 }
      );
    }

    const [target, opportunities, messages] = await Promise.all([
      getOpportunityById(opportunityId),
      getOpportunities(),
      getAllMessagesForUser(),
    ]);

    if (!target) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }

    const urlMap = buildOpportunityUrlMap(messages);
    const duplicates = findDuplicatesForOpportunity(
      target,
      opportunities,
      urlMap
    );

    const enriched = duplicates.map((dup) => {
      const opp = opportunities.find((o) => o.id === dup.opportunityId);
      return {
        ...dup,
        company: opp?.company ?? null,
        role_title: opp?.role_title ?? null,
        source: opp?.source ?? null,
        stage: opp?.stage ?? null,
      };
    });

    return NextResponse.json({ duplicates: enriched });
  } catch (err) {
    return handleApiError(err, "Failed to find duplicates");
  }
}
