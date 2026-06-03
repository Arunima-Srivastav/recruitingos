import { handleApiError } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { getGoogleConfigError } from "@/lib/google/config";
import { getGoogleConnection } from "@/lib/google/oauth";

export async function GET() {
  try {
    const configError = getGoogleConfigError();
    if (configError) {
      return NextResponse.json({
        configured: false,
        connected: false,
        error: configError,
      });
    }

    const connection = await getGoogleConnection();

    return NextResponse.json({
      configured: true,
      connected: Boolean(connection),
      google_email: connection?.google_email ?? null,
      scopes: connection?.scopes ?? null,
      updated_at: connection?.updated_at ?? null,
    });
  } catch (err) {
    return handleApiError(err, "Failed to load Gmail status");
  }
}
