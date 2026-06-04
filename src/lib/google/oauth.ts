import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  CALENDAR_EVENTS_SCOPE,
  getGoogleConfig,
  GOOGLE_FULL_SCOPES,
  GOOGLE_GMAIL_SCOPES,
} from "./config";

export interface GoogleConnection {
  id: string;
  user_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string | null;
  calendar_sync_enabled: boolean | null;
  calendar_last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

async function authContext() {
  const supabase = await createClient();
  const user = await requireUser();
  return { supabase, userId: user.id };
}

export function mergeGoogleScopes(
  existing: string | null | undefined,
  incoming: string | null | undefined
): string {
  const scopes = new Set<string>();
  for (const value of [existing, incoming]) {
    if (!value) continue;
    for (const scope of value.split(/\s+/)) {
      if (scope) scopes.add(scope);
    }
  }
  return [...scopes].join(" ");
}

export function hasCalendarScope(scopes: string | null | undefined): boolean {
  if (!scopes) return false;
  return scopes.includes(CALENDAR_EVENTS_SCOPE);
}

export function buildGoogleAuthUrl(
  state: string,
  options?: { includeCalendar?: boolean }
): string {
  const config = getGoogleConfig();
  if (!config) throw new Error("Google OAuth is not configured");

  const scope = options?.includeCalendar
    ? GOOGLE_FULL_SCOPES
    : GOOGLE_GMAIL_SCOPES;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const config = getGoogleConfig();
  if (!config) throw new Error("Google OAuth is not configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = (await res.json()) as TokenResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to exchange Google auth code");
  }

  return data;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const config = getGoogleConfig();
  if (!config) throw new Error("Google OAuth is not configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as TokenResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to refresh Google access token");
  }

  return data;
}

export async function fetchGoogleProfileEmail(
  accessToken: string
): Promise<string | null> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;
  const data = (await res.json()) as { emailAddress?: string };
  return data.emailAddress ?? null;
}

export async function saveGoogleConnection(input: {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  scopes?: string;
  googleEmail?: string | null;
  calendarSyncEnabled?: boolean;
  calendarLastSyncedAt?: string | null;
}): Promise<GoogleConnection> {
  const { supabase, userId } = await authContext();
  const existing = await getGoogleConnection();
  const expiresAt = new Date(Date.now() + input.expiresIn * 1000).toISOString();

  const row = {
    user_id: userId,
    google_email: input.googleEmail ?? existing?.google_email ?? null,
    access_token: input.accessToken,
    refresh_token: input.refreshToken ?? existing?.refresh_token ?? null,
    token_expires_at: expiresAt,
    scopes: mergeGoogleScopes(existing?.scopes, input.scopes),
    calendar_sync_enabled:
      input.calendarSyncEnabled ?? existing?.calendar_sync_enabled ?? false,
    calendar_last_synced_at:
      input.calendarLastSyncedAt ?? existing?.calendar_last_synced_at ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("google_connections")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;
  return data as GoogleConnection;
}

export async function updateCalendarSyncMetadata(input: {
  calendarSyncEnabled?: boolean;
  calendarLastSyncedAt?: string | null;
}): Promise<void> {
  const { supabase, userId } = await authContext();
  const { error } = await supabase
    .from("google_connections")
    .update({
      calendar_sync_enabled: input.calendarSyncEnabled,
      calendar_last_synced_at: input.calendarLastSyncedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getGoogleConnection(): Promise<GoogleConnection | null> {
  const { supabase, userId } = await authContext();
  const { data, error } = await supabase
    .from("google_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as GoogleConnection | null) ?? null;
}

export async function deleteGoogleConnection(): Promise<void> {
  const { supabase, userId } = await authContext();
  const { error } = await supabase
    .from("google_connections")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

async function getValidAccessToken(options?: {
  requireCalendar?: boolean;
}): Promise<string> {
  const connection = await getGoogleConnection();
  if (!connection) {
    throw new Error(
      options?.requireCalendar
        ? "Google Calendar is not connected. Connect your Google account first."
        : "Gmail is not connected. Connect your account first."
    );
  }

  if (options?.requireCalendar && !hasCalendarScope(connection.scopes)) {
    throw new Error(
      "Calendar permission missing. Reconnect Google with calendar access enabled."
    );
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;

  if (expiresAt > Date.now() + 60_000) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Google session expired. Please reconnect Google.");
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const updated = await saveGoogleConnection({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? connection.refresh_token,
    expiresIn: refreshed.expires_in,
    scopes: mergeGoogleScopes(connection.scopes, refreshed.scope),
    googleEmail: connection.google_email,
    calendarSyncEnabled: connection.calendar_sync_enabled ?? false,
    calendarLastSyncedAt: connection.calendar_last_synced_at,
  });

  return updated.access_token;
}

export async function getValidGoogleAccessToken(): Promise<string> {
  return getValidAccessToken();
}

export async function getValidGoogleAccessTokenForCalendar(): Promise<string> {
  return getValidAccessToken({ requireCalendar: true });
}
