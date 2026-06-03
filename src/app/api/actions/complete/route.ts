import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { markActionComplete } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action_id } = body as { action_id?: string };

    if (!action_id) {
      return NextResponse.json(
        { error: "action_id is required" },
        { status: 400 }
      );
    }

    await markActionComplete(action_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, "Failed to complete action");
  }
}
