# I4 COMPAT — histórico das rodadas interrompidas

**Estado atual: concluído, pronto para revisão humana de commit, sem commit. Ver [FINAL.md](FINAL.md) para os resultados finais e o catálogo atualizado.** As seções abaixo preservam os bloqueios anteriores, já resolvidos por autorizações posteriores.

## Estado atual após autorização dos grants

HEAD permanece `0f27cba283262dff633fb2236dc695d8e7495131`. Nenhum commit. **Pronto para commit: NÃO.**

Antes da edição, catálogo conferido em `grants-preflight.json`: seis tabelas novas existentes, RLS habilitado e zero policies; dez funções i4_* criadas no EXPAND; todas as nove legadas já tinham SELECT/INSERT/UPDATE/DELETE para service_role.

Adicionados à migration COMPAT somente dois blocos GRANT: SELECT/INSERT/UPDATE/DELETE nas seis tabelas novas e EXECUTE nas dez funções reais do EXPAND (`i4_escopos_validos(text[])`, `i4_sujeito_identidade()`, `i4_subtipo_completo()`, `i4_atividade_sujeito()`, `i4_vinculo_identidade()`, `i4_vinculo_integridade()`, `i4_pf_identidade()`, `i4_coletivo_curadoria()`, `i4_atestacao_integridade()`, `i4_caso_integridade()`). Nove destas funções retornam trigger; a avaliação direta do CHECK depende de EXECUTE em i4_escopos_validos.

Aplicados somente os blocos novos via pg no Postgres local, pois o wrapper já estava instalado. Após a aplicação, registrada a migration em `supabase_migrations.schema_migrations`: version `20261106014443`, name `i4_compat`, statements contendo o SQL integral do arquivo. `grants-applied.json` registra o hash SHA-256 do arquivo; `grants-after.json` confirma correspondência exata entre arquivo e histórico.

Verificação pós-grants em `grants-after.json`: seis tabelas com os quatro privilégios para service_role, dez funções com EXECUTE; anon/authenticated continuam sem privilégios; RLS habilitado e zero policies; nove legadas inalteradas.

Executados na sequência:

| Etapa | Resultado | Evidência |
|---|---|---|
| CMP-01 específico, executando como service_role | PASS 1/1, zero SKIP, exit 0 | green-service-role.log |
| Dez testes PG COMPAT | PASS 10/10, zero SKIP, exit 0 | green-pg-final.log |
| npm test, incluindo gateway atualizado | FAIL: 366 PASS, 1 FAIL; 33 arquivos PASS e 1 FAIL; exit 1 | unit-final.log |
| Integração completa / E2E COMPAT / E2E completo | NOT RUN nesta retomada: parada após a falha acima | — |
| build / lint / typecheck | NOT RUN nesta retomada: parada após a falha acima | — |

**Erro exato que determinou a parada:** `tests/components/auth-form.test.tsx:21:35`, cenário `componentes simulados de autenticação > erros do servidor são associados ao campo e recebem foco`:

```text
AssertionError: expected <body><div>…(1)</div></body> to be <div tabindex="-1" …(2)></div> // Object.is equality
expect(document.activeElement).toBe(alert);
```

O elemento ativo recebido foi body, em vez do alerta esperado. Nenhuma alteração em componente/teste para contornar o erro; nenhum retry; não foi inferida causa ou flakiness. Parada conforme instrução humana “Se algum passo falhar: PARE e reporte o erro exato”.

CMP-01–06, CMP-11, CMP-12 e as duas provas PG adicionais estão GREEN. Gateway passou dentro da suíte unitária. CMP-07/CMP-08 ainda aguardam GREEN E2E; CMP-09/CMP-10 e B01–C08 **20/20 não confirmados nesta execução**.

Após a parada, somente coleta de estado/preservação e atualização deste relatório: `preservation-result.json` mantém preserved=true; definição da função legada, ACL/RLS/policies das nove tabelas e fingerprints legados iguais à base. Banco local continua vazio após rollback das fixtures. A prova preenchida de snapshots/eventos em CMP-12 passou no conjunto 10/10. Diff de `organization_onboarding.sql` e `scripts/i4-backfill.mjs` permanece zero; `git diff --check` passou. Nenhum servidor foi iniciado nesta retomada; o da rodada anterior estava encerrado.

Status da árvore ao parar:

```text
 M src/lib/auth/gateway.server.ts
 M tests/auth/gateway.test.ts
 M tests/e2e/auth.spec.mjs
?? operations/evidence/incremento-i4-compat/
?? supabase/migrations/20261106014443_i4_compat.sql
?? tests/e2e/i4-compat.spec.mjs
?? tests/i4/compat.pg.test.mjs
```

## Histórico da rodada anterior — bloqueio de privilégios já resolvido

HEAD: `0f27cba283262dff633fb2236dc695d8e7495131`. Preflight: árvore limpa; últimos commits `0f27cba` BACKFILL e `27e81fc` EXPAND; conexão PG local `OK`.

Pronto para revisão humana de commit: **NÃO**. Nenhum commit, CUTOVER, backfill global ou acesso a dados reais. O banco local tinha zero registros nas nove tabelas legadas antes e depois. Fixtures fictícias removidas/rollback. Servidor E2E encerrado pelo supervisor próprio (SIGINT no PID 41862).

## Bloqueio e estado do banco

Após RED, criada e aplicada **somente no PG local 127.0.0.1:56152/postgres** a migration `20261106014443_i4_compat.sql`, via conexão `pg`. A função permanece instalada. **Histórico de migrations ainda não registrado**: fase interrompida antes do fechamento/verificação completa.

Primeira rodada pós-implementação: 9/10 PASS em `green-pg.log`. CMP-01 executa realmente como `service_role` e falha com SQLSTATE `42501`, `permission denied for table sujeitos_publicadores`. Consulta de catálogo confirmou ausência de SELECT/INSERT nessa tabela e ausência de EXECUTE em `public.i4_escopos_validos(text[])` para `service_role`.

O wrapper é SECURITY INVOKER: EXECUTE nele não concede privilégios nas relações/funções chamadas. Para prosseguir é necessário definir/aplicar os privilégios mínimos nas **tabelas novas** sujeitos/vínculos e na função de validação, examinar as dependências dos triggers e repetir a prova como service_role. Não foi usado SECURITY DEFINER nem foram alterados grants de tabelas para contornar a falha. Interrompido conforme instrução humana “Se algo bloquear: PARE e reporte, não improvise”.

Risco atual: a rota já aponta para o wrapper, mas o backend service_role não consegue completá-lo; **não liberar nem commitar este estado**. A transação desfaz a criação legada em caso de falha, evitando organização órfã.

## Wrapper e rota

Assinatura: `public.criar_organizacao_com_sujeito(p_auth_user_id uuid,p_nome_publico text,p_canal_publico text) returns uuid`. SECURITY INVOKER; search_path vazio; EXECUTE revogado de PUBLIC/anon/authenticated e concedido a service_role. Chama a RPC legada intacta, reutilizando seu advisory lock por identidade; cria sujeito e vínculo na mesma transação. Sem captura de exceções. Retry usa nome persistido, preserva IDs/estado/vínculos anteriores; não reabre vínculo revogado. `ativada_em` preenchida para cumprir o CHECK de vínculo ativo.

`src/app/api/organizacoes/route.ts` é um delegador e não contém chamada RPC. Permanece byte a byte intacta. A alteração funcional está no gateway chamado por essa rota, `src/lib/auth/gateway.server.ts:25`:

```diff
-      const {data,error}=await admin().rpc('criar_organizacao_pendente',{p_auth_user_id:userId,p_nome_publico:name,p_canal_publico:channel??null});
+      const {data,error}=await admin().rpc('criar_organizacao_com_sujeito',{p_auth_user_id:userId,p_nome_publico:name,p_canal_publico:channel??null});
```

Payload, resposta e tratamento de erros preservados no código. `tests/auth/gateway.test.ts` atualizado primeiro para exigir a RPC nova (RED comprovado). `tests/e2e/auth.spec.mjs` recebeu apenas remoção das dependências das próprias fixtures na limpeza, sem alterar assertivas de aceitação.

## Catálogo de testes

Pré-condição comum PG: Postgres local com EXPAND/BACKFILL e autorização de fixtures; usuário UUID fictício criado em transação com rollback no finally. PG = integração SQL real; E2E = Chromium/Next/Auth/PostgREST/SQL reais. Os testes PG estão em `tests/i4/compat.pg.test.mjs`; o E2E em `tests/e2e/i4-compat.spec.mjs`.

| ID | Pré-condição específica | Ação | Resultado esperado | Arquivo / tipo | RED / pós-implementação |
|---|---|---|---|---|---|
| CMP-01 | Sem conta para a identidade; SET ROLE service_role | Chamar wrapper e verificar constraints | Organização, conta, sujeito e vínculo corretos | compat.pg.test.mjs / PG | RED 42883 → FAIL 42501 (bloqueio) |
| CMP-02 | Nome NFD aceito pelo legado, recusado por CHECK NFC do sujeito | Chamar sob savepoint, recuperar erro e consultar | 23514; organização/conta ausentes | compat.pg.test.mjs / PG | RED 42883 → PASS como postgres |
| CMP-03 | Primeiro cadastro completo | Repetir com mesmo auth_user_id e outro nome | Mesmo ID/estado/timestamps; nenhuma duplicação | compat.pg.test.mjs / PG | RED 42883 → PASS como postgres |
| CMP-04 | Duas identidades fictícias | Criar duas organizações; consultar par conta/sujeito | Bijeção sem vínculo cruzado | compat.pg.test.mjs / PG | RED 42883 → PASS como postgres |
| CMP-05 | Cadastro completo | Consultar escopos do vínculo | Cinco escopos na ordem contratada | compat.pg.test.mjs / PG | RED 42883 → PASS como postgres |
| CMP-06 | Identidade sem conta | Chamar diretamente função legada | Cria org/conta e permanece sem sujeito | compat.pg.test.mjs / PG | PASS de controle antes e depois |
| CMP-07 | Sessão confirmada, sem conta | POST /api/organizacoes e retry | 200 e objeto message/next exatamente iguais ao legado | i4-compat.spec.mjs / E2E | Resposta inicial passou no RED; teste combinado falhou em CMP-08; GREEN NOT RUN |
| CMP-08 | Mesmo POST | Query de sujeito/vínculo/conta e escopos | Uma associação correta; retry não duplica | i4-compat.spec.mjs / E2E | RED: 0 linhas na consulta; GREEN NOT RUN |
| CMP-09 | Stack local e fixtures I3 | Regressão B01–B04 | 4/4 PASS | tests/e2e/activities.spec.mjs e regressão existente / PG+E2E | NOT RUN após bloqueio |
| CMP-10 | Stack local e fixtures I3 completas | Executar suíte B01–B12/C01–C08 | 20/20 IDs PASS | tests/integration/*.test.ts, tests/e2e/*.spec.mjs / PG+E2E | NOT RUN após bloqueio |
| CMP-11 | Organização criada diretamente pela RPC legada | backfillBatch apenas no ID fictício, retry, wrapper | Um sujeito/vínculo; backfill e wrapper preservam IDs/estado | compat.pg.test.mjs / PG | RED na chamada final do wrapper → PASS como postgres |
| CMP-12 | Fixture com atividade/snapshot, registro/snapshot, evidência, autorização, apoio e evento | Fingerprint das tabelas antes/depois do wrapper | Hashes/contagens de conteúdo iguais | compat.pg.test.mjs / PG | RED 42883 → PASS como postgres |

Provas adicionais PG: falha injetada no INSERT final do vínculo também faz rollback de sujeito/conta/org (RED → PASS como postgres); SECURITY INVOKER/search_path e negativas de EXECUTE anon/authenticated (RED → PASS). Nenhum PASS como postgres substitui o teste positivo obrigatório como service_role.

Comando RED PG: `A_PRACA_ALLOW_FIXTURE_CLEANUP=1 node --test tests/i4/compat.pg.test.mjs` (exit 1; 1 PASS, 9 FAIL esperados). `red-pg.log` contém o erro 42883 da ausência do wrapper; as assertivas que esperam 23514 falham recebendo 42883, e o teste de catálogo falha por ausência da função. Controle legado permanece PASS.

RED gateway: `npm test -- tests/auth/gateway.test.ts` (exit 1; 5 PASS, 1 FAIL pela RPC antiga). RED E2E: `A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-i4-compat npm run test:e2e -- tests/e2e/i4-compat.spec.mjs` (exit 1; 0 PASS, 1 FAIL, zero SKIP). Registro do runner em `red-e2e.json`; linha 30 do teste é a assertiva de existência da associação.

Pós-implementação PG: mesmo comando, `green-pg.log` (nome de rodada, **não significa gate GREEN**): exit 1; 9 PASS, 1 FAIL, zero SKIP.

## Preservação e limites

`before.json` / `after.json` / `preservation-result.json`: fingerprints legados, RLS/ACL/policies das nove tabelas e hash da definição SQL legada idênticos; preserved=true. Base local vazia, portanto essa comparação externa sozinha não prova preservação de conteúdo publicado. CMP-12 usa dados preenchidos e compara todas as colunas das sete tabelas de conteúdo antes/depois, incluindo JSON de snapshots e eventuais campos de hash. Fixture revertida integralmente.

Diff zero em `git diff HEAD -- supabase/migrations/20261103230507_organization_onboarding.sql scripts/i4-backfill.mjs`. Também vazio o comando solicitado `git diff HEAD^ HEAD -- supabase/migrations/20261103230507_organization_onboarding.sql`. Nenhuma mudança em CHECK legado, atividades.organizacao_id, RLS/grants das nove tabelas, leitores públicos, snapshots ou serviços de publicação. `git diff --check` passou.

Regressões obrigatórias `npm test` completo, `test:onboarding:db`, E2E completo, build, lint e typecheck: **NOT RUN**, parada no primeiro bloqueio confirmado. Não há declaração de B01–C08 20/20 nesta execução. I4-P40 está parcialmente coberto pelo wrapper/rota; seleção de múltiplos sujeitos de I4-P10 não foi aberta neste recorte de onboarding, e a prova de duas organizações cobre somente a bijeção.

Histórico de CLI: Supabase status v3 falhou dentro do sandbox ao gravar `~/.supabase/telemetry.json`; execução do servidor/teste foi autorizada fora do sandbox, sem contornar permissões. Migration criada diretamente com timestamp UTC conforme autorização explícita do usuário.

Documentação consultada: guia local Next `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`; [Supabase Database Functions](https://supabase.com/docs/guides/database/functions) (invoker, search_path e privilégios); [CLI v3 changelog](https://supabase.com/changelog/supabase-cli-v3). A instrução humana de arquivo SQL direto prevalece sobre a recomendação da skill de gerar via CLI.
