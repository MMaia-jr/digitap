begin;

-- Declarações não verificadas. A publicação não comprova disponibilidade,
-- qualificação, representação ou compromisso de atendimento.
create table public.capacidades (
  id uuid primary key default gen_random_uuid(),
  sujeito_id uuid not null references public.sujeitos_publicadores(id) on delete restrict,
  criado_por_conta_id uuid not null references public.contas_acesso(id) on delete restrict,
  descricao text not null check (char_length(btrim(descricao)) between 3 and 1000),
  categoria text not null check (categoria in ('agroecologia','cultura','comunicacao','cuidado','educacao','gestao','mobilizacao','tecnologia','outros')),
  condicoes text not null default '' check (char_length(condicoes) <= 1000),
  visibilidade text not null default 'privada' check (visibilidade in ('privada','publica')),
  estado text not null default 'ativa' check (estado in ('ativa','arquivada')),
  versao integer not null default 1 check (versao > 0),
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index capacidades_publicas_idx on public.capacidades(categoria,atualizada_em desc)
  where visibilidade='publica' and estado='ativa';
create index capacidades_titular_idx on public.capacidades(sujeito_id,atualizada_em desc);

create table public.necessidades_projeto (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete restrict,
  criado_por_conta_id uuid not null references public.contas_acesso(id) on delete restrict,
  descricao text not null check (char_length(btrim(descricao)) between 3 and 1000),
  categorias text[] not null check (
    cardinality(categorias) between 1 and 9 and
    categorias <@ array['agroecologia','cultura','comunicacao','cuidado','educacao','gestao','mobilizacao','tecnologia','outros']::text[]
  ),
  condicoes text not null default '' check (char_length(condicoes) <= 1000),
  visibilidade text not null default 'privada' check (visibilidade in ('privada','visivel')),
  estado text not null default 'aberta' check (estado in ('aberta','encerrada')),
  versao integer not null default 1 check (versao > 0),
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index necessidades_publicas_idx on public.necessidades_projeto(visibilidade,estado,atualizada_em desc);
create index necessidades_projeto_idx on public.necessidades_projeto(projeto_id,estado);

create table public.interesses_necessidade (
  id uuid primary key default gen_random_uuid(),
  necessidade_id uuid not null references public.necessidades_projeto(id) on delete restrict,
  sujeito_id uuid not null references public.sujeitos_publicadores(id) on delete restrict,
  criado_por_conta_id uuid not null references public.contas_acesso(id) on delete restrict,
  owner_auth_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'ativo' check (status in ('ativo','retirado')),
  request_id uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  versao integer not null default 1 check (versao > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (necessidade_id,sujeito_id),
  unique (owner_auth_user_id,request_id)
);
create index interesses_necessidade_idx on public.interesses_necessidade(necessidade_id,status,criado_em);
create index interesses_titular_idx on public.interesses_necessidade(owner_auth_user_id,status,atualizado_em desc);

-- Endpoints usam conexão privilegiada exclusivamente no servidor e repetem
-- a autorização por sessão/propriedade. O Data API não recebe acesso às tabelas.
alter table public.capacidades enable row level security;
alter table public.capacidades force row level security;
alter table public.necessidades_projeto enable row level security;
alter table public.necessidades_projeto force row level security;
alter table public.interesses_necessidade enable row level security;
alter table public.interesses_necessidade force row level security;

revoke all on public.capacidades,public.necessidades_projeto,public.interesses_necessidade from public,anon,authenticated;
grant select,insert,update,delete on public.capacidades,public.necessidades_projeto,public.interesses_necessidade to service_role;

commit;
