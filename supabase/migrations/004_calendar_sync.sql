-- Google Calendar two-way sync (run after 003_auth_rls.sql)

alter table google_connections
  add column if not exists calendar_sync_enabled boolean not null default false,
  add column if not exists calendar_last_synced_at timestamptz;

create table if not exists calendar_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source_kind text not null check (source_kind in ('deadline', 'action')),
  source_id text not null,
  google_event_id text not null,
  google_calendar_id text not null default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_kind, source_id)
);

create index if not exists idx_calendar_event_links_user_id
  on calendar_event_links(user_id);

alter table calendar_event_links enable row level security;

create policy "calendar_event_links_own" on calendar_event_links
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
