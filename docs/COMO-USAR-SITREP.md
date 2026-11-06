# Como usar o SitRep (getsitrep)

O SitRep é a camada de estado automática do repo. Ele lê e escreve
`sitrep/STATUS_REPORT.md` para que qualquer agente (Codex, Claude, GPT)
saiba onde o projeto está no início da sessão.

## Comandos essenciais

| Comando | Quando | O que faz |
|---|---|---|
| `getsitrep session-start` | Início da sessão | Lê o estado e orienta o agente |
| `getsitrep session-end` | Fim da sessão | Atualiza progresso, custos, decisões. Commita. |
| `getsitrep sitrep` | Qualquer momento | Leitura rápida (read-only) do estado |
| `getsitrep handoff` | Trocar de contexto | Gera HANDOFF.md para outro agente/pessoa |

## O que é gerado (pasta sitrep/)

- `MANIFEST.md`: referência do framework (não editar à mão)
- `PROJECT_PLAN.md`: o que construir (fases, decisões, riscos)
- `STATUS_REPORT.md`: onde estamos (tarefas, progresso, sessões)
- `HANDOFF.md`: pacote de contexto para outro agente
- `.sitrep-data.json`: custos/tokens (máquina)
- `history/`: logs por sessão (nunca apagados)
- `dashboard.html`: relatório visual (abrir no browser)

## Fluxo diário

1. Abrir Codex no repo.
2. `getsitrep session-start` (ou `/session-start` se o agente suportar).
3. Trabalhar normalmente.
4. `getsitrep session-end` (ou `/session-end`).
5. O commit do estado é automático.

## Relação com o ESTADO_ATUAL.md

O `ESTADO_ATUAL.md` (manual) continua sendo o checkpoint de leitura rápida.
O SitRep é a versão automática, versionada em `sitrep/`. Os dois convivem:
o manual para humanos, o automático para agentes.

## O que NÃO fazer

- Não editar `MANIFEST.md` à mão.
- Não apagar `history/` (é memória do projeto).
- Não commitar `.sitrep-active-session` (efêmero; deve estar no .gitignore).
- Não usar o SitRep como substituto do plano (`docs/plans/`).
