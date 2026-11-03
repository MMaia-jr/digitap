-- Incremento 1: estrutura e fronteira de acesso. Sem publicação/apoio habilitados.
begin;
create table public.organizacoes (
 id uuid primary key default gen_random_uuid(),
 nome_publico text not null check (char_length(trim(nome_publico)) between 2 and 160),
 canal_publico text,
 estado_validacao text not null default 'pendente' check (estado_validacao in ('pendente','validada','suspensa')),
 criada_em timestamptz not null default now()
);
create table public.contas_acesso (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid not null unique references auth.users(id) on delete restrict,
 organizacao_id uuid references public.organizacoes(id) on delete restrict,
 papel text not null default 'organizacao' check (papel in ('organizacao','editor','administrador')),
 situacao text not null default 'ativa' check (situacao in ('ativa','bloqueada','desativada')),
 criada_em timestamptz not null default now(),
 constraint papel_vinculo check (papel <> 'organizacao' or organizacao_id is not null)
);
create index contas_organizacao_idx on public.contas_acesso(organizacao_id);
create table public.atividades (
 id uuid primary key default gen_random_uuid(),
 organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
 criada_por_conta_id uuid not null references public.contas_acesso(id) on delete restrict,
 titulo text not null check (char_length(trim(titulo)) between 3 and 180),
 descricao text not null check (char_length(trim(descricao)) between 10 and 5000),
 inicio_previsto timestamptz not null,
 orientacao_acesso text not null check (char_length(trim(orientacao_acesso)) between 3 and 600),
 referencia_oficial text,
 estado_programacao text not null default 'programada' check (estado_programacao in ('programada','adiada','cancelada','realizada')),
 estado_editorial text not null default 'rascunho' check (estado_editorial in ('rascunho','enviada','em_revisao','aprovada','publicada','devolvida','rejeitada','retirada')),
 versao_submetida integer not null default 1 check (versao_submetida > 0),
 versao_publicada jsonb,
 numero_versao_publicada integer check (numero_versao_publicada > 0),
 publicada_em timestamptz,
 apoios_abertos boolean not null default false,
 criada_em timestamptz not null default now(),
 atualizada_em timestamptz not null default now(),
 constraint snapshot_coerente check (
   (versao_publicada is null and numero_versao_publicada is null and publicada_em is null)
   or (jsonb_typeof(versao_publicada) = 'object' and versao_publicada is not null and numero_versao_publicada is not null and publicada_em is not null))
);
create index atividades_organizacao_idx on public.atividades(organizacao_id,estado_editorial,inicio_previsto);
create index atividades_criador_idx on public.atividades(criada_por_conta_id);
create table public.registros_realizacao (
 id uuid primary key default gen_random_uuid(),
 atividade_id uuid not null unique references public.atividades(id) on delete restrict,
 data_realizacao date not null,
 descricao_factual text not null check (char_length(trim(descricao_factual)) between 10 and 5000),
 origem_informacao text not null,
 estado_apuracao text not null default 'declarado' check (estado_apuracao in ('declarado','corroborado','contestado')),
 estado_editorial text not null default 'rascunho' check (estado_editorial in ('rascunho','enviada','em_revisao','aprovada','publicada','devolvida','rejeitada','retirada')),
 versao_publicada jsonb,
 numero_versao_publicada integer check (numero_versao_publicada > 0),
 publicada_em timestamptz
);
create table public.evidencias (
 id uuid primary key default gen_random_uuid(),
 registro_id uuid not null references public.registros_realizacao(id) on delete restrict,
 tipo_fonte text not null, url_publica text not null, afirmacao_sustentada text not null,
 consultada_em timestamptz not null, aprovada_publicacao boolean not null default false
);
create index evidencias_registro_idx on public.evidencias(registro_id);
create table public.autorizacoes_publicacao (
 id uuid primary key default gen_random_uuid(),
 objeto_tipo text not null check (objeto_tipo in ('organizacao','atividade','registro','parceiro')),
 objeto_id uuid not null,
 escopo_autorizado text[] not null check (cardinality(escopo_autorizado)>0),
 papel_autorizante text not null, comprovante_restrito text not null,
 autorizada_em timestamptz not null,
 situacao text not null default 'vigente' check (situacao in ('vigente','revogada','expirada')),
 validade_ate timestamptz, revogada_em timestamptz
);
create index autorizacoes_objeto_idx on public.autorizacoes_publicacao(objeto_tipo,objeto_id,situacao);
create table public.apoios (
 id uuid primary key default gen_random_uuid(),
 atividade_id uuid not null references public.atividades(id) on delete restrict,
 chave_anonima_hash text not null check (chave_anonima_hash ~ '^[0-9a-f]{64}$'),
 situacao text not null default 'ativo' check (situacao in ('ativo','cancelado','invalidado')),
 criado_em timestamptz not null default now(), encerrado_em timestamptz,
 constraint apoio_unico_navegador_atividade unique(atividade_id,chave_anonima_hash)
);
create index apoios_ativos_idx on public.apoios(atividade_id) where situacao='ativo';
create table public.parceiros (
 id uuid primary key default gen_random_uuid(), nome_publico text not null,
 categoria text not null default 'lojista', referencia_publica text, colaboracao_publica text,
 situacao_parceria text not null default 'proposta' check (situacao_parceria in ('proposta','confirmada','suspensa','encerrada')),
 autorizacao_id uuid references public.autorizacoes_publicacao(id) on delete restrict,
 inicio_vigencia timestamptz, fim_vigencia timestamptz, contato_restrito text,
 constraint parceria_com_autorizacao check (situacao_parceria <> 'confirmada' or autorizacao_id is not null)
);
create index parceiros_autorizacao_idx on public.parceiros(autorizacao_id);
create table public.eventos_editoriais (
 id uuid primary key default gen_random_uuid(), objeto_tipo text not null, objeto_id uuid not null,
 acao text not null,
 executada_por_conta_id uuid references public.contas_acesso(id) on delete set null,
 estado_anterior text, estado_novo text, justificativa_restrita text,
 ocorrida_em timestamptz not null default now()
);
create index eventos_objeto_idx on public.eventos_editoriais(objeto_tipo,objeto_id,ocorrida_em desc);
create index eventos_autor_idx on public.eventos_editoriais(executada_por_conta_id);

alter table public.organizacoes enable row level security;
alter table public.contas_acesso enable row level security;
alter table public.atividades enable row level security;
alter table public.registros_realizacao enable row level security;
alter table public.evidencias enable row level security;
alter table public.autorizacoes_publicacao enable row level security;
alter table public.apoios enable row level security;
alter table public.parceiros enable row level security;
alter table public.eventos_editoriais enable row level security;
revoke all on table public.organizacoes, public.contas_acesso, public.atividades,
 public.registros_realizacao, public.evidencias, public.autorizacoes_publicacao,
 public.apoios, public.parceiros, public.eventos_editoriais from public, anon, authenticated;
grant select,insert,update,delete on table public.organizacoes, public.contas_acesso,
 public.atividades, public.registros_realizacao, public.evidencias,
 public.autorizacoes_publicacao, public.apoios, public.parceiros, public.eventos_editoriais to service_role;
-- Sem policies: deny-by-default. O backend deve verificar papel e objeto por ação.
-- Fechar também os padrões das futuras funções criadas pelo proprietário de migrações.
alter default privileges for role postgres in schema public revoke execute on functions from public,anon,authenticated;
commit;
