# Reconciliação do estado local — 13/11/2026

[CÓDIGO] Base inventariada: `fda9da280d8c2902cd172f7490b752ba3e485d66`; HEAD técnico antes desta nota: `b57d600`. Esta nota atualiza a leitura corrente; o conteúdo anterior abaixo é preservado como snapshot histórico e não comprova o estado de produção. Referências de produto: [Norte aprovado](docs/digitap/00-norte-do-produto.md) e [modelo de domínio](docs/digitap/01-modelo-de-dominio.md).

- [CÓDIGO] I4 possui migrations `20261106003448_i4_expand.sql`, `20261106014443_i4_compat.sql` e `20261106030921_i4_cutover.sql` em `supabase/migrations/`; serviços Auth/atividades e regras de sujeitos, PF, coletivos e representação existem. As afirmações anteriores de “I4 apenas especificado” são históricas. Isso não demonstra implantação, aplicação atual dessas migrations ou funcionamento integral de todos os percursos.
- [CÓDIGO] Projetos, colaboração e portfólio existem no schema e nos serviços `src/lib/queries/`; `/perfil/[id]` reúne conteúdo público e o PDF usa impressão do navegador. Implementação não comprova I5 cumprido nem certificação dos fatos.
- [CÓDIGO] P0 local foi registrado no commit `b57d600`: PostgreSQL mantém `SUPABASE_DB_URL`, exige endpoint independente autorizado em produção e TLS com certificado verificado; cookies usam Secure em produção. A descrição anterior de conexão exclusivamente local foi superada no código. [Revalidação](operations/evidence/saneamento-git/validation.json): 81 PASS, 0 FAIL, 0 SKIP; testes específicos, TypeScript e build com exit 0. [Histórico RED/GREEN](operations/evidence/af-p0-parte-1/REPORT.md) preservado; não se declara P0 implantado ou liberado para deploy.
- [CONTRATO] [REL-01](specs/REL-01-registro-relacoes.md) define o contrato futuro; o motor não existe. Seus testes intencionalmente RED, por ausência de implementação, serão preservados no ramo local `wip/rel-01-contract-red`, fora de `main`, sem merge. O estado de apuração factual de realização existente não é a comprovação relacional futura.
- [PENDENTE] A direção aprovada é reutilizar Supabase Storage; upload privado não foi comprovado no núcleo atual, que registra referências por URL. A referência privada não protege o arquivo externo.
- [INFORMADO] Implantação pública, hospedagem Cloud e funcionamento de e-mail foram relatados pelo proponente; não foram verificados remotamente neste saneamento.
- [PENDENTE] Cloud, DNS, cadeia/certificado e handshake TLS, RLS/grants efetivos, configuração Auth, entrega de e-mail, backups e release exigem validação autorizada própria. Mocks/build não comprovam essas condições. VH-01/VH-02/VH-03, governança operacional e obrigações de privacidade não são considerados concluídos por existência de código.

[CÓDIGO] [Manifesto inicial e hashes](operations/evidence/saneamento-git/initial-state.json) e [relatório de revalidação](operations/evidence/saneamento-git/REPORT.md) registram a proveniência local. Os originais brutos RED/GREEN ficam preservados localmente e ignorados; somente resumos sanitizados são versionados. A regressão geral posterior ao isolamento será informada na entrega, sem antecipar resultado nesta nota.

---

# DigItap — A Praça

## Como ler este estado

[CÓDIGO] Esta reconciliação descreve arquivos da base `f9a39b1`, não uma auditoria de produção. O contexto canônico [00-master-context](docs/00-master-context.md) preserva um snapshot de 04–05/11/2026 e exige distinguir software, decisão humana e validação de uso.

- [CÓDIGO] Indica implementação ou registro existente no repositório; cada item cita sua fonte. Existência de teste ou relatório não significa execução nesta revisão.
- [INFORMADO] Indica informação fornecida pelo proponente, sem confirmação independente pelo repositório.
- [PENDENTE] Indica confirmação externa/remota necessária, não realizada neste escopo.

## Implementação observável

- [CÓDIGO] Cadastro PF/Organização, confirmação de e-mail, login e recuperação de senha estão implementados em [gateway](src/lib/auth/gateway.server.ts), [fluxo](src/lib/auth/flow.server.ts) e nas páginas [cadastro](src/app/cadastro/page.tsx) e [cadastro PF](src/app/cadastro/pessoa-fisica/page.tsx).
- [CÓDIGO] Criação/edição de atividades, curadoria e publicação têm implementação em [service.server.ts](src/lib/activities/service.server.ts); realização e evidências também têm handlers em `src/app/api/atividades/[id]/registro/` e `src/app/api/atividades/[id]/realizacao/`.
- [CÓDIGO] `/dashboard` usa acesso institucional; `/dashboard/pessoa-fisica` usa acesso de PF, com interfaces distintas: [Organização/coletivo](src/app/dashboard/page.tsx) e [PF](src/app/dashboard/pessoa-fisica/page.tsx).
- [CÓDIGO] `/perfil/[id]` reúne bio, projetos, atividades e relatos públicos. O botão de PDF chama `window.print()` e orienta “Salvar como PDF”; não é um gerador de PDF no servidor: [perfil](src/app/perfil/[id]/page.tsx), [PrintPortfolioButton](src/components/PrintPortfolioButton.tsx), [consulta](src/lib/queries/portfolio.server.ts).
- [CÓDIGO] A migration [projetos_bio_portfolio](supabase/migrations/20261109145628_projetos_bio_portfolio.sql) define `public.projetos`, `public.atividades.projeto_id` e `public.sujeitos_publicadores.bio`. [PublisherPresentation](src/components/PublisherPresentation.tsx) usa bio e projetos. Isto comprova estrutura prevista em SQL e uso no código, não aplicação atual em qualquer banco.
- [CÓDIGO] Apoio/intenção, consentimento opcional para nome público e contadores estão implementados em [participação](src/lib/participation/service.ts), [adapter](src/lib/participation/runtime.server.ts), [interface](src/components/ActivityParticipation.tsx), [contadores](src/components/ConfirmationCounts.tsx) e [migration](supabase/migrations/20261111222337_confirmacoes_apoio_intencao.sql). WhatsApp não integra o DTO público; presença verificada não é um campo dessa tabela.

## Implantação informada e limites

- [INFORMADO] O proponente informa deploy em **https://www.digitap.com.br**, na Vercel, com Supabase Cloud e envio de e-mails via Resend; também informou banco Cloud migrado e e-mail funcional. Não foram consultados serviços remotos nesta revisão.
- [INFORMADO] A localização Oregon foi mencionada pelo proponente no planejamento. Não foi deduzida de um nome de host nem confirmada no painel do projeto.
- [CÓDIGO] [config.server.ts](src/lib/supabase/config.server.ts) aceita URL HTTPS de projeto `*.supabase.co` em produção, exige `APP_ORIGIN` HTTPS e valida presença/tamanho da chave pública.
- [CÓDIGO] [database.server.ts](src/lib/database.server.ts) aceita PostgreSQL somente em `127.0.0.1:56152/postgres`; as consultas de [public.server.ts](src/lib/queries/public.server.ts) e [portfolio.server.ts](src/lib/queries/portfolio.server.ts) usam esse caminho. Aceitar Auth Cloud não comprova conexão PostgreSQL Cloud.
- [PENDENTE] Confirmar DNS/TLS, deploy/commit efetivamente servido, variáveis da Vercel, região real do Supabase e funcionamento do caminho de banco em produção.
- [PENDENTE] Confirmar `Enable Signup` no Auth Cloud antes de classificar o cadastro como beta aberto ou fechado; páginas de cadastro no código não comprovam a configuração remota.
- [PENDENTE] Confirmar aplicação das migrations no Cloud, configuração/entrega de e-mails Resend, frequência/retenção de backups, cobertura de Storage e restore. Arquivos SQL e relatórios locais não comprovam esses estados remotos.

## Executar a interface local

[CÓDIGO] `package.json` declara Node `^22.22.2 || ^24.15.0 || >=26.0.0` e os comandos abaixo; `.env.example` fornece placeholders locais. A configuração deve usar credenciais locais, sem versionar segredos.

```sh
npm ci
cp .env.example .env.local
# Preencher os placeholders exclusivamente locais.
npm run dev
```

[CÓDIGO] `npm run dev` serve em `http://127.0.0.1:3215`. Os endereços locais esperados estão em [.env.example](.env.example) e [config.server.ts](src/lib/supabase/config.server.ts). As operações de Auth/banco dependem de serviços configurados; iniciar a interface não é prova de funcionamento desses fluxos.

[CÓDIGO] `npm run local:start` continua bloqueado por [start-local.mjs](scripts/start-local.mjs). O procedimento histórico está em [autenticação local](operations/autenticacao-local.md); o bloqueio do script não comprova que Docker esteja parado hoje. Esta revisão não inspecionou Docker nem banco.

## Privacidade, governança e contribuição

- [CÓDIGO] Existem as páginas [privacidade](src/app/privacidade/page.tsx), [termos](src/app/termos/page.tsx), [contestação](src/app/contestacao/page.tsx) e [governança](src/app/governanca/page.tsx). Os caminhos públicos correspondentes são `/privacidade`, `/termos`, `/contestacao` e `/governanca`; disponibilidade remota não foi verificada.
- [CÓDIGO] O [footer global](src/app/layout.tsx) identifica Marcos Antonio Maia Júnior como responsável provisório, mostra `muralitaperuna@gmail.com` e links para as páginas legais. [Contestação](src/app/contestacao/page.tsx) descreve atendimento por e-mail em até 30 dias, respeitando prazos legais menores; o texto não comprova atendimento efetivo.
- [CÓDIGO] Os [termos](src/app/termos/page.tsx) declaram AGPLv3 para código e CC BY-SA 4.0 para documentos, diferenciando conteúdo de usuários. A existência desse texto não comprova regularização de toda a titularidade ou conformidade jurídica.
- [CÓDIGO] A referência de governança provisória está em [04-governanca](docs/04-governanca.md) e na página de governança. Propostas de contribuição devem explicitar escopo, impacto nos dados e validação; o canal exibido para contato é `muralitaperuna@gmail.com`. Esta orientação documental não concede autorização de deploy ou alteração de banco.
- [PENDENTE] Confirmar situação institucional, responsáveis/compromissos formalizados, instrumentos de transferência internacional, retenção e mecanismos efetivos de atendimento dos titulares em fontes externas ao código.

## Verificação e histórico

[CÓDIGO] Existem 11 arquivos de integração em `tests/integration/` e 19 specs em `tests/e2e/`; o inventário completo está no [relatório desta reconciliação](operations/evidence/reconciliacao-dias1-2/REPORT.md). Presença de teste não equivale a PASS.

[CÓDIGO] Evidências históricas registram 490 PASS/4 FAIL na suíte unitária e oito testes de confirmações aprovados no banco local, seguidos de interrupção da regressão por divergência 403/404: [resumo anterior](operations/evidence/semana-1-dias-4-5/summary.json) e [retomada Docker](operations/evidence/semana-1-dias-4-5-docker/summary.json). São registros versionados, não testes reexecutados no Escopo A nem confirmação do estado atual do banco.

[CÓDIGO] O contexto canônico condiciona avanço a VH-01/VH-02/VH-03. O portfólio existe no código apesar da condição histórica de I5; [02-escopo-e-mvp](docs/02-escopo-e-mvp.md) registra essa divergência. A reconciliação documenta existência, sem declarar aprovação retroativa ou utilidade humana comprovada.

[CÓDIGO] O acompanhamento desta revisão e os limites do build estão em [operations/progresso.md](operations/progresso.md). Integração, E2E e alterações de aplicação/banco estão fora do Escopo A.
