# Reconciliação do estado local — 13/11/2026

[CÓDIGO] Base inventariada: `fda9da280d8c2902cd172f7490b752ba3e485d66`; HEAD técnico antes desta nota: `b57d600`. Esta nota atualiza a leitura corrente; o conteúdo anterior abaixo é preservado como snapshot histórico e não comprova o estado de produção. Referências de produto: [Norte aprovado](../docs/digitap/00-norte-do-produto.md) e [modelo de domínio](../docs/digitap/01-modelo-de-dominio.md).

- [CÓDIGO] I4 possui migrations `20261106003448_i4_expand.sql`, `20261106014443_i4_compat.sql` e `20261106030921_i4_cutover.sql` em `supabase/migrations/`; serviços Auth/atividades e regras de sujeitos, PF, coletivos e representação existem. As afirmações anteriores de “I4 apenas especificado” são históricas. Isso não demonstra implantação, aplicação atual dessas migrations ou funcionamento integral de todos os percursos.
- [CÓDIGO] Projetos, colaboração e portfólio existem no schema e nos serviços `src/lib/queries/`; `/perfil/[id]` reúne conteúdo público e o PDF usa impressão do navegador. Implementação não comprova I5 cumprido nem certificação dos fatos.
- [CÓDIGO] P0 local foi registrado no commit `b57d600`: PostgreSQL mantém `SUPABASE_DB_URL`, exige endpoint independente autorizado em produção e TLS com certificado verificado; cookies usam Secure em produção. A descrição anterior de conexão exclusivamente local foi superada no código. [Revalidação](evidence/saneamento-git/validation.json): 81 PASS, 0 FAIL, 0 SKIP; testes específicos, TypeScript e build com exit 0. [Histórico RED/GREEN](evidence/af-p0-parte-1/REPORT.md) preservado; não se declara P0 implantado ou liberado para deploy.
- [CONTRATO] [REL-01](../specs/REL-01-registro-relacoes.md) define o contrato futuro; o motor não existe. Seus testes intencionalmente RED, por ausência de implementação, serão preservados no ramo local `wip/rel-01-contract-red`, fora de `main`, sem merge. O estado de apuração factual de realização existente não é a comprovação relacional futura.
- [PENDENTE] A direção aprovada é reutilizar Supabase Storage; upload privado não foi comprovado no núcleo atual, que registra referências por URL. A referência privada não protege o arquivo externo.
- [INFORMADO] Implantação pública, hospedagem Cloud e funcionamento de e-mail foram relatados pelo proponente; não foram verificados remotamente neste saneamento.
- [PENDENTE] Cloud, DNS, cadeia/certificado e handshake TLS, RLS/grants efetivos, configuração Auth, entrega de e-mail, backups e release exigem validação autorizada própria. Mocks/build não comprovam essas condições. VH-01/VH-02/VH-03, governança operacional e obrigações de privacidade não são considerados concluídos por existência de código.

[CÓDIGO] [Manifesto inicial e hashes](evidence/saneamento-git/initial-state.json) e [relatório de revalidação](evidence/saneamento-git/REPORT.md) registram a proveniência local. Os originais brutos RED/GREEN ficam preservados localmente e ignorados; somente resumos sanitizados são versionados. A regressão geral posterior ao isolamento será informada na entrega, sem antecipar resultado nesta nota.

---

# DigItap — reconciliação documental, Escopo A

## Base e critérios

[CÓDIGO] Inspeção da base `f9a39b1`, com árvore inicialmente limpa e últimos commits `f9a39b1`, `e0bcb48` e `7f1324b`. Fonte canônica lida: [00-master-context](../docs/00-master-context.md), snapshot de 04–05/11/2026, que não se apresenta como telemetria do estado atual.

- [CÓDIGO] Etiqueta para implementação, teste ou registro encontrado em arquivo; uma referência a resultado histórico não significa execução nesta revisão.
- [INFORMADO] Etiqueta para declaração do proponente sem confirmação independente pelo repositório.
- [PENDENTE] Etiqueta para verificação externa/remota necessária, não executada neste escopo.

## Estado observável nos arquivos

- [CÓDIGO] Páginas `/privacidade`, `/termos`, `/contestacao` e `/governanca` existem em `src/app/`; o footer em `src/app/layout.tsx` exibe contestação por `muralitaperuna@gmail.com` e responsável provisório.
- [CÓDIGO] Cadastro PF/Organização e operações Auth existem em `src/lib/auth/gateway.server.ts` e `flow.server.ts`; atividades/editorial em `src/lib/activities/service.server.ts`.
- [CÓDIGO] `src/app/dashboard/page.tsx` e `src/app/dashboard/pessoa-fisica/page.tsx` usam verificações e apresentações distintas para acesso institucional e PF.
- [CÓDIGO] `src/app/perfil/[id]/page.tsx` e `src/components/PrintPortfolioButton.tsx` implementam portfólio com bio, agrupamento por projetos e impressão para “Salvar como PDF”; não há promessa de certificação independente nesse mecanismo.
- [CÓDIGO] `supabase/migrations/20261109145628_projetos_bio_portfolio.sql` define tabela `projetos`, `atividades.projeto_id` e `sujeitos_publicadores.bio`. Sua presença não confirma a aplicação local ou Cloud nesta revisão.
- [CÓDIGO] Confirmações têm implementação em `src/lib/participation/`, componentes de participação/contadores e migration `20261111222337_confirmacoes_apoio_intencao.sql`. A exposição opcional de nome e os DTOs sem WhatsApp são observáveis no código, não uma nova prova de RLS em execução.
- [CÓDIGO] `src/lib/supabase/config.server.ts` admite Auth Cloud em produção; `src/lib/database.server.ts` ainda restringe PostgreSQL ao loopback. O caminho de produção não pode ser considerado comprovado somente por essa configuração.

## Informações do proponente

- [INFORMADO] Deploy público em `www.digitap.com.br`, hospedagem Vercel, Supabase Cloud, banco Cloud migrado e e-mail funcional via Resend foram informados pelo proponente.
- [INFORMADO] Oregon foi mencionado como localização da infraestrutura Supabase. Região efetiva e instrumentos de transferência não foram confirmados no repositório.
- [INFORMADO] O histórico da sessão registra autorização do proponente para portfólio e apoio/intenção antes de completar os gates humanos; isso não equivale a comprovação de I5 ou decisão de lançamento.

## Evidências históricas, sem reexecução

- [CÓDIGO] `operations/evidence/semana-1-dias-4-5/summary.json` registra 38 testes específicos PASS, suíte completa com 490 PASS/4 FAIL/0 SKIP, build/typecheck exit 0 e lint geral exit 1 por `Date.now()`.
- [CÓDIGO] `operations/evidence/semana-1-dias-4-5-docker/summary.json` registra migration aplicada localmente e oito testes de confirmações PASS. A união histórica da regressão é 224 PASS/2 FAIL/2 SKIP; não deve ser somada aos oito testes repetidos.
- [CÓDIGO] O mesmo resumo e `tests/integration/pf-activities.database.test.ts:62` registram a divergência entre 403 esperado e 404 observado. O código em `src/lib/activities/service.server.ts` filtra a leitura pelo sujeito/autor e retorna 404 fora do escopo; não foi alterado nem executado nesta revisão.
- [CÓDIGO] A existência de `tests/e2e/participation.spec.mjs` comprova cenários preparados; o relatório Docker registra que não foram executados naquela rodada. Inventário completo e fontes: [relatório do Escopo A](evidence/reconciliacao-dias1-2/REPORT.md).
- [CÓDIGO] Os checkpoints anteriores permanecem nos relatórios referenciados e no histórico Git. Este resumo substitui a sobreposição de textos datados como leitura corrente, sem reclassificar seus resultados como testes atuais.

## Pendências externas/remotas

- [PENDENTE] Verificar domínio/DNS/TLS e qual deployment/commit está efetivamente servido na Vercel.
- [PENDENTE] Verificar variáveis e conectividade de produção, incluindo a restrição PostgreSQL encontrada no código, sem inferir funcionamento a partir do Auth Cloud.
- [PENDENTE] Confirmar região/identidade do projeto Supabase, migrations aplicadas, RLS/grants efetivos e `Enable Signup` Cloud; não classificar cadastro como beta aberto/fechado sem evidência remota.
- [PENDENTE] Confirmar configuração e entrega Resend, backup automático, frequência, retenção, cobertura dos arquivos e restore/RPO/RTO.
- [PENDENTE] Confirmar implementação operacional de privacidade/contestação, situação institucional, instrumentos de transferência internacional e deliberações VH-01/VH-02/VH-03 em fontes externas ao código. Publicação de páginas legais não é certificado de conformidade.

## Validação deste escopo

[CÓDIGO] `npm run build` passou com **exit code 0** nesta revisão, concluído em `2026-11-11T23:52:23.574618+00:00` (UTC). O build executa a verificação TypeScript integrada do Next; não foi executado `npm run typecheck` separado. Não foram executados testes, consultas de banco, deploy, commit ou publicação. O relatório final registra apenas os três arquivos autorizados.
