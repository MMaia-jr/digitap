# CUTOVER — fixtures atualizadas e regressão I3 verificada

Rodada autorizada após diagnóstico de B01: fixtures I3 devem usar o mesmo wrapper da rota de produção. **Sem commit.** HEAD continua `49102757ecfbe94356ddcb75250060648375c656`.

## Alterações desta rodada

- Inventário executado com `rg -n "criar_organizacao_pendente" tests/`, saída completa exibida na conversa.
- Fixtures de integração e E2E passaram a usar `criar_organizacao_com_sujeito` com `p_auth_user_id`, `p_nome_publico`, `p_canal_publico: null`.
- Teste de onboarding passou a verificar existência/permissões da RPC efetivamente usada em produção. Assertivas de idempotência, autorização, estado e rollback preservadas.
- Limpeza remove vínculos e sujeitos das próprias fixtures, após remover suas atividades/registros/evidências e antes de excluir contas/organizações. Escopo restrito aos IDs gerados pela execução.
- Fixture preenchida de preservação em CMP-12 também usa o wrapper.
- A única referência literal remanescente à RPC legada é o ramo deliberado do helper `tests/i4/compat.pg.test.mjs`, usado para testar CMP-06 e CMP-11: RPC legada e rede de segurança manual. Não é uma fixture de I3, e substituir esse controle apagaria a prova do comportamento legado.
- Nenhuma mudança de produção nesta rodada. Função legada sem diff; trigger não relaxado. SHA-256 da migration corresponde ao registro de sua aplicação, e definição SQL atual de i4_atividade_sujeito é idêntica àquela aplicada inicialmente.

## Regressão executada, saídas e exit codes

Todas as saídas brutas foram exibidas durante a execução. `quality-results.json` guarda os exit codes e os trechos finais capturados diretamente dos runners. `e2e.json` contém o relatório completo dos testes Chromium.

### PostgreSQL / integração

```sh
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db
```

Exit code **0**:

```text
 Test Files  9 passed (9)
      Tests  206 passed (206)
   Start at  07:47:26
   Duration  40.30s (tests 96%, import 3%, transform 1%)
```

### Chromium

```sh
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-i4-cutover npm run test:e2e
```

Exit code **0**, saída final:

```text
B12 Chromium: PASS
{"status":"passed","PASS":41,"FAIL":0,"SKIP":0}
```

Conferência determinística de `e2e.json`, exit code **0**, listou B01–B12 e C01–C08 individualmente como PASS e produziu:

```json
{"e2e":{"PASS":41,"FAIL":0,"SKIP":0},"criteriaPASS":20,"criteriaTotal":20}
```

Mapeamento em `i3-20-criteria.json`. C02–C04 compartilham um cenário Chromium combinado existente: 20 critérios não significam 20 testes independentes. A suíte tem os 40 E2E anteriores ao COMPAT mais o teste combinado CMP-07/CMP-08.

### Unidade/componentes após o DDL

`npm test`, exit code **0**:

```text
 Test Files  35 passed (35)
      Tests  378 passed (378)
   Start at  08:02:09
   Duration  6.58s (environment 62%, import 18%, tests 16%, transform 3%, worker 1%)
```

### Qualidade

- `npm run build`: exit **0**, compilação concluída, TypeScript concluído e 10/10 páginas estáticas geradas. Saída completa da etapa foi exibida na conversa e o trecho final capturado está em quality-results.json.
- `npm run lint`: exit **0**, sem mensagens além do cabeçalho do comando.
- `npm run typecheck`: exit **0**, sem mensagens além do cabeçalho do comando.
- `next-env.d.ts`: os dois imports alterados automaticamente pelo build foram devolvidos ao conteúdo original antes do typecheck final. Sem diff.

## Histórico Supabase

Somente após as verificações acima, a migration já aplicada no Postgres local foi registrada em `supabase_migrations.schema_migrations`: version `20261106030921`, name `i4_cutover`, statements contendo o SQL integral do arquivo. Nenhum ALTER foi reaplicado.

Comando pg de registro/verificação: exit code **0**. Consulta solicitada:

```sql
SELECT version FROM supabase_migrations.schema_migrations WHERE version='20261106030921'
```

Saída bruta:

```json
[
  {"version":"20261106030921"}
]
```

`migration-history.json` registra a versão, hash do arquivo e comparação do trigger. Saída da conferência:

```json
{"migration_sha_matches_application":true,"trigger_function_unchanged":true}
```

Contagens ao final (consulta SQL exit **0**):

```json
[
  {"organizacoes":0,"contas":0,"atividades":0,"sujeitos":0,"vinculos":0}
]
```

Somente fixtures fictícias locais utilizadas. Servidor E2E encerrado por SIGINT no supervisor próprio PID 51914; saída `Next local encerrado.`, exit **0**.

## Limite do resultado

**A correção de fixtures e a regressão I3 solicitadas nesta rodada estão verificadas. Isso ainda não conclui todas as obrigações do CUTOVER.** A publicação real de PF v2 comparada com organização v1, renderização com evidências publicadas reais, backend/onboarding inclusivo e recuperação inclusiva continuam pendentes de implementação/verificação. Os 41 E2E desta rodada são regressão organizacional e COMPAT; não constituem prova E2E de PF/coletivo.

Os 11 testes unitários novos comprovam leitura/projeção v2 e preservação canônica v1 sob fixtures simuladas. Os quatro PG CUTOVER anteriores comprovam schema e fixtures SQL, não o fluxo humano de publicação inclusiva. Snapshots preexistentes preenchidos não foram comparados porque a base estava vazia; não declarar essa prova como concluída.

O arquivo REPORT.md preserva a falha anterior de B01 como histórico; o bloqueio de fixture nele descrito foi resolvido nesta rodada. Sem staging, commit, deploy ou dados reais. Parada após o relatório conforme autorização recebida.
