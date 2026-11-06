# A Praça — Status Report

> **Last Updated:** 2026-11-06 — fechamento técnico do I4 autorizado
> **Projeto:** A Praça
> **Fase atual:** I4 concluído tecnicamente; I5 próximo (não iniciado)
> **Progresso:** I3 100%, I4 100% (4 de 4 fases)
> **Último commit de implementação:** `42be755` — CUTOVER
> **Próximo:** I5 — validação humana (VH-01 compreensão, VH-02 uso, VH-03 decisão)

CUTOVER técnico completo, com lacuna documentada: base vazia, sem PF/coletivo real ainda. A prova humana fica em I5; o fechamento técnico não equivale à validação humana nem comprova uso real.

## Progresso por incremento

| Incremento | Estado | Evidência / próximo passo |
|---|---|---|
| I1 Fundação | Concluído | Base fundacional do projeto |
| I2 Autenticação | Concluído | Fluxo de autenticação implementado |
| I3 Atividades/Editorial/Evidências | 100% | B01–B12/C01–C08: 20/20 cenários PASS; commit `623ee50` |
| I4 Titularidade inclusiva | 100% — técnico | EXPAND `27e81fc`, BACKFILL `0f27cba`, COMPAT `70c7ef9`, CUTOVER `42be755` |
| I5 Validação humana | Próximo, não iniciado | VH-01 compreensão, VH-02 uso, VH-03 decisão com uma pessoa real; não substituir por testes |
| I6+ Portfólio/Contas/IA/Rede | Condicional | Depende do resultado de I5; sem autorização para iniciar |

## Estado do I4

- EXPAND: seis tabelas novas, sujeito_id nullable em atividades, RLS deny-by-default; 22 testes RED→GREEN.
- BACKFILL: script idempotente `scripts/i4-backfill.mjs`; oito testes PG PASS, fixtures fictícias e base real vazia.
- COMPAT: wrapper transacional de onboarding, grants service_role e função legada intacta; 10/10 PG e 41/41 E2E PASS.
- CUTOVER `42be755`: concluído tecnicamente com fechamento autorizado; organizacao_id nullable, papel publicador e leitor dual v1/v2. Prova humana pendente em I5; ainda sem PF/coletivo real.

## Próximo incremento e dívida técnica

1. I5: realizar VH-01 compreensão, VH-02 uso e VH-03 decisão com uma pessoa real de Itaperuna. Não substituir os gates humanos por testes.
2. CONTRACT: migrar organizações v1→v2 em I5 ou, no máximo, I6, com autorização específica; sem reescrever snapshots v1 existentes ou recalcular seus hashes.
3. Preservar leitura inclusiva e os limites de recuperação registrados no plano. Os limites técnicos da prova atual permanecem documentados em `operations/evidence/incremento-i4-cutover/FIXTURE-REGRESSION.md`.

As decisões D1–D9 e a Opção C do COMPAT permanecem aprovadas. Esta atualização documental não inicia I5 nem autoriza I6+.

## Referências e contexto Git

- Checkpoint manual: `ESTADO_ATUAL.md` (intacto).
- Plano detalhado e invariantes: `docs/plans/I4-2026-11-05.md`.
- Evidências: `operations/evidence/incremento-i4-*/`.
- Após COMPAT, houve o checkpoint documental `73e4a90`, a instalação SitRep `2ce7639`, o selfheal `175b80d` e as sessões `1ad4925` e `f700fd2`.
- SitRep integrado à `main` pelo merge `4910275`; CUTOVER commitado em `42be755`. Branch de trabalho atual: `main`.

## Session Log

### Session 2 — 2026-11-06
- **User:** D.Morpheus
- **Branch:** docs/sitrep-setup
- **Since Session 1:** (not provided)
- **Focus:** (not provided)
- **Done:** None recorded
- **Blockers:** None
- **Tokens:** not tracked
- **Model:** unknown
- **Next:** (not provided)
### Session 1 — 2026-11-06
- **User:** D.Morpheus
- **Branch:** docs/sitrep-setup
- **Since Session:** — (this is the first recorded session)
- **Focus:** (not provided)
- **Done:** None recorded
- **Blockers:** None
- **Tokens:** not tracked
- **Model:** unknown
- **Next:** (not provided)
