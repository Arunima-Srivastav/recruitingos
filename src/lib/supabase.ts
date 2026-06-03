import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfigError } from "./config";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const configError = getSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  supabaseInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return supabaseInstance;
}
