# A Praça — Status Report

> **Last Updated:** 2026-11-06 — duas sessões de instalação registradas
> **Projeto:** A Praça
> **Fase atual:** I4 — CUTOVER (pendente; não iniciado)
> **Progresso:** I3 100%, I4 75% (3 de 4 fases)
> **Último commit de implementação:** `70c7ef9` — COMPAT
> **Próximo:** decidir snapshot v2 e trigger de coerência antes de codar

## Progresso por incremento

| Incremento | Estado | Evidência / próximo passo |
|---|---|---|
| I1 Fundação | Concluído | Base fundacional do projeto |
| I2 Autenticação | Concluído | Fluxo de autenticação implementado |
| I3 Atividades/Editorial/Evidências | 100% | B01–B12/C01–C08: 20/20 cenários PASS; commit `623ee50` |
| I4 Titularidade inclusiva | 75% | EXPAND `27e81fc`, BACKFILL `0f27cba`, COMPAT `70c7ef9`; CUTOVER pendente |
| I5 Validação humana | Não iniciado | VH-01, VH-02 e VH-03 com uma pessoa real; não substituir por testes |
| I6+ Portfólio/Contas/IA/Rede | Condicional | Depende do resultado de I5; sem autorização para iniciar |

## Estado do I4

- EXPAND: seis tabelas novas, sujeito_id nullable em atividades, RLS deny-by-default; 22 testes RED→GREEN.
- BACKFILL: script idempotente `scripts/i4-backfill.mjs`; oito testes PG PASS, fixtures fictícias e base real vazia.
- COMPAT: wrapper transacional de onboarding, grants service_role e função legada intacta; 10/10 PG e 41/41 E2E PASS.
- CUTOVER: não iniciado. Abrirá publicação para PF/coletivos após decisões e autorização específica.

## Próximas decisões e riscos

1. Definir o formato exato do snapshot v2 e sua compatibilidade com v1.
2. Definir o trigger de coerência organizacao_id ↔ sujeito_id preservando a regressão B01–C08.
3. Definir rollback pós-CUTOVER com release de recuperação inclusivo; preservar leitura/moderação de conteúdo PF/coletivo, sem voltar ao I3 puro.

As decisões D1–D9 e a Opção C do COMPAT permanecem aprovadas. Não reabrir decisões nem iniciar implementação de CUTOVER nesta atualização documental.

## Referências e contexto Git

- Checkpoint manual: `ESTADO_ATUAL.md` (intacto).
- Plano detalhado e invariantes: `docs/plans/I4-2026-11-05.md`.
- Evidências: `operations/evidence/incremento-i4-*/`.
- Após COMPAT, houve o checkpoint documental `73e4a90`, a instalação SitRep `2ce7639`, o selfheal `175b80d` e as sessões `1ad4925` e `f700fd2`.
- Branch de trabalho: `docs/sitrep-setup`; sem merge na main.

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
