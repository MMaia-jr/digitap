# I4 — BACKFILL local — relatório

HEAD inicial/final: `27e81fc984d07e06d29fdec466e74411e628f92e`. Pré-condição: árvore limpa; conexão PG local OK; migration EXPAND presente no catálogo. Nenhum commit executado.

## Resultado

Executor operacional idempotente em `scripts/i4-backfill.mjs`; testes em `tests/i4/backfill.pg.test.mjs`. Nenhum código de produção, migration, RLS, grant, CHECK legado, snapshot ou evento existente foi alterado. COMPAT/CUTOVER não iniciados. O arquivo next-env.d.ts gerado pelo build foi restaurado ao conteúdo de HEAD.

| Verificação | Resultado | Evidência |
|---|---|---|
| RED anterior ao DML | 6 FAIL, exit 1: executor ausente | red.log |
| GREEN inicial | 6/6 PASS, exit 0 | green.log |
| GREEN final com histórico preenchido e limite/rollback | 8/8 PASS, exit 0 | green-final.log |
| npm test | 367/367 PASS, exit 0 | unit.log |
| test:onboarding:db | 206/206 PASS, exit 0 | database-retry.log |
| Chromium completo | 40 PASS, 0 FAIL, 0 SKIP, exit 0 | e2e.json, e2e-retry.log |
| build | PASS, exit 0 | build.log |
| lint | PASS, exit 0 | lint.log |
| typecheck | PASS, exit 0 | typecheck.log |

Detalhamento de pré-condição/ação/resultado/tipo/arquivo e limites da prova RED em tests.md. O RED comprova ausência da implementação; não representa seis falhas comportamentais observadas em SQL. Os dois testes adicionais BF04/BF05 foram acrescentados na verificação, sem RED anterior registrado.

## Lotes, contagens e idempotência

A base estava vazia antes da fase. Não foram criadas fixtures persistentes para inflar as contagens operacionais.

**Limitação central:** BACKFILL executado na base vazia (0 organizações, 0 atividades, 0 contas). A lógica foi validada com fixtures temporárias (revertidas após o teste), mas o backfill de dados reais nunca rodou porque não há dados reais no Supabase local. O primeiro backfill real acontecerá quando I5 (validação humana) trouxer a primeira organização real para o sistema.

| Execução operacional | Lotes | Organizações | Sujeitos criados | Vínculos criados | Atividades atualizadas |
|---|---:|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 | 0 | 0 |
| 2 | 0 | 0 | 0 | 0 | 0 |

run-1.log/run-2.log, arquivos datados before/result, batches.jsonl e checkpoint.json registram as duas execuções. A segunda execução não alterou contagens ou fingerprints. A prova não vazia de idempotência usa três organizações/contas/atividades por fixture PG: mesmos sujeitos, vínculos, atividades, IDs e timestamps após repetição. Fixtures revertidas por ROLLBACK.

Checkpoint final complete. Nenhum lote operacional falhou. Conta bloqueada gera vínculo suspenso; total de contas organizacionais não deve ser confundido com total de vínculos ativos quando houver contas bloqueadas/revogadas.

## Invariantes e regressão I3

post-regression.json confirma, após limpeza do runner: zero organizações/sujeitos/vínculos/atividades, zero órfãos ou divergências e SHA-256 das nove tabelas legadas igual ao baseline anterior ao backfill. Bijeção na base vazia é trivial; BF01 prova bijeção com três organizações e estados diferentes. BF03 compara histórico fictício não vazio, incluindo snapshots de atividade/registro, evento com hash, evidência, autorização e apoio; todas as demais colunas legadas de atividades são incluídas no hash.

B01–B12/C01–C08: **20/20 PASS**, agregação dos cenários originais, sustentada pelos 206 testes PG e pelos 40 Chromium completos. Matriz normativa e testes I3 não foram alterados. Cobertura Chromium: B01–B04 em activities; B05/B06 em review; B07 em publication; B08/B09 em revisions; B10–B12 em scheduling; C01–C04 em records; C05–C08 em record-editorial. Os nove cenários de autenticação também passaram.

O supervisor E2E criado nesta fase foi encerrado por SIGINT próprio; confirmou “Next local encerrado”. Nenhuma infraestrutura Supabase foi reiniciada.

## Ambiente e riscos

As primeiras tentativas PG/Chromium foram bloqueadas pelo sandbox: gravação de telemetria em ~/.supabase e inicialização MachPort do Chromium. Reexecuções autorizadas fora do sandbox passaram; logs iniciais preservados em database.log/e2e.log. Não houve correção ou flexibilização dos testes para obter PASS.

Limites: base operacional vazia; não há ensaio de crash/restart ou carga multi-lote >100. P18 testa revogação entre processamentos/retry, sem prova de corrida simultânea em duas conexões. Escritores legados ainda podem criar deltas após a verificação final, como previsto antes de COMPAT. Snapshots fictícios do teste de preservação são objetos PG e não foram usados como prova de leitura pelos parsers públicos. A leitura pública I3 é comprovada pela regressão original.

Os riscos de crash, processamento de mais de 100 organizações e revogação simultânea não foram testados em ambiente real. A lógica está pronta, mas o “teste de fogo” fica para quando houver dados.

Bloqueios pendentes: nenhum para revisar o executor neste recorte local. As limitações acima impedem tratar esta execução como prova operacional com volume, recuperação após crash ou gate COMPAT.

Pronto para revisão humana de commit: **SIM**, com as limitações de evidência explicitadas. Nenhum commit autorizado nesta fase. Aguardar “ok commit backfill”.

Git status final esperado: somente diretório de evidências novo, executor novo e arquivo de testes novo (ver git-status.txt). Sem alterações em arquivos rastreados existentes.
