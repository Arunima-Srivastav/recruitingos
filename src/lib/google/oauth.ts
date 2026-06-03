import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleConfig, GMAIL_READONLY_SCOPE } from "./config";

export interface GoogleConnection {
  id: string;
  user_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string | null;
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

export function buildGoogleAuthUrl(state: string): string {
  const config = getGoogleConfig();
  if (!config) throw new Error("Google OAuth is not configured");

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GMAIL_READONLY_SCOPE,
    access_type: "offline",
    prompt: "consent",
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
}): Promise<GoogleConnection> {
  const { supabase, userId } = await authContext();
  const expiresAt = new Date(Date.now() + input.expiresIn * 1000).toISOString();

  const row = {
    user_id: userId,
    google_email: input.googleEmail ?? null,
    access_token: input.accessToken,
    refresh_token: input.refreshToken ?? null,
    token_expires_at: expiresAt,
    scopes: input.scopes ?? GMAIL_READONLY_SCOPE,
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

export async function getValidGoogleAccessToken(): Promise<string> {
  const connection = await getGoogleConnection();
  if (!connection) {
    throw new Error("Gmail is not connected. Connect your account first.");
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0;

  if (expiresAt > Date.now() + 60_000) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Gmail session expired. Please reconnect Google.");
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const updated = await saveGoogleConnection({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? connection.refresh_token,
    expiresIn: refreshed.expires_in,
    scopes: refreshed.scope ?? connection.scopes ?? GMAIL_READONLY_SCOPE,
    googleEmail: connection.google_email,
  });

  return updated.access_token;
}
