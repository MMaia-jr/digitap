-- Institutional presentation and project grouping; private access stays server-mediated.
alter table public.sujeitos_publicadores add column bio text
  check (bio is null or char_length(bio) <= 5000);
create table public.projetos (
 id uuid primary key default gen_random_uuid(),
 sujeito_id uuid not null references public.sujeitos_publicadores(id),
 titulo text not null check (char_length(btrim(titulo)) between 3 and 180),
 descricao text not null default '' check (char_length(descricao) <= 5000),
 ano integer not null check (ano between 1900 and 2200),
 criado_em timestamptz not null default now(),
 unique (id, sujeito_id)
);
create index projetos_sujeito_ano_idx on public.projetos(sujeito_id, ano desc);
alter table public.atividades add column projeto_id uuid references public.projetos(id);
-- A project must belong to the same publisher as the activity, even for privileged writes.
alter table public.atividades add constraint atividades_projeto_sujeito_fk
 foreign key (projeto_id,sujeito_id) references public.projetos(id,sujeito_id);
create index atividades_projeto_idx on public.atividades(projeto_id) where projeto_id is not null;
alter table public.projetos enable row level security;
revoke all on public.projetos from anon, authenticated;
grant all on public.projetos to service_role;
