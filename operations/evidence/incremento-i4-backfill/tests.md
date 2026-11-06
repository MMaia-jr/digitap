# I4 BACKFILL — testes PostgreSQL

Arquivo: `tests/i4/backfill.pg.test.mjs`. Comando: `node --test tests/i4/backfill.pg.test.mjs`.
Todos os casos são PG real, exclusivamente em loopback:56152. Fixtures fictícias de UUID aleatório são revertidas por ROLLBACK; nenhuma fixture desses testes fica persistida.

| ID | Pré-condição | Ação | Resultado esperado | Tipo / arquivo |
|---|---|---|---|---|
| I4-P38 | Três organizações e contas, sem mapa | Executar o mesmo lote duas vezes | Três sujeitos e vínculos; mesmos IDs, linhas e timestamps na segunda execução | PG / arquivo acima |
| I4-P06 | Três atividades de organizações distintas | Executar lote e comparar os dois IDs de titularidade | Zero sujeitos nulos, órfãos ou cruzados; política i3; organização original preservada | PG / arquivo acima |
| I4-P18 | Vínculo ativo criado pelo primeiro processamento | Revogar e repetir processamento | Mesma linha revogada, sem reativação ou vínculo duplicado | PG / arquivo acima |
| I4-BF01 | Organizações validada, pendente, suspensa | Executar lote | Bijeção, estados correspondentes, legado/versão 1/risco médio/curadoria prévia/criador NULL | PG / arquivo acima |
| I4-BF02 | Contas organizacionais ativas/bloqueada e contas editor/administrador | Executar lote | Somente titulares organizacionais; bloqueada suspensa; cinco escopos especificados | PG / arquivo acima |
| I4-BF03 | Atividade e registro com snapshot, evento com hash, evidência, autorização e apoio fictícios | Comparar SHA-256 das nove tabelas legadas antes/depois | Mesmos hashes de todas as colunas legadas; somente sujeito_id/politica_publicacao excluídos da comparação de atividades | PG / arquivo acima |
| I4-BF04 | 101 IDs distintos | Pedir lote acima do limite | Recusa anterior a DML | PG / arquivo acima |
| I4-BF05 | Nome legado incompatível com CHECK do sujeito | Executar lote dentro de savepoint e reverter ao falhar | SQLSTATE 23514; nenhum sujeito/vínculo/ponte parcial | PG / arquivo acima |

## Sequência TDD e limites da prova

1. Os seis primeiros casos foram escritos antes de qualquer INSERT/UPDATE desta fase.
2. `red.log`: exit 1, 0 PASS / 6 FAIL por `ERR_MODULE_NOT_FOUND` do executor ainda ausente. RED de implementação ausente, não uma falha comportamental de SQL.
3. Executor implementado; `green.log`: exit 0, 6/6 PASS.
4. Caso de preservação enriquecido com histórico não vazio, e dois casos adicionais de limite/rollback: `green-final.log`, exit 0, 8/8 PASS. BF04/BF05 não têm execução RED histórica.

I4-P18 aqui é o recorte BACKFILL solicitado, distinto da ativação de coletivos/atestação/publicação concorrente do plano. Prova revogação entre processamentos e retry; não demonstra corrida em duas conexões simultâneas. P38 demonstra estabilidade do lote em fixture; a execução operacional foi sobre base vazia. Não há prova de checkpoint após crash nem carga de mais de 100 organizações nesta execução.

## Operação

O executor `scripts/i4-backfill.mjs` lê SUPABASE_DB_URL do ambiente, exige destino local e autorização de fixtures. Lotes de até 100 organizações têm BEGIN/COMMIT ou ROLLBACK, timeout e checkpoint em `checkpoint.json`. `batches.jsonl` registra IDs afetados, contagens, duração e código de erro. Lote marcado failed impede repetição automática. Não há UPDATE de vínculo: nem revogação, suspensão ou versão material são restauradas pelo backfill.

Varredura por UUID e reconciliação reexaminam deltas em até dez passagens. Escritores legados continuam sem dual write nesta fase; não se declara gate COMPAT nem garantia contra escrita posterior à verificação final. Hash global detecta mudança concorrente em dados legados e interrompe a conclusão.

Base inicial efetivamente vazia: duas execuções operacionais completas, zero lotes e zero linhas afetadas. Nenhum dado real foi utilizado. Nos testes positivos cada lote contém três organizações, três sujeitos novos, três vínculos novos e três atividades atualizadas, com rollback ao final de cada teste.
