import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { getOpportunities, getPendingActions } from "@/lib/db";
import { detectNeedsReply } from "@/lib/replies/detect";

export async function GET() {
  try {
    const [opportunities, actions] = await Promise.all([
      getOpportunities(),
      getPendingActions(),
    ]);

    return NextResponse.json({
      items: detectNeedsReply(opportunities, actions),
    });
  } catch (err) {
    return handleApiError(err, "Failed to load reply queue");
  }
}
