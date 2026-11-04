# A Praça v1.5 — progresso atual

Atualização: 04/11/2026. Base: commit 954299ece3c831003a221efc37adc9ba304ded2b.

- Incremento 3, recorte B01–B04: **PASS no ambiente local**, com criação/edição de rascunhos privados e envio para enviada, mantendo privacidade.
- Testes finais: **183 PASS** em unidade/componentes, **100 PASS** em integração real (89 anteriores + 11 novos), **13 PASS** em Chromium/Next reais (9 Auth + 4 atividades); 0 FAIL/SKIP nessas suítes.
- Lint, typecheck e build: exit 0; pg 8.23.1 existente promovido a dependência runtime sem instalação.
- Atomicidade comprovada em PostgreSQL: envio + evento na mesma transação; erro FK na auditoria reverte envio; concorrência/retry sem duplicação.
- Nove tabelas/RLS/grants permanentes e ambas as migrações preservados. Sem snapshots ou publicação.
- A07 **PENDENTE no aceite integral**, exige nova prova quando existir publicação. A08: PASS com datas controladas das fixtures.
- Fixtures desta execução removidas com autorização específica; nenhum dado anterior excluído. Next encerrado; Supabase preservado, sem start/stop/configuração.
- Sem migração, instalação, commit, push, deploy ou operação remota nesta etapa. B05–B12 não implementados; aguardar nova decisão humana.

[Relatório](incremento-3-b01-b04.md) · [Evidências](evidence/incremento-3-b01-b04/) · [Matriz](../specs/matriz-testes-v1.5.md)

## Checkpoint B01–B04

Revisão e stage preparados conforme [manifesto exato](checkpoint-b01-b04-files.txt) e [relatório](checkpoint-b01-b04.md). Aguarda autorização explícita para commit; B05–B06 continuam não iniciados. A07 permanece PENDENTE. A preparação do checkpoint não repetiu as suítes nem alterou código funcional, dados ou infraestrutura.
