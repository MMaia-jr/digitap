# Incremento 3 — B01–B04

04/11/2026. Diretório exclusivo ~/projects/a-praca-v1-5. Base 954299ece3c831003a221efc37adc9ba304ded2b. Sem commit novo.

## Resultado funcional

Organização autenticada cria, consulta, edita e envia atividades privadas. O tenant e a conta autora são derivados no servidor. Outros tenants recebem 404 e visitantes 401/redirect. Editor/admin ativo explicitamente autorizado pode ler um detalhe interno conhecido; não edita nem envia. Conta bloqueada/organização suspensa são negadas para operações da organização.

Rascunho → enviada é a única transição nova. Enviada permanece privada. Nenhum snapshot, aprovação, publicação, registro de realização, apoio, selo, parceiro ou indicador foi implementado. /atividade/[id] permanece ausente e /api/atividades é API privada com no-store.

## Testes finais executados

| Camada | PASS | FAIL | SKIP | Evidência |
|---|---:|---:|---:|---|
| Unidade/componentes: npm test | 183 | 0 | 0 | unit-final.log/json, 16 arquivos |
| Integração real: npm run test:onboarding:db | 100 | 0 | 0 | integration-final.log/json, 3 arquivos |
| Chromium/Next reais: npm run test:e2e | 13 | 0 | 0 | e2e.json: 9 Auth + 4 B01–B04 |
| Lint | exit 0 | — | — | lint-final.log/json, sem warnings finais |
| Typecheck | exit 0 | — | — | typecheck-final.log |
| Build | exit 0 | — | — | build-final.log |
| Dependência runtime: npm ls pg --omit=dev | exit 0 | — | — | runtime-dependency-final.log |

São contagens de suítes, não alegação de aceite dos 74 cenários. A07 permanece PENDENTE no aceite integral; A08 preserva manipulação temporal controlada. B05–B12 continuam fora do recorte e NOT RUN.

## B01–B04 por camada

- **B01 PASS:** testes de domínio/serviço com ports simulados (não RLS real), integração no banco e navegador com dois tenants. Editor foi autorizado por alteração explícita apenas da fixture já autenticada e acessou a URL interna; isso não implementa login/editorial novo. Dono edita, outro tenant não lê/edita, visitante não lê. Edição exige versão e conflito retorna 409. HTML, metadata e API públicos não expõem rascunho.
- **B02 PASS:** servidor valida campos mínimos; payload incompleto não cria atividade, envio sem versão é 422. A tabela já exige campos completos no INSERT: formulário incompleto não é persistido. Alterações não salvas na tela bloqueiam o botão de envio da versão anterior. Conteúdo persistido é revalidado antes do envio.
- **B03 PASS:** calendário e offsets estritos, início futuro, URL http/https sem credenciais/whitespace interno e limites, texto sem HTML inclusive sem fechamento. DTO server usa ISO; datetime-local é convertido explicitamente com Intl/America/Sao_Paulo. E2E com timezone Asia/Tokyo comprovou persistência no instante correto do Brasil. Não se consulta URL externa.
- **B04 PASS:** envio legítimo, evento com autor/estado anterior/novo, retry idempotente e atividade ainda privada. Seis envios concorrentes no banco geraram um evento; quatro retries via API real não duplicaram. Duas edições concorrentes da mesma versão produzem um sucesso e um 409.

## RED → GREEN → refatoração

1. Teste escrito antes do código: coleta RED por módulos ausentes (unit-red.log), sem alegação de testes executados nessa coleta.
2. Exports mínimos permitiram RED comportamental: **22 FAIL + 27 PASS**, 49 casos (unit-red-behavior.log).
3. Implementação mínima de domínio/serviço: **49 PASS** (unit-green.log).
4. Proteção de UI para conteúdo alterado e não salvo: **1 FAIL + 2 PASS** antes da correção (form-red.log); flag dirty bloqueia envio; domínio+componente **52 PASS** (refactor-green.log).
5. Revisão de entradas adicionou duas regressões: HTML sem fechamento e URL com quebra de linha. **2 FAIL + 49 PASS** (input-regressions-red.log) → **51 PASS** no domínio/serviço (input-regressions-green.log).
6. Integração real específica **11 PASS** (integration-first.log); E2E específico **4 PASS** na primeira execução, depois suíte completa final **13 PASS**. Esses checks reais foram verificação após o RED unitário; não se alega uma execução RED de banco/E2E que não ocorreu.
7. Suítes finais: 183 unitários/componentes = 129 preservados + 51 domínio/serviço + 3 componentes. Integração 100 = 89 preservados + 11 novos.

## Transação e fronteira privilegiada

Não havia helper genérico de transação; pg já estava instalado e a proposta autorizada previa seu uso. Criado database.server.ts server-only, pool pequeno e conexão restrita a PostgreSQL local 127.0.0.1:56152/postgres, sem query params capazes de mudar host. SUPABASE_DB_URL fica só no ambiente do processo; .env.example contém placeholder. Mesma versão pg 8.23.1 movida de devDependencies para dependencies, com ajuste do grafo existente no lockfile, sem download/instalação.

Cada operação verifica Auth.getUser; dentro da transação relê e bloqueia conta/organização, aplica authorize e filtra o objeto pelo tenant autorizado. Edição/envio bloqueiam a linha de atividade FOR UPDATE. Versão privada versao_submetida incrementa no PATCH; envio preserva a versão. Retry de enviada com mesma versão retorna o resultado existente; nenhuma atualização de snapshot/apoios é permitida pelo payload.

BEGIN, UPDATE de envio, INSERT do evento e COMMIT usam o mesmo PoolClient. O teste de falha altera apenas os parâmetros do INSERT da auditoria, no adapter do teste, para usar autor inexistente. PostgreSQL retorna **23503** e o helper executa ROLLBACK: atividade continua rascunho e evento não existe. Não há flag de falha exposta por HTTP, transação entre chamadas PostgREST ou nova RPC/migração.

Fonte conferida: https://node-postgres.com/features/transactions . Aplicadas orientações da skill supabase-postgres-best-practices para transações curtas, mesma conexão e locks. Revisão TSX guiada pela skill vercel:react-best-practices; eventos, foco, labels e hidratação preservados.

## Segurança, fixtures e limites

- Nenhum grant/RLS permanente alterado; ambas as migrações idênticas ao checkpoint. A suíte legada de segurança inclui teste de GRANT SELECT **dentro de transação revertida**, sem concessão persistente; não confundir isso com nova permissão da aplicação.
- Todas as nove tabelas foram verificadas com RLS/grants fechados, além das tentativas reais anon/authenticated de REST dos 85 testes preservados.
- Sem alteração no código de autenticação de produção. O teste Auth A07 foi adaptado: POST /api/atividades com ID forjado agora retorna 400; rota de publicação continua 404. Isso mantém A07 PENDENTE.
- Nenhuma nova instalação, start/stop/configuração Docker, migração remota/local, push, deploy ou commit. CLI status e lsof usados apenas para leitura; os três listeners Supabase observados continuam 127.0.0.1. Não é nova prova completa de LAN/IPv6: ressalvas históricas de metadados :: e ausência de segundo dispositivo permanecem.
- Execução/limpeza de fixtures autorizada separadamente pelo usuário. Exclusões somente por UUIDs de Auth/contas criados nesta execução e atividades/eventos desses autores. Nenhum dado anterior foi removido; mensagens das regressões Auth podem permanecer no Mailpit local.
- Zero pageerror no Chromium. Console: 9 erros HTTP negativos no recorte de atividades e 13 na regressão Auth; categorias e pathnames sem query em activities-observations.json/auth-observations.json. Nenhum trace, vídeo, screenshot ou cookie/storageState persistido.
- Comparação segura em memória: **0 ocorrências** de valores conhecidos secretos em 61 arquivos então disponíveis, incluindo bundle público .next/static e novos/modificados. HMAC não configurado; apoio fora do escopo. Ver secret-values.json.
- Body JSON permanece limitado a 8192 bytes; campos seguem limites documentados e mensagens acessíveis. Listagem privada limitada às 100 atividades próprias mais recentes; paginação está fora deste recorte.
- Navegador testado: Chromium desktop headless, sem aceite de mobile/WebKit/Firefox/leitor de tela nesta etapa. Operação remota/produção não configurada nem autorizada.

## Comandos reproduzíveis (sem credenciais)

Executados na raiz autorizada; credenciais lidas em memória pela CLI local e nunca passadas como literal no terminal:

```sh
./node_modules/.bin/vitest run tests/activities/activities.test.ts
./node_modules/.bin/vitest run tests/components/activity-form.test.tsx tests/activities/activities.test.ts
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 ./node_modules/.bin/vitest run --config vitest.database.config.ts tests/integration/activities.database.test.ts
A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b01-b04 node scripts/e2e-server.mjs
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b01-b04 PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" ./node_modules/.bin/playwright test tests/e2e/activities.spec.mjs --project=chromium
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b01-b04 npm run test:e2e
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db
npm test
npm run lint
npm run build
npm run typecheck
npm ls pg --omit=dev
git diff --check
git status --short
```

Outputs npm/vitest capturados por subprocess, segredos redigidos antes de gravação. Logs novos foram normalizados apenas em espaços finais/CR/linhas vazias finais, sem alterar resultados (evidence-format.json). Next foi encerrado por SIGTERM somente no supervisor deste projeto, após verificar cadeia de processos e cwd; porta 3215 ficou sem listener. Supabase preservado.

## Arquivos e parada

A lista exata de novos/modificados fica em operations/arquivos-incremento-3-b01-b04.txt e git-status-final.txt. O conjunto previsto de 21 arquivos foi acrescido de três ajustes justificados antes de fazê-los: teste de componente para alterações não salvas, destino do reporter E2E e adaptação da regressão Auth à nova rota privada. Relatório e evidências são adicionais. next-env.d.ts foi regenerado pelo Next dev/build, sem diff final.

Nenhum arquivo de migração, configuração global Docker ou código de B05–B12 foi criado/alterado. B01–B04 concluídos no ambiente local. Não iniciar o próximo recorte, não fazer commit automaticamente e não publicar. Aguardar decisão humana.
