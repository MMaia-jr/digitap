# Incremento 3 — execução B10–B12/C01–C08

HEAD inicial: `1aa8f1ab1efeff2a915a8037f0367a53b4a5509f`.
Pré-condições: cwd confirmado, AGENTS.md lido, árvore limpa, B08–B09 no commit 61a948c e evidências anteriores conferidas. Fonte normativa: specs/A_Praca_Fase3_Prompt_Codex_v1_5.md, seção 6. Sem stage/commit nesta execução.

## B10 — em validação (sem aceite integral ainda)

Contrato: cancelar/adiar atualiza estado visível corretamente (P1). F02 exige fechamento imediato de apoios em cancelamento; F04 também exclui adiadas. Seção 3.3 distingue snapshot de conteúdo aprovado e estado atual da programação.

Implementação: POST /api/admin/atividades/[id]/programacao, editor/admin ativo confirmado no servidor; payload restrito a pedido_id, versao_esperada, estado_esperado, estado_programacao, motivo. Apenas programada → adiada/cancelada e adiada → cancelada. Sem reabertura ou alteração de data. Motivo 10–1500 caracteres sem HTML, seguindo a validação editorial existente. Atividade com publicação corrente, não retirada. Lock de atividade; versão e estado esperado; retries contextuais por autor/payload/chave; atualização e evento na transação existente. Snapshot/número/data de publicação não são modificados. Apoios fechados. Público valida hash/autorização do snapshot original antes de projetar estado atual. Motivo/histórico restritos não entram na projeção pública.

### TDD

- `npm test -- tests/activities/scheduling.test.ts`: RED inicial 2 FAIL, exit 1 (operação ausente). Versão ampliada do teste teve o mesmo RED antes da implementação. Logs privados /private/tmp/a-praca-b10-red.log e a-praca-b10-behavior-red.log.
- `npm test -- tests/activities/public-queries.test.ts`: RED 2 FAIL/7 PASS, exit 1; estado público permanecia programada. Log privado a-praca-b10-public-red.log.
- `npm test -- tests/components/schedule-form.test.tsx`: suíte RED por componente ausente, 0 testes executados, exit 1; não é contabilizado como falha comportamental. Log privado a-praca-b10-form-red.log.
- GREEN inicial serviço/consulta: 11 PASS, exit 0. Depois formulário: 12 PASS, exit 0.
- `npm test`: 302 PASS, 26 arquivos, exit 0; 283 anteriores + 19 novos. Log privado a-praca-b10-regression.log. Negativas incluem visitante, organização, papel desconhecido, versão/estado, retirada e payload privilegiado.
- `npm run build`: exit 0. Log privado a-praca-b10-build.log.
- `npm run lint`: exit 0 sem warnings finais; helpers copiados sem uso removidos após avisos iniciais.
- `npm run typecheck`: exit 0.
- `git diff --check`: exit 0.
- `A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db -- tests/integration/scheduling.database.test.ts`: 5 PASS, exit 0. PostgreSQL/Auth reais, concorrência/retries, histórico, projeção pública, negativas e rollback FK 23503. Log privado a-praca-b10-db.log. Primeira tentativa bloqueada pelo sandbox na telemetria da CLI (5 SKIP/erro de setup), repetida fora do sandbox e aprovada. Sem RED real de banco anterior à implementação; RED comportamental foi unitário.

Autorização de fixtures específica desta execução recebida do usuário por resposta à pergunta de autorização. Listeners observados em 127.0.0.1:56151/56152/56154. Não equivale a auditoria completa de rede. Sem reinício Supabase. Teardown da integração passou.

## Demais cenários

B11, B12, C01, C02, C03, C04, C05, C06, C07, C08: NOT RUN. Nenhum novo aceite na matriz. Não iniciar C antes de completar grupo B.

## Preservação

Nenhuma alteração em migrations, RLS/grants, schema ou documentos protegidos. Modelo exclusivamente atividades.organizacao_id. Integridade do catálogo ainda não reinspecionada nesta execução; não confundir ausência de alteração em arquivos com inspeção de banco real. Regressão PostgreSQL/Chromium completa ainda pendente. Não há declaração de conclusão do I3.

## Fechamento do grupo B

B10, B11, B12: PASS local. Integração completa 170 PASS/7 arquivos (163 anteriores + 7 novos), exit 0. Chromium completo 34 PASS (30 anteriores + 4 novos), 0 FAIL/SKIP, exit 0, e2e.json. npm test final 312 PASS/27 arquivos (283 anteriores + 29 novos), exit 0. Build final, lint final sem warnings e typecheck final exit 0. Inspeção somente leitura do catálogo: nove tabelas, nenhum achado; catalog.json e inspect-preservation.mjs. RLS/grants/migrations preservados. Não equivale à conclusão de C01–C08/I3.

B11 (comportamento existente): testes em tests/components/public-safety.test.tsx, tests/integration/scheduling.database.test.ts e tests/e2e/scheduling.spec.mjs. Sem RED artificial nem alteração de produção de segurança. Primeira execução unitária teve erro no próprio uso de vi.hoisted (0 casos), corrigido antes de verificar os 6 PASS iniciais. Primeiro Chromium B11 contou SVG do indicador de desenvolvimento fora de main: 1 FAIL, sem execução de payload; seletor corrigido para conteúdo da aplicação, Chromium subsequente PASS. b11-e2e-initial.json preserva a falha, sem confundi-la com vulnerabilidade.

B12 (comportamento existente): teste público de vazio/indisponibilidade em public-safety.test.tsx; consultas existentes em public-queries.test.ts; PostgreSQL real com rascunho excluído e listagem vazia antes das publicações desta suíte. Chromium retira somente publicações fictícias próprias e mantém rascunho privado; API retorna [], página mostra mensagem de vazio e nenhum link inventado. Sem RED artificial ou mudança de produção neste cenário.

B10: primeiro Chromium 1 PASS/1 FAIL por não esperar a conclusão da mutação antes de navegar no visitante. Teste passou após esperar resposta POST e navegação, sem mudar produção. b10-e2e-initial.json. Teste adicional de clique em botão do formulário passou; typecheck detectou opção exact inválida de Testing Library no próprio teste, removida. Na revisão foi encontrado estado ausente na UI da listagem: teste B10 adicional em public-safety.test.tsx teve 1 FAIL/8 PASS (a-praca-b10-list-red.log), implementação exibiu estado, depois 9 PASS. Regressão completa Chromium terminou após essa correção e passou; testes específicos de UI/lista e build também passaram.

Logs brutos fora do Git: /private/tmp/a-praca-group-b-unit-final.log, a-praca-group-b-db.log, a-praca-group-b-e2e-full.log, a-praca-group-b-build-final.log. Logs de servidor e observações dentro do diretório de evidências estão ignorados. Nenhuma senha/token/cookie é copiada para esta rastreabilidade.

## C01–C04 — implementação privada e validação

Fonte: seção 6 da especificação normativa, complementada por Registro/evidência/autorização e pelas nove tabelas existentes. Contrato operacional acrescentado a specs/contratos-api.md antes de cada operação nova. Organização deriva do servidor e do vínculo atividades.organizacao_id; registros/evidências não recebem organizacao_id do cliente. Nenhuma tabela nova.

- C01: createRecord/getRecord, POST/GET /api/atividades/[id]/registro, RecordForm e detalhe privado. Data efetiva real de calendário, não futura em America/Sao_Paulo. Relato factual/origem textuais; uma linha por atividade; privado rascunho; snapshot nulo. Versão da atividade/lock, conta ativa, isolamento e idempotência contextual. Criação e evento registro_criado transacionais. RED /private/tmp/a-praca-c01-red.log: 1 FAIL (operação ausente), depois 1 PASS. Ampliação: datas/calendário/fuso e payloads. Componente ausente causou erro de import (0 testes), não contabilizado como RED comportamental. PostgreSQL inicial: 4 PASS, C01 Chromium específico: 1 PASS após corrigir seletor de alert do Next para alert do formulário. c01-e2e-initial.json preserva essa falha de teste.
- C02: default declarado existente após a implementação C01, sem escolha de apuração/estado/snapshot pelo cliente. Sem RED artificial. Testes adicionais em records.test.ts e records.database.test.ts comprovam estado declarado/rascunho, snapshot nulo, payload corroborado rejeitado. Chromium C02–C04 confere declaração e estado após referência. Registro não equivale a evidência nem reputação.
- C03: addEvidence e POST /api/atividades/[id]/registro/evidencias. Afirmação sustentada delimitada, tipo/URL/data de consulta; referência não aprovada por default; nenhuma atualização de apuração/editorial/snapshot. Evidência e evento evidencia_referenciada na mesma transação, lock de atividade, retries contextuais por autor/chave/payload. RED /private/tmp/a-praca-c03-behavior-red.log: 1 FAIL/10 PASS antes da implementação; GREEN 11 PASS. Teste de componente começou com import ausente (0 casos). PostgreSQL cobre seis retries, afirmação preservada, apuração declarada, isolamento e rollback FK 23503. EvidenceForm explicita privacidade e limite da fonte. Leitura privada apresenta afirmação, sem incorporação de mídia.
- C04: referências locais/impróprias, URL com e-mail/token/identificador, credenciais/protocolos e contatos/identificadores detectáveis são recusados antes da persistência. RED /private/tmp/a-praca-c04-red.log: 5 FAIL/11 PASS; GREEN 16 PASS. Data de consulta inexistente e ano zero foram encontrados na revisão: /private/tmp/a-praca-record-calendar-red.log 2 FAIL/16 PASS, corrigidos, depois 18 PASS. Não se consulta URL, baixa mídia ou infere adequação material da página; análise humana permanece necessária antes de eventual aprovação/publicação. Referências ficam privadas e aprovada_publicacao=false. Não há publicação de registros no recorte C01–C04.

Arquivos de testes: tests/activities/records.test.ts (18 casos), tests/components/record-form.test.tsx (1), tests/components/evidence-form.test.tsx (1), tests/integration/records.database.test.ts (8), tests/e2e/records.spec.mjs (2 fluxos, sendo um combinado C02–C04).

Falha de implementação corrigida: a normalização de DATE na projeção SQL foi aplicada indevidamente à lista de colunas do INSERT. Chromium capturou 503 em dois fluxos antes da correção (c01-c04-sql-regression.json). Correção restrita ao INSERT; casts permanecem somente nas projeções de saída. Integração completa posterior: 178 PASS/8 arquivos, exit 0. Sem alteração de schema. Logs privados: a-praca-final-db.log e a-praca-c01-c04-db.log.

Regressão unitária: execução concorrente com outras verificações teve 331 PASS/1 FAIL no teste histórico B09 de foco de alerta; arquivo sem alterações passou isolado (3 PASS) e a suíte completa repetida, sem alterações e sem outras verificações simultâneas, passou 332/332. Logs privados a-praca-final-unit.log (falha), a-praca-b09-focus-recheck.log e a-praca-final-unit-recheck.log (PASS). Não se enfraqueceu nem removeu o teste. Ocorrência registrada como risco de sincronização intermitente do teste. Lint final sem warnings e typecheck exit 0.

C05, C06, C07 e C08: NOT RUN. Eventos de criação/referência não constituem aceite de todas as transições editoriais de C07. Revogação/publicação de registros/contestação não foram implementadas por este checkpoint. I3 não concluído.

## Checkpoint final desta sessão

C01–C04 PASS local; matriz atualizada somente nas linhas desses quatro IDs, além das três linhas B10–B12 já registradas. 74 IDs originais e ordem preservados. Contratos históricos não foram reescritos; contratos de implementação deste recorte foram acrescentados ao arquivo de API.

Execuções finais após correções: npm test 332 PASS/30 arquivos, 0 FAIL/SKIP, exit 0; integração PostgreSQL 178 PASS/8 arquivos, 0 FAIL/SKIP, exit 0; Chromium completo 36 PASS, 0 FAIL/SKIP, exit 0 em e2e.json. São quantidades de testes/fluxos, não 11 cenários aceitos. Sete IDs aceitos neste checkpoint; C05–C08 NOT RUN. Build/lint/typecheck e inspeções finais detalhados em quality-final.json.

Servidor Next iniciado exclusivamente em 127.0.0.1:3215 foi identificado pela cadeia supervisor 15904 → next dev 15909 → next-server 15910, cwd conferido no repositório; SIGTERM enviado somente ao supervisor próprio após os E2E. Supabase não reiniciado. Fixtures próprias limpas nos teardowns. Sem exclusão de dados alheios. Não houve stage/commit/push/deploy.

Pendências para retomada: C05 autorização distinta para registro posterior; C06 fluxo de revogação e suspensão da publicação abrangida; C07 cobertura integral das transições editoriais; C08 contestação e preservação da divergência. Não inferir esses aceites a partir dos eventos de criação/referência ou da revalidação de autorização das atividades existente. Pronto para revisão humana do fechamento integral B10–C08: NÃO. Checkpoint permanece no working tree.

## Esclarecimento B09 — três execuções e sincronização de foco

A pedido do usuário, withdraw-form.test.tsx foi executado três vezes consecutivas antes de qualquer ajuste: todas com 3 PASS/exit 0. Sem delay explícito, timer de aplicação, fake timers ou mock de relógio. Não identificada dependência de ordem: cleanup/unstubAllGlobals em afterEach e restoreMocks configurado. O mock de fetch é específico de cada caso; o teste de retry controla manualmente uma Promise, sem relógio.

Identificada corrida entre presença do alerta (findByRole) e foco posterior aplicado em useEffect. Asserção de foco passou a usar waitFor, preservando exatamente a condição exigida, sem delay fixo e sem alterar produção. Três repetições posteriores: 3 PASS/exit 0 em cada. Na regressão completa surgiu a mesma falha em review-form.test.tsx: esperado alerta com foco, recebido body (331 PASS/1 FAIL). Após corrigir a mesma sincronização somente nesse teste, regressão completa 332 PASS/exit 0, lint/typecheck exit 0. Evidências e hashes dos logs privados: b09-stability.json. Não se atribui exclusivamente ao ambiente, e execuções finitas não provam ausência universal de flakiness. Nenhum commit/stage.
