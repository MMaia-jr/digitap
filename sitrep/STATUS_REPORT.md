# A Praça — Status Report

> **Checkpoint documental — 22/11/2026 (LIC-01B).** Na branch isolada `docs/lic-01-20261122`, foram adicionados `LICENSE` (AGPLv3 oficial, versão fixa 3), `LICENSE-DOCS.md`, `CONTRIBUTING.md`, SPDX `AGPL-3.0-only`, esclarecimentos no README/Termos e notas no plano/status. O texto oficial foi obtido da fonte GNU indicada; a versão CC BY-SA 4.0 foi conferida no legalcode oficial. `git diff --check` e checks documentais passaram. Não houve mudança de runtime, dependência, banco ou serviço remoto. A licença cobre somente contribuições originais com autoridade para licenciar e documentação original autorizada; não transfere titularidade institucional. O código associado ao ZIP ValueFlows permanece com proveniência/licença pendente e explicitamente não declarado como coberto; capturas, marcas, usuários, dados pessoais, segredos e material de terceiros permanecem excluídos. Isso não equivale a revisão jurídica nem declara o repositório inteiro com direitos regularizados.

> **Checkpoint técnico — 22/11/2026 (INC-OSS-01D).** Na worktree `release/inc-oss-01d-20261122`, handlers autenticados conectam o serviço OSS-01C à tela de detalhes do registro: upload assinado, confirmação, listagem confirmada e leitura privada. PostgreSQL + Storage local: 8/8; Playwright DOG-01 direcionado: 1/1; Vitest completo: 965/965; testes direcionados de componente/contrato: 34/34; TypeScript PASS; ESLint zero erros/quatro avisos; `git diff --check` PASS; `beta:check` confirmou loopback, 15 migrations sem pendências e zero usuários sintéticos residuais. Build Turbopack falhou por resolução do pacote Next através do symlink externo; build `--webpack` PASS. Evidência sanitizada em `operations/evidence/inc-oss-01d-green-20261122-7/`. Fixture bucket foi temporário e limpo. Nada aqui comprova Storage/Cloud, Auth online, uso humano, adoção ou homologação; URL assinada anterior permanece válida até o TTL de até 300 segundos.

> **Checkpoint técnico — 22/11/2026 (INC-OSS-01C).** Na branch isolada `release/inc-oss-01c-20261122`, foi criado um adaptador server-only para Supabase Storage com o SDK já instalado. RED dos contratos e das autorizações PostgreSQL foi observado antes da implementação; depois, integração PostgreSQL + Storage local passou 12/12, incluindo upload e leitura dos mesmos bytes, estados pendente/confirmado, negação entre titulares, PF/coletivo/organização, revogação, concorrência e limpeza do bucket temporário. Vitest completo: 961/961; TypeScript PASS; ESLint zero erros e quatro avisos. `beta:check`: 15 migrations reconhecidas sem pendências e zero contas sintéticas; buckets temporários OSS-01C: zero. Build não validado: Turbopack não resolveu `next/package.json` através do `node_modules` compartilhado fora da raiz da worktree; nenhuma dependência foi instalada ou copiada. A integração permanece no nível do serviço/adaptador, sem rota ou interface de produto e sem validação Cloud.

> **Checkpoint técnico — 22/11/2026 (INC-EST-02/03).** A worktree candidata local `release/inc-est-03-20261122`, iniciada em `e6cae4c9`, verificou C01 em cinco execuções Chromium sucessivas após sincronizar pelas respostas reais da API; o timeout anterior não teve causa-raiz comprovada. A suíte PostgreSQL de publicação passou 35/35, incluindo DTO/PATCH e revogação concorrente; E2E atividades 5/5, registros C02–C04 1/1 e portfólio 3/3; Vitest 957/957, TypeScript e build passaram. ESLint: zero erros e quatro avisos preexistentes. `beta:check`: 15 migrations locais reconhecidas, sem pendências e zero contas sintéticas residuais. É evidência local da candidata, não homologação online, uso humano ou paridade Cloud.

> **CÓDIGO experimental — ValueFlows.** Foi adicionada uma função pura de projeção pública E4 → JSON-LD ValueFlows, sem rota ou persistência, com teste específico 8/8. O mapeamento é provisório; o envelope de proveniência é específico do DigItap e não declara verificação.

> **Pendências mantidas.** Estado online de Supabase/Auth, TLS, migrations, backups e políticas não foi verificado nesta execução. `pode_editar` foi corrigido para refletir o escopo ativo do PATCH; a corrida revogação/PATCH foi exercitada localmente sob lock transacional. DOG-01, VH-01–VH-03, D14–D17 e adoção continuam sem prova humana. O PR #2 One Tap/Memória permanece hipótese documental segundo o registro fornecido; não foi integrado aqui.

> **Nota de contexto — 21/11/2026.** Os incrementos I1–I4 documentam o desenvolvimento técnico do DigItap.
> Os campos de fase, progresso e último commit abaixo descrevem o checkpoint histórico de 06/11.
> Em 21/11, a branch local `release/beta-fechado-20261116` registrou `76f1c7f` (implementação)
> e `1c01271` (registro documental). A constituição, a governança e a validação comunitária
> de A Praça dependem de atos e evidências próprios. Esses commits locais não comprovam tais marcos.

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
