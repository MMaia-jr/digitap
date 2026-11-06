# I4 EXPAND — testes antes de DDL

Base: 52f4e2ac493f5f0c5531cec81604b65f6710b7a2; árvore inicialmente limpa.
Autorização complementar: somente UNIQUE (id, atividade_id) em registros_realizacao.

| ID | Pré-condição | Ação | Resultado esperado após implementação | Arquivo | Tipo |
|---|---|---|---|---|---|
| I4-P01 | Schema legado / conta fictícia local | Inserir pai PF e filha, forçar constraints | Estrutura existe e relação válida | tests/i4/expand.database.test.ts | PG |
| I4-P02 | Pai coletivo | Inserir filha PF | 23503, FK composta | tests/i4/expand.database.test.ts | PG |
| I4-P03 | Pai PF | Inserir filha coletivo | 23503, FK composta | tests/i4/expand.database.test.ts | PG |
| I4-P04 | Pai PF ou coletivo sem filha | COMMIT | 23514, constraint trigger adiada | tests/i4/expand.database.test.ts | PG |
| I4-P05 | PF da conta A | Inserir segunda PF de A | 23505, UNIQUE | tests/i4/expand.database.test.ts | PG |
| I4-P06 | Organização A, sujeito da B | Criar atividade de A com sujeito B | 23514, incoerência recusada | tests/i4/expand.database.test.ts | PG |
| I4-P36 | Seis tabelas novas | Catálogo + SELECT/INSERT/UPDATE/DELETE sob anon/authenticated | RLS, zero policies, zero privilégios, 42501 | tests/i4/expand.database.test.ts | PG |
| H02 legado | Nove tabelas antigas | Mesmas provas de catálogo/operações | Deny-by-default preservado | tests/i4/expand.database.test.ts | PG |
| I4-P44 (pendente CUTOVER; fora de EXPAND) | Autorização I4 ausente | Invocar contrato unitário com flag/metadata/sujeito forjados | Contract pending, GREEN in CUTOVER | tests/i4/autopublication.test.ts | U |

Config dedicada: vitest.i4-expand.config.ts. Nenhuma alteração nos testes I3.
Fixtures PG usam UUIDs próprios e rollback; P04 limpa apenas seus IDs se um COMMIT indevido passar.
Falha de preflight/CLI não comprova RED estrutural do banco.
P44 especifica contrato unitário futuro; sua ausência comprova somente a falta de implementação I4. Não testa nem acusa bypass no fluxo I3.
