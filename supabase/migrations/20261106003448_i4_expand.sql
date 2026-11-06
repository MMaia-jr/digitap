-- I4 EXPAND: docs/plans/I4-2026-11-05.md, §§ 3.2–3.9.
-- Somente estrutura aditiva. Sem backfill, policies, abertura de acesso ou CUTOVER.

create table public.sujeitos_publicadores (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pessoa_fisica', 'coletivo_informal', 'organizacao')),
  organizacao_legada_id uuid unique references public.organizacoes(id),
  nome_publico text not null check (nome_publico = normalize(btrim(nome_publico), NFC) and char_length(nome_publico) between 2 and 160),
  estado text not null default 'pendente' check (estado in ('pendente', 'ativo', 'suspenso', 'encerrado')),
  modo_publicacao text not null default 'curadoria_previa' check (modo_publicacao in ('curadoria_previa', 'autopublicacao')),
  risco text not null default 'medio' check (risco in ('baixo', 'medio', 'alto')),
  versao integer not null default 1 check (versao > 0),
  criado_por_conta_id uuid references public.contas_acesso(id),
  origem text not null check (origem in ('legado', 'cadastro')),
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  unique (id, tipo),
  check ((tipo = 'organizacao') = (organizacao_legada_id is not null)),
  check (risco <> 'alto' or modo_publicacao = 'curadoria_previa'),
  check (origem <> 'cadastro' or criado_por_conta_id is not null),
  check (origem <> 'legado' or tipo = 'organizacao')
);
create index sujeitos_estado_risco_idx on public.sujeitos_publicadores (estado, risco);
create index sujeitos_criador_idx on public.sujeitos_publicadores (criado_por_conta_id);

create table public.pessoas_fisicas (
  sujeito_id uuid primary key,
  tipo_sujeito text not null default 'pessoa_fisica' check (tipo_sujeito = 'pessoa_fisica'),
  conta_id uuid not null unique references public.contas_acesso(id),
  criada_em timestamptz not null default now(),
  foreign key (sujeito_id, tipo_sujeito) references public.sujeitos_publicadores(id, tipo)
);

create table public.coletivos_informais (
  sujeito_id uuid primary key,
  tipo_sujeito text not null default 'coletivo_informal' check (tipo_sujeito = 'coletivo_informal'),
  nome_em_curadoria text not null check (nome_em_curadoria = btrim(nome_em_curadoria) and char_length(nome_em_curadoria) between 2 and 160),
  nome_curado_em timestamptz,
  nome_curado_por_conta_id uuid references public.contas_acesso(id),
  curadoria_caso_id uuid,
  curadoria_caso_versao integer,
  criada_em timestamptz not null default now(),
  foreign key (sujeito_id, tipo_sujeito) references public.sujeitos_publicadores(id, tipo),
  check ((nome_curado_em is null) = (nome_curado_por_conta_id is null)),
  check ((curadoria_caso_id is null) = (curadoria_caso_versao is null)),
  check ((nome_curado_em is null) = (curadoria_caso_id is null))
);
create index coletivos_curador_idx on public.coletivos_informais (nome_curado_por_conta_id);
create index coletivos_caso_idx on public.coletivos_informais (curadoria_caso_id, curadoria_caso_versao, sujeito_id);

-- Validação pura: sem consultas a tabelas ou relógio.
create function public.i4_escopos_validos(p_escopos text[]) returns boolean
language sql immutable security invoker set search_path = pg_catalog
as $$
  select coalesce(cardinality(p_escopos) > 0
    and array_ndims(p_escopos) = 1
    and p_escopos <@ array['ler_privado','editar','enviar','publicar','gerir_vinculo']::text[]
    and not exists (select 1 from unnest(p_escopos) as e(valor) where valor is null)
    and cardinality(p_escopos) = (select count(distinct valor) from unnest(p_escopos) as e(valor)), false)
$$;

create table public.vinculos_publicadores (
  id uuid not null default gen_random_uuid(),
  versao integer not null default 1 check (versao > 0),
  atual boolean not null default true,
  sujeito_id uuid not null references public.sujeitos_publicadores(id),
  conta_id uuid not null references public.contas_acesso(id),
  papel_vinculo text not null check (papel_vinculo in ('titular', 'representante', 'membro')),
  escopos text[] not null check (public.i4_escopos_validos(escopos)),
  situacao text not null default 'pendente' check (situacao in ('pendente', 'ativo', 'suspenso', 'revogado')),
  origem text not null check (origem in ('legado', 'cadastro')),
  revisao_validacao integer not null default 1 check (revisao_validacao > 0),
  atestacao_1_id uuid,
  atestacao_2_id uuid,
  curadoria_caso_id uuid,
  curadoria_caso_versao integer,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  ativada_em timestamptz,
  suspensa_em timestamptz,
  revogada_em timestamptz,
  primary key (id, versao),
  unique (id, versao, sujeito_id),
  check ((atestacao_1_id is null) = (atestacao_2_id is null)),
  check (atestacao_1_id is null or atestacao_1_id <> atestacao_2_id),
  check ((curadoria_caso_id is null) = (curadoria_caso_versao is null)),
  check (situacao <> 'ativo' or ativada_em is not null),
  check (situacao <> 'suspenso' or suspensa_em is not null),
  check (situacao <> 'revogado' or revogada_em is not null),
  check (situacao <> 'pendente' or (ativada_em is null and suspensa_em is null and revogada_em is null)),
  check (situacao = 'revogado' or revogada_em is null),
  check (ativada_em is null or ativada_em >= criada_em),
  check (suspensa_em is null or suspensa_em >= criada_em),
  check (revogada_em is null or revogada_em >= criada_em)
);
create unique index vinculos_atual_id_idx on public.vinculos_publicadores (id) where atual;
create unique index vinculos_atual_par_idx on public.vinculos_publicadores (conta_id, sujeito_id) where atual;
create index vinculos_sujeito_idx on public.vinculos_publicadores (sujeito_id, atual, situacao);
create index vinculos_conta_idx on public.vinculos_publicadores (conta_id, atual, situacao);
create index vinculos_atestacao_1_idx on public.vinculos_publicadores (atestacao_1_id, id, versao);
create index vinculos_atestacao_2_idx on public.vinculos_publicadores (atestacao_2_id, id, versao);
create index vinculos_caso_idx on public.vinculos_publicadores (curadoria_caso_id, curadoria_caso_versao, sujeito_id);

create table public.atestacoes_representacao (
  id uuid primary key default gen_random_uuid(),
  vinculo_id uuid not null,
  versao_vinculo integer not null,
  posicao smallint not null check (posicao in (1, 2)),
  atestante_conta_id uuid not null references public.contas_acesso(id),
  declara_membro boolean not null check (declara_membro),
  declara_pessoa_distinta boolean not null check (declara_pessoa_distinta),
  situacao text not null default 'vigente' check (situacao in ('vigente', 'revogada', 'substituida')),
  atestada_em timestamptz not null default now(),
  revogada_em timestamptz,
  pedido_id uuid not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-fA-F]{64}$'),
  foreign key (vinculo_id, versao_vinculo) references public.vinculos_publicadores(id, versao) deferrable initially deferred,
  unique (id, vinculo_id, versao_vinculo),
  unique (atestante_conta_id, pedido_id),
  check ((situacao = 'revogada') = (revogada_em is not null)),
  check (revogada_em is null or revogada_em >= atestada_em)
);
create unique index atestacoes_posicao_vigente_idx on public.atestacoes_representacao (vinculo_id, versao_vinculo, posicao) where situacao = 'vigente';
create unique index atestacoes_conta_vigente_idx on public.atestacoes_representacao (vinculo_id, versao_vinculo, atestante_conta_id) where situacao = 'vigente';
create index atestacoes_vinculo_idx on public.atestacoes_representacao (vinculo_id, versao_vinculo);
create index atestacoes_conta_idx on public.atestacoes_representacao (atestante_conta_id, situacao);

-- Adições autorizadas às três tabelas legadas; nenhuma alteração de nullability/papel.
alter table public.atividades
  add column sujeito_id uuid references public.sujeitos_publicadores(id),
  add column politica_publicacao text check (politica_publicacao in ('i3', 'i4')),
  add constraint atividades_id_sujeito_key unique (id, sujeito_id);
create index atividades_sujeito_editorial_inicio_idx on public.atividades (sujeito_id, estado_editorial, inicio_previsto);
alter table public.contas_acesso add column ativa_desde timestamptz;
alter table public.registros_realizacao add constraint registros_id_atividade_key unique (id, atividade_id);

create table public.casos_moderacao (
  id uuid not null default gen_random_uuid(),
  versao integer not null default 1 check (versao > 0),
  atual boolean not null default true,
  sujeito_id uuid not null references public.sujeitos_publicadores(id),
  tipo text not null check (tipo in ('curadoria_inicial', 'curadoria_nome', 'revisao_risco', 'denuncia', 'contestacao')),
  alvo text not null check (alvo in ('sujeito', 'atividade', 'registro')),
  atividade_id uuid,
  registro_id uuid,
  estado text not null default 'aberto' check (estado in ('aberto', 'em_analise', 'procedente', 'improcedente', 'encerrado')),
  caso_origem_id uuid,
  caso_origem_versao integer,
  aberto_por_conta_id uuid not null references public.contas_acesso(id),
  analisado_por_conta_id uuid references public.contas_acesso(id),
  decidido_por_conta_id uuid references public.contas_acesso(id),
  motivo_restrito text not null check (char_length(btrim(motivo_restrito)) between 10 and 1500),
  justificativa_restrita text check (char_length(btrim(justificativa_restrita)) between 10 and 1500),
  resultado text check (resultado in ('procedente', 'improcedente', 'sem_julgamento')),
  efeito text not null default 'nenhum' check (efeito in ('nenhum', 'suspender_publicacao', 'curadoria_previa', 'liberar_autopublicacao')),
  sancao_aplicada boolean not null default false,
  sancao_tipo text check (sancao_tipo in ('advertencia', 'suspensao_temporaria', 'suspensao_permanente')),
  sancao_duracao_dias integer,
  aberto_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  decidida_em timestamptz,
  notificada_em timestamptz,
  prazo_contestacao_ate timestamptz,
  pedido_id uuid not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-fA-F]{64}$'),
  primary key (id, versao),
  unique (id, versao, sujeito_id),
  unique (aberto_por_conta_id, pedido_id, versao),
  foreign key (atividade_id, sujeito_id) references public.atividades(id, sujeito_id),
  foreign key (registro_id, atividade_id) references public.registros_realizacao(id, atividade_id),
  foreign key (caso_origem_id, caso_origem_versao, sujeito_id) references public.casos_moderacao(id, versao, sujeito_id),
  check ((alvo = 'sujeito' and atividade_id is null and registro_id is null)
    or (alvo = 'atividade' and atividade_id is not null and registro_id is null)
    or (alvo = 'registro' and atividade_id is not null and registro_id is not null)),
  check ((caso_origem_id is null) = (caso_origem_versao is null)),
  check (tipo <> 'contestacao' or caso_origem_id is not null),
  check (caso_origem_id is null or caso_origem_id <> id),
  check ((estado in ('procedente', 'improcedente', 'encerrado')) =
    (resultado is not null and decidido_por_conta_id is not null and decidida_em is not null and justificativa_restrita is not null)),
  check (estado not in ('aberto', 'em_analise') or (resultado is null and decidido_por_conta_id is null and decidida_em is null and prazo_contestacao_ate is null)),
  check (estado <> 'procedente' or resultado = 'procedente'),
  check (estado <> 'improcedente' or resultado = 'improcedente'),
  check (not sancao_aplicada or (resultado is not null and resultado = 'procedente' and decidido_por_conta_id is not null and justificativa_restrita is not null)),
  check (sancao_aplicada = (sancao_tipo is not null)),
  check ((sancao_tipo is not null and sancao_tipo = 'suspensao_temporaria' and sancao_duracao_dias is not null and sancao_duracao_dias > 0)
    or (sancao_tipo is distinct from 'suspensao_temporaria' and sancao_duracao_dias is null)),
  check (atualizado_em >= aberto_em),
  check (decidida_em is null or decidida_em >= aberto_em),
  check (notificada_em is null or (decidida_em is not null and notificada_em >= decidida_em)),
  check ((decidida_em is null and prazo_contestacao_ate is null)
    or (decidida_em is not null and prazo_contestacao_ate is not null and prazo_contestacao_ate = decidida_em + interval '30 days'))
);
create unique index casos_atual_id_idx on public.casos_moderacao (id) where atual;
create index casos_sujeito_estado_idx on public.casos_moderacao (sujeito_id, atual, estado);
create index casos_procedentes_idx on public.casos_moderacao (sujeito_id, decidida_em) where resultado = 'procedente';
create index casos_atividade_idx on public.casos_moderacao (atividade_id);
create index casos_registro_idx on public.casos_moderacao (registro_id, atividade_id);
create index casos_origem_idx on public.casos_moderacao (caso_origem_id, caso_origem_versao, sujeito_id);
create index casos_autor_idx on public.casos_moderacao (aberto_por_conta_id);
create index casos_analista_idx on public.casos_moderacao (analisado_por_conta_id);
create index casos_decisor_idx on public.casos_moderacao (decidido_por_conta_id);
create index casos_fila_idx on public.casos_moderacao (estado, aberto_em) where atual;

alter table public.coletivos_informais add constraint coletivos_caso_fk
  foreign key (curadoria_caso_id, curadoria_caso_versao, sujeito_id) references public.casos_moderacao(id, versao, sujeito_id);
alter table public.vinculos_publicadores
  add constraint vinculos_caso_fk foreign key (curadoria_caso_id, curadoria_caso_versao, sujeito_id) references public.casos_moderacao(id, versao, sujeito_id),
  add constraint vinculos_atestacao_1_fk foreign key (atestacao_1_id, id, versao) references public.atestacoes_representacao(id, vinculo_id, versao_vinculo) deferrable initially deferred,
  add constraint vinculos_atestacao_2_fk foreign key (atestacao_2_id, id, versao) references public.atestacoes_representacao(id, vinculo_id, versao_vinculo) deferrable initially deferred;

create function public.i4_sujeito_identidade() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
begin
  if (new.id, new.tipo, new.organizacao_legada_id) is distinct from (old.id, old.tipo, old.organizacao_legada_id) then
    raise exception 'Identidade e tipo do sujeito são imutáveis' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger i4_sujeito_identidade before update on public.sujeitos_publicadores
  for each row execute function public.i4_sujeito_identidade();

create function public.i4_subtipo_completo() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
declare
  ids uuid[];
  sid uuid;
  s public.sujeitos_publicadores%rowtype;
begin
  if tg_table_name = 'sujeitos_publicadores' then
    if tg_op = 'INSERT' then ids := array[new.id];
    elsif tg_op = 'DELETE' then ids := array[old.id];
    else ids := array[old.id, new.id]; end if;
  else
    if tg_op = 'INSERT' then ids := array[new.sujeito_id];
    elsif tg_op = 'DELETE' then ids := array[old.sujeito_id];
    else ids := array[old.sujeito_id, new.sujeito_id]; end if;
  end if;
  foreach sid in array ids loop
    select * into s from public.sujeitos_publicadores where id = sid for update;
    if not found then continue; end if;
    if (s.tipo = 'pessoa_fisica' and not exists (select 1 from public.pessoas_fisicas where sujeito_id = sid))
      or (s.tipo = 'coletivo_informal' and not exists (select 1 from public.coletivos_informais where sujeito_id = sid)) then
      raise exception 'Sujeito % sem subtipo completo', sid using errcode = '23514';
    end if;
  end loop;
  return null;
end
$$;
create constraint trigger i4_subtipo_pai after insert or update or delete on public.sujeitos_publicadores
  deferrable initially deferred for each row execute function public.i4_subtipo_completo();
create constraint trigger i4_subtipo_pf after insert or update or delete on public.pessoas_fisicas
  deferrable initially deferred for each row execute function public.i4_subtipo_completo();
create constraint trigger i4_subtipo_coletivo after insert or update or delete on public.coletivos_informais
  deferrable initially deferred for each row execute function public.i4_subtipo_completo();

-- Somente a coerência da nova referência; NULL conserva o caminho legado.
create function public.i4_atividade_sujeito() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
begin
  if new.sujeito_id is not null and not exists (
    select 1 from public.sujeitos_publicadores s where s.id = new.sujeito_id
      and s.tipo = 'organizacao' and s.organizacao_legada_id = new.organizacao_id
  ) then
    raise exception 'Sujeito incompatível com a organização da atividade em EXPAND' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger i4_atividade_sujeito before insert or update of sujeito_id, organizacao_id on public.atividades
  for each row execute function public.i4_atividade_sujeito();

-- Históricos materiais: só o marcador atual e o estado operacional do vínculo
-- podem mudar na mesma versão; papel/escopos exigem uma nova versão.
create function public.i4_vinculo_identidade() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
declare anterior public.vinculos_publicadores%rowtype;
begin
  perform 1 from public.sujeitos_publicadores where id = new.sujeito_id for update;
  if tg_op = 'UPDATE' then
    if (new.id, new.versao, new.sujeito_id, new.conta_id, new.papel_vinculo, new.escopos, new.origem, new.criada_em)
      is distinct from (old.id, old.versao, old.sujeito_id, old.conta_id, old.papel_vinculo, old.escopos, old.origem, old.criada_em)
      or not old.atual or (old.situacao = 'revogado' and new.situacao <> 'revogado') then
      raise exception 'Versão material de vínculo imutável' using errcode = '23514';
    end if;
    if new.revisao_validacao < old.revisao_validacao
      or ((new.atestacao_1_id, new.atestacao_2_id) is distinct from (old.atestacao_1_id, old.atestacao_2_id)
        and new.revisao_validacao <= old.revisao_validacao) then
      raise exception 'Troca de atestações exige nova revisão de validação' using errcode = '23514';
    end if;
  else
    select * into anterior from public.vinculos_publicadores where id = new.id order by versao desc limit 1;
    if found then
      if (anterior.conta_id, anterior.sujeito_id) is distinct from (new.conta_id, new.sujeito_id)
        or new.versao <> anterior.versao + 1 or anterior.atual then
        raise exception 'Identidade/versão de vínculo incompatível' using errcode = '23514';
      end if;
    elsif new.versao <> 1 then
      raise exception 'Primeira versão de vínculo deve ser 1' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create trigger i4_vinculo_identidade before insert or update on public.vinculos_publicadores
  for each row execute function public.i4_vinculo_identidade();

create function public.i4_vinculo_integridade() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
declare v public.vinculos_publicadores%rowtype; t text; n integer;
begin
  select * into v from public.vinculos_publicadores where id = new.id and versao = new.versao;
  if not found then return null; end if;
  select tipo into t from public.sujeitos_publicadores where id = v.sujeito_id for update;
  if t = 'pessoa_fisica' and (v.papel_vinculo <> 'titular' or not exists (
    select 1 from public.pessoas_fisicas where sujeito_id = v.sujeito_id and conta_id = v.conta_id
  )) then
    raise exception 'Titular PF deve ser a própria conta' using errcode = '23514';
  end if;
  if v.atual and v.situacao = 'ativo' and t = 'coletivo_informal' and v.papel_vinculo = 'representante' then
    select count(distinct a.atestante_conta_id) into n
    from public.atestacoes_representacao a join public.contas_acesso c on c.id = a.atestante_conta_id
    where a.vinculo_id = v.id and a.versao_vinculo = v.versao and a.situacao = 'vigente'
      and ((a.id = v.atestacao_1_id and a.posicao = 1) or (a.id = v.atestacao_2_id and a.posicao = 2))
      and c.situacao = 'ativa' and c.ativa_desde is not null and c.ativa_desde <= now() - interval '30 days';
    if n <> 2 or not exists (
      select 1 from public.casos_moderacao c join public.contas_acesso e on e.id = c.decidido_por_conta_id
      where c.id = v.curadoria_caso_id and c.versao = v.curadoria_caso_versao and c.sujeito_id = v.sujeito_id
        and c.tipo = 'curadoria_inicial' and c.resultado = 'procedente' and c.decidida_em is not null
        and e.situacao = 'ativa' and e.papel in ('editor', 'administrador')
    ) then
      raise exception 'Representante coletivo exige duas atestações elegíveis e decisão editorial' using errcode = '23514';
    end if;
  end if;
  return null;
end
$$;
create constraint trigger i4_vinculo_integridade after insert or update on public.vinculos_publicadores
  deferrable initially deferred for each row execute function public.i4_vinculo_integridade();

-- A conta da PF integra a identidade material e não pode ser transferida.
create function public.i4_pf_identidade() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
begin
  if (new.sujeito_id, new.conta_id) is distinct from (old.sujeito_id, old.conta_id) then
    raise exception 'Identidade PF imutável' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger i4_pf_identidade before update on public.pessoas_fisicas
  for each row execute function public.i4_pf_identidade();

create function public.i4_coletivo_curadoria() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
begin
  if new.nome_curado_em is not null and not exists (
    select 1 from public.casos_moderacao c join public.contas_acesso e on e.id = c.decidido_por_conta_id
    where c.id = new.curadoria_caso_id and c.versao = new.curadoria_caso_versao and c.sujeito_id = new.sujeito_id
      and c.tipo = 'curadoria_nome' and c.resultado = 'procedente' and c.decidida_em = new.nome_curado_em
      and c.decidido_por_conta_id = new.nome_curado_por_conta_id
      and e.papel in ('editor', 'administrador') and e.situacao = 'ativa'
  ) then
    raise exception 'Nome curado exige decisão editorial apta no mesmo sujeito' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger i4_coletivo_curadoria before insert or update on public.coletivos_informais
  for each row execute function public.i4_coletivo_curadoria();

create function public.i4_atestacao_integridade() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
declare sid uuid;
begin
  select sujeito_id into sid from public.vinculos_publicadores where id = new.vinculo_id and versao = new.versao_vinculo;
  perform 1 from public.sujeitos_publicadores where id = sid for update;
  if tg_op = 'UPDATE' and (
    (new.id, new.vinculo_id, new.versao_vinculo, new.posicao, new.atestante_conta_id, new.declara_membro,
      new.declara_pessoa_distinta, new.atestada_em, new.pedido_id, new.payload_sha256)
    is distinct from (old.id, old.vinculo_id, old.versao_vinculo, old.posicao, old.atestante_conta_id, old.declara_membro,
      old.declara_pessoa_distinta, old.atestada_em, old.pedido_id, old.payload_sha256)
    or (old.situacao <> 'vigente' and new.situacao <> old.situacao)
  ) then
    raise exception 'Identidade e declaração da atestação imutáveis' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.sujeitos_publicadores where id = sid and tipo = 'coletivo_informal')
      or not exists (select 1 from public.contas_acesso where id = new.atestante_conta_id and situacao = 'ativa'
        and ativa_desde is not null and ativa_desde <= now() - interval '30 days') then
      raise exception 'Atestação exige coletivo e conta ativa há 30 dias acompanhados' using errcode = '23514';
    end if;
  end if;
  -- O backend deve auditar esta suspensão na mesma transação; não há reativação automática.
  if tg_op = 'UPDATE' and old.situacao = 'vigente' and new.situacao <> 'vigente' then
    update public.vinculos_publicadores set situacao = 'suspenso', suspensa_em = now(), atualizada_em = now()
    where id = new.vinculo_id and versao = new.versao_vinculo and atual and situacao = 'ativo'
      and (atestacao_1_id = new.id or atestacao_2_id = new.id);
  end if;
  return new;
end
$$;
create trigger i4_atestacao_integridade before insert or update on public.atestacoes_representacao
  for each row execute function public.i4_atestacao_integridade();

create function public.i4_caso_integridade() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $$
declare anterior public.casos_moderacao%rowtype;
begin
  perform 1 from public.sujeitos_publicadores where id = new.sujeito_id for update;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'atual') is distinct from (to_jsonb(old) - 'atual') or not old.atual or new.atual then
      raise exception 'Versão de caso imutável; somente desmarcar atual' using errcode = '23514';
    end if;
    return new;
  end if;
  select * into anterior from public.casos_moderacao where id = new.id order by versao desc limit 1;
  if found then
    if anterior.atual or new.versao <> anterior.versao + 1
      or (new.sujeito_id, new.tipo, new.alvo, new.atividade_id, new.registro_id, new.caso_origem_id, new.caso_origem_versao,
        new.aberto_por_conta_id, new.aberto_em)
      is distinct from (anterior.sujeito_id, anterior.tipo, anterior.alvo, anterior.atividade_id, anterior.registro_id,
        anterior.caso_origem_id, anterior.caso_origem_versao, anterior.aberto_por_conta_id, anterior.aberto_em)
      or not ((anterior.estado = 'aberto' and new.estado = 'em_analise')
        or (anterior.estado = 'em_analise' and new.estado in ('procedente', 'improcedente', 'encerrado'))) then
      raise exception 'Transição/identidade de caso inválida' using errcode = '23514';
    end if;
  elsif new.versao <> 1 or new.estado <> 'aberto' then
    raise exception 'Caso deve iniciar aberto na versão 1' using errcode = '23514';
  end if;
  if new.caso_origem_id is not null then
    if not exists (select 1 from public.casos_moderacao c where c.id = new.caso_origem_id
      and c.versao = new.caso_origem_versao and c.sujeito_id = new.sujeito_id and c.decidida_em is not null)
      or exists (
        with recursive origem(id, versao, caso_origem_id, caso_origem_versao) as (
          select id, versao, caso_origem_id, caso_origem_versao from public.casos_moderacao
          where id = new.caso_origem_id and versao = new.caso_origem_versao
          union
          select c.id, c.versao, c.caso_origem_id, c.caso_origem_versao from public.casos_moderacao c
          join origem o on c.id = o.caso_origem_id and c.versao = o.caso_origem_versao
        ) select 1 from origem where id = new.id
      ) then
      raise exception 'Origem de caso inválida, não decidida ou cíclica' using errcode = '23514';
    end if;
  end if;
  if new.estado <> 'aberto' and (new.analisado_por_conta_id is null or not exists (
    select 1 from public.contas_acesso where id = new.analisado_por_conta_id and situacao = 'ativa' and papel in ('editor', 'administrador')
  )) then
    raise exception 'Análise exige editor/admin ativo' using errcode = '23514';
  end if;
  if new.decidida_em is not null and not exists (
    select 1 from public.contas_acesso where id = new.decidido_por_conta_id and situacao = 'ativa' and papel in ('editor', 'administrador')
  ) then
    raise exception 'Decisão exige editor/admin ativo' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger i4_caso_integridade before insert or update on public.casos_moderacao
  for each row execute function public.i4_caso_integridade();

-- Sem policies e sem privilégios herdados de defaults de criação Supabase.
alter table public.sujeitos_publicadores enable row level security;
alter table public.pessoas_fisicas enable row level security;
alter table public.coletivos_informais enable row level security;
alter table public.vinculos_publicadores enable row level security;
alter table public.atestacoes_representacao enable row level security;
alter table public.casos_moderacao enable row level security;
revoke all on table public.sujeitos_publicadores, public.pessoas_fisicas, public.coletivos_informais,
  public.vinculos_publicadores, public.atestacoes_representacao, public.casos_moderacao
  from public, anon, authenticated;
revoke all on function public.i4_escopos_validos(text[]), public.i4_sujeito_identidade(), public.i4_subtipo_completo(),
  public.i4_atividade_sujeito(), public.i4_vinculo_identidade(), public.i4_vinculo_integridade(),
  public.i4_pf_identidade(), public.i4_coletivo_curadoria(), public.i4_atestacao_integridade(), public.i4_caso_integridade()
  from public, anon, authenticated;
-- Nenhum grant novo: operações futuras exigem backend autorizado e auditoria atômica.
