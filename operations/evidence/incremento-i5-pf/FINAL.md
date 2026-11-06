# Onboarding PF — verificado após build limpo, aguardando revisão de commit

HEAD: `ef046caa8286e57ec92e321159496fb1f3eb06ca`. **Pronto para revisão humana de commit: SIM.** Sem staging/commit, deploy, dados pessoais reais de cadastro ou início de I5.1. Somente identidades fictícias `example.invalid` foram usadas. O contato público é o canal já autorizado pelo usuário, `muralitaperuna@gmail.com`.

## Retomada sem mudança de código

Conforme autorização, consultados os processos Next/E2E: exit 0, nenhum processo correspondente. `rm -rf .next`: exit 0. `ls .next`: exit 1 esperado, saída `ls: .next: No such file or directory`.

`npm run build`: exit 0; compilação e TypeScript concluídos, 11/11 páginas estáticas geradas. Saída completa da etapa capturada em `clean-build.json`, incluindo:

```text
├ ○ /cadastro/pessoa-fisica
├ ƒ /dashboard/pessoa-fisica
```

Iniciado servidor E2E novo após o build. O erro HTTP 500 anterior não reapareceu nesta execução. Não foi feita correção de AuthForm, página ou action nesta retomada: somente limpeza, build, verificações e atualização de evidências. `server-before-clean-build.log` e `e2e-before-clean-build.json` preservam a rodada anterior; `server.log` acumula o histórico das sessões locais.

## Testes PF-01 a PF-15

Pré-condição PG: Postgres local com schema I4 e RPC PF; identidade UUID fictícia em transação com rollback. Pré-condição E2E: serviços locais, Chromium, confirmação real pelo Mailpit, limpeza restrita à própria identidade. As definições dos testes foram escritas antes da implementação e estão catalogadas em REPORT.md.

| ID | Ação e resultado esperado | Arquivo / tipo | Evidência / estado final |
|---|---|---|---|
| PF-01 | RPC como service_role cria conta publicador sem organização | tests/i5/pf.pg.test.mjs / PG | GREEN na execução PG 10/10 anterior à limpeza; também conferido por SQL no E2E real |
| PF-02 | Sujeito PF pendente, curadoria_previa, risco medio, origem cadastro | mesmo / PG | GREEN; também confirmado por SQL no E2E |
| PF-03 | Filha PF e vínculo apontam à conta/sujeito corretos | mesmo / PG | GREEN |
| PF-04 | Titular ativo, versão 1 atual, escopos ler_privado/editar/enviar | mesmo / PG | GREEN; escopos também conferidos no E2E |
| PF-05 | Duas chamadas com a mesma identidade preservam IDs/nome/timestamps | mesmo / PG | GREEN |
| PF-06 | Nome vazio e falha injetada no vínculo final fazem rollback | mesmo / PG | GREEN; dois testes PG |
| PF-07 | GET cadastro PF 200 e formulário próprio | tests/e2e/i5-pf.spec.mjs / E2E | PASS após build limpo, direcionado e completo |
| PF-08 | /cadastro mantém formulário organizacional e link para PF | mesmo / E2E | PASS direcionado e completo |
| PF-09 | Antes de confirmar, conta inexistente; OTP cria PF e redireciona | mesmo / E2E | PASS no cenário combinado PF-09/PF-10/PF-11 |
| PF-10 | Dashboard mostra nome, pendência, contato e logout; login retoma PF | mesmo / E2E | PASS no cenário combinado |
| PF-11 | PF pendente sem botão publicar e POST editorial negado com 403 | mesmo / E2E; tests/auth/pf-flow.test.ts / unidade | PASS real e unitário |
| PF-12 | Regressão organizacional B01–B04 preservada (quatro IDs) | testes I3 existentes / PG+E2E | 4/4 critérios em i3-20-criteria.json |
| PF-13 | Regressão completa B01–B12/C01–C08 | testes I3 existentes / PG+E2E | 20/20 critérios |
| PF-14 | organizacao_id continua nullable; papel publicador aceito | tests/i5/pf.pg.test.mjs / PG | PASS como controle antes/depois da RPC nova |
| PF-15 | Onboarding não altera snapshots/hashes/eventos/registros | mesmo / PG e inspect-preservation.mjs | GREEN com fixture preenchida; preserved=true na comparação externa final |

Os dez testes PG específicos tiveram exit 0, 10 PASS, zero FAIL/SKIP na etapa de implementação, com a mesma RPC que permaneceu sem alteração nesta retomada. Há casos adicionais de recusa de organização existente e de ausência de EXECUTE para clientes. A suíte unitária direcionada teve 11/11 PASS; os onze casos também integram os 389 unitários finais.

O RED está em `red-pg.log` (exit 1, 9 FAIL/1 controle PASS), `red-unit.log` (exit 1, 8 FAIL/3 controles PASS), `red-e2e.log`/`red-e2e.json` (PF-07 ausente e interrupção serial) e `red-link.log`/`red-link.json` (PF-08 executado separadamente antes da implementação). PF-09–11 foram escritos antes do código e exercitados agora no fluxo real; não se atribui RED HTTP comportamental aos passos que eram inacessíveis sem a página.

## Saídas finais e exit codes

### E2E PF direcionado

Comando solicitado com o arquivo i5-pf.spec.mjs: **exit 0**, `clean-target-e2e.log` e `clean-target-e2e.json`:

```text
PF-07: PASS
PF-08: PASS
PF-09/PF-10/PF-11: PASS
{"status":"passed","PASS":3,"FAIL":0,"SKIP":0}
```

São três cenários cobrindo cinco obrigações, não cinco testes independentes.

### Unidade/componentes

`npm test`: **exit 0**, `unit-final.log`:

```text
 Test Files  37 passed (37)
      Tests  389 passed (389)
   Start at  09:33:49
   Duration  5.43s (environment 65%, import 16%, tests 16%, transform 1%, worker 1%)
```

### Integração PG I3

`A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db`: **exit 0**, `integration-final.log`:

```text
 Test Files  9 passed (9)
      Tests  206 passed (206)
   Start at  09:36:38
   Duration  37.88s (tests 96%, import 3%)
```

### E2E completo e critérios I3

Comando completo de test:e2e com diretório de evidências PF: **exit 0**, `e2e-final.log` e `e2e.json`:

```json
{"status":"passed","PASS":44,"FAIL":0,"SKIP":0}
```

Conferência determinística de e2e.json: **exit 0**, todos os IDs B01–B12 e C01–C08 listados como PASS:

```json
{"e2e":{"PASS":44,"FAIL":0,"SKIP":0},"criteriaPASS":20,"criteriaTotal":20}
```

`i3-20-criteria.json` mapeia cada ID aos testes. C02–C04 compartilham um cenário combinado existente. Os 44 E2E são os 41 anteriores mais três cenários PF.

### Qualidade

- `npm run build`: **exit 0**, saída bruta em clean-build.json.
- `npm run lint`: **exit 0**, lint-final.log, sem diagnósticos após o cabeçalho.
- `npm run typecheck`: **exit 0**, typecheck-final.log, sem diagnósticos após o cabeçalho.
- `git diff --check`: **exit 0**, saída vazia.

Servidor E2E encerrado pelo próprio supervisor PID 54685: `Next local encerrado.`, **exit 0**. Nenhum servidor externo foi encerrado.

## Design e RPC

Opção escolhida: metadata como intenção de cadastro. signup_pf envia tipo=pessoa_fisica e nome_publico. Confirmação usa a identidade confirmada do verifyOtp; somente depois chama a RPC. A metadata não decide autorização editorial/publicação: contas/vínculos persistidos são a autoridade. A RPC recusa converter organização/editor/admin existentes. Login confirmado retoma a criação após falha entre Auth e RPC; conta publicador já existente entra no dashboard PF. Não há novos privilégios editoriais/publicação.

RPC `public.criar_pf_com_sujeito(p_auth_user_id uuid,p_nome_publico text) returns uuid`: SECURITY INVOKER, search_path vazio, EXECUTE service_role only. Mesmo advisory xact lock por identidade usado pelo onboarding organizacional. Cria conta publicador sem organização, sujeito PF pendente/risco médio/curadoria prévia, filha PF e vínculo titular ativo versão 1 com escopos exatamente `ler_privado, editar, enviar`. Uma transação; qualquer insert falho reverte tudo. Retry não renomeia, não muda curadoria/papel nem reativa vínculo.

Nome público: informado no formulário, validado e normalizado NFC/trim, sem HTML, entre 2 e 160 caracteres. Contato do dashboard: canal previamente autorizado `muralitaperuna@gmail.com`. Nenhuma conta pessoal real do usuário criada nesta fase.

## Histórico Supabase

Somente após o E2E e a qualidade verdes, executado o INSERT de versão solicitado, **exit 0**:

```text
REGISTERED: [ { version: '20261106120940' } ]
```

Consulta integral do histórico, **exit 0**:

```text
[
  { version: '20261103221114' },
  { version: '20261103230507' },
  { version: '20261106003448' },
  { version: '20261106014443' },
  { version: '20261106030921' },
  { version: '20261106120940' }
]
```

**São seis versões, não cinco:** a lista esperada no pedido omitia CUTOVER `20261106030921`, já registrado. Nenhuma versão anterior foi removida. O INSERT solicitado registra apenas a coluna version; não se afirma ter gravado name/statements nesse registro. `migration-history.json` guarda o retorno real. `migration-applied.json` preserva o hash da migration aplicada na etapa anterior.

## Preservação e estado do repo

`node operations/evidence/incremento-i5-pf/inspect-preservation.mjs after`: **exit 0**:

```json
{"phase":"after","preserved":true}
```

before/after: fingerprints legados iguais, RLS/grants/policies das nove tabelas legadas e seis novas iguais, definições da função legada, wrapper organizacional e trigger CUTOVER iguais. A base externa estava vazia; o teste PF-15 usa conteúdo preenchido fictício (snapshots, registro, evidência, apoio, autorização, evento com hash) e rollback para não tratar igualdade de base vazia como prova suficiente.

`git diff HEAD -- next-env.d.ts src/app/dashboard/organizacao/page.tsx tests/integration/onboarding.database.test.ts supabase/migrations/20261103230507_organization_onboarding.sql`: **exit 0**, saída vazia. Nenhum teste I3 existente foi alterado. Em /cadastro, adicionado somente o link para PF; mode signup organizacional permanece.

Status final esperado e conferido: sete arquivos rastreados modificados, novas páginas/serviço/migration/testes PF e diretório de evidências untracked. Inclui `tests/auth/pf-flow.test.ts`, criado no RED original, além dos caminhos citados no pedido. next-env.d.ts não aparece.

```text
 M src/app/api/auth/[action]/route.ts
 M src/app/auth/confirm/page.tsx
 M src/app/cadastro/page.tsx
 M src/components/AuthForm.tsx
 M src/lib/auth/flow.server.ts
 M src/lib/auth/gateway.server.ts
 M src/lib/auth/permissions.server.ts
?? operations/evidence/incremento-i5-pf/
?? src/app/cadastro/pessoa-fisica/
?? src/app/dashboard/pessoa-fisica/
?? src/lib/auth/person-access.server.ts
?? supabase/migrations/20261106120940_i5_pf_onboarding.sql
?? tests/auth/pf-flow.test.ts
?? tests/components/pf-form.test.tsx
?? tests/e2e/i5-pf.spec.mjs
?? tests/i5/
```

Stat dos arquivos rastreados: 7 files changed, 56 insertions(+), 14 deletions(-). Novos arquivos untracked não entram no stat padrão. Sem bloqueios observados no escopo verificado. Curadoria e publicação PF não foram abertas; I5.1 não foi iniciado. Parada aguardando `ok commit pf`.
