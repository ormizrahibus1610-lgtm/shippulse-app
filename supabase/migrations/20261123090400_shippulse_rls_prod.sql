-- ShipPulse production schema guard & initPlan RLS policies (shippulse-dev)
alter table public.features enable row level security;
alter table public.votes enable row level security;
alter table public.changelogs enable row level security;
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('features', 'votes', 'changelogs') loop
    execute format('drop policy if exists %I on %I.%I',
      p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Strict per-operation initPlan policies (0 advisor warnings)
create policy "features_public_read" on public.features
  for select to anon, authenticated using (true);
create policy "features_owner_insert" on public.features
  for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "features_owner_update" on public.features
  for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
create policy "features_owner_delete" on public.features
  for delete to authenticated using ((select auth.uid()) = author_id);
create policy "votes_public_read" on public.votes
  for select to anon, authenticated using (true);
create policy "votes_owner_insert" on public.votes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "votes_owner_delete" on public.votes
  for delete to authenticated using ((select auth.uid()) = user_id);
create policy "changelogs_public_read" on public.changelogs
  for select to anon, authenticated using (true);
create policy "changelogs_admin_insert" on public.changelogs
  for insert to authenticated with check (
    coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

insert into public.features (id, title, status, author_id) values
  ('seed-1', 'Live Terminal Stream', 'in_progress', null),
  ('seed-2', 'Automated RLS Checks', 'shipped', null)
on conflict (id) do nothing;
