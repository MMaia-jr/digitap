# Fechamento das verificações restantes — Dia 3

Base: `eeec4ce1ee6b97f86f06d69b42a5a7bd2e9ab472`. Execução em 11/11/2026, conforme timestamps nos registros. Os quatro comandos foram executados sequencialmente por `run-remaining.mjs`, que preserva stdout e stderr separados e o exit code real. `npm test` foi executado **sem bail, sem filtro e sem exclusões**.

| Comando | Exit code | Resultado / output |
| --- | --- | --- |
| `npm run build` | **0** | `Compiled successfully`; TypeScript concluído; `Generating static pages … (14/14)` |
| `npm run lint` | **1** | `1 problem (1 error, 0 warnings)`; `react-hooks/purity` por `Date.now()` durante renderização |
| `npm run typecheck` | **0** | `tsc --noEmit`, sem diagnóstico |
| `npm test` | **1** | `Test Files 2 failed \| 47 passed (49)`; `Tests 4 failed \| 452 passed (456)`; **0 SKIP** |

## Falhas conhecidas preservadas

- `tests/components/editorial-queue.test.tsx`: “lista somente a fila do serviço com sujeito, data e ações editoriais”.
- `tests/components/editorial-queue.test.tsx`: “aprovação usa endpoint protegido e atualiza fila”.
- `tests/components/editorial-queue.test.tsx`: “rejeição envia o motivo digitado, sem aprovar ou publicar”.
- `tests/components/visible-home.test.tsx`: “home vazia convida a participar sem fabricar atividades”.
- Lint: `src/app/dashboard/pessoa-fisica/atividade/[id]/evidencia/page.tsx:13:794`, uso de `Date.now()`, regra `react-hooks/purity`.

São exatamente os débitos que o proponente autorizou registrar e seguir nesta rodada. **Não houve nova falha P0.** O B11 passou na suíte completa após a correção exclusiva do teste em `eeec4ce`. Nenhuma correção adicional foi aplicada.

## Outputs e reprodução

- Build: [stdout](remaining-build.stdout.log), [stderr](remaining-build.stderr.log), [exit code e timestamps](remaining-build.json).
- Lint: [stdout](remaining-lint.stdout.log), [stderr](remaining-lint.stderr.log), [exit code e timestamps](remaining-lint.json).
- Typecheck: [stdout](remaining-typecheck.stdout.log), [stderr](remaining-typecheck.stderr.log), [exit code e timestamps](remaining-typecheck.json).
- Suíte completa: [stdout](remaining-unit.stdout.log), [stderr](remaining-unit.stderr.log), [exit code e timestamps](remaining-unit.json).
- [Resumo estruturado](closure-summary.json), [executor](run-remaining.mjs).

Para reproduzir um comando: `node operations/evidence/semana-1-dia-3/run-remaining.mjs build` (ou `lint`, `typecheck`, `unit`). O executor termina com o mesmo código do comando npm.

## Limites do fechamento

Os arquivos `unit.json`, `p0-public-safety.json`, `summary.json` e o relatório de parada original foram preservados como evidência histórica da primeira tentativa. **Não somar seus totais aos desta execução completa.** Os resultados atuais são os arquivos `remaining-*` e `closure-summary.json`.

Este pedido encerra as quatro verificações restantes, sem atestar toda a validação inicialmente prevista para o Dia 3. Integração PostgreSQL, E2E completo, duas contas PF/Organização e teste real de RLS/rascunhos não foram reexecutados. A ausência de comprovação de backup/restore continua registrada como risco. Não houve acesso à produção nem alteração de código de produção. Os artefatos locais da investigação B11 estão preservados em diretório separado e não integram este commit.
