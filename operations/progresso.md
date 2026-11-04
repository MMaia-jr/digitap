# A Praça v1.5 — progresso atual

Atualizado em 04/11/2026 após incremento 2C.

- Validação local de autenticação A01–A09: **PASS**, 9 cenários reais Chromium/Next/Supabase; 0 FAIL/SKIP. Expiração exercitada com datas controladas somente nas fixtures reais; sem espera natural prolongada.
- Unidade/componentes: **129 PASS**; lint, typecheck e build exit 0.
- Integração anterior: 89 PASS; probe Auth/API anterior: 17 PASS. Não repetidos nesta etapa.
- Corrigida corrida de envio antes de hidratação, com RED 1 FAIL + 1 PASS → GREEN 2 PASS e E2E completo verde.
- Publicação/editorial não implementados: testes de impossibilidade comprovam 404 no recorte, não um futuro workflow.
- Next encerrado; Supabase local preservado sem operações de infraestrutura neste incremento. Ressalvas da prova de rede anterior permanecem.
- Sem autorização de produção/publicação. Não iniciar incremento 3.

[Relatório verificável](incremento-2c.md) · [Matriz](../specs/matriz-testes-v1.5.md) · [Evidências](evidence/incremento-2c/)

## Checkpoint e proposta seguinte

Preparação do checkpoint local concluída, sem stage/commit. [Lista exata e proposta](checkpoint-incremento-2.md). Matriz ressalta nova prova obrigatória para A07 quando publicação existir e tempo controlado em A08. [B01–B04 propostos](proposta-incremento-3-b01-b04.md), sem código iniciado; aguardar aprovação humana.
