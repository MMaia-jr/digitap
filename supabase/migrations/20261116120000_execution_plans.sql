begin;

-- Private, indicative resource/cost planning. No publication or finance ledger.
create table public.planos_execucao (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null unique,
  sujeito_id uuid not null,
  criado_por_conta_id uuid not null references public.contas_acesso(id) on delete restrict,
  versao integer not null default 1 check (versao between 1 and 2147483646),
  total_previsto_centavos bigint not null default 0
    check (total_previsto_centavos between 0 and 9007199254740991),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint planos_execucao_atividade_sujeito_fk
    foreign key (atividade_id,sujeito_id)
    references public.atividades(id,sujeito_id) on delete restrict
);

create index planos_execucao_sujeito_idx on public.planos_execucao(sujeito_id,atualizado_em desc);

create table public.itens_planejamento_execucao (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.planos_execucao(id) on delete cascade,
  ordem smallint not null check (ordem between 1 and 100),
  categoria text check (categoria is null or (categoria=btrim(categoria) and char_length(categoria) between 1 and 80)),
  descricao text check (descricao is null or (descricao=btrim(descricao) and char_length(descricao) between 1 and 500)),
  quantidade numeric check (quantidade is null or (quantidade > 0 and quantidade <= 9007199254740991)),
  unidade text check (unidade is null or (unidade=btrim(unidade) and char_length(unidade) between 1 and 40)),
  valor_previsto_centavos bigint check (valor_previsto_centavos is null or valor_previsto_centavos between 0 and 9007199254740991),
  criado_em timestamptz not null default now(),
  constraint itens_planejamento_execucao_conteudo_check check (
    nullif(btrim(categoria),'') is not null or nullif(btrim(descricao),'') is not null
    or quantidade is not null or nullif(btrim(unidade),'') is not null
    or valor_previsto_centavos is not null
  ),
  constraint itens_planejamento_execucao_ordem_unique unique (plano_id,ordem)
);

create index itens_planejamento_execucao_plano_idx on public.itens_planejamento_execucao(plano_id,ordem);

alter table public.planos_execucao enable row level security;
alter table public.planos_execucao force row level security;
alter table public.itens_planejamento_execucao enable row level security;
alter table public.itens_planejamento_execucao force row level security;

-- Matches E4's deny-by-default Data API model; the server repeats session and
-- activity-owner authorization before using its privileged PostgreSQL client.
revoke all on public.planos_execucao,public.itens_planejamento_execucao from public,anon,authenticated;
grant select,insert,update,delete on public.planos_execucao,public.itens_planejamento_execucao to service_role;

commit;
