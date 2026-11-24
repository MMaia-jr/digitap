begin;

create table public.ideia_decisoes_revisoes (
  ideia_id uuid not null references public.ideias_privadas(id) on delete cascade,
  versao_ideia integer not null check (versao_ideia > 1),
  chave text not null check (chave ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  estado text not null check (estado in ('DEFINIDO','PROVISÓRIO','PENDENTE','EXCLUÍDO')),
  descricao text not null check (char_length(btrim(descricao)) between 1 and 500),
  autor_id uuid not null references auth.users(id) on delete cascade,
  confirmada_em timestamptz not null default now(),
  primary key (ideia_id, chave, versao_ideia)
);
create index ideia_decisoes_historico_idx on public.ideia_decisoes_revisoes (ideia_id, versao_ideia desc, chave);

create table public.atividade_decisoes_origem (
  atividade_id uuid primary key,
  sujeito_id uuid not null,
  ideia_id uuid not null references public.ideias_privadas(id) on delete cascade,
  versao_ideia integer not null check (versao_ideia > 1),
  decisoes jsonb not null check (jsonb_typeof(decisoes) = 'array' and jsonb_array_length(decisoes) > 0),
  foreign key (atividade_id, sujeito_id) references public.atividades(id, sujeito_id) on delete cascade
);
create index atividade_decisoes_ideia_idx on public.atividade_decisoes_origem (ideia_id);

alter table public.ideia_decisoes_revisoes enable row level security;
alter table public.ideia_decisoes_revisoes force row level security;
alter table public.atividade_decisoes_origem enable row level security;
alter table public.atividade_decisoes_origem force row level security;
revoke all on public.ideia_decisoes_revisoes, public.atividade_decisoes_origem from public, anon, authenticated, service_role;
grant select, insert on public.ideia_decisoes_revisoes, public.atividade_decisoes_origem to service_role;

commit;
