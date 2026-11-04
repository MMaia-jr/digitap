# Incremento 3 — B05–B06

Base 012394d02fd27ce0ca847cb77e521e8acdbece22. Diretório exclusivo ~/projects/a-praca-v1-5. Nenhum commit novo.

## Resultado

Reutilizado o módulo de atividades: edição/rascunho/envio preservados; nova revisão editorial privada. Editor/admin ativo relido no banco pode iniciar revisão (enviada → em_revisao), aprovar (em_revisao → aprovada), devolver ou rejeitar (enviada/em_revisao → devolvida/rejeitada). Organização não recebe essas permissões por payload ou user_metadata.

Aprovação exige autorização existente e compatível com objeto atividade, ID, escopo divulgacao e marcador explícito **atividade:versao:N**, vigência e versão corrente. Registros ausentes, revogados, expirados, futuros ou incompatíveis falham. Papel autorizante/comprovação vazios também falham. O text[] existente guarda essa restrição de versão; sem nova coluna/migração. Registros genéricos antigos não aprovam implicitamente qualquer versão. Não há tela/rota que crie autorização institucional ou conceda papel editorial.

Devolução/rejeição exigem motivo 10–1500 caracteres de texto sem HTML. Somente proprietário e editor/admin autorizados consultam o motivo pelo detalhe privado; terceiros/visitantes não o recebem. Dados brutos de autorização, comprovante e metadata do evento não são retornados ao dono.

Aprovada/devolvida/rejeitada continuam privadas. Nenhum snapshot, publicação, apoio, selo ou portal público foi implementado. Organização pendente não é validada automaticamente pela aprovação interna.

## Resultados executados

| Camada | PASS | FAIL | SKIP | Evidência |
|---|---:|---:|---:|---|
| npm test | 223 | 0 | 0 | unit-final.log/json, 18 arquivos |
| npm run test:onboarding:db | 128 | 0 | 0 | integration-final.log/json, 4 arquivos reais |
| npm run test:e2e (Chromium + Next reais) | 19 | 0 | 0 | e2e.json: 13 preservados + 6 novos |
| lint | exit 0 | — | — | lint-final.log/json |
| typecheck | exit 0 | — | — | typecheck-final.log |
| build | exit 0 | — | — | build-final.log |

223 = 183 preservados + 33 revisão + 4 Auth + 3 UI. Integração 128 = 100 preservados + 28 novos. Contagens separadas não equivalem a 74/74; A07 permanece PENDENTE e A08 mantém ressalva temporal.

## RED/GREEN e refatoração

- Testes de revisão e login escritos antes da implementação: **33 FAIL / 39 PASS** (unit-red.log) → **72 PASS** (unit-green.log). Nenhum módulo de atividades foi recriado.
- Formulário editorial: **3 FAIL** em scaffold vazio (form-red.log) → **75 PASS** no conjunto domínio/Auth/UI (unit-form-green.log).
- Retorno do editor à fila após decisão: **1 FAIL / 31 PASS** (editor-navigation-red.log) → **32 PASS** (editor-navigation-green.log).
- Retry de aprovação com autorização revogada: **1 FAIL / 32 PASS** (retry-authorization-red.log) → **33 PASS** (retry-authorization-green.log). Extraído helper único de consulta/lock de autorização, reutilizado em primeira decisão e retry; sem consulta HTTP como transação.
- Integração inicial: **26 PASS / 1 FAIL** (integration-first.log). O monitor de locks reutilizava snapshot de estatísticas na própria transação, impedindo comprovação da espera. Corrigido somente o teste com pg_stat_clear_snapshot() da sessão: **27 PASS** (integration-green.log). Não houve alteração de configuração/counters globais ou da lógica de aprovação por causa dessa falha. Depois foi acrescentada a regressão real de retry revogado, totalizando 28 novos na suíte final.
- Typecheck inicial após integração encontrou referência de tipo a uma propriedade dinâmica do helper de teste; corrigida usando a variável motivo já tipada. Arquivo typecheck-integration.log preserva a falha, typecheck-final.log comprova sucesso.
- E2E específico: **6 PASS** (e2e-specific-first.json); regressões completas finais **19 PASS**.

Fonte sobre snapshots de observação do teste: https://www.postgresql.org/docs/17/monitoring-stats.html . pg_stat_clear_snapshot descarta o snapshot local da transação, sem resetar estatísticas do servidor.

## Segurança, atomicidade e concorrência

Auth.getUser verifica identidade antes da transação; conta ativa/papel são relidos sob lock no servidor. Revisão exige modo editorial estrito, sem fallback para proprietário. Não há e-mail textual ou user_metadata definindo privilégios. Login editorial antes recusado foi liberado somente para editor/admin ativo confirmado no banco, com RED/GREEN; redireciona à fila privada /admin/atividades. Proxy SSR cobre /admin/*; respostas privadas no-store. Cadastro e onboarding continuam sem promoção de papel.

Mesma conexão pg e BEGIN/COMMIT/ROLLBACK para transição + evento. Lock da atividade serializa decisões; autorização é lida com FOR SHARE e filtros de validade no relógio PostgreSQL. O teste de revogação concorrente comprovou que a aprovação esperava lock; após COMMIT da revogação recebeu 422 e a atividade ficou em_revisao.

Evento registra autor, estado anterior/novo e metadata JSON textual na coluna já existente justificativa_restrita (tipo revisao.v1, pedido_id, versão, estado esperado, ação, motivo e autorizacao_id). Somente o motivo é projetado para o dono. pedido_id é contextual à atividade; mesmos autor/payload/versão são reconhecidos sem novo evento, mas autorização de aprovação é revalidada inclusive no retry. Payload ou autor diferente com mesma chave dá 409. Versão/estado desatualizados conflitam.

Provas reais: seis aprovações concorrentes com mesma chave geram um evento; decisões diferentes concorrentes têm um sucesso e um conflito; rollback FK SQLSTATE 23503 comprovado nas quatro ações (iniciar/aprovar/devolver/rejeitar). A falha é injetada somente no adapter do teste, alterando autor para UUID inexistente no INSERT de auditoria; UPDATE e evento são revertidos no PostgreSQL real. Nenhuma flag de falha foi exposta pela API.

Nove tabelas, RLS, grants permanentes e migrações permanecem como na base. catalog.json foi produzido pelo inspetor reutilizado do checkpoint, com alvo/base/output deste recorte, em transação somente leitura; compara colunas, constraints/índices e permissões e terminou sem divergências. O teste legado de GRANT SELECT é revertido em transação, sem permissão persistente. Nenhuma migração foi criada/aplicada.

## Cobertura por camada

- **B05 PASS:** unitários de comandos/permissões/versão/autorizações/idempotência; 28 integrações de revisão incluindo negativas de vigência/escopo/objeto/versão e atomicidade; E2E com login real de editor e administrador antes de revisar, não cookies editoriais injetados.
- **B06 PASS:** motivo obrigatório, devolução/rejeição, dono lê na UI/Next API e outro tenant 404 sem motivo; visitante 401/rota pública 404; JSON interno/provas/UUID de autorização não vazam na projeção ao dono.
- Falsificações: payload com papel rejeitado, contas reais de teste criadas com user_metadata admin mas papel organizacao continuam negadas, editor bloqueado com sessão existente perde acesso.
- Chromium observou 54 respostas de navegação/API no conjunto específico e 0 pageerror; 13 console.error classificados como respostas HTTP negativas esperadas. Console/logs omitiram corpos, cookies, senhas, tokens e queries. Evidências em review-observations.json.

## Limitações do recorte

- Aprovação é interna; não cria snapshot ou página pública e não valida automaticamente a organização/representação institucional. A07 só poderá ser integralmente validado quando existir publicação.
- Revogação posterior não inventa um fluxo de retirada ou reavaliação automática do estado já aprovado. Porém novas aprovações e retries com autorização agora inválida falham; não há conteúdo público ou apoio a suspender neste recorte.
- Devolvida/rejeitada ficam disponíveis para consulta com motivo; edição/reenvio dessas versões não foi implementado.
- Autorização precisa usar o marcador de versão documentado. Sua legitimidade material depende de exame humano restrito; texto de comprovante não se torna prova institucional automática. Nenhuma autorização/papel institucional real foi criado.
- Vigência testada com timestamps passados/futuros nos registros fictícios e relógio real do banco; sem espera natural de horas. Browser: Chromium desktop headless, sem novo aceite de mobile/WebKit/Firefox/leitor de tela.
- Fila editorial limitada às 100 atividades enviadas/em_revisao mais antigas; sem paginação ou painel de métricas. Fora do escopo: B07–B12, portal, publicação, registro de realização, apoio e selos.

## Operação, arquivos e comandos

Criação e limpeza de fixtures receberam **autorização específica neste recorte** (contas/organizações/atividades/autorizações/eventos e regressões). Somente UUIDs próprios da execução foram removidos. Dados anteriores não foram alterados; mensagens das regressões Auth podem permanecer no Mailpit. Sem envio externo, convites ou uso de organizações reais.

Comandos executados na raiz autorizada (segredos obtidos só em memória):

```sh
./node_modules/.bin/vitest run tests/activities/review.test.ts tests/auth/flow.test.ts
./node_modules/.bin/vitest run tests/components/review-form.test.tsx tests/activities/review.test.ts tests/auth/flow.test.ts
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 ./node_modules/.bin/vitest run --config vitest.database.config.ts tests/integration/review.database.test.ts
A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b05-b06 node scripts/e2e-server.mjs
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b05-b06 PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" ./node_modules/.bin/playwright test tests/e2e/review.spec.mjs --project=chromium
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-3-b05-b06 npm run test:e2e
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db
npm test
npm run lint
npm run build
npm run typecheck
node operations/evidence/incremento-3-b05-b06/inspect-preservation.mjs
git diff --check
git status --short
```

As execuções de integração foram capturadas/sanitizadas por subprocess antes da gravação. Logs novos normalizados só em whitespace de apresentação (evidence-format.json), preservando conteúdo significativo/resultados. Ver quality-final.json para códigos e totais. Inspeção de segredos cobriu novos/modificados e bundle público .next/static sem imprimir valores; resultado em secret-values.json, sem garantia de detectar todo segredo desconhecido.

Arquivos: domínio/serviço existentes, login e destino editorial, proxy SSR, detalhe/dashboard privados; novos ReviewForm, fila e handler revisar; novos testes review em unidade/componente/integração/E2E; contratos/matriz/progresso, este relatório e evidências. Lista exata em operations/arquivos-incremento-3-b05-b06.txt; git-status-final.txt registra estado.

Nenhuma dependência instalada/atualizada, recurso Docker iniciado/parado/reconfigurado ou infraestrutura global/remota alterada. Listeners Supabase observados em 127.0.0.1 antes dos testes; não é nova prova completa de rede, e as ressalvas históricas de metadados :: e ausência de segundo dispositivo permanecem. Next iniciado apenas em 127.0.0.1:3215 e encerrado por SIGTERM só no supervisor deste projeto, após conferir cadeia de processos e cwd. Porta 3215 sem listener ao final; Supabase preservado.

Sem stage/commit automático, push, deploy, migração ou publicação. B05–B06 encerrados localmente; parar antes do próximo recorte e aguardar decisão humana.

## Nota de versionamento do checkpoint

Por instrução do checkpoint, logs brutos e observações de requisições desta execução foram mantidos somente locais/ignorados. O stage usa o manifesto operations/checkpoint-b05-b06-files.txt e inclui resumos sanitizados com hashes dos logs em operations/evidence/checkpoint-b05-b06/evidence-review.json; não confundir o inventário histórico de 58 arquivos com o conjunto versionável. Nenhum log ou dado foi apagado.
