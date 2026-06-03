import { NextResponse } from "next/server";
import { deleteGoogleConnection } from "@/lib/google/oauth";

export async function POST() {
  try {
    await deleteGoogleConnection();
    return NextResponse.json({ disconnected: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to disconnect Gmail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
