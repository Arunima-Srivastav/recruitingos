import { NextResponse } from "next/server";
import { deleteOpportunity, getOpportunityById } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { opportunity_id } = body as { opportunity_id?: string };

    if (!opportunity_id) {
      return NextResponse.json(
        { error: "opportunity_id is required" },
        { status: 400 }
      );
    }

    const existing = await getOpportunityById(opportunity_id);
    if (!existing) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    await deleteOpportunity(opportunity_id);
    return NextResponse.json({ deleted: true, opportunity_id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete opportunity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
