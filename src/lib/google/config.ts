import { isSupabaseAdminConfigured } from "@/lib/supabase-admin";

export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

export const RECRUITING_GMAIL_QUERY =
  '(recruiter OR internship OR interview OR "online assessment" OR "coding challenge" OR application OR "new grad" OR "software engineer")';

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

export function isGoogleConfigured(): boolean {
  return getGoogleConfig() !== null;
}

export function getGoogleConfigError(): string | null {
  if (!isGoogleConfigured()) {
    return "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.";
  }
  if (!isSupabaseAdminConfigured()) {
    return "Gmail sync requires SUPABASE_SERVICE_ROLE_KEY in .env.local to store OAuth tokens securely.";
  }
  return null;
}
