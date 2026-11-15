create table public.ideias_privadas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  original_text text not null check (length(btrim(original_text)) between 1 and 20000),
  original_interpretation jsonb not null check (
    original_interpretation->>'estado' = 'revisao_humana_pendente'
    and original_interpretation->>'verificacao' = 'nao_verificada'
    and jsonb_typeof(original_interpretation->'dados') = 'object'
  ),
  revised_interpretation jsonb check (revised_interpretation is null or (
    revised_interpretation->>'estado' = 'revisao_humana_pendente'
    and revised_interpretation->>'verificacao' = 'nao_verificada'
    and jsonb_typeof(revised_interpretation->'dados') = 'object'
  )),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ideias_privadas_owner_updated_idx on public.ideias_privadas(owner_id,updated_at desc);
alter table public.ideias_privadas enable row level security;
revoke all on public.ideias_privadas from public,anon,authenticated;
grant select,insert,update,delete on public.ideias_privadas to authenticated;
create policy ideias_privadas_select_own on public.ideias_privadas for select to authenticated using ((select auth.uid())=owner_id);
create policy ideias_privadas_insert_own on public.ideias_privadas for insert to authenticated with check ((select auth.uid())=owner_id);
create policy ideias_privadas_update_own on public.ideias_privadas for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy ideias_privadas_delete_own on public.ideias_privadas for delete to authenticated using ((select auth.uid())=owner_id);
