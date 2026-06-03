export function getSupabaseConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return "Missing Supabase configuration. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  if (url.includes("your-project") || key.includes("your-anon-key")) {
    return "Supabase env vars look like placeholders. Replace them with values from Supabase → Project Settings → API.";
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigError() === null;
}
