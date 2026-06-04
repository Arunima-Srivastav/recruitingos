-- User-created calendar events (run after 004_calendar_sync.sql)

create table if not exists user_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default true,
  opportunity_id uuid references opportunities(id) on delete set null,
  google_event_id text,
  google_calendar_id text default 'primary',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_calendar_events_user_id
  on user_calendar_events(user_id);

create index if not exists idx_user_calendar_events_starts_at
  on user_calendar_events(starts_at);

alter table user_calendar_events enable row level security;

create policy "user_calendar_events_own" on user_calendar_events
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
