# A Praça — Plano

## O que é

Infraestrutura cívica e comunitária para Itaperuna (RJ). Inclui pessoas físicas e coletivos informais, não só organizações. Critério de progresso é humano.

## Fases

- I1 Fundação: ✅ concluído
- I2 Autenticação: ✅ concluído
- I3 Atividades/Editorial/Evidências: ✅ concluído (20/20 cenários, commit 623ee50)
- I4 Titularidade inclusiva: 🔄 3/4 (EXPAND 27e81fc, BACKFILL 0f27cba, COMPAT 70c7ef9; CUTOVER pendente)
- I5 Validação humana: ⏳ não iniciado (VH-01, VH-02, VH-03)
- I6+ Portfólio/Contas/IA/Rede: ⏳ condicional ao I5

## Próximo passo (CUTOVER)

Abrir o sistema para PF/coletivo:

1. atividades.organizacao_id nullable para PF/coletivo
2. contas_acesso.papel ganha 'publicador'
3. Snapshot v2: sujeito {id, tipo, nome_publico}
4. Trigger de coerência organizacao_id ↔ sujeito_id
5. Release de recuperação inclusivo

## Decisões pendentes para CUTOVER

- Formato do snapshot v2
- Regressão B01-C08 com trigger novo
- Plano de rollback pós-CUTOVER
