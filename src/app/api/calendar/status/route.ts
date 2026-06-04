import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/auth/server";
import { getGoogleConfigError } from "@/lib/google/config";
import {
  getGoogleConnection,
  hasCalendarScope,
} from "@/lib/google/oauth";

export async function GET() {
  try {
    const configError = getGoogleConfigError();
    if (configError) {
      return NextResponse.json({
        configured: false,
        connected: false,
        calendarScope: false,
        calendarSyncEnabled: false,
        google_email: null,
        lastSyncedAt: null,
        error: configError,
      });
    }

    const connection = await getGoogleConnection();
    const calendarScope = hasCalendarScope(connection?.scopes);

    return NextResponse.json({
      configured: true,
      connected: Boolean(connection),
      calendarScope,
      calendarSyncEnabled: Boolean(connection?.calendar_sync_enabled),
      google_email: connection?.google_email ?? null,
      lastSyncedAt: connection?.calendar_last_synced_at ?? null,
    });
  } catch (err) {
    return handleApiError(err, "Failed to load calendar status");
  }
}
