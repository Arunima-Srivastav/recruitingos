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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create unique index if not exists idx_messages_external_id
  on messages (user_id, external_message_id)
  where external_message_id is not null;

-- MVP: allow anon key access (replace with real auth policies later)
alter table opportunities enable row level security;
alter table messages enable row level security;
alter table actions enable row level security;
alter table drafts enable row level security;
alter table google_connections enable row level security;

drop policy if exists "mvp_opportunities_all" on opportunities;
drop policy if exists "mvp_messages_all" on messages;
drop policy if exists "mvp_actions_all" on actions;
drop policy if exists "mvp_drafts_all" on drafts;

create policy "mvp_opportunities_all" on opportunities for all using (true) with check (true);
create policy "mvp_messages_all" on messages for all using (true) with check (true);
create policy "mvp_actions_all" on actions for all using (true) with check (true);
create policy "mvp_drafts_all" on drafts for all using (true) with check (true);

drop policy if exists "no_public_google_connections" on google_connections;
create policy "no_public_google_connections" on google_connections
  for all using (false) with check (false);
