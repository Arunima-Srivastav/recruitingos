create extension if not exists "pgcrypto";

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-user',
  company text,
  role_title text,
  source text not null default 'manual',
  stage text not null default 'New',
  priority_score integer not null default 0,
  deadline timestamptz,
  next_action text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  user_id text not null default 'demo-user',
  source text not null default 'manual',
  sender_name text,
  sender_email text,
  subject text,
  body text not null,
  received_at timestamptz,
  extracted_json jsonb,
  external_message_id text,
  snippet text,
  extraction_status text,
  extraction_confidence double precision,
  needs_review boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists actions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  user_id text not null default 'demo-user',
  action_type text not null,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'pending',
  priority_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  user_id text not null default 'demo-user',
  draft_type text not null,
  tone text not null default 'professional',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_opportunities_user_id on opportunities(user_id);
create index if not exists idx_opportunities_stage on opportunities(stage);
create index if not exists idx_messages_opportunity_id on messages(opportunity_id);
create index if not exists idx_actions_opportunity_id on actions(opportunity_id);
create index if not exists idx_actions_status on actions(status);
create index if not exists idx_drafts_opportunity_id on drafts(opportunity_id);

create table if not exists google_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'demo-user',
  google_email text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  calendar_sync_enabled boolean not null default false,
  calendar_last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create unique index if not exists idx_messages_external_id
  on messages (user_id, external_message_id)
  where external_message_id is not null;

-- Auth: row-level security scoped to signed-in user (auth.uid())
alter table opportunities enable row level security;
alter table messages enable row level security;
alter table actions enable row level security;
alter table drafts enable row level security;
alter table google_connections enable row level security;

drop policy if exists "mvp_opportunities_all" on opportunities;
drop policy if exists "mvp_messages_all" on messages;
drop policy if exists "mvp_actions_all" on actions;
drop policy if exists "mvp_drafts_all" on drafts;
drop policy if exists "no_public_google_connections" on google_connections;

create policy "opportunities_select_own" on opportunities
  for select using (auth.uid()::text = user_id);
create policy "opportunities_insert_own" on opportunities
  for insert with check (auth.uid()::text = user_id);
create policy "opportunities_update_own" on opportunities
  for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create policy "opportunities_delete_own" on opportunities
  for delete using (auth.uid()::text = user_id);

create policy "messages_select_own" on messages
  for select using (auth.uid()::text = user_id);
create policy "messages_insert_own" on messages
  for insert with check (auth.uid()::text = user_id);
create policy "messages_update_own" on messages
  for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create policy "messages_delete_own" on messages
  for delete using (auth.uid()::text = user_id);

create policy "actions_select_own" on actions
  for select using (auth.uid()::text = user_id);
create policy "actions_insert_own" on actions
  for insert with check (auth.uid()::text = user_id);
create policy "actions_update_own" on actions
  for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create policy "actions_delete_own" on actions
  for delete using (auth.uid()::text = user_id);

create policy "drafts_select_own" on drafts
  for select using (auth.uid()::text = user_id);
create policy "drafts_insert_own" on drafts
  for insert with check (auth.uid()::text = user_id);
create policy "drafts_update_own" on drafts
  for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create policy "drafts_delete_own" on drafts
  for delete using (auth.uid()::text = user_id);

create policy "google_connections_own" on google_connections
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

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
