# Incremento 3 — B07: publicação explícita de snapshot

Base: `7c8c80d478890cf1e350b6c397151ed3aa767f3e`. Execução local em 04/11/2026, exclusivamente em `~/projects/a-praca-v1-5`. Nenhum commit novo ou stage.

## Resultado e escopo

**B07 PASS no ambiente local; A07 revalidado e PASS contra publicação real.** Editor ou administrador ativo, confirmado por identidade Auth e conta no servidor, publica explicitamente uma atividade aprovada de organização validada. A publicação exige a autorização original da aprovação, compatível com atividade, escopo `divulgacao`, marcador `atividade:versao:N`, vigência e conteúdo revisado.

Snapshot, número da versão, timestamp, estado `publicada` e evento editorial persistem na mesma conexão/transação PostgreSQL existente. Não há chamadas HTTP tratadas como uma transação distribuída. Falha na auditoria reverte todos esses campos; publicação mantém `apoios_abertos=false`.

A interface editorial oferece ação explícita e continua separada das páginas públicas. `/api/atividades` e seus detalhes permanecem privados. Novos endpoints `/api/public/atividades` e `/api/public/atividades/[id]` retornam envelopes `atividades`/`atividade` com projeção permitida do snapshot; páginas `/atividades` e `/atividade/[id]` apresentam esse conteúdo, sem controles editoriais ou apoios. Nenhum deploy ou exposição externa foi realizado.

## Resultados efetivamente executados

| Camada | PASS | FAIL | SKIP | Evidência em operations/evidence/incremento-3-b07/ |
|---|---:|---:|---:|---|
| `npm test` | 262 | 0 | 0 | unit-regression.log; 21 arquivos |
| `npm run test:onboarding:db` | 152 | 0 | 0 | integration-final.log/json; 5 arquivos, PostgreSQL/Auth locais reais |
| `npm run test:e2e` | 27 | 0 | 0 | e2e.json; Chromium + Next/Supabase reais |
| `npm run lint` | exit 0 | — | — | lint-final.log |
| `npm run typecheck` | exit 0 | — | — | typecheck-final.log |
| `npm run build` | exit 0 | — | — | build-final.log |

262 = 223 anteriores + 39 novos; 152 = 128 anteriores + 24 novos; 27 = 19 anteriores + 8 novos. Os 39 novos compreendem 29 publicação, 7 consultas públicas, 2 interface e 1 vínculo de conteúdo na aprovação. Esses totais são de camadas distintas, não 74/74 cenários. Nenhuma integração obrigatória B07 ficou NOT RUN. B08–B12 permanecem NOT RUN.

A01–A09 e B01–B06 foram preservados nas regressões executadas. A08 mantém a ressalva de expiração por manipulação temporal controlada de fixtures, sem espera natural. A07 agora usa atividade aprovada real, payload válido e rota de publicação funcional: visitante 401, proprietário/organização alheia com metadata admin 403, papel forjado no payload 400, editor tentando publicar atividade de organização pendente 422. Há controle positivo de publicação por editor e administrador em casos B07 separados.

## RED → GREEN → REFACTOR

- Publicação: **27 FAIL** em `unit-red.log` → **27 PASS** em `unit-green.log`.
- Consultas públicas: **7 FAIL** em `public-queries-red.log` → **34 PASS** no conjunto publicação/consultas em `public-queries-green.log`.
- Interface: **2 FAIL** em `form-red.log` → **36 PASS** no conjunto com interface em `form-green.log`. Botão desabilitado no HTML até hidratação; duplo clique e retry usam o mesmo pedido.
- Vínculo exato com conteúdo aprovado: **3 FAIL / 60 PASS** em `approved-content-red.log` → **63 PASS** em `approved-content-green.log` (publicação + revisão). A regressão detectou aprovação sem impressão digital ou conteúdo divergente com mesmo número de versão.
- Refatoração: helper servidor de autorização compartilhado entre revisão e publicação, serializer público por lista branca e hash canônico separados do serviço privado. Autorização/regras existentes e transação reutilizadas, sem recriar o módulo de atividades.
- Integração específica B07: **24 PASS** na primeira execução contra o banco real, incluindo espera de lock/revogação, concorrência e rollback; não houve RED real de banco nesta etapa. O RED comportamental anterior foi de unidade/componentes e está identificado como simulado.
- E2E específico inicial: **1 PASS / 1 FAIL / 6 SKIP**, por seletor de alerta do teste procurar `form` quando o componente usa `section`. Segunda execução: **3 PASS / 1 FAIL / 4 SKIP**, por expectativa do teste sem o envelope JSON já usado pela rota. Corrigidos somente os testes, sem mudar produção para satisfazer esses erros. Terceira execução específica: **8 PASS / 0 FAIL / 0 SKIP**, seguida da execução completa de **27 PASS**. Resultados iniciais preservados em e2e-specific-first/second/green.json.

## Segurança e atomicidade comprovadas

- Conta/papel/situação são relidos no banco, sob lock, depois de Auth.getUser. Papel de e-mail, payload ou user_metadata não autoriza publicação; editor bloqueado com sessão existente é negado. Cadastro não cria editor/admin.
- Estado aprovado não basta: o evento de aprovação deve identificar a mesma versão, autorização e hash do conteúdo normalizado. A autorização não é escolhida pelo cliente e outra autorização válida não substitui uma original revogada/incompatível.
- Novas aprovações registram `conteudo_sha256` no JSON restrito do evento existente, sem coluna nova. Aprovações antigas sem esse hash falham fechadas na publicação (409). Não foram alterados eventos anteriores, feito backfill nem implementado fluxo de reaprovação.
- Snapshot permite somente ID/versão, título, descrição, data, acesso, link oficial, organização atribuída (ID/nome), programação e timestamp público. Leitura usa exclusivamente esses campos do snapshot. Motivo, comprovante, autorização, autor de evento, e-mail/contato e metadados privados não são retornados.
- Publicação audita autor, pedido, versão, evento da aprovação, autorização original e hash do snapshot em registro interno. Nenhum desses metadados de auditoria é projetado ao público.
- Locks de atividade, organização e autorização protegem a mutação. Seis pedidos concorrentes idênticos produzem um evento; pedidos distintos ou outro autor/versão conflitam. Retry revalida situação atual da conta, organização e autorização, sem republicar.
- Falha FK `23503` no INSERT de auditoria, injetada somente no adapter de teste, reverte estado/snapshot/número/data no PostgreSQL real. Não existe flag de falha pública.
- Revogação concorrente foi confirmada enquanto a publicação esperava lock; após COMMIT, publicação recusada e nenhum evento produzido. A leitura pública também verifica autorização original vigente e organização validada; autorização alternativa não recupera visibilidade.
- Testes de mutação direta somente nas fixtures demonstraram que colunas privadas divergentes não substituem o snapshot. Campos JSON extras são descartados; alteração de campo público conhecido invalida seu hash e oculta o objeto. Isso não implementa endpoint de edição posterior (B08).
- Respostas/páginas públicas dinâmicas usam no-store; rotas privadas continuam verificando sessão/tenant, sem cache público. Erros de consulta são indisponibilidade, não dados vazios fabricados. Há 404 para objeto inelegível.

O catálogo foi examinado em transação somente leitura pelo inspetor local: **9 tabelas**, colunas/constraints/índices, RLS e grants permanentes sem divergências; duas migrações iguais à base. `catalog.json` contém a evidência. Os testes legados de grants temporários usam rollback, sem alteração permanente. Não foi criada/aplicada migração, policy ou grant novo.

Comparação em memória de valores secretos locais conhecidos contra novos/modificados, `.next/static` e `public`: **nenhum achado**, conforme secret-values.json. HMAC de apoio não está configurado neste recorte. A inspeção não garante detectar segredos desconhecidos. HTML/API reais também foram verificados no Chromium para ausência de comprovante, contato/e-mail, autorização e nomes de campos privados. Tokens/senhas/cookies não são gravados nas observações.

## Evidências do navegador

`publication-observations.json`: 92 respostas de navegação/API e 18 console.error classificados como respostas HTTP negativas esperadas; **0 pageerror**. O conteúdo dos erros/corpos foi omitido. Observações das regressões Auth/atividades/revisão estão separadas no mesmo diretório. Sem trace, vídeo, screenshot ou storageState persistido nos testes novos.

Há uma errata explícita em `observations-errata.md`: a descrição histórica emitida pelo teste Auth A07 ainda citava rota inexistente/404, embora a asserção realmente executada já fosse 403 na rota real. A descrição no código foi corrigida; o registro bruto foi preservado. O aceite de A07 usa também os casos novos B07/A07 com atividade aprovada e a integração real, não a evidência histórica de 404.

## Operação e limites

Criação e limpeza de fixtures receberam autorização específica desta execução, inclusive regressões necessárias. Contas, organizações, atividades, autorizações e eventos fictícios foram removidos por UUIDs exclusivos próprios. Nenhum dado anterior, papel real ou autorização institucional real foi alterado. Mensagens fictícias das regressões podem permanecer no Mailpit local; não foram versionadas nem enviadas a destinatários externos.

Supabase já estava operacional e não foi reiniciado/reconfigurado. Next foi iniciado somente em `127.0.0.1:3215`; encerrado ao fim por SIGTERM apenas no supervisor desta execução, após conferir cwd e cadeia de processos. Porta 3215 livre ao final, conforme next-process.json. Não foi repetida auditoria global de Docker/rede nem feita nova prova por segundo dispositivo; mantêm-se as ressalvas da validação de isolamento anterior.

Limites funcionais: uma publicação por atividade, sem edição posterior, republicação, retirada, registro de realização, apoios, selos ou métricas. Revogação foi aplicada apenas a fixtures para testar leitura/retry; não há novo endpoint de retirada. Devolução/rejeição não ganharam edição/reenvio. Lista pública limitada às 100 publicações mais recentes de organizações validadas, filtradas por elegibilidade, sem paginação. Navegador testado: Chromium desktop headless, não novo aceite de Firefox/WebKit/mobile/leitor de tela. Legitimidade material de autorização continua dependendo de revisão humana.

## Comandos e arquivos

Comandos executados na raiz autorizada, com saída de CLI/credenciais capturada somente em memória e testes de banco sanitizados antes da gravação:

```sh
git status --short
git rev-parse HEAD
./node_modules/.bin/vitest run tests/activities/publication.test.ts
./node_modules/.bin/vitest run tests/activities/publication.test.ts tests/activities/public-queries.test.ts
./node_modules/.bin/vitest run tests/components/publish-form.test.tsx tests/activities/publication.test.ts tests/activities/public-queries.test.ts
./node_modules/.bin/vitest run tests/activities/publication.test.ts tests/activities/review.test.ts
npm test
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 ./node_modules/.bin/vitest run --config vitest.database.config.ts tests/integration/publication.database.test.ts
A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b07 node scripts/e2e-server.mjs
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b07 PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" ./node_modules/.bin/playwright test tests/e2e/publication.spec.mjs --project=chromium
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b07 npm run test:e2e
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db
npm run lint
npm run build
npm run typecheck
node operations/evidence/incremento-3-b07/inspect-preservation.mjs
node operations/evidence/incremento-3-b07/inspect-secrets.mjs
git diff --check
git diff --cached --name-only
```

Também foram usados `rg`, leituras de arquivos, wrappers Python/Node de captura e comandos lsof/ps restritos à porta 3215/cadeia própria, com SIGTERM validado. Uma tentativa inicial de acesso ao status local falhou pelo sandbox; repetição autorizada fora do sandbox funcionou, sem reiniciar infraestrutura. Não houve instalação, atualização de dependência, migração, push, deploy ou alteração global/remota.

Arquivos de produção: serviço/domínio existentes; helpers novos de publicação/consultas públicas; handler publicar, dois handlers públicos, formulário PublishForm e páginas de lista/detalhe público; fila editorial e dashboards com leitura do novo estado. Testes: novos publicação/consultas/UI/integração/E2E, regressão de hash de aprovação e A07 atualizado. Documentos: contratos, matriz, segurança, progresso, relatório, registro de comandos, inventário e evidências. Relação exata em `operations/arquivos-incremento-3-b07.txt`; estado Git em `operations/evidence/incremento-3-b07/git-status-final.txt`.

**Parada:** B07 concluído localmente. Sem stage/commit automático. B08–B12 não iniciados; aguardar nova decisão humana.

## Nota posterior — preparação do checkpoint B07

O inventário de 67 arquivos acima é histórico da implementação e inclui material bruto local. O stage posterior autorizado usa exclusivamente `operations/checkpoint-b07-files.txt`; logs/observações/processos foram ignorados sem exclusão, e resumos/hashes sanitizados foram preparados em `operations/evidence/checkpoint-b07/`. Ver `operations/checkpoint-b07.md`. Nenhuma suíte foi repetida nem código funcional modificado na preparação. Aguardar autorização de commit.
