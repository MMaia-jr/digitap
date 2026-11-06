# A Praça — Plano

## O que é

Infraestrutura cívica e comunitária para Itaperuna (RJ). Inclui pessoas físicas e coletivos informais, não só organizações. Critério de progresso é humano.

## Fases

- I1 Fundação: ✅ concluído
- I2 Autenticação: ✅ concluído
- I3 Atividades/Editorial/Evidências: ✅ concluído (20/20 cenários, commit 623ee50)
- I4 Titularidade inclusiva: ✅ 4/4 fases concluídas tecnicamente (EXPAND 27e81fc, BACKFILL 0f27cba, COMPAT 70c7ef9, CUTOVER 42be755)
- I5 Validação humana: ⏳ próximo, não iniciado (VH-01 compreensão, VH-02 uso, VH-03 decisão)
- I6+ Portfólio/Contas/IA/Rede: ⏳ condicional ao I5

## Próximo passo (I5 — validação humana)

CUTOVER técnico completo, com fechamento autorizado e lacuna documentada: base vazia, sem PF/coletivo real ainda. A prova humana fica em I5, com uma pessoa real de Itaperuna, sem substituí-la por testes automatizados.

1. VH-01 — compreensão
2. VH-02 — uso
3. VH-03 — decisão

I6+ permanece condicional ao resultado de I5. Esta atualização não inicia a validação humana nem autoriza fases posteriores.

## Dívida CONTRACT — prazo I5 ou I6

Migrar organizações de v1 para v2 na fase CONTRACT posterior, durante I5 ou, no máximo, I6, mediante autorização específica. Até lá, organizações continuam gerando v1 e PF/coletivos usam v2, com leitor dual. Não reescrever snapshots v1 existentes nem recalcular seus hashes.

Plano detalhado: `docs/plans/I4-2026-11-05.md`. Lacunas e limites da verificação: `operations/evidence/incremento-i4-cutover/FIXTURE-REGRESSION.md`.
