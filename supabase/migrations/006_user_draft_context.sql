-- Per-user resume and highlights for AI draft generation

create table if not exists user_draft_context (
  user_id text primary key,
  resume_text text,
  highlights_text text,
  resume_filename text,
  updated_at timestamptz not null default now()
);

alter table user_draft_context enable row level security;

create policy "user_draft_context_select_own" on user_draft_context
  for select using (auth.uid()::text = user_id);
create policy "user_draft_context_insert_own" on user_draft_context
  for insert with check (auth.uid()::text = user_id);
create policy "user_draft_context_update_own" on user_draft_context
  for update using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create policy "user_draft_context_delete_own" on user_draft_context
  for delete using (auth.uid()::text = user_id);
