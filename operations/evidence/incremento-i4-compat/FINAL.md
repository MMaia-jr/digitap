# I4 COMPAT — concluído, aguardando revisão humana de commit

HEAD: `0f27cba283262dff633fb2236dc695d8e7495131`. **Pronto para revisão humana de commit: SIM.** Nenhum commit, deploy, CUTOVER, backfill global ou uso de dados reais. Servidor E2E encerrado pelo supervisor próprio (PID 42443). Banco local vazio após limpeza/rollback de todas as fixtures.

## Falha intermitente de foco — prova e correção autorizada

Antes de editar, executado `npm test -- tests/components/auth-form.test.tsx` três vezes: **10/10 PASS em cada execução**, exit 0. Evidências `auth-form-isolated-before-{1,2,3}.log`. Isso atende ao critério humano para tratar a falha anterior da suíte como flaky; não comprova que o COMPAT tenha causado a falha anterior.

Correção de uma linha somente em `tests/components/auth-form.test.tsx:21`:

```diff
-   expect(document.activeElement).toBe(alert);
+   await waitFor(()=>expect(document.activeElement).toBe(alert));
```

`waitFor` já estava importado. Mesmo padrão dos testes review/withdraw. Assertiva de acessibilidade preservada, agora aguardando o foco assíncrono. **AuthForm.tsx intacto. Nenhum código de produção alterado nesta correção.**

Após a edição, três execuções isoladas sequenciais: **10/10 PASS em cada uma**, exit 0 (`auth-form-isolated-after-{1,2,3}.log`). Suíte completa: **367/367 PASS**, exit 0 (`unit-after-focus-fix.log`).

## Implementação COMPAT e privilégios

Migration: `supabase/migrations/20261106014443_i4_compat.sql`, aplicada via pg exclusivamente em `127.0.0.1:56152/postgres`; registrada no histórico Supabase como version `20261106014443`, name `i4_compat`, statements com SQL integral. Hash em `grants-applied.json`; correspondência arquivo/histórico confirmada em `grants-after.json`.

Wrapper: `public.criar_organizacao_com_sujeito(p_auth_user_id uuid,p_nome_publico text,p_canal_publico text) returns uuid`; SECURITY INVOKER, search_path vazio, EXECUTE somente service_role entre os papéis de aplicação. Chama `criar_organizacao_pendente` intacta; cria sujeito organizacional pendente, curadoria_previa, risco medio, origem cadastro, criador conta; cria vínculo titular ativo versão 1 atual, com os cinco escopos solicitados e ativada_em exigida pelo CHECK. Falha em qualquer insert reverte a operação inteira. Advisory lock da função legada serializa por identidade; retry mantém IDs e não sobrescreve estado/nome/vínculo anterior.

Conforme autorização posterior, SELECT/INSERT/UPDATE/DELETE para service_role nas seis tabelas novas: sujeitos_publicadores, pessoas_fisicas, coletivos_informais, vinculos_publicadores, atestacoes_representacao, casos_moderacao. EXECUTE para service_role nas dez funções reais do EXPAND: i4_escopos_validos(text[]), i4_sujeito_identidade(), i4_subtipo_completo(), i4_atividade_sujeito(), i4_vinculo_identidade(), i4_vinculo_integridade(), i4_pf_identidade(), i4_coletivo_curadoria(), i4_atestacao_integridade(), i4_caso_integridade().

Catálogo antes/depois: `grants-preflight.json`, `grants-after.json`. As nove legadas já tinham os quatro privilégios e permanecem sem alteração. RLS habilitado nas quinze tabelas, zero policies; anon/authenticated sem privilégios nas tabelas e funções I4.

## Rota — diff funcional exato

`src/app/api/organizacoes/route.ts` delega ao runtime e está intacta. A chamada RPC efetiva está em `src/lib/auth/gateway.server.ts:25`:

```diff
-      const {data,error}=await admin().rpc('criar_organizacao_pendente',{p_auth_user_id:userId,p_nome_publico:name,p_canal_publico:channel??null});
+      const {data,error}=await admin().rpc('criar_organizacao_com_sujeito',{p_auth_user_id:userId,p_nome_publico:name,p_canal_publico:channel??null});
```

Tratamento de erros, payload de entrada e resposta preservados. Gateway testado na suíte unitária; resposta real comprovada no Chromium. E2E auth recebeu somente limpeza das dependências I4 das próprias fixtures, sem mudar critérios/assertivas I3.

## CMP-01 a CMP-12

Pré-condição PG: stack local com EXPAND/COMPAT, identidade fictícia, transação com rollback; E2E: identidade fictícia confirmada e sessão real, limpeza restrita aos IDs criados. PG adicional usa SET ROLE service_role no controle positivo.

| ID | Pré-condição / ação | Resultado esperado e obtido | Arquivo / tipo |
|---|---|---|---|
| CMP-01 | Identidade sem conta; chamar wrapper como service_role | Org+conta+sujeito+vínculo corretos, constraints válidas — PASS | tests/i4/compat.pg.test.mjs / PG |
| CMP-02 | Nome NFD aceito pelo legado e inválido para sujeito; chamar wrapper | 23514, rollback da organização e conta — PASS | mesmo / PG |
| CMP-03 | Cadastro completo; repetir mesma identidade com outro nome | Mesmo ID, estado, nome e timestamps, sem duplicação — PASS | mesmo / PG |
| CMP-04 | Duas identidades/organizações; comparar chaves | Bijeção e zero vínculo cruzado — PASS | mesmo / PG |
| CMP-05 | Cadastro completo; consultar vínculo | Cinco escopos completos — PASS | mesmo / PG |
| CMP-06 | Identidade nova; chamar RPC legada diretamente | RPC legada funciona e não cria sujeito automaticamente — PASS | mesmo / PG |
| CMP-07 | Sessão confirmada; POST /api/organizacoes e retry | HTTP 200, message/next exatamente iguais ao legado — PASS | tests/e2e/i4-compat.spec.mjs / E2E |
| CMP-08 | Mesmo POST; consultar SQL de sujeito/vínculo | Associação correta, escopos completos, retry sem duplicação — PASS | mesmo / E2E |
| CMP-09 | Fixtures I3; regressão B01–B04 | Quatro critérios PASS — PASS | tests/e2e/activities.spec.mjs / E2E e integração existente |
| CMP-10 | Fixtures I3; regressão B01–B12/C01–C08 | Vinte critérios PASS — PASS | tests/integration/*.test.ts, tests/e2e/*.spec.mjs / PG+E2E |
| CMP-11 | Organização fictícia criada sem wrapper; backfillBatch nesse único ID, repetir e chamar wrapper | Um sujeito/vínculo; IDs e estado preservados — PASS | tests/i4/compat.pg.test.mjs / PG |
| CMP-12 | Fixture preenchida com snapshots de atividade/registro, evidência, autorização, apoio, evento; fingerprints antes/depois | Conteúdo, hashes e contagens iguais — PASS | mesmo / PG |

Duas provas PG adicionais PASS: falha no insert final do vínculo também causa rollback total; invoker/search_path fechado e EXECUTE negado a anon/authenticated. Dez testes PG no total (CMP-07–10 usam as suítes de gateway/E2E/regressão).

RED anterior à implementação preservado: `red-pg.log` (1 controle legado PASS, 9 FAIL pela ausência do wrapper), `red-gateway.log` (RPC antiga), `red-e2e.json` e `red-e2e.log` (resposta preservada, associação SQL ausente). A rodada anterior aos grants falhou como service_role e está preservada em `green-pg.log`; o nome desse arquivo não significa sucesso. Após os grants: `green-service-role.log` 1/1 PASS e `green-pg-final.log` 10/10 PASS, zero SKIP.

## Regressão final

| Comando | Resultado | Evidência |
|---|---|---|
| npm test | 367/367 PASS, exit 0 | unit-after-focus-fix.log |
| A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db | 206/206 PASS em nove arquivos, exit 0 | database-final.log |
| A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-i4-compat npm run test:e2e | 41/41 PASS, zero FAIL/SKIP, exit 0 | e2e-final.log, e2e.json |
| npm run build | PASS, exit 0 | build-final.log |
| npm run lint | PASS, exit 0 | lint-final.log |
| npm run typecheck | PASS, exit 0 | typecheck-final.log |

`i3-20-criteria.json` mapeia os vinte critérios aos testes reais aprovados. C02–C04 compartilham o cenário existente combinado; o relatório não representa 20 testes independentes. Os 41 E2E são os 40 anteriores mais um teste combinado CMP-07/CMP-08.

O build regenerou dois imports de next-env.d.ts. Restaurados ao conteúdo original, e typecheck repetido com sucesso; arquivo sem diff.

## Preservação, riscos e parada

`before.json`, `after.json`, `preservation-result.json`: preserved=true após toda a regressão. Hash da definição da RPC legada, ACL/RLS/policies das nove legadas e fingerprints iguais à base. Como a base externa era vazia, a preservação preenchida é comprovada também por CMP-12 (snapshots de atividade/registro e demais dados fictícios), com rollback da fixture.

Diff zero em AuthForm.tsx, next-env.d.ts, src/app/api/organizacoes/route.ts, migration histórica organization_onboarding.sql e scripts/i4-backfill.mjs. Também vazio `git diff HEAD^ HEAD -- supabase/migrations/20261103230507_organization_onboarding.sql`. `git diff --check` passou.

Nenhum bloqueio restante observado no escopo de onboarding. Chamada direta à RPC legada continua podendo criar organização sem sujeito; o backfill manual permanece a rede de segurança aprovada. Não foram implementadas seleção N:N, PF/coletivo, autopublicação, alterações de atividades ou demais capacidades de CUTOVER.

Árvore final, sem staging/commit:

```text
 M src/lib/auth/gateway.server.ts
 M tests/auth/gateway.test.ts
 M tests/components/auth-form.test.tsx
 M tests/e2e/auth.spec.mjs
?? operations/evidence/incremento-i4-compat/
?? supabase/migrations/20261106014443_i4_compat.sql
?? tests/e2e/i4-compat.spec.mjs
?? tests/i4/compat.pg.test.mjs
```

Parada para revisão humana. Aguardando autorização explícita de commit.
