-- Run in Supabase SQL Editor after schema.sql (user auth + RLS)

-- Drop MVP open policies
drop policy if exists "mvp_opportunities_all" on opportunities;
drop policy if exists "mvp_messages_all" on messages;
drop policy if exists "mvp_actions_all" on actions;
drop policy if exists "mvp_drafts_all" on drafts;
drop policy if exists "no_public_google_connections" on google_connections;

-- Per-user RLS (user_id stores auth.users.id as text)
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
