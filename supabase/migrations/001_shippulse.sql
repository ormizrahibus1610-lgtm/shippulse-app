-- shippulse initial schema and row level security policies

create table if not exists public.features (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'shipped')),
  votes integer not null default 0 check (votes >= 0),
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  feature_id text not null references public.features(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (feature_id, user_id)
);

create table if not exists public.changelogs (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  body text not null,
  feature_id text not null references public.features(id) on delete cascade,
  published_at timestamptz not null default now()
);

create index if not exists idx_features_author_id on public.features (author_id);
create index if not exists idx_votes_feature_id on public.votes (feature_id);
create index if not exists idx_votes_user_id on public.votes (user_id);
create index if not exists idx_changelogs_feature_id on public.changelogs (feature_id);

alter table public.features enable row level security;
alter table public.votes enable row level security;
alter table public.changelogs enable row level security;

create policy features_select_public
  on public.features
  for select
  to anon, authenticated
  using (true);

create policy features_insert_authenticated
  on public.features
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and author_id = (select auth.uid())
  );

create policy features_update_owner_or_admin
  on public.features
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    author_id = (select auth.uid())
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy features_delete_owner_or_admin
  on public.features
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy votes_select_public
  on public.votes
  for select
  to anon, authenticated
  using (true);

create policy votes_insert_own
  on public.votes
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

create policy votes_delete_own
  on public.votes
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and user_id = (select auth.uid())
  );

create policy changelogs_select_public
  on public.changelogs
  for select
  to anon, authenticated
  using (true);

create policy changelogs_insert_admin
  on public.changelogs
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy changelogs_update_admin
  on public.changelogs
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.uid()) is not null
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy changelogs_delete_admin
  on public.changelogs
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );
