# Reconciliação documental — Dias 1–2

## Pré-condição e escopo

[CÓDIGO] `git status --short` retornou vazio antes da inspeção. `git log --oneline -3` retornou `f9a39b1`, `e0bcb48`, `7f1324b`. A base desta revisão é `f9a39b1`; `docs/00-master-context.md` foi lido integralmente antes das edições.

[CÓDIGO] Fontes desta revisão: arquivos, migrations e evidências versionadas. Nenhum banco, Docker, API, DNS ou painel remoto foi consultado. Nenhum teste foi executado; a única validação de execução prevista é o build. Somente README.md, operations/progresso.md e este relatório são arquivos autorizados para alteração/criação.

[CÓDIGO] A legenda usada é: implementação/registro no repo; [INFORMADO] identifica declaração do proponente; [PENDENTE] identifica verificação externa/remota necessária. As listas abaixo usam [CÓDIGO] para existência de arquivos, não para certificar comportamento em execução.

## Diferenças e correções documentais

- [CÓDIGO] O README anterior (`f9a39b1:README.md`) iniciava com deploy/fornecedores em forma afirmativa antes de limitar a fonte. A nova redação marca essas informações como [INFORMADO] e separa confirmação remota como [PENDENTE].
- [CÓDIGO] O progresso anterior empilhava checkpoints com resultados e restrições de épocas diferentes, inclusive Docker indisponível versus retomada posterior e “I3 não concluído” no histórico. Foi substituído por resumo corrente com fontes e histórico explicitamente identificado, sem alterar os relatórios originais.
- [CÓDIGO] Projetos, `projeto_id` e bio já estavam na migration e na interface; foram documentados como estrutura definida em SQL/código, sem afirmar presença atual em banco.
- [CÓDIGO] Privacidade, termos, contestação, footer e dashboards diferenciados já existiam; a reconciliação registra os caminhos e não cria/revisa páginas de aplicação.
- [CÓDIGO] O PDF já era corretamente associado à impressão no README; foi mantido e detalhado como `window.print()` + “Salvar como PDF”, sem serviço de geração no servidor.
- [CÓDIGO] Foi explicitada a diferença entre aceitar Auth Cloud (`config.server.ts`) e restringir consultas PostgreSQL ao loopback (`database.server.ts`), omitida na orientação anterior de configuração de produção.
- [CÓDIGO] Totais antigos agora aparecem como o que os arquivos de evidência registram, e não como testes repetidos ou aprovação atual do núcleo. A divergência 403/404 e E2E não executado foram preservados como registros históricos.
- [CÓDIGO] O contexto canônico conserva gates I5 e um snapshot que diz I4 apenas especificado; os arquivos atuais de PF, migrations e portfólio existem. A reconciliação distingue existência de implementação de aprovação histórica, sem editar o contexto canônico nem declarar gates satisfeitos.

## Pendências e motivo

- [INFORMADO] Deploy em `www.digitap.com.br`, Vercel, Supabase Cloud, Oregon, banco migrado e Resend funcional são informações do proponente, não conclusões desta inspeção.
- [PENDENTE] DNS/TLS, deployment/commit servido e variáveis Vercel exigem evidência remota; não são dedutíveis dos componentes.
- [PENDENTE] Região real do Supabase, migrations/RLS/grants ativos e `Enable Signup` exigem inspeção Cloud. Migration em arquivo não comprova execução; rota de cadastro não comprova cadastro aberto.
- [PENDENTE] Funcionamento PostgreSQL em produção precisa ser confrontado com o guard local observado no código; o repositório não prova como o deployment resolve isso.
- [PENDENTE] Entrega real de e-mail, backups, retenção, cobertura de Storage e restore exigem evidência do serviço/ambiente e ensaio autorizado posterior.
- [PENDENTE] Efetividade dos canais, situação institucional, transferência internacional e gates humanos dependem de fontes externas ao código. Textos publicados e build não comprovam essas condições.

## Verificações de existência

- [CÓDIGO] `/privacidade`: `src/app/privacidade/page.tsx`; `/termos`: `src/app/termos/page.tsx`.
- [CÓDIGO] Footer com contestação e e-mail: `src/app/layout.tsx`; procedimento: `src/app/contestacao/page.tsx`.
- [CÓDIGO] Portfólio: `src/app/perfil/[id]/page.tsx`; PDF por impressão: `src/components/PrintPortfolioButton.tsx`; leitura/agregação: `src/lib/queries/portfolio.server.ts`.
- [CÓDIGO] Dashboards distintos: `src/app/dashboard/page.tsx` e `src/app/dashboard/pessoa-fisica/page.tsx`.
- [CÓDIGO] `public.projetos`, `public.atividades.projeto_id` e `public.sujeitos_publicadores.bio`: definidos por `supabase/migrations/20261109145628_projetos_bio_portfolio.sql`; usados em `src/components/PublisherPresentation.tsx` e consultas de projetos/portfólio. Nenhuma query foi feita.

## Inventário de arquivos

### Páginas

[CÓDIGO] 23 arquivos encontrados nesta categoria.

- [CÓDIGO] `/admin/atividades` — `src/app/admin/atividades/page.tsx`.
- [CÓDIGO] `/atividade/[id]` — `src/app/atividade/[id]/page.tsx`.
- [CÓDIGO] `/atividades` — `src/app/atividades/page.tsx`.
- [CÓDIGO] `/auth/confirm` — `src/app/auth/confirm/page.tsx`.
- [CÓDIGO] `/cadastro` — `src/app/cadastro/page.tsx`.
- [CÓDIGO] `/cadastro/pessoa-fisica/completar` — `src/app/cadastro/pessoa-fisica/completar/page.tsx`.
- [CÓDIGO] `/cadastro/pessoa-fisica` — `src/app/cadastro/pessoa-fisica/page.tsx`.
- [CÓDIGO] `/contestacao` — `src/app/contestacao/page.tsx`.
- [CÓDIGO] `/dashboard/atividade/[id]` — `src/app/dashboard/atividade/[id]/page.tsx`.
- [CÓDIGO] `/dashboard/nova-atividade` — `src/app/dashboard/nova-atividade/page.tsx`.
- [CÓDIGO] `/dashboard/organizacao` — `src/app/dashboard/organizacao/page.tsx`.
- [CÓDIGO] `/dashboard` — `src/app/dashboard/page.tsx`.
- [CÓDIGO] `/dashboard/pessoa-fisica/atividade/[id]/evidencia` — `src/app/dashboard/pessoa-fisica/atividade/[id]/evidencia/page.tsx`.
- [CÓDIGO] `/dashboard/pessoa-fisica/nova` — `src/app/dashboard/pessoa-fisica/nova/page.tsx`.
- [CÓDIGO] `/dashboard/pessoa-fisica` — `src/app/dashboard/pessoa-fisica/page.tsx`.
- [CÓDIGO] `/dashboard/projetos/[id]/colaboradores` — `src/app/dashboard/projetos/[id]/colaboradores/page.tsx`.
- [CÓDIGO] `/governanca` — `src/app/governanca/page.tsx`.
- [CÓDIGO] `/login` — `src/app/login/page.tsx`.
- [CÓDIGO] `/` — `src/app/page.tsx`.
- [CÓDIGO] `/perfil/[id]` — `src/app/perfil/[id]/page.tsx`.
- [CÓDIGO] `/privacidade` — `src/app/privacidade/page.tsx`.
- [CÓDIGO] `/recuperar-acesso` — `src/app/recuperar-acesso/page.tsx`.
- [CÓDIGO] `/termos` — `src/app/termos/page.tsx`.

### Handlers API

[CÓDIGO] 23 arquivos encontrados nesta categoria.

- [CÓDIGO] `/api/admin/atividades/[id]/autorizacoes/revogar` — `src/app/api/admin/atividades/[id]/autorizacoes/revogar/route.ts`.
- [CÓDIGO] `/api/admin/atividades/[id]/decidir` — `src/app/api/admin/atividades/[id]/decidir/route.ts`.
- [CÓDIGO] `/api/admin/atividades/[id]/programacao` — `src/app/api/admin/atividades/[id]/programacao/route.ts`.
- [CÓDIGO] `/api/admin/atividades/[id]/publicar` — `src/app/api/admin/atividades/[id]/publicar/route.ts`.
- [CÓDIGO] `/api/admin/atividades/[id]/registro/revisar` — `src/app/api/admin/atividades/[id]/registro/revisar/route.ts`.
- [CÓDIGO] `/api/admin/atividades/[id]/relato` — `src/app/api/admin/atividades/[id]/relato/route.ts`.
- [CÓDIGO] `/api/admin/atividades/[id]/retirar` — `src/app/api/admin/atividades/[id]/retirar/route.ts`.
- [CÓDIGO] `/api/admin/atividades/[id]/revisar` — `src/app/api/admin/atividades/[id]/revisar/route.ts`.
- [CÓDIGO] `/api/atividades/[id]/confirmacoes/resumo` — `src/app/api/atividades/[id]/confirmacoes/resumo/route.ts`.
- [CÓDIGO] `/api/atividades/[id]/confirmacoes` — `src/app/api/atividades/[id]/confirmacoes/route.ts`.
- [CÓDIGO] `/api/atividades/[id]/enviar` — `src/app/api/atividades/[id]/enviar/route.ts`.
- [CÓDIGO] `/api/atividades/[id]/realizacao` — `src/app/api/atividades/[id]/realizacao/route.ts`.
- [CÓDIGO] `/api/atividades/[id]/registro/contestar` — `src/app/api/atividades/[id]/registro/contestar/route.ts`.
- [CÓDIGO] `/api/atividades/[id]/registro/enviar` — `src/app/api/atividades/[id]/registro/enviar/route.ts`.
- [CÓDIGO] `/api/atividades/[id]/registro/evidencias` — `src/app/api/atividades/[id]/registro/evidencias/route.ts`.
- [CÓDIGO] `/api/atividades/[id]/registro` — `src/app/api/atividades/[id]/registro/route.ts`.
- [CÓDIGO] `/api/atividades/[id]` — `src/app/api/atividades/[id]/route.ts`.
- [CÓDIGO] `/api/atividades` — `src/app/api/atividades/route.ts`.
- [CÓDIGO] `/api/auth/[action]` — `src/app/api/auth/[action]/route.ts`.
- [CÓDIGO] `/api/organizacoes` — `src/app/api/organizacoes/route.ts`.
- [CÓDIGO] `/api/public/atividades/[id]/registro` — `src/app/api/public/atividades/[id]/registro/route.ts`.
- [CÓDIGO] `/api/public/atividades/[id]` — `src/app/api/public/atividades/[id]/route.ts`.
- [CÓDIGO] `/api/public/atividades` — `src/app/api/public/atividades/route.ts`.

[CÓDIGO] Handler adicional fora de `src/app/api/`: `/auth/callback` em `src/app/auth/callback/route.ts`.

### Serviços nos padrões solicitados

[CÓDIGO] 2 arquivos encontrados nesta categoria.

- [CÓDIGO] `src/lib/activities/service.server.ts`.
- [CÓDIGO] `src/lib/auth/gateway.server.ts`.

[CÓDIGO] O módulo de participação também tem `src/lib/participation/service.ts` e `runtime.server.ts`, fora do padrão literal solicitado. Consultas adicionais ficam em `src/lib/queries/`.

### Integração

[CÓDIGO] 11 arquivos encontrados nesta categoria.

- [CÓDIGO] `tests/integration/activities.database.test.ts`.
- [CÓDIGO] `tests/integration/editorial-cycle.database.test.ts`.
- [CÓDIGO] `tests/integration/onboarding.database.test.ts`.
- [CÓDIGO] `tests/integration/participation.database.test.ts`.
- [CÓDIGO] `tests/integration/pf-activities.database.test.ts`.
- [CÓDIGO] `tests/integration/publication.database.test.ts`.
- [CÓDIGO] `tests/integration/record-editorial.database.test.ts`.
- [CÓDIGO] `tests/integration/records.database.test.ts`.
- [CÓDIGO] `tests/integration/review.database.test.ts`.
- [CÓDIGO] `tests/integration/revisions.database.test.ts`.
- [CÓDIGO] `tests/integration/scheduling.database.test.ts`.

### E2E

[CÓDIGO] 19 arquivos encontrados nesta categoria.

- [CÓDIGO] `tests/e2e/activities.spec.mjs`.
- [CÓDIGO] `tests/e2e/auth.spec.mjs`.
- [CÓDIGO] `tests/e2e/collaboration.spec.mjs`.
- [CÓDIGO] `tests/e2e/cookie-refresh.spec.mjs`.
- [CÓDIGO] `tests/e2e/design-navigation.spec.mjs`.
- [CÓDIGO] `tests/e2e/editorial-cycle.spec.mjs`.
- [CÓDIGO] `tests/e2e/governanca.spec.mjs`.
- [CÓDIGO] `tests/e2e/i4-compat.spec.mjs`.
- [CÓDIGO] `tests/e2e/i5-pf.spec.mjs`.
- [CÓDIGO] `tests/e2e/mvp-visivel.spec.mjs`.
- [CÓDIGO] `tests/e2e/participation.spec.mjs`.
- [CÓDIGO] `tests/e2e/portfolio.spec.mjs`.
- [CÓDIGO] `tests/e2e/publication.spec.mjs`.
- [CÓDIGO] `tests/e2e/realization.spec.mjs`.
- [CÓDIGO] `tests/e2e/record-editorial.spec.mjs`.
- [CÓDIGO] `tests/e2e/records.spec.mjs`.
- [CÓDIGO] `tests/e2e/review.spec.mjs`.
- [CÓDIGO] `tests/e2e/revisions.spec.mjs`.
- [CÓDIGO] `tests/e2e/scheduling.spec.mjs`.

[CÓDIGO] Arquivo auxiliar em `tests/e2e/`: `reporter.mjs`. `vitest.database.config.ts` também inclui `tests/security/database.test.ts`, fora de `tests/integration/`; nada disso foi executado.

## Verificação final

[CÓDIGO] **`npm run build`: PASS, exit code 0**, concluído em `2026-11-11T23:52:23.574618+00:00` (UTC), com compilação, verificação TypeScript integrada e geração das páginas concluídas. O primeiro build terminou durante uma reinicialização do servidor de ferramentas; seu log registrou a conclusão, mas o exit code da sessão se perdeu. Após conferir o estado dos arquivos, somente o build foi repetido para registrar exit 0. Logs e metadados de execução ficaram em `/private/tmp/digitap-reconciliacao-068hdtyw/`, fora do repositório. Nenhum teste, banco ou serviço remoto foi acessado.

[CÓDIGO] Mensagem de commit sugerida, sem executar commit: `docs(estado): reconciliar README e progresso com proveniência explícita`.

[CÓDIGO] A conferência final com `git status --short --untracked-files=all` contém exclusivamente `README.md`, `operations/progresso.md` e `operations/evidence/reconciliacao-dias1-2/REPORT.md`: dois modificados e um novo. Nenhum código-fonte foi modificado; nenhum arquivo foi adicionado ao índice.

[CÓDIGO] `git diff --stat` contabiliza os dois arquivos já rastreados; o relatório novo aparece como `??`. Para incluir os três no resumo sem fazer stage, a comparação `git diff --no-index --stat --no-renames before after` usa cópias temporárias das versões anterior/posterior fora do repositório. Nenhum commit, push ou deploy foi executado.
