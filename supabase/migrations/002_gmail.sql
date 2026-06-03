  -- Run in Supabase SQL Editor after schema.sql (Gmail sync)

  create table if not exists google_connections (
    id uuid primary key default gen_random_uuid(),
    user_id text not null default 'demo-user',
    google_email text,
    access_token text not null,
    refresh_token text,
    token_expires_at timestamptz,
    scopes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id)
  );

  alter table messages add column if not exists snippet text;
  alter table messages add column if not exists extraction_status text;
  alter table messages add column if not exists extraction_confidence double precision;
  alter table messages add column if not exists needs_review boolean default false;

  create unique index if not exists idx_messages_external_id
    on messages (user_id, external_message_id)
    where external_message_id is not null;

  alter table google_connections enable row level security;

  -- Tokens are server-only (use SUPABASE_SERVICE_ROLE_KEY in API routes)
  drop policy if exists "no_public_google_connections" on google_connections;
  create policy "no_public_google_connections" on google_connections
    for all using (false) with check (false);
