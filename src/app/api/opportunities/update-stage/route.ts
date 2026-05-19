import { NextResponse } from "next/server";
import { updateOpportunityStage } from "@/lib/db";
import { STAGES } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { opportunity_id, stage } = body as {
      opportunity_id?: string;
      stage?: string;
    };

    if (!opportunity_id || !stage) {
      return NextResponse.json(
        { error: "opportunity_id and stage are required" },
        { status: 400 }
      );
    }

    if (!STAGES.includes(stage as (typeof STAGES)[number])) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    const opportunity = await updateOpportunityStage(opportunity_id, stage);
    return NextResponse.json({ opportunity });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update stage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
