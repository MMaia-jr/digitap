# I4 EXPAND — bloqueado antes de DDL

## Nova tentativa com telemetria desabilitada

HEAD reconfirmado em 52f4e2a. Nenhuma alteração em arquivo rastreado;
árvore contém somente os testes/configuração/evidências desta execução já autorizada.
`tests/i4/` e `vitest.i4-expand.config.ts` confirmados presentes.
P44 reclassificado como **contract pending, GREEN in CUTOVER** e excluído
da configuração obrigatória EXPAND, que coleta exatamente 22 testes PG.

```sh
DO_NOT_TRACK=1 SUPABASE_TELEMETRY_DISABLED=1 A_PRACA_ALLOW_FIXTURE_CLEANUP=1 ./node_modules/.bin/vitest run --config vitest.i4-expand.config.ts
```

Exit 1. Log: `red-telemetry-disabled.log`. Os 22 testes foram SKIPPED por falha
no beforeAll; RED estrutural ainda NÃO comprovado. Nenhum erro de telemetria
apareceu nesta tentativa. A CLI herdou as duas variáveis do processo de testes.

Erro exato da CLI:

```text
failed to inspect container health: permission denied while trying to connect to the docker API at unix:///Users/alexandrechagasleaocryptoboy/.docker/run/docker.sock
Try rerunning the command with --debug to troubleshoot the error.
```

Parada imediata conforme instrução: sem tentativa alternativa ou nova invocação
da CLI. Sem conexão PG, fixtures, DDL, migration ou hash de migration.
Regressão I3, GREEN e verificação de integridade: NOT RUN.
Nenhuma alteração nas nove tabelas, migrations históricas ou código de produção.
Pronto para revisão humana de commit: **NÃO**. Sem commit/push/deploy.

## Registro da tentativa anterior

HEAD: 52f4e2ac493f5f0c5531cec81604b65f6710b7a2.
Preflight Git: HEAD esperado, árvore limpa antes dos novos testes.

Comando executado:

```sh
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 ./node_modules/.bin/vitest run --config vitest.i4-expand.config.ts
```

Saída: exit 1; 3 testes unitários I4-P44 FAIL (contrato I4 ausente),
22 testes PG SKIPPED por falha de beforeAll. Log completo em red.log.
Os testes PG NÃO comprovam RED de estrutura nem de segurança: não chegaram ao banco.

Bloqueio: `supabase status --workdir ... --output json`, chamado pelo setup,
tentou `FileSystem.writeFile` fora do workspace em
`/Users/alexandrechagasleaocryptoboy/.supabase/telemetry.json.tmp.8d394e54-2cce-44bd-9f82-53cfd837abf7`.
Retorno EPERM. Nenhuma tentativa de contorno, alteração de HOME, configuração de
telemetria, instalação ou escalada. Parada expressamente exigida pelo usuário.

Sem conexão PG, fixtures, DDL, migration, backfill ou código de produção alterado.
Ajuda da CLI e migration new não executados: RED PG ainda não comprovado e CLI bloqueada.
Regressão I3 e verificação pós-aplicação: NOT RUN. Nenhum novo PASS 20/20 alegado.
Integridade do banco não foi consultada; as migrations históricas permanecem intocadas.

Na tentativa anterior, P44 permaneceu RED por ausência de um contrato de autorização I4, não por bypass I3.
DDL isoladamente não tornará esse teste GREEN. O nome de função no teste é uma
especificação unitária proposta, não uma API preexistente. Para concluir o gate,
será necessário resolver sua expectativa de GREEN nesta fase sem ampliar o escopo
funcional autorizado. Não foi implementada autorização ou rota de autopublicação.

Pronto para revisão humana de commit: NÃO. Não houve commit/push/deploy.
