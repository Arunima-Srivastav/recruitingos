import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { mergeOpportunities } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { primary_id, secondary_id } = body as {
      primary_id?: string;
      secondary_id?: string;
    };

    if (!primary_id || !secondary_id) {
      return NextResponse.json(
        { error: "primary_id and secondary_id are required" },
        { status: 400 }
      );
    }

    const opportunity = await mergeOpportunities(primary_id, secondary_id);
    return NextResponse.json({ opportunity });
  } catch (err) {
    return handleApiError(err, "Failed to merge opportunities");
  }
}
