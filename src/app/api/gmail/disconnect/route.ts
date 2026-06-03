import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { deleteGoogleConnection } from "@/lib/google/oauth";

export async function POST() {
  try {
    await deleteGoogleConnection();
    return NextResponse.json({ disconnected: true });
  } catch (err) {
    return handleApiError(err, "Failed to disconnect Gmail");
  }
}
