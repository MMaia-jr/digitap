# Onboarding PF — histórico da parada no E2E PF-07

**Estado atual: verificado após limpeza de .next e build limpo; pronto para revisão humana de commit, sem commit. Ver [FINAL.md](FINAL.md).** A retomada não alterou código: E2E PF 3/3 (cinco obrigações), unidade 389/389, integração 206/206, E2E completo 44/44, critérios I3 20/20, build/lint/typecheck exit 0, versão PF registrada e preserved=true. As seções abaixo preservam o estado anterior, já superado por essa verificação.

HEAD: `ef046caa8286e57ec92e321159496fb1f3eb06ca`. Sem staging/commit. **Pronto para revisão humana de commit: NÃO.**

## Preflight e escopo

git log confirmou ef046ca; git status inicial vazio; conexão local PostgreSQL retornou OK (exit 0). Lidos schema EXPAND/CUTOVER, plano I4, regras D1–D4, fluxo/gateway/AuthForm, páginas e testes de onboarding organizacional. Guias locais Next page/route e checklist React consultados.

Somente fixtures fictícias (`example.invalid`) nos testes. Nenhuma conta pessoal real criada. Canal da página PF: `muralitaperuna@gmail.com`, já autorizado pelo usuário no contexto da governança; nome público é informado no formulário, não inferido de e-mail ou identidade civil.

## Decisão de design

Opção 1: signup_pf envia `tipo='pessoa_fisica'` e `nome_publico` em user_metadata. A confirmação já usa verifyOtp e recebe a identidade confirmada do Auth. O formulário atual remove os parâmetros do link, portanto redirect_to exigiria novo transporte de contexto. Metadata serve somente como intenção do cadastro e nome validado; nunca concede papel editorial ou publicação. Papel e acesso vêm de contas_acesso e vínculos persistidos.

A conta/sujeito só é criada após OTP confirmado com sessão. RPC service-only recebe o UUID retornado pelo Auth, não do payload do cliente. Se a RPC falhar após consumir OTP, a sessão é limpa; um login confirmado posterior retoma a RPC. Organização/editor/admin existentes não são convertidos em PF pela RPC. O login de editor do banco preserva o destino editorial mesmo com metadata PF.

## Testes escritos antes de produção/DDL

Pré-condição PG comum: Postgres local EXPAND/CUTOVER, usuário UUID fictício dentro de transação; finally executa rollback. E2E usa Chromium/Next/Auth/Mailpit locais, e limpa somente o UUID gerado.

| ID | Pré-condição | Ação | Esperado | Arquivo / tipo | Estado |
|---|---|---|---|---|---|
| PF-01 | Auth fictício sem conta | RPC como service_role | Papel publicador, organizacao_id NULL | tests/i5/pf.pg.test.mjs / PG | RED → GREEN |
| PF-02 | Identidade sem conta | RPC e query sujeito | PF pendente, curadoria_previa, risco medio, origem cadastro | mesmo / PG | RED → GREEN |
| PF-03 | Cadastro PF | Consultar filha/conta/sujeito | Mesmas chaves, sem referência cruzada | mesmo / PG | RED → GREEN |
| PF-04 | Cadastro PF | Consultar vínculo | Titular ativo, versão 1 atual; somente ler_privado/editar/enviar | mesmo / PG | RED → GREEN |
| PF-05 | Cadastro completo | Repetir mesma identidade com outro nome | Mesmo ID/nome/timestamps; nenhum novo vínculo | mesmo / PG | RED → GREEN |
| PF-06 | Identidade sem conta | Nome vazio; em outro caso, falha injetada no vínculo final | 22023/23514 e rollback das quatro inserções | mesmo / PG | RED → GREEN |
| PF-07 | Visitante | GET /cadastro/pessoa-fisica | 200 e formulário PF | tests/e2e/i5-pf.spec.mjs / E2E | RED 404; pós-implementação FAIL 500 |
| PF-08 | Visitante | Abrir /cadastro e consultar link | Sou pessoa física aponta para rota nova | mesmo / E2E | RED em execução própria; GREEN SKIP após PF-07 |
| PF-09 | Signup PF, e-mail ainda não confirmado | Confirmar pelo Mailpit | Sem conta antes do OTP; depois dashboard PF | mesmo / E2E | Escrita antes do código; execução pós-implementação SKIP |
| PF-10 | PF confirmada | Ler dashboard, logout e login | Nome, pendente de curadoria, canal e logout; sem botão publicar | mesmo / E2E | SKIP |
| PF-11 | PF pendente | POST de publicação com sessão | 403 | mesmo / E2E; tests/auth/pf-flow.test.ts / unidade | Controle unitário GREEN; E2E SKIP |
| PF-12 | Fixtures organizacionais I3 | Regressão B01–B04 | Quatro critérios preservados | testes I3 existentes / PG+E2E | NÃO EXECUTADO nesta fase |
| PF-13 | Fixtures I3 | Regressão B01–B12/C01–C08 | 20/20 critérios | testes I3 existentes / PG+E2E | NÃO EXECUTADO |
| PF-14 | Schema CUTOVER | Consultar nullability e CHECK | organizacao_id nullable e papel publicador aceito | tests/i5/pf.pg.test.mjs / PG | PASS de controle antes/depois |
| PF-15 | Fixture com snapshots, registro, evidência, autorização, apoio e evento | Fingerprints antes/depois da RPC | Conteúdo/hash/eventos iguais | mesmo / PG | RED → GREEN |

Unidade/UI adicionais em `tests/auth/pf-flow.test.ts` e `tests/components/pf-form.test.tsx`: cadastro adia vínculo até confirmação, nome inválido negado, confirmação sem e-mail confirmável negada, falha de RPC/retomada, destino de login publicador, papel editorial não derivado de metadata, forma da chamada SDK/RPC e formulário PF com endpoint próprio e limpeza da senha.

## Evidência RED

Antes de qualquer página/action ou migration:

- Node PG: exit 1, 1 PASS e 9 FAIL em dez testes, SQLSTATE 42883 pela ausência de criar_pf_com_sujeito. PF-14 permanece controle PASS. `red-pg.log`.
- Unidade/UI direcionadas: exit 1, 8 FAIL e 3 PASS em onze testes. Ação signup_pf ausente, confirmação ainda encaminhava para organização, gateway/mode ausentes. `red-unit.log`.
- HTTP: PF-07 FAIL (rota ausente), PF-08 SKIP por serialização. `red-e2e.log`, `red-e2e.json`.
- PF-08 executado separadamente antes de implementar link: exit 1, 1 FAIL, zero SKIP. `red-link.log`, `red-link.json`.

PF-09–11 foram escritos antes do código, mas não atingidos no RED HTTP por inexistência da página; não declarar RED comportamental deles como executado. Confirmação/destino e negação editorial foram exercitados nos testes unitários RED/controle.

## Implementação parcial

Migration `20261106120940_i5_pf_onboarding.sql`: função `public.criar_pf_com_sujeito(p_auth_user_id uuid,p_nome_publico text) returns uuid`, SECURITY INVOKER, search_path vazio, EXECUTE service_role only. Usa o mesmo advisory xact lock por identidade do onboarding organizacional. Conta publicador sem organização, sujeito PF pendente/risco médio/curadoria prévia, filha PF e vínculo titular com três escopos na mesma transação. Valida/normaliza nome e não captura erros de insert; rollback integral. Retry preserva estado anterior.

Aplicação PG direta: exit 0; SQL integral foi exibido na conversa. `migration-applied.json` contém arquivo/hash/applied=true. **Função aplicada no banco local, histórico Supabase ainda NÃO registrado**, pois houve parada na verificação E2E antes do fechamento. Não reaplicar CREATE FUNCTION sem considerar que a função já existe.

Arquivos adicionados: cadastro PF, dashboard PF e person-access.server.ts. Cadastro organizacional recebeu apenas o link. Página de confirmação recebeu texto neutro sobre o fluxo escolhido. AuthForm mantém mode signup existente e ganhou signup_pf. Dashboard organizacional, testes de onboarding existentes, função legada, snapshots/leitores e trigger CUTOVER não foram alterados.

## GREEN observado antes da falha E2E

PG após a migration, exit 0 (saída bruta exibida na conversa):

```text
# tests 10
# suites 0
# pass 10
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

Unidade/UI direcionadas, exit 0:

```text
 Test Files  2 passed (2)
      Tests  11 passed (11)
```

Suíte unitária completa, exit 0:

```text
 Test Files  37 passed (37)
      Tests  389 passed (389)
   Start at  09:13:24
   Duration  6.07s (environment 67%, tests 16%, import 14%, transform 2%, worker 1%)
```

`npm run typecheck`: exit 0, sem mensagens além do cabeçalho. Capturas dos resultados em `checks.json`.

## Falha determinante e parada

Comando:

```sh
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-i5-pf npm run test:e2e -- tests/e2e/i5-pf.spec.mjs
```

Exit code **1**, saída final:

```text
PF-07: FAIL
PF-08: SKIP
PF-09/PF-10/PF-11: SKIP
{"status":"failed","PASS":0,"FAIL":1,"SKIP":2}
```

Erro em `tests/e2e/i5-pf.spec.mjs:33:86`:

```text
Error: expect(received).toBe(expected) // Object.is equality
Expected: 200
Received: 500
```

Log do servidor:

```text
TypeError: Cannot read properties of undefined (reading 'endpoint')
at AuthForm (src/components/AuthForm.tsx:33:50)
```

Contexto bruto preservado em `pf07-error-context.md`; relatório do runner em `e2e.json`; log sanitizado em `server.log`. O arquivo atual AuthForm.tsx possui config.signup_pf e a linha de form é 35, enquanto o stack exibiu a linha antiga 33. Essa divergência foi apenas observada: **não foi comprovado que a causa seja cache/hot reload**, e não houve restart/retry/correção para contornar o erro.

Parada conforme instrução humana. Servidor encerrado pelo supervisor próprio PID 53935: saída `Next local encerrado.`, exit 0. Após a falha, somente coleta de estado e este relatório; nenhuma continuação da implementação ou execução de testes.

## Preservação e pendências

Após a parada, consulta de preservação (`inspect-preservation.mjs after`), exit 0:

```json
{"phase":"after","preserved":true}
```

`before.json`, `after.json`, `preservation-result.json`: fingerprints legados, ACL/RLS/policies das nove legadas + seis novas e hashes das definições do onboarding legado/organizacional e trigger CUTOVER iguais. Base externa vazia; a prova preenchida de conteúdo é o PF-15 PG, que foi executado com rollback. Nenhum dado real usado.

Pendentes: PF-07 HTTP GREEN, PF-08–11 E2E GREEN, integração I3 completa, E2E completo e 20/20 critérios, build, lint, registro da migration e revisão final. Typecheck e unidade têm os resultados acima, mas não substituem o fluxo real. Nenhuma afirmação de PF-01–15 integralmente GREEN.

Estado final: sete arquivos rastreados modificados; novas páginas, serviço de acesso PF, migration, quatro arquivos de teste e evidências untracked. `git diff --stat`: 7 files changed, 56 insertions(+), 14 deletions(-); arquivos untracked não entram nesse stat padrão. HEAD inalterado, sem commit. Aguardando orientação para retomada.
