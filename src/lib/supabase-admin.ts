import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminInstance) return adminInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Required for Gmail token storage."
    );
  }

  adminInstance = createClient(url, key);
  return adminInstance;
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
