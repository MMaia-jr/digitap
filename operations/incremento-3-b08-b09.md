# Incremento 3 — B08 e B09

Base: `c015cdeffbe06512a34a4fc9b1242a43834c3adb`. Execução exclusivamente local em `~/projects/a-praca-v1-5`. Nenhum stage ou commit novo.

## Resultado

**B08 PASS local:** organização proprietária edita atividade publicada; incrementa versão privada e mantém snapshot público anterior. Envio/revisão/devolução/rejeição da pendência não modificam esse snapshot. Aprovação editorial com autorização e hash da nova versão substitui o snapshot público na mesma transação da aprovação e auditoria. Primeira publicação continua explícita, conforme B07.

**B09 PASS local:** editor/admin ativo retira publicação corrente, inclusive durante uma revisão pendente. Estado retirada, apoios_abertos=false e evento com autor/data/motivo são persistidos na mesma transação. Lista/detalhe/API públicos deixam de expor a atividade; motivo permanece restrito ao dono e equipe editorial. Edição/envio/publicação de retirada e retries conflitantes não a reativam.

## Resultados executados

| Camada | PASS | FAIL | SKIP | Evidência em operations/evidence/incremento-3-b08-b09/ |
|---|---:|---:|---:|---|
| npm test | 283 | 0 | 0 | unit-final.log; 24 arquivos |
| npm run test:onboarding:db | 163 | 0 | 0 | integration-final.log/json; 6 arquivos, PostgreSQL/Auth reais |
| npm run test:e2e | 30 | 0 | 0 | e2e.json, Chromium + Next/Supabase reais |
| npm run build | exit 0 | — | — | build-final.log |
| npm run lint | exit 0 | — | — | lint-final.log, sem warnings finais |
| npm run typecheck | exit 0 | — | — | typecheck-final.log |

283 = 262 anteriores + 21 novos (6 serviço, 12 validação, 3 componente). 163 = 152 anteriores + 11 novos. 30 = 27 anteriores + 3 novos. Totais de camadas distintas não equivalem a 74/74. A01–A09/B01–B07 preservados nas regressões; A08 conserva sua ressalva temporal controlada. B10–B12/C01–C08 e I4/I5 não foram iniciados.

## RED, GREEN e correções de teste

- Antes de alterar produção: unidade **2 FAIL** (unit-red.log), integração real **2 FAIL** (integration-red.log), Chromium **2 FAIL/0 SKIP** (e2e-red.json), uma falha por cenário. Edição publicada era rejeitada com 409; retirada não existia. No Chromium, esperas de ação de 90 s nos controles de título/motivo ausentes comprovaram a ausência da interface, não uma falha de instalação do browser.
- Implementação mínima e reaproveitamento/refatoração do publicador: unidade inicial **2 PASS** (unit-green.log), integração ampliada **11 PASS** (integration-green-initial.log), Chromium ampliado **3 PASS** (e2e-green-specific.json).
- Regressão de acessibilidade da retirada foi escrita antes da correção: form-red.log contém **1 PASS/2 FAIL**. Uma falha era a falta de aria-invalid/associação do erro ao motivo; a outra era import incorreto de act no próprio teste. Após corrigir produção, tentativa intermediária teve **20 PASS/1 FAIL**, ainda pelo import do teste (form-and-unit-green-initial.log). Corrigido somente o import para Testing Library; a execução final npm test passou todos os 283 casos, incluindo os três componentes novos.
- Lint inicial teve dois avisos de variáveis de teste ainda não usadas; helper passou a ser exercitado pelo terceiro E2E e uma variável redundante foi removida. Lint final sem avisos.
- Duas assertivas históricas de B07 exigiam edição publicada bloqueada/ausente. Foram ajustadas estritamente ao novo contrato explícito B08: teste real preserva a igualdade do snapshot anterior após criar pendência; teste Chromium verifica formulário de edição privada e ausência de envio antes de salvar. Não foram apagados testes nem alterados IDs/prioridades da matriz.
- Helper publishApproved concentra as mesmas verificações para primeira publicação e substituição aprovada; publicationRecord agora seleciona o evento correspondente ao número publicado. Regressões completas foram executadas depois dessa refatoração e das correções, sem duplicar implementação de autenticação ou criar outro módulo de atividades.

## Transações, segurança e snapshots

O modelo segue exclusivamente atividades.organizacao_id. Auth.getUser e conta ativa/papel do banco continuam sendo a fronteira confiável. Organização do cliente, user_metadata e papel do payload não autorizam operações. Edição usa somente o tenant derivado no servidor; editor/admin não edita como organização. Visitante, outro tenant, editor bloqueado e payload privilegiado foram exercitados.

Edição usa lock da atividade, versão esperada e a transação pg existente. Incrementa versao_submetida e muda a revisão privada para rascunho, sem UPDATE no snapshot publicado. A versão anterior é arquivada no evento restrito atividade_edicao_iniciada antes de qualquer futura substituição; novas publicações guardam snapshot completo no evento atividade_publicada. Assim também é preservado o primeiro snapshot B07, cujo evento antigo continha apenas o hash. Eventos anteriores não são modificados pela aplicação.

A consulta pública não depende do estado da revisão pendente: exige snapshot existente, organização validada, estado diferente de retirada dentro dos estados permitidos e autorização original da versão efetivamente publicada. Seleciona seu evento por numero_versao_publicada, compara hash e projeta somente a lista permitida. Não usa título/descrição/data pendentes. Rascunho sem snapshot continua oculto. HTML, metadados, lista e API foram conferidos no Chromium com marcador fictício de pendência.

A aprovação inicial sem publicação mantém o comportamento B05/B07. Quando há snapshot anterior, a aprovação de nova versão chama o mesmo publicador dentro da transação já aberta: valida organização, autorização nova com atividade/escopo/versão, hash do conteúdo aprovado e integridade do snapshot anterior; grava aprovação, snapshot/número/timestamp/estado e evento de publicação. Falha em auditoria reverte tudo. Autorização da versão antiga não aprova uma nova versão. Aprovações antigas sem hash continuam recusadas, sem backfill automático.

Retirada recebe apenas pedido_id, versao_esperada e motivo de 10–1500 caracteres, sem HTML. Lock serializa retirada/edição/aprovação; transição e evento usam o mesmo client/BEGIN/COMMIT/ROLLBACK. Não requer autorização ainda vigente para permitir ocultação. Motivo é projetado somente após autorização privada; não se retorna evento bruto ou comprovante. O snapshot fica retido no histórico restrito, mas estado retirada nunca entra na consulta pública. Headers no-store e rotas privadas são preservados.

Provas reais adicionais: duas edições concorrentes com mesma versão têm um sucesso e um 409; seis aprovações concorrentes da revisão e seis retiradas idênticas geram um efeito/evento cada; reuso por outro autor/chave/payload conflita. Falha FK 23503 no INSERT de auditoria foi injetada somente no adapter de testes para edição, publicação da revisão e retirada; snapshot anterior permaneceu público e estados foram revertidos. Retirada durante revisão impede aprovação subsequente e republicação.

## Privacidade e preservação

Nove tabelas, colunas/constraints/índices, RLS, grants permanentes e as duas migrações foram conferidos pelo inspetor somente leitura contra a base; nenhum achado em catalog.json. Nenhuma migração/policy/grant novo, entidade publicadora ou dependência foi criada. Testes legados de privilégios temporários terminam em rollback, sem alteração permanente.

Comparação de valores secretos conhecidos em memória com arquivos novos/modificados versionáveis e bundle .next/static/public registrada em secret-values.json; valores nunca são impressos. Isso não garante detectar todo segredo desconhecido. Logs, observações de requisição/console, processos, intermediários e resultados brutos permanecem locais/ignorados, sem stage. Binários/caches/perfis de browser e .env privados continuam ignorados. Os resumos versionáveis contêm resultados/hashes, sem senhas, tokens, cookies ou corpos sensíveis.

Criação/limpeza de fixtures recebeu autorização específica B08–B09, incluindo regressões: contas, organizações, atividades, autorizações e eventos, apenas UUIDs exclusivos próprios. Nenhum dado anterior ou papel institucional real foi modificado. As fixtures foram limpas no teardown; mensagens fictícias das regressões Auth podem permanecer no Mailpit local, sem envio externo.

Chromium B08–B09 observou 60 respostas de navegação/API, 10 console.error classificados como negativas HTTP esperadas e 0 pageerror. Observações sanitizadas locais em revisions-observations.json, sem trace/vídeo/screenshot/storageState.

Supabase já operacional foi preservado, sem reinício ou configuração global. Antes das fixtures, listeners das portas conhecidas 56151/56152/56154 foram conferidos em 127.0.0.1 (listeners.json); isso não substitui nova auditoria completa Docker ou prova por outro dispositivo. Next foi iniciado só em 127.0.0.1:3215 e encerrado somente pelo supervisor desta execução após verificar cwd/cadeia de processos. Porta 3215 livre ao final. Não houve push, deploy, migração remota ou alteração de outro projeto.

## Limitações e parada

- **B09 está completo no recorte normativo de retirada + ocultação + fechamento de apoios + auditoria + republicação bloqueada.** Reabertura após retirada não integra esse aceite: será um fluxo/cenário adicional posterior, com contrato, testes e autorização humana próprios e exigência de nova aprovação. **Não é B10**: B10 permanece exclusivamente adiar/cancelar atividade e refletir corretamente o estado público. Nenhum ID dos 74 cenários foi reinterpretado. Até existir o fluxo posterior, a atividade retirada permanece bloqueada, inclusive por retries antigos.
- Edição/reenvio de devolvida/rejeitada não foram ampliados. Edição usa as validações de conteúdo/data futura anteriores.
- Apoios não foram implementados; foi comprovado apenas fechamento da flag existente, forçada a true somente em fixture para testar retirada.
- Navegador: Chromium desktop headless. Não há novo aceite de mobile/Firefox/WebKit/leitor de tela. A08 preserva timestamps controlados apenas nas fixtures.
- Legitimidade institucional da autorização continua exigindo revisão humana; não é provada pelo hash técnico.

Sem bloqueio impeditivo encontrado para revisão do recorte local. **Pronto para revisão de commit: SIM.** Nenhum stage/commit foi feito; aguardar “ok commit”. Isso não conclui I3: B10–B12 e C01–C08 permanecem NOT RUN.

## Comandos e arquivos

Executados na raiz autorizada, com captura/sanitização antes de gravar saídas de banco:

```sh
git log -3 --oneline
git status --short
./node_modules/.bin/vitest run tests/activities/revisions.test.ts
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 ./node_modules/.bin/vitest run --config vitest.database.config.ts tests/integration/revisions.database.test.ts
A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b08-b09 node scripts/e2e-server.mjs
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b08-b09 PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" ./node_modules/.bin/playwright test tests/e2e/revisions.spec.mjs --project=chromium
./node_modules/.bin/vitest run tests/components/withdraw-form.test.tsx
./node_modules/.bin/vitest run tests/components/withdraw-form.test.tsx tests/activities/revisions.test.ts tests/activities/withdrawal-validation.test.ts
npm test
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b08-b09 npm run test:e2e
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db
npm run build
npm run lint
npm run typecheck
node operations/evidence/incremento-3-b08-b09/inspect-preservation.mjs
node operations/evidence/incremento-3-b08-b09/inspect-secrets.mjs
git diff --check
```

Também usados rg/leituras, wrappers Python para capturar resultados/segredos somente em memória, lsof das portas próprias e ps/lsof restritos à cadeia do supervisor próprio antes de SIGTERM. Nenhuma instalação executada. Arquivos exatos em operations/arquivos-incremento-3-b08-b09.txt; status final local em operations/evidence/incremento-3-b08-b09/git-status-final.txt. Rastreabilidade em traceability.json e resultados/resumos/hashes em quality-final.json.

## Esclarecimentos antes da autorização de commit

A inspeção solicitada confirmou 16 arquivos tracked modificados, 16 arquivos novos não ignorados e stage vazio. O status padrão agrupa os diretórios novos, portanto não corresponde a uma linha por arquivo; a listagem expandida `git ls-files --others --exclude-standard` conta 16. A saída com apenas dois novos arquivos não foi reproduzida. O .gitignore preserva localmente os brutos/intermediários deste recorte, com sete exceções explícitas para resumos/scripts; não ignora código ou testes novos e não oculta mudanças em arquivos já tracked.

`git diff tests/activities/publication.test.ts` é vazio: os testes unitários B07 não foram modificados. Em `tests/integration/publication.database.test.ts`, o nome do caso deixa de exigir ausência da funcionalidade de edição; as negativas 404 de rascunho/enviada/aprovada sem publicação são mantidas. A antiga expectativa de 409 na edição publicada é substituída por estado rascunho/versão 2 e igualdade integral do objeto público antes/depois (`toEqual(before)`). Isso amplia o comportamento autorizado por B08 e conserva a verificação de que a versão pendente não se torna pública. O teste usa a projeção pública; a proibição de UPDATE no snapshot é verificada também no novo teste unitário B08, e o fluxo completo até aprovação é coberto na nova integração e no Chromium.

As duas expectativas históricas mencionadas no relatório são de integração e de E2E (`tests/e2e/publication.spec.mjs`), não do arquivo unitário B07. No E2E, as assertivas de HTML/API iguais ao snapshot e sem marcadores privados foram preservadas; apenas a ausência de formulário foi ampliada para presença da edição privada e ausência de envio antes de salvar.

Nesta rodada de esclarecimento só este relatório foi editado; nenhum código/teste, stage ou commit foi alterado. As suítes não foram repetidas por não haver mudança funcional.
