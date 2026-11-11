# Retomada local com Docker — 11/11/2026

Base: `7f1324b`. Escopo autorizado: concluir a integração e E2E do módulo de apoio/intenção quando o Docker voltou a funcionar. Nenhum acesso a produção, Cloud ou serviços de terceiros. Containers Huly não alterados. Stack Supabase mantido ligado ao encerrar.

## Isolamento e migration

- Listeners do macOS: API 56151, PostgreSQL 56152 e Mailpit 56154 em `127.0.0.1`. Três controles positivos e **36 sondagens negativas sem conexão aceita**, incluindo IPv6. Metadados Docker que anunciam `::` não corresponderam a listener acessível. Prova limitada a testes feitos do próprio Mac, sem outro dispositivo.
- SMTP aponta para `supabase_inbucket_a-praca-v1-5`, não para Resend ou outro SMTP externo.
- Histórico indicou somente `20261111222337_confirmacoes_apoio_intencao.sql` pendente.
- `supabase db push --dry-run --skip-vault --workdir …`: **exit 0**, confirmou alvo local `127.0.0.1:56152` e somente essa migration.
- `supabase db push --skip-vault --workdir …`: **exit 0**, migration aplicada. Sem seed, reset, mudança de Vault ou `--remote`.

Evidências: `preflight.json`, `migration-dry-run.log`, `migration-apply.log`.

## Confirmações: PostgreSQL real

Comando: `npm run test:onboarding:db -- tests/integration/participation.database.test.ts --bail=1 --reporter=json --outputFile=…`.

**Exit 0: 8 PASS / 0 FAIL / 0 SKIP.** Auth, clientes PostgREST e PostgreSQL reais locais, sem portas simuladas. Comprovados:

1. Cinco inserções concorrentes resultam em uma linha; trocar de intenção para apoio na mesma atividade também é bloqueado por UNIQUE.
2. Duas PF leem somente as próprias confirmações. Organizador não lê linhas/WhatsApp dos participantes e recebe apenas contadores; terceiro não recebe os contadores privados.
3. Autorização de nome começa privada. Resumo divulga somente nome autorizado, sem telefone nem tamanho do grupo.
4. Outro titular do mesmo perfil organizacional não lê o contato do autor, e a unicidade permanece por atividade/perfil.
5. `anon`/`authenticated` não executam RPC privilegiada nem inserem sujeito forjado.
6. Rascunho não recebe confirmação nem resumo público.
7. Cancelamento bloqueia novas confirmações; retirada oculta resumo.
8. Constraints recusam telefone/grupo inválidos e apoio com autorização de nome.

Evidências: `focused-result.json`, `focused-vitest.json`, `focused.log`.

## Regressão maior e interrupção

Primeiro comando: `npm run test:onboarding:db -- --bail=1 --reporter=json --outputFile=…`.

**Exit 1: 111 PASS / 1 FAIL / 6 SKIP**, execução parcial. Falha B12/P1 em `scheduling.database.test.ts:38`: `publicQuery.list()` deveria ser `[]`, mas havia uma publicação existente. A asserção falhou **antes** de criar o rascunho daquele teste. Não se conclui que rascunho vazou. Nenhuma publicação existente foi apagada para forçar um resultado verde. A matriz classifica B12 como P1.

A continuação omitiu apenas a repetição desse caso já registrado, por `--testNamePattern=^(?!.*B12 PostgreSQL: sem publicações elegíveis).*`, mantendo bail na primeira próxima falha. Não houve alteração de teste nem exclusão de arquivo.

**Exit 1: 224 PASS / 1 FAIL / 3 SKIP.** O novo bloqueio é:

```text
PF não ganha acesso editorial ou publicação automática
Arquivo: tests/integration/pf-activities.database.test.ts:62
Esperado: status 403 na consulta da atividade de outra PF
Observado: status 404 — Atividade não encontrada
```

O primeiro trecho desse teste (negar publicação com 403) passou; a falha ocorreu na leitura alheia seguinte. `src/lib/activities/service.server.ts:62–63` filtra atividade pelo sujeito e autor da sessão e devolve 404 quando não encontra no escopo. **A leitura foi negada; este resultado não demonstra vazamento de dados.** É uma divergência entre contrato esperado pelo teste e status atual. Como é um gate de acesso/isolamento P0 (A05/B01 na matriz), a rodada foi interrompida e reportada antes de qualquer correção ou E2E.

A união por `(arquivo, fullName)`, retendo falhas e sem somar repetições, contém **224 PASS / 2 FAIL / 2 SKIP**. Não é uma execução integral bem-sucedida. Os oito testes focados aparecem novamente na regressão e **não devem ser somados** aos totais.

Evidências: `integration-result.json`, `integration-vitest.json`, `integration-rest-result.json`, `integration-rest-vitest.json`, `integration-union.json`. Dumps de valores de registros locais nas falhas foram omitidos; preservados título, primeira linha do erro, localização e status. Credenciais também foram omitidas.

## E2E e demais verificações

**NOT RUN após a parada P0:** E2E focado/completo, build, lint, typecheck e advisors. Nenhum novo servidor Next foi iniciado. Resultados verdes do checkpoint anterior não foram reapresentados como testes desta execução.

Antes de a falha P0 ser observada, foi preparado `tests/e2e/participation.spec.mjs`, com quatro cenários para execução posterior: apoio PF com contadores de organizador; intenção privada/consentida com telefone privado; visitante/CSRF/identidade forjada/rascunho; concorrência HTTP/cancelamento. Usa login real, API e PostgreSQL locais, sem mocks, cria somente fixtures `example.invalid` e limpa os próprios registros. **Os cenários ainda não foram executados e não são resultados PASS.**

## Encerramento e próximos passos

`postflight.json` registra apenas leitura de encerramento: migration no histórico, RLS habilitado, **0 linhas em confirmacoes e 0 usuários de fixtures do novo módulo restantes**. Nenhuma mudança de código de produção, do teste P0 ou da migration foi necessária nesta execução. O stack iniciado pelo usuário não foi parado.

Próximo gate: revisar a expectativa 403 versus 404 e a premissa de base vazia do B12. Não ajustar status nem apagar dados sem essa decisão. Após a revisão, retomar integração e E2E reais. A aplicação da migration no Supabase Cloud permanece pendente e fora desta rodada local.
