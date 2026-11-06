# CUTOVER — histórico da falha B01

**Atualização:** o bloqueio de fixtures foi resolvido em rodada posterior autorizada. Ver [FIXTURE-REGRESSION.md](FIXTURE-REGRESSION.md): integração 206/206, E2E 41/41, critérios I3 20/20, qualidade exit 0 e migration registrada. O CUTOVER inclusivo completo continua pendente conforme os limites desse relatório. As seções abaixo preservam o estado observado antes da correção.

HEAD: `49102757ecfbe94356ddcb75250060648375c656`. Sem commit. **Pronto para commit: NÃO.**

Decisão humana registrada no plano: organizações continuam em v1; PF/coletivos usam v2. Dívida CONTRACT: planejar adoção de v2 para novas publicações organizacionais em I5 ou, no máximo, I6, sem reescrever snapshots v1 existentes.

## Evidências observadas

As saídas brutas dos comandos foram exibidas na conversa, com exit code de cada execução. Não foram executados testes adicionais depois da primeira falha de regressão; após a parada, somente registro do estado de Git e consultas SQL de estado.

### Antes do DDL

`git status --short`: exit 0, saída vazia. `git log -2 --oneline`: exit 0:

```text
4910275 merge: adotar sitrep como camada de estado automática do repo
987056d docs(sitrep): popular plano e status com estado real do A Praça + documentar uso
```

Consulta de information_schema: exit 0, organizacao_id com is_nullable `NO`. Constraints de contas_acesso listadas e suas definições consultadas; contas_acesso_papel_check admitia apenas organizacao/editor/administrador. Contagens anteriores: atividades 0, sem_sujeito 0, snapshots 0, sujeitos 0. Não há snapshots preexistentes preenchidos para comparar neste banco local.

Testes RED escritos antes do DDL:

- `npm test -- tests/activities/cutover-reader.test.ts`: exit 1; 5 failed, 6 passed, 11 no total. Parser v2/projeção ausentes e snapshot ambíguo não recusado.
- `A_PRACA_ALLOW_FIXTURE_CLEANUP=1 node --test tests/i4/cutover.pg.test.mjs`: primeira versão exit 1, 1 pass e 2 fail. Após acrescentar controle positivo PF, ainda antes de DDL: exit 1, 1 pass e 3 fail. organizacao_id era NO; conta publicador recusada pelo CHECK. Controle híbrido já era recusado pelo EXPAND.

Após implementação do leitor, ainda antes do DDL:

`npm test -- tests/activities/cutover-reader.test.ts`, exit 0:

```text
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

`npm test`, exit 0:

```text
 Test Files  35 passed (35)
      Tests  378 passed (378)
   Start at  00:07:08
   Duration  6.20s (environment 69%, tests 15%, import 13%, transform 2%, worker 1%)
```

`npm run typecheck`, exit 0, saída após o cabeçalho do comando vazia. Estes resultados não são prova da regressão completa após CUTOVER.

### DDL aplicado no Postgres local

Arquivo `supabase/migrations/20261106030921_i4_cutover.sql`. Executor `apply-local.mjs`: exit 0. O executor exibiu cada SQL exato e a consulta de confirmação após cada etapa, dentro da mesma transação. Registro detalhado em `migration-applied.json`, incluindo SQL, resultados e SHA-256 do arquivo.

```text
{"migration":"supabase/migrations/20261106030921_i4_cutover.sql","applied":true,"steps":6}
```

Mudanças: CHECK permite publicador, papel publicador exige organizacao_id nulo, organizacao_id nullable, função/trigger de coerência substituídos e sujeito_id/politica_publicacao obrigatórios. O trigger só resolve um mapeamento organizacional já existente; não cria sujeitos/organizações implicitamente. Nenhuma alteração em RLS/grants das tabelas.

**A migration permanece aplicada no banco local, mas não registrada no histórico do Supabase.** Consulta de `supabase_migrations.schema_migrations WHERE version='20261106030921'`, após a parada: exit 0, saída `[]`. Não reaplicar o arquivo sem considerar que os ALTERs já foram executados. Não há rollback DDL executado.

Após DDL, `A_PRACA_ALLOW_FIXTURE_CLEANUP=1 node --test tests/i4/cutover.pg.test.mjs`, exit 0:

```text
# SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='atividades' AND column_name='organizacao_id'
# [ { column_name: 'organizacao_id', is_nullable: 'YES' } ]
# Fixture híbrida: 23514 PF/coletivo não admite organizacao_id
# tests 4
# suites 0
# pass 4
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

Os quatro testes cobrem nullability, conta publicador sem organização, recusa de atividade híbrida e insert SQL de atividade PF. Não comprovam onboarding HTTP, publicação editorial ou UI inclusiva.

## Falha determinante — parada obrigatória

Comando:

```sh
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db -- tests/integration/activities.database.test.ts --bail=1
```

**Exit code: 1.** Saída bruta relevante:

```text
 ❯ tests/integration/activities.database.test.ts (11 tests | 1 failed) 2854ms
   × B01 real: rascunho tem proprietário do servidor e não tem snapshot/apoio público 36ms

 FAIL  tests/integration/activities.database.test.ts > B01 real: rascunho tem proprietário do servidor e não tem snapshot/apoio público
Error: Serviço indisponível. Tente novamente.
 ❯ unavailable src/lib/activities/service.server.ts:22:23
 ❯ run src/lib/activities/service.server.ts:37:153
 ❯ tests/integration/activities.database.test.ts:43:12

 Test Files  1 failed (1)
      Tests  1 failed (11)
   Start at  07:24:49
   Duration  3.42s (tests 90%, import 7%, transform 2%)
```

O serviço traduziu a falha para ActivityError 503. **A causa SQL interna desse caso não foi demonstrada pela saída do teste.** Hipótese a investigar em retomada: a fixture I3 usa criar_organizacao_pendente diretamente, enquanto o novo trigger exige mapeamento organizacional existente. Não foi alterada a fixture nem o serviço para esconder ou contornar essa falha.

## Estado e pendências após a parada

Consulta SQL de estado após limpeza da própria suíte: exit 0:

```json
[
  {"column_name":"organizacao_id","is_nullable":"YES"}
]
```

```json
[
  {"organizacoes":0,"contas":0,"atividades":0,"snapshots":0}
]
```

- Publicação real de organização v1 e PF v2 e comparação da saída pública: **NÃO VERIFICADO**.
- Renderização com evidências publicadas reais: **NÃO VERIFICADO**.
- Comparação de snapshots preexistentes preenchidos: **NÃO VERIFICADO**; a base consultada tinha zero snapshots.
- Backend/onboarding/curadoria inclusivos e recuperação inclusiva: **NÃO CONCLUÍDOS / NÃO VERIFICADOS**.
- Integração completa e regressão B01–C08 20/20 após CUTOVER: **NÃO VERIFICADO**; B01 falhou na primeira verificação.
- E2E após CUTOVER: **NÃO VERIFICADO**, nenhum servidor E2E iniciado nesta fase.
- Build/lint finais após CUTOVER: **NÃO VERIFICADO**.
- Registro da migration no histórico: pendente.

`git diff --stat`, exit 0:

```text
 docs/plans/I4-2026-11-05.md             |  8 ++++++++
 src/app/atividade/[id]/page.tsx         |  3 ++-
 src/app/atividades/page.tsx             |  3 ++-
 src/lib/activities/publication.ts       | 36 +++++++++++++++++++++++++++------
 src/lib/queries/public.server.ts        | 19 ++++++++++++-----
 tests/activities/public-queries.test.ts |  2 +-
 6 files changed, 57 insertions(+), 14 deletions(-)
```

O stat padrão não inclui arquivos untracked. Também presentes: migration CUTOVER, testes `cutover-reader.test.ts` e `cutover.pg.test.mjs`, e este diretório de evidências. Sem staging ou commit. Nenhum dado real utilizado.
