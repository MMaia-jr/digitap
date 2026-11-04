# PROMPT DE EXECUÇÃO PARA CODEX — A PRAÇA v1.5

**Data-base da especificação:** 03/11/2026  
**Tipo:** contrato de implementação, não autorização de publicação  
**Uso:** copiar este arquivo integralmente para o Codex, em um diretório/repositório local autorizado.  
**Linguagem de trabalho:** português brasileiro.

---

## 0. PAPEL, AUTORIDADE E REGRAS INEGOCIÁVEIS

Você é o agente executor de engenharia do projeto independente **A Praça — Itaperuna e Região (RJ)**. Não possui memória dos diálogos anteriores; **esta especificação é autossuficiente e prevalece sobre PRDs antigos contraditórios**. A Praça quer conectar atividades reais, organizações e pessoas por meio de infraestrutura digital própria articulada às ruas e redes sociais. Esta release **não equivale ao projeto completo**.

**Decisão humana confirmada:** implementar o recorte **MVP v1.5**: (F01) cadastro simples de organização; (F02) envio de atividade; (F03) listagem/detalhe públicos; (F04) apoio simbólico anônimo com contador persistido; (F05) painel agregado de movimento; (F06) selo descritivo "A Praça divulgou"; (F07) selo de lojista "Parceiro da Praça" somente quando confirmado. Também preservar o fluxo editorial, registro da realização, referências de evidência, autorização restrita, correção e retirada da Fase 1.

**Autorizações e estado real:** o proponente é editor provisório, mas **ainda não existe segunda editora confirmada**, grupo parceiro confirmado, repositório canônico designado ou autorização para publicação. Os contatos do proponente com GRAFFITA, MOABI, NEABI, Casa de Bamba e pessoas ligadas a partidos são contatos, não acordos. Nunca usar nomes, logos, atividades, fotos ou dados reais desses grupos em fixtures, demonstrações ou produção sem autorização. **Não publicar, criar recursos externos pagos, fazer deploy, executar migrações remotas, convidar terceiros, fazer push ou alterar repositórios remotos sem aprovação explícita e separada.** Você pode preparar aplicação, testes, documentação, migrações e execução **local** quando autorizado pelo usuário que acionar o Codex. Não altere repositórios alheios. Antes de instalar dependências ou executar comandos que mudam estado, informe o comando/efeito e obtenha aprovação no ambiente de execução.

**Método TDD obrigatório:** para cada comportamento, primeiro teste que falha (RED), depois implementação mínima (GREEN), depois refatoração protegida (REFACTOR). Cada correção exige regressão. Incrementos pequenos, reversíveis, rastreáveis; sem código especulativo. Commit convencional `test:`, `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`; sem atribuição/coautoria a IA. Não gerar tudo num único salto. Reportar execução efetiva (com comandos, resultados, limitações), não apenas arquivos supostamente prontos. Pare nas barreiras de autorização.

**Tecnologia de referência:** Next.js App Router + TypeScript + Supabase (Auth + PostgreSQL) + Tailwind CSS + Vercel. Stack aceita para esta implementação, **não dogma do projeto**. Use versões estáveis documentadas vigentes na data de execução, fixe versões/lockfile, evite tutorial preso a Next.js 14 ou chaves legadas. Para Next.js >=16, siga a convenção `proxy.ts`; para versões anteriores, confira a equivalente documentada. Use `@supabase/ssr` e API atual. Mudança de stack exige justificativa objetiva antes de alterar. Nada de gov.br, blockchain, token, multisig, mapas, upload de imagem, pagamento, reputação automática, RAG ou aplicativo nativo.

**Referências conceituais, nunca dependências:** Célula Zero (https://github.com/MMaia-jr/celula-zero) inspira REGISTRO ≠ EVIDÊNCIA ≠ REPUTAÇÃO; Esentya (https://github.com/D-Madhava-Deva/d-esentya-mvpv0.2) inspira reconhecimento de contribuições e governança futura, mas **não** autoriza mecanismos de pontuação, identidade Soulbound, Proof-of-Worth, DAO ou tokens. Não importar código/licenças. Não aplicar licença AGPL ou CC BY-SA automaticamente; a escolha está pendente.

Documentos antigos 00–07 e Marco Zero são contexto revisável; não os reescreva, não invente `08-leitura-inaugural.md`. Decisão v1.5 > este contrato > Fundação v1 > PRDs antigos, para o recorte de software.

## 1. PROPRIEDADES FUNCIONAIS DO MVP

### F01 — Cadastro de organização
- Pessoa responsável se registra com e-mail e senha por Supabase Auth, com confirmação de e-mail e recuperação de senha.
- Depois de confirmar identidade, cadastra **organização** com nome público e canal público opcional. Vincula a conta autenticada à organização.
- **Autodeclaração não valida representação institucional.** `estado_validacao=pendente` até revisão editorial. Organização pode criar rascunho e enviar; publicação atribuída fica bloqueada até validação.
- Cadastro não cria parceiro, selo, reputação ou permissão editorial.
- As senhas pertencem ao Supabase Auth; nunca gravar senha/`password_hash` nas tabelas da aplicação nem em logs.
- Uma conta vinculada a uma organização na v1.5; outras relações ficam fora do escopo.

### F02 — Envio de atividade
- Organização autenticada edita somente suas próprias atividades: título, descrição, data/hora com fuso, orientação de acesso, link oficial opcional.
- Estados editoriais: `rascunho`, `enviada`, `em_revisao`, `aprovada`, `publicada`, `devolvida`, `rejeitada`, `retirada`.
- Estados da programação: `programada`, `adiada`, `cancelada`, `realizada`.
- Enviar ≠ aprovar ≠ publicar. Só editor ou administrador autorizado faz transições editoriais. Preservar versão editável separada da **versão pública aprovada**; alterações pendentes nunca vazam.
- Há procedimento de correção, contestação e retirada. Retirada/cancelamento interrompem novos apoios imediatamente.

### F03 — Portal público
- `/`: listagem de atividades elegíveis, painel de movimento e explicação simples da iniciativa.
- `/atividade/[id]`: versão aprovada, organização atribuída e validada, estado, data/hora, acesso, links públicos e apoio se elegível.
- Páginas de rascunhos/rejeições/retiradas não exibem dados nem metadados privados. Não inventar agenda, eventos ou parceiros reais.
- Compartilhamento via URL comum/links para redes; sem integração privada com WhatsApp/Instagram.

### F04 — "Quero apoiar"
- **Sem login e sem nome/telefone/e-mail.** É uma *manifestação simbólica de apoio a uma atividade*, não presença, promessa, doação, associação, pessoa única nem preferência política.
- Texto da interface: **"X apoios registrados"**; nunca "X pessoas apoiam", "X participantes" ou "X cidadãos mobilizados".
- Persistir apoio por atividade; idempotência por **identificador técnico aleatório do navegador**, com hash HMAC específico da atividade no servidor. Não usar IP como identidade; não gravar nome ou contato do apoiador. Informar o uso do identificador em aviso de privacidade. Não cruzar identificadores entre atividades.
- Um apoio ativo por navegador e atividade, com ressalva expressa: outros navegadores/dispositivos podem apoiar novamente; não se trata de unicidade por pessoa. Repetir clique/requisição com a mesma chave não aumenta contador. Permitir desfazer no mesmo navegador se o identificador ainda existir. Não permitir reativação automática de apoio invalidado por abuso.
- Aceitar apenas atividade pública, `programada`, com início futuro, `apoios_abertos=true`, organização validada e autorização válida. Não aceitar rascunho, cancelada, adiada, realizada, retirada, expirada ou com apoios fechados.
- Rate limit **durável para ambiente serverless** (camada de infraestrutura ou serviço com persistência); bloqueio 429 e testes de abuso. Rate limiting em `Map`/memória de processo não serve para produção na Vercel. Se não puder configurar limitação de abuso comprovável, **desabilite apoio público**, sinalize bloqueio e não declare release apta.
- Contador = `count(*)` persistido de apoios `ativos`, ligados a atividades públicas elegíveis para contagem; não é contador de cliques, nem valor mockado. Invalidações/retiradas alteram o total. Em erro de consulta, mostrar indisponibilidade, não zero falso. Resposta após clique vem da persistência bem-sucedida.

### F05 — Painel público de movimento
Quatro métricas reais, sem números demonstrativos:
1. `atividades`: atividades publicadas e atualmente visíveis (inclusive encerradas/canceladas **se** a página permanecer pública).
2. `apoios`: apoios ativos de atividades publicamente visíveis; se atividade for retirada, seus apoios não entram no agregado.
3. `organizacoes`: organizações validadas que tenham ao menos uma atividade pública visível (DISTINCT).
4. `parceiros`: lojistas com colaboração confirmada, autorização vigente e visibilidade autorizada.

Não contar cadastros apenas pendentes, atividades rejeitadas, parceiros prospectados. Zero real é válido. Mostrar uma legenda: os indicadores **não medem pessoas únicas, participação presencial, benefício econômico, adoção ou retorno de investimento**.

### F06 — Selo "A Praça divulgou"
Derivado, **não** um booleano manipulável. Exibir para organização validada e autorizada com >=1 atividade pública visível. Significa somente divulgação pela plataforma; não certifica qualidade, endossa ideologia, registra presença ou constitui parceria. Desaparece se a última atividade elegível for retirada.

### F07 — Selo "Parceiro da Praça"
Exibir para lojista somente se `situacao_parceria=confirmada`, autorização específica vigente, prazo válido e confirmação editorial. Prospecto não recebe selo. Não presumir desconto, investimento, patrocínio ou contribuição. Suspensão, revogação ou expiração remove selo e altera contador.

### Registro, evidência, autorização e revisão
- **Atividade anunciada** não significa realizada; **registro de realização** declara algo que ocorreu; **evidência** é referência que suporta uma afirmação delimitada; **reputação** não existe como dado nem cálculo.
- Registro após atividade contém data efetiva, descrição factual e origem; `estado_apuracao`: `declarado`, `corroborado`, `contestado`. Corroboração exige fonte adicional efetivamente examinada.
- Evidência: URL pública, tipo, afirmação sustentada e data da consulta. Não baixar ou incorporar mídia de terceiros automaticamente.
- Autorizações/revogações são **restritas**. Autorização para anúncio não autoriza automaticamente depoimento/foto/registro posterior. Assinatura ou cadastro não garantem legitimidade de representação.
- Toda ação editorial sensível gera `evento_editorial` interno com autor, tempo, ação e estado. Nada de logs públicos com dados pessoais.

## 2. MODELO DE DADOS — NOVE ENTIDADES

| Entidade | Informação central | Exposição |
|---|---|---|
| `organizacoes` | nome público, canal autorizado, estado de validação | projeção pública autorizada; estado de revisão interno |
| `contas_acesso` | vínculo com `auth.users`, papel e situação | restrito; e-mail fica no Auth |
| `atividades` | rascunho editável + snapshot público aprovado + estados | só versão aprovada é pública |
| `registros_realizacao` | declaração de realização e apuração | só versão aprovada é pública |
| `evidencias` | fontes públicas e afirmação sustentada | apenas referências aprovadas |
| `autorizacoes_publicacao` | objeto, escopo, comprovação restrita, revogação | **nunca público** |
| `apoios` | id, atividade, hash pseudônimo, situação, datas | **nunca público individualmente** |
| `parceiros` | lojista, colaboração, situação e autorização | só confirmados autorizados |
| `eventos_editoriais` | autor, mudança, motivo e data | **nunca público** |

Não criar tabela `reputacao`, `selos`, `painel`, `participantes`, `visitas` nem perfis de apoiadores. Selos e painel são consultas derivadas. IDs são UUID; timestamps `timestamptz`, exibidos no fuso `America/Sao_Paulo` quando a atividade é local.

## 3. SCHEMA SQL DE REFERÊNCIA — BASE LOCAL, CORRIGIDA

**Obrigação do Codex:** colocar a migração, após revisão técnica e testes prévios de SQL, em `supabase/migrations/` usando **nome gerado pela CLI instalada**, nunca inventar timestamp de migração. Verificar a versão do CLI e a documentação antes dos comandos. O SQL abaixo é uma **base concreta**, a ser adaptada somente se os testes identificarem necessidade. Executar apenas em ambiente local explicitamente autorizado. **Não aplicar em projeto remoto automaticamente.** Testar sintaxe, FK, grants, papéis e políticas no Postgres/Supabase local. Não assumir que a criação da migração equivale à sua aplicação.

### 3.1. Tabelas, índices, RLS e grants

```sql
-- Esquema v1.5: nove tabelas públicas com acesso direto fechado.
-- As páginas/rotas Next.js são a fronteira entre o público e o banco.
-- Requer Supabase Auth (schema auth existente) e Postgres com gen_random_uuid().

create table public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome_publico text not null check (char_length(trim(nome_publico)) between 2 and 160),
  canal_publico text,
  estado_validacao text not null default 'pendente'
    check (estado_validacao in ('pendente','validada','suspensa')),
  criada_em timestamptz not null default now()
);

create table public.contas_acesso (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  organizacao_id uuid references public.organizacoes(id) on delete restrict,
  papel text not null default 'organizacao'
    check (papel in ('organizacao','editor','administrador')),
  situacao text not null default 'ativa'
    check (situacao in ('ativa','bloqueada','desativada')),
  criada_em timestamptz not null default now(),
  constraint papel_vinculo check (
    (papel = 'organizacao' and organizacao_id is not null)
    or (papel in ('editor','administrador'))
  )
);
create index contas_organizacao_idx on public.contas_acesso (organizacao_id);

create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references public.organizacoes(id) on delete restrict,
  criada_por_conta_id uuid not null references public.contas_acesso(id) on delete restrict,
  titulo text not null check (char_length(trim(titulo)) between 3 and 180),
  descricao text not null check (char_length(trim(descricao)) between 10 and 5000),
  inicio_previsto timestamptz not null,
  orientacao_acesso text not null check (char_length(trim(orientacao_acesso)) between 3 and 600),
  referencia_oficial text,
  estado_programacao text not null default 'programada'
    check (estado_programacao in ('programada','adiada','cancelada','realizada')),
  estado_editorial text not null default 'rascunho'
    check (estado_editorial in
      ('rascunho','enviada','em_revisao','aprovada','publicada',
       'devolvida','rejeitada','retirada')),
  versao_submetida integer not null default 1 check (versao_submetida > 0),
  versao_publicada jsonb,
  numero_versao_publicada integer check (numero_versao_publicada > 0),
  publicada_em timestamptz,
  apoios_abertos boolean not null default false,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  constraint snapshot_publicacao_coerente check (
    (versao_publicada is null and numero_versao_publicada is null)
    or (versao_publicada is not null and numero_versao_publicada is not null)
  )
);
create index atividades_publicacao_idx on public.atividades
  (estado_editorial, organizacao_id, inicio_previsto);

create table public.registros_realizacao (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null unique references public.atividades(id) on delete restrict,
  data_realizacao date not null,
  descricao_factual text not null check (char_length(trim(descricao_factual)) between 10 and 5000),
  origem_informacao text not null,
  estado_apuracao text not null default 'declarado'
    check (estado_apuracao in ('declarado','corroborado','contestado')),
  estado_editorial text not null default 'rascunho'
    check (estado_editorial in
      ('rascunho','enviada','em_revisao','aprovada','publicada',
       'devolvida','rejeitada','retirada')),
  versao_publicada jsonb,
  numero_versao_publicada integer check (numero_versao_publicada > 0),
  publicada_em timestamptz
);

create table public.evidencias (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references public.registros_realizacao(id) on delete restrict,
  tipo_fonte text not null,
  url_publica text not null,
  afirmacao_sustentada text not null,
  consultada_em timestamptz not null,
  aprovada_publicacao boolean not null default false
);
create index evidencias_registro_idx on public.evidencias (registro_id);

create table public.autorizacoes_publicacao (
  id uuid primary key default gen_random_uuid(),
  objeto_tipo text not null
    check (objeto_tipo in ('organizacao','atividade','registro','parceiro')),
  objeto_id uuid not null,
  escopo_autorizado text[] not null
    check (cardinality(escopo_autorizado) > 0),
  papel_autorizante text not null,
  comprovante_restrito text not null,
  autorizada_em timestamptz not null,
  situacao text not null default 'vigente'
    check (situacao in ('vigente','revogada','expirada')),
  validade_ate timestamptz,
  revogada_em timestamptz
);
create index autorizacoes_objeto_idx on public.autorizacoes_publicacao
  (objeto_tipo, objeto_id, situacao);

create table public.apoios (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete restrict,
  chave_anonima_hash text not null
    check (chave_anonima_hash ~ '^[0-9a-f]{64}$'),
  situacao text not null default 'ativo'
    check (situacao in ('ativo','cancelado','invalidado')),
  criado_em timestamptz not null default now(),
  encerrado_em timestamptz,
  constraint apoio_unico_navegador_atividade unique
    (atividade_id, chave_anonima_hash)
);
create index apoios_ativos_por_atividade_idx on public.apoios (atividade_id)
  where situacao = 'ativo';

create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  nome_publico text not null,
  categoria text not null default 'lojista',
  referencia_publica text,
  colaboracao_publica text,
  situacao_parceria text not null default 'proposta'
    check (situacao_parceria in ('proposta','confirmada','suspensa','encerrada')),
  autorizacao_id uuid references public.autorizacoes_publicacao(id)
    on delete restrict,
  inicio_vigencia timestamptz,
  fim_vigencia timestamptz,
  contato_restrito text,
  constraint parceria_confirmada_com_autorizacao check (
    situacao_parceria <> 'confirmada' or autorizacao_id is not null
  )
);

create table public.eventos_editoriais (
  id uuid primary key default gen_random_uuid(),
  objeto_tipo text not null,
  objeto_id uuid not null,
  acao text not null,
  executada_por_conta_id uuid references public.contas_acesso(id)
    on delete set null,
  estado_anterior text,
  estado_novo text,
  justificativa_restrita text,
  ocorrida_em timestamptz not null default now()
);
create index eventos_objeto_idx on public.eventos_editoriais
  (objeto_tipo, objeto_id, ocorrida_em desc);

-- RLS deny-by-default para as nove tabelas; nenhum acesso direto
-- aos dados via anon/authenticated. Rotas server-side fazem mediação.
alter table public.organizacoes enable row level security;
alter table public.contas_acesso enable row level security;
alter table public.atividades enable row level security;
alter table public.registros_realizacao enable row level security;
alter table public.evidencias enable row level security;
alter table public.autorizacoes_publicacao enable row level security;
alter table public.apoios enable row level security;
alter table public.parceiros enable row level security;
alter table public.eventos_editoriais enable row level security;

revoke all on table
  public.organizacoes, public.contas_acesso, public.atividades,
  public.registros_realizacao, public.evidencias,
  public.autorizacoes_publicacao, public.apoios,
  public.parceiros, public.eventos_editoriais
  from public, anon, authenticated;

grant select, insert, update, delete on table
  public.organizacoes, public.contas_acesso, public.atividades,
  public.registros_realizacao, public.evidencias,
  public.autorizacoes_publicacao, public.apoios,
  public.parceiros, public.eventos_editoriais
  to service_role;

-- Deliberadamente NÃO criar policy `FOR SELECT USING (true)`
-- em apoios, contatos, autorizações ou eventos editoriais.
-- Também não conceder escrita direta ao navegador em atividades.
-- O role service_role contorna RLS: a sua chave só pode existir no servidor;
-- autenticação + checagem de escopo/papel são obrigatórias em CADA rota.
```

### 3.2. RPC transacional para o apoio — chave apenas no servidor

Usar função `SECURITY INVOKER` chamada pelo backend autenticado como serviço, jamais pelo navegador com chave pública. O backend valida origem da requisição, controla frequência/abuso, cria ou lê identificador aleatório de cookie técnico (Secure/HttpOnly/SameSite conforme ambiente), deriva **HMAC-SHA256** com segredo de servidor e identifica a atividade. O navegador não escolhe o hash armazenado no banco.

```sql
create or replace function public.registrar_apoio(
  p_atividade_id uuid,
  p_chave_hash text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ok boolean := false;
  v_linhas integer := 0;
begin
  if p_chave_hash is null
     or p_chave_hash !~ '^[0-9a-f]{64}$' then
    return 'invalido';
  end if;

  -- FOR SHARE no registro da atividade impede corrida simples
  -- entre apoio e UPDATE editorial de retirada/cancelamento.
  select true into v_ok
  from public.atividades a
  join public.organizacoes o on o.id = a.organizacao_id
  where a.id = p_atividade_id
    and a.estado_editorial = 'publicada'
    and a.versao_publicada is not null
    and a.estado_programacao = 'programada'
    and a.inicio_previsto > now()
    and a.apoios_abertos = true
    and o.estado_validacao = 'validada'
    and exists (
      select 1 from public.autorizacoes_publicacao au
      where au.objeto_tipo = 'atividade'
        and au.objeto_id = a.id
        and au.situacao = 'vigente'
        and 'divulgacao' = any(au.escopo_autorizado)
        and (au.validade_ate is null or au.validade_ate > now())
    )
  for share of a;

  if not coalesce(v_ok, false) then
    return 'inelegivel';
  end if;

  insert into public.apoios
    (atividade_id, chave_anonima_hash, situacao)
  values (p_atividade_id, p_chave_hash, 'ativo')
  on conflict (atividade_id, chave_anonima_hash)
  do update set situacao = 'ativo', encerrado_em = null
    where public.apoios.situacao = 'cancelado';

  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    return 'ja_registrado';
  end if;
  return 'registrado';
end;
$$;

create or replace function public.cancelar_apoio(
  p_atividade_id uuid,
  p_chave_hash text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare v_linhas integer := 0;
begin
  if p_chave_hash is null
     or p_chave_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  update public.apoios
    set situacao = 'cancelado', encerrado_em = now()
    where atividade_id = p_atividade_id
      and chave_anonima_hash = p_chave_hash
      and situacao = 'ativo';
  get diagnostics v_linhas = row_count;
  return v_linhas = 1;
end;
$$;

-- PostgreSQL concede EXECUTE a PUBLIC por padrão; revogar explicitamente.
revoke all on function public.registrar_apoio(uuid,text)
  from public, anon, authenticated;
revoke all on function public.cancelar_apoio(uuid,text)
  from public, anon, authenticated;
grant execute on function public.registrar_apoio(uuid,text) to service_role;
grant execute on function public.cancelar_apoio(uuid,text) to service_role;
```

**Atenção para revisão técnica obrigatória:** `service_role` contorna RLS; a checagem de identidade e de papel na aplicação é a fronteira privilegiada. Essas funções são invoker e têm acesso somente por chave secreta do backend. Confirme que o SQL funciona no Postgres instalado e rode testes de concorrência entre retirada, revogação e apoio. Se a revogação de autorização ocorrer, o mesmo fluxo editorial deve, na **mesma transação ou operação equivalente comprovada**, suspender visibilidade e `apoios_abertos`; não aceitar janela de corrida. Se a atomicidade entre atualização editorial e auditoria não puder ser garantida via PostgREST, implante transação/RPC *server-only* específica com grants estreitos, sem abrir definer ao público. Não usar transação distribuída fictícia entre chamadas HTTP.

### 3.3. Consultas derivadas e fonte de verdade

Não persistir contador manual nem selo booleano. Consultas do **servidor** calculam:

```sql
-- Base de atividades visíveis; só selecionar colunas públicas aprovadas
-- em rotas server-side, usando exclusivamente versao_publicada.
select a.id, a.organizacao_id, a.versao_publicada, a.estado_programacao
from public.atividades a
join public.organizacoes o on o.id = a.organizacao_id
where a.estado_editorial = 'publicada'
  and a.versao_publicada is not null
  and o.estado_validacao = 'validada'
  and exists (
    select 1 from public.autorizacoes_publicacao au
    where au.objeto_tipo = 'atividade' and au.objeto_id = a.id
      and au.situacao = 'vigente' and 'divulgacao' = any(au.escopo_autorizado)
      and (au.validade_ate is null or au.validade_ate > now())
  );

-- Apoios de UMA atividade pública (revalidar elegibilidade de visibilidade
-- no backend antes de executar esta consulta).
select count(*)::bigint as apoios_registrados
from public.apoios
where atividade_id = :atividade_id and situacao = 'ativo';
```

Os quatro agregados seguem as definições da seção 1. Em particular, **apoiadores individuais jamais serão retornados**. Ao remover uma atividade da visibilidade, excluir seus apoios dos agregados mesmo que registros internos sejam retidos por prazo justificável. Para parceiro, confirmar `autorizacao_id` existente, referente àquele parceiro, com escopo `selo_parceiro` e estado vigente; a FK isolada não prova legitimidade. Não usar `CREATE VIEW` com comportamento padrão de bypass de RLS; se criar projeções seguras, revisar grants e `security_invoker` ou servir resultados exclusivamente do backend.

### 3.4. Controles de autenticação e acesso

- O browser só recebe `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; chave secreta exclusivamente server-side `SUPABASE_SECRET_KEY` (não prefixar `NEXT_PUBLIC_`), além de segredo HMAC restrito. Chaves legadas `anon`/`service_role` apenas se indispensáveis, justificando compatibilidade.
- Criar cliente público SSR para Auth com cookies e `getClaims()`/`getUser()` conforme docs atuais. **Nunca autorizar ações com `getSession()` isolado ou com `user_metadata` editável.**
- Criar cliente administrativo separado, somente em módulo `server-only`, sem cookie/sessão de usuário anexado. Validar usuário com SDK Auth independente, depois buscar `contas_acesso` e `situacao`, e autorizar **cada ação** no servidor. Não usar e-mail textual como única autorização administrativa.
- Não existir criação pública de `editor` ou `administrador`. Bootstrap desses papéis só por procedimento manual protegido e autorizado, documentado, não executado automaticamente; testes usam contas fictícias locais.
- Rotas REST/handlers rejeitam requisições sem autenticação onde devida, sem permissão por objeto, com CSRF/origem inválida, conteúdo excessivo, entradas HTML/URLs malformadas ou abuso. Implementar validação server-side em todos os campos, e limitação de payload.
- As nove tabelas têm RLS habilitada e acesso direto anon/authenticated fechado. Criar testes reais com credenciais `anon` e `authenticated` para garantir que não podem SELECT/INSERT/UPDATE/DELETE dados individuais, mesmo quando adivinham IDs.
- Preferir caminhos que não encaminhem cookie/token do usuário ao cliente do serviço, para não rebaixar inadvertidamente a requisição ao papel do usuário.
- A marcação `corroborado`, aprovação, parceria ou selo não pode vir de parâmetros fornecidos pela organização.
- Manter informações privadas fora de renderização HTML inicial, metadata, sitemap, logs, Open Graph, cache/CDN e respostas de erro; sessões e respostas privadas usam cache `no-store` e headers apropriados.

## 4. ESTRUTURA DE ARQUIVOS — OBJETIVO, NÃO OBRIGAÇÃO DE RECRIAR O REPOSITÓRIO

Verifique o diretório/repositório existente antes de criar arquivos. Preserve documentos e mudanças existentes. Se a raiz estiver vazia e você tiver autorização para criar a estrutura local, use um arranjo aproximado:

```text
README.md
SECURITY.md
CONTRIBUTING.md
.env.example
.gitignore
package.json
package-lock.json              # ou lockfile do gerenciador escolhido
next.config.ts
proxy.ts                       # Next >=16; equivalência documentada se anterior
supabase/
  config.toml
  migrations/                 # migração real gerada pela CLI
  seed.sql                    # dados fictícios, somente local
src/
  app/
    page.tsx                  # atividades + painel público
    atividade/[id]/page.tsx
    cadastro/page.tsx
    login/page.tsx
    recuperar-acesso/page.tsx
    dashboard/page.tsx
    dashboard/nova-atividade/page.tsx
    dashboard/atividade/[id]/page.tsx
    admin/page.tsx
    admin/atividades/page.tsx
    admin/parceiros/page.tsx
    api/
      organizacoes/route.ts
      atividades/route.ts
      atividades/[id]/route.ts
      atividades/[id]/enviar/route.ts
      apoios/route.ts
      apoios/cancelar/route.ts
      movimento/route.ts
      admin/atividades/[id]/revisar/route.ts
      admin/atividades/[id]/publicar/route.ts
      admin/atividades/[id]/retirar/route.ts
      admin/parceiros/route.ts
      admin/parceiros/[id]/route.ts
      admin/registros/route.ts
      privacidade/page.tsx
  components/
    Header.tsx
    Footer.tsx
    CardAtividade.tsx
    BotaoApoio.tsx
    PainelMovimento.tsx
    SeloDivulgou.tsx
    SeloParceiro.tsx
    FormularioAtividade.tsx
  lib/
    supabase/client.ts
    supabase/server.ts
    supabase/admin.server.ts
    auth/permissions.server.ts
    domain/activities.ts
    domain/support.ts
    domain/partners.ts
    domain/publications.ts
    validation/schemas.ts
    security/rate-limit.server.ts
    security/origin.server.ts
    queries/public.server.ts
  styles/
    globals.css
specs/
  prd-v1.5.md
  modelo-de-dados-v1.5.md
  contratos-api.md
  matriz-testes-v1.5.md
  decisoes-pendentes.md
  referencias-tecnicas.md
tests/
  unit/
  integration/
  security/
  e2e/
  fixtures/
operations/
  editorial.md
  privacidade-e-retencao.md
  bootstrap-editor.md
  deploy.md
  rollback.md
```

Nome de arquivos e pastas não é contrato de API; **comportamento, segurança e testes são**. Não criar apps, módulos ou CI desnecessários. `README` deve deixar explícito: software em desenvolvimento, sem adoção/parceria confirmada. Sem licença definitiva inventada. `.env.example` tem NOMES e placeholders, sem segredos reais.

### Páginas e componentes

- Home: atividades públicas + 4 indicadores verdadeiros + estado vazio + links claros.
- Cadastro: e-mail/senha no Auth, nome público da organização, confirmação e termos; não afirmar representação validada.
- Login/recuperação: sessão SSR segura e recuperação de acesso; respostas não enumeram existência de contas.
- Dashboard organização: próprias atividades, versões, estados, devolutivas editoriais, criar/editar/enviar; nunca atividades de outras organizações.
- Nova atividade: validações acessíveis, horários, confirmação do escopo de autorização; sem upload.
- Detalhe público: renderizar apenas snapshot aprovado, origem e status, apoio elegível e contador.
- Administração: acesso negado a todos exceto contas com papel apropriado e ativo. Revisar, validar atribuição e autorização, publicar, corrigir/retirar, administrar parceiros, registrar eventos editoriais.
- SeloDivulgou: só exibir pelo predicado derivado; texto explicativo anti-endosso.
- SeloParceiro: só exibir para parceria válida; texto explicativo e vigência quando houver.
- Registro: revisão editorial de relato factual posterior, com evidências aprovadas e sem mídia incorporada.
- Acessibilidade: formulários com `label`, erros associados, foco visível, uso por teclado, contraste, mobile-first, redução de movimento quando pertinente.

## 5. CONTRATOS DAS ROTAS E TRANSIÇÕES

O Codex deve escrever `specs/contratos-api.md` antes da implementação. Estes contratos mínimos são obrigatórios:

- `POST /api/organizacoes`: autenticado e e-mail confirmado; cria organização pendente e conta organizacional de forma **idempotente/segura**, nunca aceita papel admin do payload.
- `POST /api/atividades`: usuário de organização ativa; cria rascunho vinculado à **própria** organização derivada do servidor, nunca do ID fornecido pelo cliente. Dados sob validação. Retorna apenas objeto próprio.
- `POST /api/atividades/[id]/enviar`: dono legítimo; transição permitida, versão registrada; conteúdo não público.
- `GET /api/atividades`, `GET /api/atividades/[id]`: somente snapshots aprovados de objetos visíveis; sem campos internos.
- `POST /api/apoios`: sem login; origem validada; proteção contra abuso; serviço gera/recupera token técnico, deriva hash HMAC contextual e chama RPC idempotente. Retorna estado + contador agregado; não retorna identificadores de terceiros.
- `POST /api/apoios/cancelar`: sem login; exige identificador técnico válido já existente naquele navegador; cancela somente seu apoio e retorna agregado. Requisição sem token não cancela terceiros.
- `GET /api/movimento`: quatro contadores de dados reais, sem PII, sem mock.
- Rotas `admin`: sessão verificada + `contas_acesso.papel`=`editor`/`administrador` e ativa, autorização por operação/objeto, transições registradas, publicação condicionada a autorização vigente. `administrador` para elevar papéis ou administrar contas, quando estritamente necessário; não criar UI de promoção de papéis aberta.

Erros: `400` malformado, `401` não autenticado, `403` sem permissão, `404` objeto não exposto, `409` conflito/idempotência quando aplicável, `422` regra de negócio, `429` abuso, `500/503` falha de serviço. Mensagens sem segredos. Rotas mutantes devem usar proteção CSRF/origem e validação de payload. Conflito de versão deve evitar sobrescrita silenciosa (optimistic concurrency).

**Publicação:** editor confirma organização validada, snapshot autorizado e versão revisada; transição + log em uma operação atômica. **Retirada e revogação:** retirar visibilidade, fechar apoios, registrar evento; atualização atômica. Sem publicação se não conseguir executar e confirmar essas ações.

## 6. 74 CENÁRIOS DE TESTE — MATRIZ NORMATIVA

**Precisão histórica:** a entrega anterior se chamou "74 cenários", mas enumerou **71** (`A01–A09`, `B01–B12`, `C01–C08`, `D01–D14`, `E01–E07`, `F01–F09`, `G01–G12`). Preserve os 71 e acrescente **H01–H03** como regressões de D01–D03. São **74 cenários identificados**, não alegação de 74 testes já implementados/executados. Criar rastreabilidade ID → teste automatizado → resultado.

### A. Cadastro, autenticação, tenant e papéis (9)
- A01 P0: signup válido; conta e e-mail confirmados; contato não público.
- A02 P0: e-mail inválido/duplicado; erro sem enumeração de contas.
- A03 P0: senha incorreta; sem credencial vazada.
- A04 P0: recuperação de senha; token expira e não se reutiliza.
- A05 P0: organização não lê/edita dados de outra.
- A06 P0: organização não promove seu próprio papel.
- A07 P0: conta não validada não publica em nome de terceiro.
- A08 P1: logout, expiração e bloqueio negam ações restritas.
- A09 P0: visitante não acessa rota editorial direta.

### B. Atividade, revisão e publicação (12)
- B01 P0: rascunho restrito ao dono/editor.
- B02 P0: campos obrigatórios ausentes impedem envio.
- B03 P0: data/URL/conteúdo inválidos bloqueados.
- B04 P0: enviar deixa `enviada` e continua privado.
- B05 P0: revisão com autorização válida habilita aprovação.
- B06 P0: devolver/rejeitar sem publicação, motivo acessível ao dono.
- B07 P0: publicar mostra somente snapshot aprovado.
- B08 P0: editar publicação não vaza versão pendente.
- B09 P0: retirar oculta e fecha apoio.
- B10 P1: cancelar/adiar atualiza estado visível corretamente.
- B11 P0: XSS/HTML malicioso não executa.
- B12 P1: listagem vazia não fabrica atividades.

### C. Registro, evidência, autorização (8)
- C01 P0: registro não declara realização futura como fato.
- C02 P0: só declaração => `declarado`, sem corroboração automática.
- C03 P0: evidência parcial não valida afirmação total.
- C04 P0: referência imprópria ou com dado sensível é bloqueada.
- C05 P0: autorização de anúncio não cobre registro posterior.
- C06 P0: revogar autorização suspende publicação abrangida.
- C07 P0: transições editoriais deixam evento restrito com autor/data.
- C08 P1: contestação preserva divergência, sem afirmar consenso.

### D. Apoio anônimo, idempotência e contagem (14)
- D01 P0: apoio elegível persiste e incrementa exatamente 1.
- D02 P0: mesmo navegador não incrementa novamente.
- D03 P0: retry do mesmo pedido é idempotente.
- D04 P0: requests concorrentes com mesma chave não duplicam.
- D05 P0: apoio a rascunho/retirada negado.
- D06 P0: apoio a cancelada, encerrada ou fechada negado.
- D07 P0: desfazer com token legítimo decrementa.
- D08 P0: invalidar apoio abusivo desconta do agregado.
- D09 P0: automação/abuso encontra rate limit efetivo, retorna 429.
- D10 P0: falha de persistência não gera sucesso falso.
- D11 P0: consulta pública expõe **somente** número agregado.
- D12 P1: segundo navegador não é contado como pessoa única.
- D13 P1: erro de contador mostra indisponibilidade, não 0 inventado.
- D14 P1: texto é **"apoios registrados"**, não "pessoas".

### E. Selos e parceiros (7)
- E01 P0: sem atividade publicada não existe selo de divulgação.
- E02 P0: atividade publicada/organização validada gera selo descritivo.
- E03 P0: retirada da última atividade remove selo.
- E04 P0: prospecto não é parceiro confirmado.
- E05 P0: parceria autorizada e vigente pode ganhar selo.
- E06 P0: expiração, revogação e suspensão removem selo e reduzem total.
- E07 P1: selos explicam seu alcance, sem endosso/reputação.

### F. Painel de movimento (9)
- F01 P0: sem dados, exibir zeros verdadeiros.
- F02 P0: pending/draft não entram nos totais.
- F03 P0: publicar uma atividade soma uma, não mais.
- F04 P0: contagem de apoios condiz com persistência.
- F05 P0: múltiplas atividades contam organização uma vez.
- F06 P0: parceria confirmada válida incrementa exatamente uma.
- F07 P0: retirada/invalidação/suspensão atualiza agregados.
- F08 P1: concorrência mantém totais consistentes.
- F09 P0: painel jamais retorna PII ou histórico.

### G. Privacidade, operação, acesso e UX (12)
- G01 P0: visitante não consulta dados de conta.
- G02 P0: visitante não consulta autorizações/eventos editoriais.
- G03 P0: apoio individual não é legível por API pública.
- G04 P0: revisão detecta e bloqueia dados pessoais indevidos.
- G05 P0: correção/exclusão aplicável tem procedimento executável.
- G06 P0: editor só recebe permissão explícita.
- G07 P0: é possível suspender submissão/apoios/publicação em incidente.
- G08 P1: fluxos principais usam teclado e funcionam no celular.
- G09 P1: mensagens de erro acessíveis, associadas a campos.
- G10 P1: URLs públicas corretas, sem dados privados.
- G11 P0: fixture não é exibida como atividade real em produção.
- G12 P0: recuperação operacional sem vazamento de segredos.

### H. Três regressões adicionadas para fechar 74 (3)
- H01 P0: scan de bundle, resposta HTTP, logs e configurações confirma que `SUPABASE_SECRET_KEY`/segredo HMAC **não** aparecem no navegador, no `NEXT_PUBLIC_`, em artefatos públicos ou no Git.
- H02 P0: usando clientes Supabase `anon` e `authenticated`, tentar diretamente SELECT/INSERT/UPDATE/DELETE nas nove tabelas e EXECUTE nas RPCs sensíveis; **acesso negado** e nenhum registro alterado.
- H03 P0: concorrer `registrar_apoio` com retirada/cancelamento/revogação editorial; após confirmação da retirada não pode haver novo apoio ativo contabilizável nem exposição de atividade retirada.

**TDD:** iniciar por testes de banco/permissão (H02, G01–G03), suporte (D01–D04, H03) e fluxo editorial (B04–B09). Em cada incremento, RED → GREEN → REFACTOR. Depois testes funcionais restantes. Não apagar testes para conseguir verde. Integração usando banco Supabase local + usuários artificiais reais de teste, não mocks de RLS. E2E com browser automatizado em ambiente local/previews protegidos. Além dos testes, execute `lint`, `typecheck`, suíte completa, build, análise de dependências e verificações de segurança suportadas pela CLI instalada. **Não declare 74/74 sem executar as 74 verificações; se um teste estiver manual/pendente, discriminar.**

## 7. DECISÕES DE SEGURANÇA D01–D07 (NÃO REGREDIR)

- **D01:** nunca `SELECT` público de `apoios` individuais; nenhum nome/contato pessoal de apoiador. Agregados via servidor.
- **D02:** nunca `INSERT` público irrestrito em apoios. Elegibilidade, idempotência, concorrência e limite de abuso são obrigatórios; sem rate limiter funcional, desabilitar apoio público.
- **D03:** admin não definido apenas por e-mail. Papel do banco confirmado em servidor em cada ação. Não usar `user_metadata` do JWT para autorização.
- **D04:** selos e indicadores derivados de registros elegíveis; não salvar `selo=true` como decisão independente.
- **D05:** não usar `ON DELETE CASCADE` como padrão para destruir atividades, autorizações ou histórico. Retenção/anonimização dependem de política e direitos aplicáveis; documentar antes da produção.
- **D06:** stack e licença não devem ser herdadas de PRDs antigos. Stack desta tarefa é referência aprovada; não escolher licença sem decisão humana.
- **D07:** não gerar adoção, investimentos, valores, números de organizações/parceiros ou prazos fictícios; dashboards mostram apenas fatos persistidos.

## 8. AMBIENTES, CONFIGURAÇÃO E DEPLOY — PREPARAR, NÃO PUBLICAR

### 8.1. Configuração

Criar `.env.example` sem segredos, com no mínimo:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUBSTITUIR
SUPABASE_SECRET_KEY=sb_secret_SOMENTE_SERVIDOR
APOIO_HMAC_SECRET=SEGREDO_ALEATORIO_SOMENTE_SERVIDOR
APP_ORIGIN=http://localhost:3000
# Variáveis de rate limiting: documentar conforme solução escolhida,
# sem presumir serviço gratuito, limites ou credenciais.
```

- Usar Supabase Auth para contas e cookie de sessão SSR, confirmação de e-mail, recuperação, configuração correta de URL de redirecionamento.
- `SUPABASE_SECRET_KEY` só no servidor, nunca `NEXT_PUBLIC_`. Não copiar .env para logs ou artefatos públicos. Nunca exibir valores ao usuário.
- Separar desenvolvimento, preview e produção; **preview não pode apontar para banco de produção**. Dados fictícios só no local/preview. Considerar proteção de preview contra exposição externa.
- Para suporte anônimo, usar cookie técnico pseudônimo com escopo e expiração limitados, aviso de privacidade e avaliação da base legal; não usar cookie publicitário nem rastreio de comportamento. Definir retenção antes de publicar com usuários reais.
- `APP_ORIGIN` confiável por ambiente, verificação de Origin/Host em mutações. Não aceitar `Origin` livre enviado pelo cliente como origem legítima.
- Erros e logs minimizados; não coletar IP persistente sem justificativa/documentação.

### 8.2. Desenvolvimento e validação (apenas ambiente autorizado)

1. Verificar versões instaladas de Node, gerenciador de pacotes, Next, SDK Supabase, CLI Supabase e Vercel. Consultar docs atuais antes de instalar ou executar comando.
2. Preparar Supabase local, migration gerada por CLI e `.env.local` ignorado no Git. Rodar SQL e verificar grants/índices/constraints/RLS com usuários artificiais.
3. Implementar incrementalmente a aplicação seguindo TDD. Rodar UI local e E2E.
4. Testar uma retirada/revogação enquanto apoios são enviados e confirmar resultado.
5. Preparar documentação de administração, incidentes, proteção de dados, restauração e bootstrap manual do editor. Não gerar admin com senha padrão ou baseada em e-mail hardcoded.
6. Executar auditorias disponíveis e apresentar resultados reais; confirmar se há segredos no build, RLS, vazamento em logs, CSP, CSRF, XSS, rate limit e dependências.

### 8.3. Preparação para Vercel + Supabase (sem deploy automático)

Documentar, sem executar remotamente:
- Criação ou conexão de projetos Vercel e Supabase exigirá autorização humana específica.
- Ambientes `Development`, `Preview`, `Production` devem ter variáveis e bancos separados; salvar segredo somente no ambiente correspondente.
- `Preview`: deploy de teste a partir de branch/PR autorizado, com controles de acesso e banco de testes; exige consentimento para push/deploy.
- `Production`: migração revisada com backup/rollback, deploy apenas de commit testado, validação antes de promover, smoke tests de cadastro/envio/publicação/apoio/painel, monitoramento de erros, procedimento de rollback e pessoa responsável disponível.
- Mudanças em segredos da Vercel requerem novo deploy para surtir efeito; não registrar segredo em prints, terminal compartilhado ou documentação.
- Não habilitar automaticamente integração de Git que faça publicar a cada push sem revisão humana.
- Custos, cotas e políticas de plano gratuito precisam ser verificados na data de contratação/uso; não prometer "custo zero" nem "deploy em três dias".

**Bloqueadores para soft launch com pessoas reais:** P0 falhando; P1 aplicável falhando sem exceção autorizada; acesso público a dados privados; emissão de selos não autorizada; rate limit inexistente; ausência de editor; falta de política e canal de correção; nenhuma autorização da primeira organização; indisponibilidade de retirada/rollback; backup/restore não testado. A existência de preview não constitui soft launch.

## 9. CHECKLIST FINAL E RELATÓRIO OBRIGATÓRIO DO CODEX

Entregar em português, ao final da execução local autorizada:

1. **Resumo de arquivos modificados**, migrados ou criados, com paths e motivo. Não afirmar que criou remoto se não criou.
2. **Comandos efetivamente executados** (sem segredos) e resultados: testes unitários, integração, RLS, E2E, lint, typecheck, build, auditoria de dependências e advisories, com totais reais.
3. **Matriz de testes 74/74** por ID; cada um `PASS`, `FAIL`, `SKIP` ou `NOT RUN`, com evidência. Não declarar sucesso de não executados.
4. **Análise das sete correções D01–D07**: onde estão implementadas e quais testes comprovam.
5. **Segurança:** confirmar quais dados são públicos, restritos e não coletados. Demonstrar negado direto Supabase `anon`/`authenticated` e que nenhum segredo foi empacotado no browser.
6. **Operação:** instruções locais, `.env.example`, migração/rollback preparados, processo de bootstrap editorial MANUAL, procedimento de suspensão e retirada.
7. **Pendências humanas:** autorização para banco remoto, GitHub, deploy, domínio, publicação, parceria, licença, aviso de privacidade, retenção e ingresso de segunda pessoa.
8. **Proposta de commits** Conventional Commits, sem Co-Authored-By e sem commit/push remotos sem autorização.
9. **Critério de parada:** ao finalizar implementação local e relatório, PARE. Não publicar na Vercel, não enviar convites, não cadastrar pessoas ou organizações reais, não executar SQL remoto, não fazer alterações externas sem aprovação explícita.

**Definição de pronto desta tarefa:** aplicação local demonstrável com fixtures fictícias, testes executados e rastreáveis, modelo seguro, workflow editorial e agregados corretos; **pronta para decisão de teste fechado**, não automaticamente pronta para produção.

## 10. FONTES TÉCNICAS QUE VOCÊ DEVE CONFERIR AO IMPLEMENTAR

- Supabase Changelog: https://supabase.com/changelog
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase migrations e CLI: https://supabase.com/docs/reference/cli/introduction
- Supabase SSR Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Next.js App Router: https://nextjs.org/docs/app
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Vercel Environments: https://vercel.com/docs/deployments/environments
- Vercel Deployments: https://vercel.com/docs/deployments

Se houver contradição entre um exemplo antigo e o comportamento/documentação atual, siga a documentação atual, mantenha os requisitos funcionais e os testes e descreva o ajuste. **Não mude silenciosamente escopo, semântica ou dados públicos.**

---

**INSTRUÇÃO FINAL AO CODEX:** Execute incrementalmente no escopo local autorizado, começando por inspecionar o projeto existente e escrever os testes. Não trate este prompt como permissão para operar serviços externos. Quando faltar autorização, pare e descreva exatamente o ato solicitado. Não prometa prazos ou funcionamento não testado.
