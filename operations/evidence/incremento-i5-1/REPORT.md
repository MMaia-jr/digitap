# I5.1 — Parte A: governança visível

Data: 06/11/2026. HEAD de base: 1d697c41df1a9377c6ca76d738373f289ab6d406. Sem commit.

## Escopo

Página pública /governanca, acréscimo no footer compartilhado, documentação interna e três testes E2E novos. Nenhuma conta criada; nenhuma migration ou alteração em autenticação, permissões, banco, testes existentes ou matriz.

## TDD

| ID | Pré-condição | Ação | Resultado esperado | Arquivo / tipo |
|---|---|---|---|---|
| GG-01 | Visitante sem sessão | GET /governanca | 200, título, nome e canal no conteúdo principal | tests/e2e/governanca.spec.mjs / E2E |
| GG-02 | Visitante na home | Ler footer | Link Governança para /governanca | mesmo arquivo / E2E |
| GG-03 | Visitante na home | Ler footer | Link Contestar com mailto correto | mesmo arquivo / E2E |

RED antes da implementação: exit 1, 0 PASS, 3 FAIL, 0 SKIP. GG-01 recebeu 404 em vez de 200; GG-02 e GG-03 não encontraram os links. Saída em red.log e red-e2e.json.

GREEN direcionado: exit 0, 3 PASS, 0 FAIL, 0 SKIP. Saída em green.log e green-e2e.json.

## Regressão

- npm test: exit 0, 389/389, 37 arquivos.
- A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db: exit 0, 206/206, 9 arquivos.
- E2E completo com fixtures locais e A_PRACA_EVIDENCE_DIR=operations/evidence/incremento-i5-1: exit 0, 47 PASS, 0 FAIL, 0 SKIP.
- B01–B12 + C01–C08: 20/20 critérios PASS, conferidos sobre e2e.json desta execução; detalhamento em i3-20-criteria.json. C02–C04 compartilham um cenário.
- npm run build: exit 0; /governanca pré-renderizada estática.
- npm run lint: exit 0.
- npm run typecheck: exit 0.
- git diff --check: exit 0.

Saídas brutas nos arquivos *.log; códigos observados dos comandos em exit-codes.json. O servidor foi reiniciado entre RED e GREEN e encerrado antes do build. A mudança automática de next-env.d.ts produzida pelo build foi revertida ao conteúdo exato do HEAD antes do typecheck.

## Revisão

Página sem login, sem acesso ao banco e sem JavaScript de cliente adicional. Título e subtítulos semânticos, data com time/dateTime, footer com navegação identificada, links de e-mail. Preservados aviso e link de privacidade anteriores.

A documentação diferencia operação editorial atual de formalização futura. A custódia de dados pessoais não é descrita como propriedade de livre transferência. O prazo e o canal são compromissos públicos manuais: esta Parte A não implementa registro automatizado de decisões/contestações.

Bloqueios: nenhum. Pronto para revisão humana: SIM. Aguardar “ok commit i5.1-A”.
