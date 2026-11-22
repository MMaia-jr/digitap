# A Praça — Plano

## Registro documental — DIG-IA-MEM-01 (22/11/2026)

- **Fonte:** [One Tap e Memória Contextual](../docs/digitap/03-one-tap-memoria-contextual.md), registro de reconciliação estratégica.
- **Direção de experiência:** One Tap — simplificar a expressão de necessidades e capacidades sem autorizar ações automáticas.
- **HIP-IA-01:** memória contextual autorizada pode melhorar a assistência; não validada.
- **HIP-ECO-01:** possível ganho econômico incremental; os R$ 750/mês citados no registro são simulação, não receita nem resultado observado.
- **EXP-IA-MEM-01:** comparação futura de E4 determinístico, IA sem memória e IA com memória em 30 casos sintéticos; proposta não iniciada e sem autorização de implementação.
- **Limites:** documentação não altera a prioridade do beta, os gates humanos, a arquitetura operacional nem o estado Git local.

## Beta Fechado — candidato local versionado e demonstrável, 16/11/2026

- **Branch local:** `release/beta-fechado-20261116`, criada a partir de `main`
  em `f7db35e560e57a0b3e4d1ccc8ec24b494214dc5e`. Os percursos integrados estão
  em dois commits locais: `8194daf` (ideia → atividade e planejamento privado
  ECO-01) e `5629045` (E4/E4.1, capacidades, encontros e Biblioteca de Ações).
  Nenhum commit foi enviado.
- **Validação reutilizada:** Vitest 890 PASS/82 arquivos, PostgreSQL local 246
  PASS/18 arquivos, Playwright 68 PASS/0 FAIL/0 SKIP; TypeScript, ESLint,
  build e diff check aprovados. A execução final E2E está em
  `operations/evidence/digitap-candidate-final3-20261116/`. Não foram repetidas
  suítes completas por causa apenas dos artefatos operacionais/documentais.
- **Preflight e demonstração observados:** `npm run beta:check` confirmou Node
  22.23.2, API/Auth `127.0.0.1:56151`, PostgreSQL `127.0.0.1:56152`, 14
  migrations locais reconhecidas sem pendências e zero contas Auth
  `@example.invalid`. `npm run beta:demo` iniciou Next em `127.0.0.1:3215` com
  mock local fail-closed; GET a `/`, `/cadastro`, `/login`, `/biblioteca-acoes`
  e `/encontros` respondeu HTTP 200. O processo foi encerrado e a porta ficou
  livre. Nenhuma migration foi aplicada nesta etapa.
- **Artefatos operacionais:** `scripts/beta-local.mjs` fornece `beta:check`
  (somente leitura, bloqueia migrations pendentes/resíduos) e `beta:demo`
  (usa supervisor existente e mock sintético). Procedimento local e plano de
  homologação estão em `docs/operacao/BETA-FECHADO-LOCAL-E-HOMOLOGACAO.md`.
  Homologação remota continua não criada nem testada.
- **Bloqueios reais para Beta com pessoas:** não existe homologação isolada
  validada; a inicialização Supabase da CLI continua bloqueada no script
  `local:start` e o procedimento exige stack loopback previamente ativa. Antes
  de participantes reais são necessários verificação de proteção fechada,
  SMTP/links, TLS/CA/origens, retenção/privacidade e autorização específica
  para infraestrutura/deploy. A tentativa E2E anterior sem preload mantém a
  incerteza de egress já registrada acima. Gateway real, e-mail de produção,
  Cloud, produção, DOG-01 e VH-01–VH-03 não foram validados. E5/ECO-02 não
  iniciadas.
- **Estado de trabalho:** nenhuma evidência histórica foi removida; o snapshot
  agregado do diretório `operations/evidence/` permaneceu preservado. Não houve
  deploy, push, migration ou alteração remota.

## Candidato local integrado — 16/11/2026

- **Escopo verificado:** regressão conjunta dos percursos locais já presentes
  (autenticação, perfil, ideias privadas, atividade, planejamento ECO-01,
  curadoria/publicação, descoberta pública e E4/E4.1). Nenhum módulo novo foi
  iniciado. O planejamento ECO-01 foi apresentado separadamente na gestão da
  atividade e permaneceu privado; a jornada E3 verificou que o marcador de
  custo não aparece nas superfícies públicas após publicação.
- **Resultados observados:** Vitest completo **890 PASS em 82 arquivos**;
  integração PostgreSQL local **246 PASS em 18 arquivos**; Playwright completo
  **68 PASS, 0 FAIL, 0 SKIP**. A suíte E2E final inclui ECO-01, E3 conectado,
  E4 e E4.1, com duas identidades nas verificações de isolamento. TypeScript,
  ESLint, build e `git diff --check`: PASS. Esses resultados descrevem esta
  árvore local, não produção.
- **Evidências:** relatório final E2E em
  `operations/evidence/digitap-candidate-final3-20261116/e2e.json`, capturas e
  observações sanitizadas no mesmo diretório; seis interações da suíte final
  com o Gateway foram atendidas pelo mock local fail-closed registrado em
  `gateway-mock.jsonl`. O relatório de limpeza E1 registra duas contas
  sintéticas geradas e zero remanescentes. Consulta agregada final ao banco
  local confirmou API `127.0.0.1:56151`, PostgreSQL `127.0.0.1:56152`, zero
  contas Auth `@example.invalid`, zero contas de aplicação associadas e a
  migration de planejamento registrada.
- **Correções delimitadas durante a validação:** o percurso E3 agora exercita
  planejamento privado na mesma atividade e confirma sua ausência nas
  respostas públicas; os caminhos de screenshots respeitam o diretório de
  evidências da execução. O teardown E4 passou a fechar páginas e contextos
  sequencialmente após timeouts reproduzidos no encerramento concorrente. As
  asserções de domínio e segurança foram mantidas.
- **Limites e ressalva operacional:** uma tentativa completa anterior terminou
  em timeout de E1 antes de o preload do Gateway estar ativo no processo da
  aplicação; ela não produziu `gateway-mock.jsonl`. Não há evidência suficiente
  para afirmar se houve ou não saída externa nessa tentativa. A execução final
  aprovada usou o mock fail-closed. A varredura de limpeza confirmou zero
  usuários no domínio sintético reservado e suas contas associadas; não foi
  feita auditoria de dados preexistentes por conteúdo. Navegação e capturas
  desktop/mobile foram exercitadas pelos cenários existentes, sem auditoria
  independente WCAG. Kimi real, Cloud, e-mails de produção, produção e DOG-01
  não foram validados; VH-01–VH-03 continuam pendentes. A migration ECO-01 já
  existente foi apenas verificada, não reaplicada. E5 permanece suspensa; ECO-02
  não iniciada.
- **Estado Git:** `main`, HEAD
  `f7db35e560e57a0b3e4d1ccc8ec24b494214dc5e`; índice vazio. As alterações
  rastreadas anteriores e as evidências não rastreadas foram preservadas; este
  pacote não cria commit, push ou deploy.

## Painel operacional — 15/11/2026

Este painel complementa o histórico preservado abaixo. Não autoriza execução
automática, publicação ou ampliação de escopo.

### ECO-01 — entrega vertical local do planejamento privado, 16/11/2026

- **Percurso:** a gestão autorizada de uma atividade existente apresenta uma
  área separada para planejar recursos e custos previstos. A pessoa pode
  adicionar, editar e remover linhas, salvar explicitamente, reabrir o plano e
  atualizá-lo com controle otimista de versão. O formulário editorial continua
  separado. A interface informa que os dados são privados e não representam
  despesas, pagamentos, compromissos ou prestação de contas certificada.
- **Segurança e persistência:** a rota privada usa sessão server-side, a
  autorização e o filtro de titularidade do serviço existente, validação de
  origem nas mutações e respostas sem cache. A tentativa de leitura ou escrita
  de outra identidade retorna 404; uma versão obsoleta retorna 409. O plano não
  aparece em leitura pública e não altera o estado editorial da atividade.
  Colaboração e interesse não concedem acesso econômico.
- **TDD:** testes RED de interface e rota reproduziram a ausência do percurso e
  as fronteiras HTTP antes da implementação. GREEN específico: **32 PASS**
  (10 componentes, 6 rota e 16 testes de domínio/autorização pertinentes).
  A primeira execução E2E encontrou uma expectativa de alias de total errada
  no teste; a correção foi restrita à asserção e a tentativa foi preservada como
  evidência histórica, sem sobrescrita.
- **Validação efetiva:** `npm test`: **890 PASS em 82 arquivos**;
  `A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:e2e --
  tests/e2e/execution-plan.spec.mjs`: **1 PASS, 0 FAIL, 0 SKIP**; suíte de
  integração PostgreSQL local `A_PRACA_ALLOW_FIXTURE_CLEANUP=1
  ECO01_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db`: **246 PASS em
  18 arquivos**. `npm run typecheck`, `npm run lint`, `npm run build` e
  `git diff --check`: PASS. A E2E usou duas identidades sintéticas e a
  aplicação/Auth/PostgreSQL locais; comprovou persistência após logout e novo
  login, isolamento, CSRF, 404 de acesso alheio, 409 concorrente, valores
  exatos, rascunhos não publicados e ausência de rota pública para o plano.
- **Migração e limpeza:** `20261116120000_execution_plans.sql` já estava
  aplicada no Supabase local e não foi reaplicada neste incremento. A
  verificação final, restrita a loopback, encontrou **zero** resíduos sintéticos
  em Auth, contas, perfis PF, vínculos, projetos, atividades, necessidades,
  interesses, eventos editoriais, planos e itens.
- **Limites:** validação somente local; nenhum teste de Cloud/produção ou
  chamada paga foi executado. A migration e o schema local não foram alterados
  nesta entrega; não houve commit, push ou deploy. E3, E4 e E4.1 foram
  preservadas; ECO-02 não foi iniciada.

### ECO-01 — GREEN 2B, integração PostgreSQL local, 16/11/2026

- **Migração:** antes da aplicação, o histórico do target local em
  `127.0.0.1:56152` mostrava somente `20261116120000_execution_plans.sql`
  pendente. Supabase CLI 3.0.0 aplicou essa migration sem reset; o histórico
  posterior a registra como aplicada. Nenhuma outra migration foi aplicada
  nesta execução. API/Auth e PostgreSQL foram confirmados em
  `127.0.0.1:56151` e `127.0.0.1:56152`.
- **Integração:** executado
  `ECO01_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db -- tests/integration/execution-plan.database.test.ts --bail=1`.
  Três cenários passaram: persistência/recuperação autenticada, negação à
  segunda identidade apesar de colaboração/interesse e RLS/FORCE RLS/privilégios.
  O cenário de concorrência confirmou atualização e rejeição da versão obsoleta
  antes de falhar na asserção monetária; o quinto cenário não foi executado por
  `--bail=1`. A asserção que falhou seleciona item por UUID sem excluir o item
  cujo valor é nulo e observou `0` em vez de `1250`; isso não comprova falha da
  persistência monetária.
- **Limpeza incompleta:** o `afterAll` interrompeu ao excluir o subtipo PF por
  violação de integridade (`Sujeito ... sem subtipo completo`). Uma consulta
  somente leitura encontrou, sob o marcador sintético ECO-01, 2 usuários Auth,
  2 contas de aplicação, 2 sujeitos, 2 subtipos PF e 1 vínculo publicador
  residuais. Projetos, vínculos de colaboração, atividades, eventos editoriais,
  necessidades, interesses, planos e itens residuais: 0. Nenhuma exclusão manual
  foi executada após a falha.
- **Bloqueio:** GREEN 2B não concluída. O teste de seleção monetária e a ordem
  segura de limpeza precisam de correção e nova validação; suíte completa,
  estáticos e regressões finais não foram executados após a falha. A integração
  permanece bloqueada; GREEN 3 não iniciado.

### ECO-01 — GREEN 2B.1, correção e recuperação local, 16/11/2026

- **Causa confirmada:** o teste lia o custo do item selecionado por UUID sem
  ordenar ou filtrar o recurso; assim, o item de empréstimo com valor `null`
  podia ser convertido em `0` em vez de validar o material de 1.250 centavos.
  A limpeza anterior interrompia entre a remoção do subtipo PF e do sujeito
  publicador porque a constraint de subtipo é diferida até o commit.
- **Correção nos testes:** seleção monetária agora usa a descrição sintética
  específica e verifica separadamente 1.250 centavos e `null`. A rotina de
  limpeza valida namespace e titularidade das fixtures, remove dependências
  sintéticas em transação (incluindo PF e sujeito antes do commit), exclui Auth
  pela API Admin local e cobre falha parcial de criação do perfil.
- **Recuperação:** as duas fixtures residuais identificadas foram removidas
  exclusivamente por seus IDs confirmados, após verificação de namespace
  sintético e ausência de projetos/atividades. A constraint diferida foi
  respeitada em transação. A API Admin do Supabase local removeu as duas contas.
  Contagens posteriores: zero Auth users, contas, sujeitos PF e vínculos
  residuais para os IDs; a contagem ECO-01 também foi zero em Auth, contas,
  sujeitos, projetos, atividades, necessidades e planos.
- **Validação efetiva:** `ECO01_ALLOW_FIXTURE_CLEANUP=1 npm run
  test:onboarding:db -- tests/integration/execution-plan.database.test.ts
  --bail=1`: **5 PASS, 0 FAIL**. Domínio:
  `npm test -- tests/activities/execution-plan.test.ts
  tests/activities/execution-plan-authorization.test.ts`: **16 PASS, 0 FAIL**.
  `npm run typecheck`, ESLint específico e `git diff --check`: PASS. A primeira
  tentativa de integração usou outro nome de variável de proteção e parou antes
  de conectar ao banco; não criou fixtures. Nenhuma migration foi reaplicada;
  `20261116120000_execution_plans.sql` permanece registrada no banco local.
- **Limites:** não foram executados suíte completa, E2E, build ou GREEN 3. A
  validação foi somente local; não houve Cloud, produção, commit ou publicação.

### E2.2 — Minhas ideias: rascunhos privados, 15/11/2026

- **Escopo autorizado:** persistir ideias somente por ação explícita da pessoa;
  listar, retomar, editar com controle de versão e excluir os próprios
  rascunhos. Nenhuma interpretação cria projetos, atividades, sujeitos,
  vínculos, confiança ou publicação.
- **Resultado local e aceite humano:** o proponente aceitou o resultado técnico
  local da E2.2 em 15/11/2026. Duas
  migrações aditivas foram aplicadas somente ao Supabase local: tabela privada
  `public.ideias_privadas` e campo separado `revised_text`. RLS, privilégios
  mínimos e filtros de proprietário foram exercitados no PostgreSQL local.
  Dados preexistentes foram preservados; não houve reset.
- **Validação observada:** `npm test`: **827 PASS**; integração
  `npm run test:onboarding:db`: **232 PASS**; E2E: **4 PASS, 0 FAIL, 0 SKIP**.
  TypeScript, ESLint e `git diff --check`: PASS. A E2E usou duas identidades
  fictícias, aplicação/Auth/PostgreSQL locais e mock somente do Vercel AI
  Gateway. O relatório final registra a limpeza das duas contas sintéticas.
- Os testes RED reproduziram validação incompleta do contrato, limite de corpo
  insuficiente para o texto de proposta e rejeição de Host confiável na rota
  autenticada; as correções permaneceram nos limites autorizados e passaram
  pelas regressões. A interface salva apenas após ação explícita; retomar não
  chama novamente a IA. Texto original e trechos de origem são preservados;
  revisões ficam em campos próprios.
- **Limites:** evidência exclusivamente local. Kimi/Gateway real, Cloud,
  e-mails de produção, operação de produção, DOG-01 e VH-01–VH-03 não foram
  validados. A política de retenção e descarte de produção continua pendente.
  Não houve commit, push, deploy, migration remota ou chamada paga.
- **Estado de sequência:** E2.2 concluída tecnicamente localmente e aceita
  pelo proponente no escopo testado. E2.3 e demais incrementos
  continuam não iniciados e sem autorização. Nenhuma próxima etapa é iniciada
  automaticamente.

### E3.1 — descoberta pública de sujeitos, 15/11/2026

- **Escopo autorizado:** visitantes podem descobrir pessoas físicas, coletivos
  e organizações somente quando aparecem como publicadores de atividades já
  retornadas por `publicActivities.list()`. A apresentação usa exclusivamente
  `publicPublisher()` e o snapshot público; o link reutiliza `/perfil/[id]`.
- **Resultado local:** concluído tecnicamente, aguardando revisão humana. A
  deduplicação é por ID público do sujeito. Snapshots v1 são apresentados como
  organização e v2 preservam PF/coletivo/organização; a home não cria sujeitos
  quando a lista pública está vazia e mantém erro explícito quando a consulta
  falha.
- **TDD e validação:** RED inicial da home: 3 falhas comportamentais novas e 6
  testes existentes aprovados. Correção pontual: RED adicional, 1 falha
  reproduzida quando snapshots do mesmo sujeito chegam com o mais recente
  primeiro e o antigo depois, substituindo indevidamente o nome recente. A
  deduplicação agora mantém a primeira ocorrência por ID e a ordem
  da lista. GREEN específico final: 10 PASS. Regressões de home, publicação e
  segurança pública: 50 PASS em 4 arquivos. TypeScript, ESLint geral e
  `git diff --check`: PASS. O teste visitante confirma acesso sem login; campos
  privados adicionados ao fixture não aparecem na descoberta.
- **Limites:** nenhuma consulta de cadastro privado, identidade adicional ou
  projeto privado; o feed existente permanece. Sem alterações no banco,
  Cloud, release ou produção. Expansões além do percurso integrado autorizado,
  E4 e E5 continuam sem autorização. Este resultado local aguarda revisão
  humana.

### E3 integrado — ideia privada à descoberta pública, 15/11/2026

- **Escopo autorizado:** selecionar uma ideia privada própria, revisar o
  conteúdo aproveitável, completar manualmente os dados obrigatórios e confirmar
  a criação de atividade. A conversão reutiliza o serviço de atividades e o
  pipeline existente de rascunho, envio, curadoria e publicação; não cria
  publicação automática nem altera a ideia de origem.
- **Autorização e privacidade:** sessão verificada no servidor, permissão
  vigente de edição do sujeito, proprietário derivado da sessão, versão
  otimista e chave de idempotência. IDs alheios retornam 404, visitante 401,
  versão obsoleta 409 e repetição exata reutiliza o mesmo rascunho. O E2E
  confirmou o rascunho ausente da API pública e da home antes da publicação;
  só depois do consentimento explícito para divulgação, envio e aprovação
  editorial a atividade apareceu na home, em “Quem faz a Praça” e no perfil.
- **Dados:** não foi criada migração nem entidade nova. A ideia original,
  revisão e trechos de origem permanecem; data e acesso foram informados pela
  pessoa no formulário. A conversão registra proveniência e pedido no histórico
  editorial existente. Nenhum projeto, sujeito, vínculo ou alegação de
  representação é criado pela interpretação.
- **TDD e validação local:** RED comportamental nos testes da conversão,
  formulário e seleção da ideia; GREEN após reutilizar o serviço existente.
  Vitest completo: 835 PASS em 72 arquivos. PostgreSQL local: 233 PASS em 14
  arquivos. E2E selecionados: 7 PASS, 0 FAIL, 0 SKIP, incluindo a jornada
  conectada e regressões de onboarding/editorial. TypeScript, ESLint geral e
  `git diff --check`: PASS. Fixtures sintéticas Auth, PF, ideias e atividades:
  contagens residuais verificadas em zero. Relatório:
  [E2E](../operations/evidence/e3-integrado-final-20261115/e2e.json);
  [limpeza E1](../operations/evidence/e3-integrado-final-20261115/e1-cleanup.json).
- **Limites:** verificação exclusivamente local; Gateway simulado quando
  exercitado pelos testes de onboarding. Kimi real, Cloud, e-mail de produção,
  DOG-01 e VH-01–VH-03 não foram validados. Este resultado técnico aguarda
  revisão humana; não inicia E4/E5 ou outros incrementos.

### E4 — capacidades, necessidades e encontros, 15/11/2026

- **Autorização e enquadramento:** implementação local preparatória
  expressamente autorizada antes do DOG-01. Esta entrega não declara I5,
  DOG-01 ou VH-01, VH-02 e VH-03 cumpridos e não libera E5.
- **Percurso entregue:** o titular registra capacidades privadas, edita,
  oculta da descoberta ou arquiva; a coordenação autorizada registra,
  edita, torna visíveis, oculta e encerra necessidades privadas de seus
  projetos; visitantes e participantes consultam compatibilidades públicas
  determinísticas por categorias declaradas. A sugestão explica a categoria
  comum e não confirma colaboração. Participante manifesta, acompanha ou
  retira interesse; a coordenação o consulta e pode convidar pelo fluxo
  existente. O vínculo só se efetiva após o aceite existente.
- **Autorização e privacidade:** três tabelas aditivas — `capacidades`,
  `necessidades_projeto` e `interesses_necessidade` — foram migradas somente
  no PostgreSQL local, sem reset. RLS e FORCE RLS estão habilitados; `anon` e
  `authenticated` não têm privilégios de tabela, e as rotas no servidor
  restringem cada operação à sessão verificada e à propriedade/titularidade
  ou coordenação autorizada. Registros começam privados; a exposição requer
  ação explícita e elegibilidade pública já existente. Versões concorrentes
  são rejeitadas e interesses usam idempotência.
- **TDD e validação observada:** RED comportamental reproduziu duas falhas de
  matching e três de interface; o RED de integração confirmou a ausência das
  tabelas antes da migração local. GREEN final: `npm test` **843 PASS em 74
  arquivos**; `npm run test:onboarding:db` **238 PASS em 15 arquivos**;
  E2E E4 **1 PASS, 0 FAIL, 0 SKIP**. O E2E percorreu declaração pública,
  curadoria, compatibilidade explicável, interesse, consulta pela coordenação,
  convite e aceite; verificou CSRF, isolamento entre identidades, remoção da
  compatibilidade após revogar a visibilidade e zero atividades adicionais
  por interesse. Fixtures sintéticas foram removidas,
  com zero capacidade, necessidade, interesse ou conta Auth residual. TypeScript,
  ESLint geral e `git diff --check`: PASS.
- **Limites:** a autorização de publicação da atividade sintética da
  organização no E2E foi preparada diretamente como fixture local de
  consentimento, pois a interface existente não oferece essa ação; esse teste
  não comprova um fluxo de consentimento organizacional pela interface. A
  elegibilidade pública depende de atividade já publicada pelo sujeito. Não
  houve notificações, ranking, pontuação, inferência pessoal, consulta de
  disponibilidade, operação Cloud ou validação em produção. DOG-01 e os três
  portões VH continuam pendentes; este resultado local aguarda revisão humana.

### E4.1 — Biblioteca de Ações e ajuda em atividades PF, 15/11/2026

- **Percurso local entregue:** catálogo público estático versionado com 12
  modelos tipados em seis categorias, filtros e distinção explícita entre modelo
  sugerido e atividade real. A pessoa adapta um modelo, preenche os dados e
  confirma um rascunho privado. Para atividade própria elegível, o titular cria,
  edita, oculta e encerra solicitação de ajuda; outra pessoa pode manifestar
  interesse e o titular consulta a manifestação em área privada. Interesse não
  cria vínculo, convite institucional, participação comprovada ou compromisso.
- **Persistência e segurança:** migração
  `20261115233000_activity_help_requests.sql` aplicada somente ao Supabase
  local. `necessidades_projeto` admite projeto ou atividade, exatamente um por
  registro; a FK da atividade usa `ON DELETE RESTRICT`. RLS e FORCE RLS
  permanecem habilitados; `anon` e `authenticated` não têm privilégios diretos
  de tabela. A descoberta revalida a publicação vigente e a revogação retira o
  pedido; o retorno público identifica a solicitação como não verificada.
  Histórico local confirmou somente essa migração pendente antes da aplicação.
- **TDD e validação final:** RED de serviço/interface precedeu a implementação;
  o teste PostgreSQL RED confirmou `atividade_id` ausente antes da migração.
  Após aplicá-la: suíte unitária/componentes **858 PASS/0 FAIL**; PostgreSQL
  local **241 PASS/0 FAIL em 17 arquivos**; E3 conectado **1 PASS** e E4/E4.1
  **2 PASS, 0 FAIL, 0 SKIP**. A jornada E4.1 cobriu biblioteca, rascunho,
  publicação pela curadoria, pedido inicialmente privado, divulgação autorizada,
  interesse por outra identidade, consulta pelo titular e revogação. A tentativa
  após perda de elegibilidade recebeu 403 e não criou interesse. TypeScript,
  ESLint geral, build e `git diff --check`: PASS. As rotinas de integração e E2E
  confirmaram limpeza de suas próprias fixtures sintéticas.
- **Condições e limites:** destinos verificados em loopback (`127.0.0.1:56151`
  e `127.0.0.1:56152`); nenhuma operação Cloud ou chamada de IA. Não comprova
  e-mail/produção, adoção, DOG-01 ou VH-01–VH-03. A migração permanece apenas
  no banco local. E5 não iniciada. Nenhum commit, push ou deploy.
- **Rollback:** não executado. Reversão do código deve limitar-se ao diff E4.1
  após preservar os demais incrementos; reversão da migração exigiria confirmar
  ausência de solicitações de atividade e autorização própria, pois remover a
  coluna descartaria esses registros.

### E2.1 — revisão manual temporária, 15/11/2026

- **Autorização humana específica:** editar descrições das categorias existentes,
  corrigir tipos de sujeito somente nos quatro valores do contrato, editar origem,
  destino e tipo das relações, descartar sugestões e restaurar a prévia original.
  Trechos de origem imutáveis; correções somente em memória, perdidas ao sair.
- Base desta execução: `main`, HEAD
  `3f480db68c0132402ca11b426a2dfdb3d5879e1d`, sincronizado com `origin/main`.
  Os dois commits E1 já foram publicados no Git; as 117 evidências não rastreadas
  anteriores foram preservadas. Nenhum commit/push/deploy foi feito em E2.1.
- **Resultado local:** implementação concluída tecnicamente, aguardando revisão
  humana. RED: 20 novos testes falharam por comportamento ausente; 10 existentes
  passaram. GREEN específico: 30 PASS. Regressão `npm test`: **807 PASS**, 69
  arquivos, zero FAIL/SKIP. TypeScript sem emissão/incremental, lint geral e
  `git diff --check`: PASS (exit 0).
- **Aceite humano E2.1:** o proponente aprovou o resultado local desta revisão
  temporária em 15/11/2026. E2.2 permanece não iniciada e sem autorização.
- Testes: `tests/components/proposal-review.test.tsx` e regressões existentes.
  Cobrem edição, descarte nas sete categorias, restauração sem nova requisição,
  trechos imutáveis, limite de 1.000 caracteres por campo, teclado/foco,
  conteúdo malicioso escapado e ausência de persistência ao remontar.
- Escopo efetivo: `src/components/ProposalForm.tsx`, novo teste de revisão e
  este plano. Função `interpretProposal`, contrato e endpoint HTTP intactos.
  Somente mocks; nenhum Kimi real, E2E, integração com banco ou produção
  revalidado neste incremento. Os aceites integrados E1 abaixo são históricos.
- **Limites:** sem salvamento no navegador/servidor/banco, novas entidades,
  representação, vínculos, publicação ou verificação. Campos vazios são rascunhos
  sinalizados para revisão, não dados aprovados. As sugestões continuam não
  verificadas, inclusive após correção humana.
- **Próxima ação:** revisar este diff e o resultado local. Demais incrementos E2,
  persistência e I6+ continuam sem autorização. Não iniciar outra etapa.
  Rollback exige autorização e deve atingir apenas o diff E2.1, preservando
  evidências e demais trabalhos; sem reset/clean.

### Estado e evidências — fotografia do encerramento E1

- Branch: `main`.
- HEAD: `8a5d1199f4cc26906cd9ff30e75e625578e33cf9`.
- Índice vazio na conferência deste checkpoint.
- Working tree com alterações locais legítimas pendentes de navegação,
  onboarding, interpretação assistida, testes e documentação.
- E1 executada localmente: **4 E2E novos, 60 E2E de regressão, 229 testes de
  integração e 787 unitários/componentes PASS**, sem FAIL/SKIP. TypeScript,
  ESLint e diff check aprovados; **não reexecutados neste encerramento**.
- Correspondência das evidências com a árvore local conferida por HEAD,
  hashes dos arquivos preexistentes e diff dos dois testes adicionados em E1.
- Os incrementos recentes permanecem sem commit, push ou deploy.
  Nenhum teste real do Kimi foi realizado.

| Frente | Estado local | Evidência ainda necessária |
| --- | --- | --- |
| Acesso/onboarding | Percurso local de duas identidades até conclusão PF e prévia aprovado em E1, com confirmação, sessão, logout, segundo login e não duplicação | Operação de produção ainda não validada por E1; OAuth real não comprovado por esses testes |
| Assistente IA | Função, interface e rota HTTP real aprovadas em E1 com Gateway mockado; prévia sem persistência | Kimi/Bedrock real, política efetiva, orçamento e limites de produção; limitador atual por processo |
| Feed/projetos/matching | Atividades públicas, projetos e colaboração existentes; feed ampliado, capacidades persistentes e matching ainda candidatos | Contratos, consentimento, visibilidade e percursos aprovados |
| PoWth | Registros, evidências, histórico editorial e portfólio existentes; motor completo futuro | Competência verificadora e contrato operacional, sem pontuação universal |

Código local, testes com mocks, produção e validação humana são estados
distintos. E-mail, PostgreSQL/TLS e configurações Cloud não foram
reverificados neste checkpoint.

### Direção humana e limites

**Direção humana já expressa:** realizar o **DOG-01 integrado depois de
prepararmos diversos percursos funcionais do DigItap**, permitindo avaliar
a experiência conectada.

Essa direção preserva **VH-01 — compreensão, VH-02 — uso e VH-03 — decisão**,
sem declará-los cumpridos. Não dispensa testes automatizados, segurança
ou aprovação de release.

As autorizações recentes de IA têm alcance específico. A preparação de
outros percursos continua condicionada às decisões e autorizações exigidas
por I5/I6+. A ordem desejada para DOG-01 não libera esses incrementos
automaticamente nem aprova todo o conteúdo das investigações.

### Etapa ativa, próxima ação e bloqueios

- **E0 — concluída documentalmente:** painel aprovado pelo proponente e
  registrado; histórico, dívida CONTRACT e alterações anteriores preservados.
- **E1 — concluída tecnicamente, com aceite humano do resultado local:**
  aceite expresso pelo proponente no pedido de encerramento de 15/11/2026.
  Nenhum defeito de produção foi identificado na E1; não houve correção de
  código de produção. Isso não afirma ausência geral de defeitos no produto.
- **E2.1 — revisão manual temporária concluída tecnicamente e aceita pelo
  proponente no escopo acima. E2.2 — rascunhos privados concluídos
  tecnicamente em ambiente local e aceitos pelo proponente em 15/11/2026.**
  **E3.1 e E3 integrado — concluídos tecnicamente no ambiente local, aguardando
  revisão humana. E4 — concluída tecnicamente no ambiente local, aguardando
  revisão humana.** A E4 foi autorizada especificamente como implementação
  local preparatória anterior ao DOG-01; não declara I5 cumprida nem libera E5.
  A conversão de ideias não libera outras expansões E3. E2.3 e E5 continuam
  não iniciadas e sem autorização.
  Nenhuma etapa seguinte é iniciada automaticamente.
- **Pendências:** Kimi real, Cloud, e-mails de produção, PostgreSQL/TLS e sessão
  de produção não validados por E2.2; orçamento e política de retenção de
  produção ainda pendentes.
  DOG-01 e VH-01–VH-03 permanecem não validados.
- O aceite humano desta execução local não equivale a DOG-01 ou I5.
  Não ampliar E2 automaticamente a partir da autorização limitada de E2.1.

### Fila única e sequência condicionada

Somente uma etapa poderá estar ativa. Cada transição exige evidência,
decisão e autorização compatíveis com seu escopo.

| Etapa | Pilar / incremento | Critério de saída ou dependência |
| --- | --- | --- |
| E0 — concluída documentalmente | Planejamento: consolidar este painel | Aprovação documental e gravação; nenhuma implementação |
| E1 — concluída tecnicamente e aceita pelo proponente no escopo local | Acesso/onboarding: jornada autenticada até a prévia, com rota HTTP real e Gateway mockado | 4 E2E novos, 60 E2E de regressão, 229 integração e 787 unitários/componentes aprovados; produção não validada |
| E2.1 — revisão manual temporária concluída localmente e aceita | Assistente IA: editar/descartar/restaurar a prévia, sem persistência | Aceite registrado; sem criação automática de autoridade |
| E2.2 — rascunhos privados concluídos tecnicamente localmente e aceitos pelo proponente em 15/11/2026 | Assistente IA: salvar explicitamente, listar, retomar, editar e excluir ideias privadas | 827 unitários/componentes, 232 integração, 4 E2E (0 FAIL/SKIP), TypeScript, ESLint e diff check PASS; Cloud/Kimi/produção e política de retenção não validados |
| E3.1 — descoberta pública concluída tecnicamente localmente; revisão humana pendente | Feed: deduplicar publicadores de atividades já publicadas e ligar a perfis públicos | 10 testes da home e 50 regressões públicas PASS; dados limitados ao snapshot público |
| E3 integrado — percurso ideia privada → rascunho → curadoria → descoberta pública, concluído tecnicamente localmente; revisão humana pendente | Reutilizar atividades, curadoria e publicação existentes sem promover a ideia automaticamente | 835 unitários/componentes, 233 integração PostgreSQL local, 7 E2E selecionados (0 FAIL/SKIP), TypeScript, ESLint e diff check PASS; Cloud, Kimi real e DOG-01 não validados |
| E4 — concluída tecnicamente localmente; revisão humana pendente | Capacidades, necessidades e encontros: declaração privada, visibilidade explícita, compatibilidade determinística, interesse e convite/aceite existente | 843 unitários/componentes, 238 integração PostgreSQL local, 1 E2E integrado (0 FAIL/SKIP), TypeScript, ESLint e diff check PASS; consentimento organizacional por UI e produção não comprovados; não equivale a I5 |
| E4.1 — concluída tecnicamente no ambiente local; revisão humana pendente | Biblioteca de Ações e solicitações de ajuda para atividades próprias PF | 858 unitários/componentes, 241 integração PostgreSQL local, E3 conectado 1 E2E e E4/E4.1 2 E2E (0 FAIL/SKIP); TypeScript, ESLint, build e diff check PASS. Migração somente local; não equivale a I5 nem valida produção. |
| E5 — candidata | Histórico PoWth: contribuição, proveniência e confiança contextual | Delimitar o incremento; preservar contestação/revogação; não antecipar motor completo ou certificação automática |
| E6 — condicionada | Integração dos percursos autorizados | Jornada conectada e regressões aprovadas; lacunas explícitas |
| E7 — condicionada | Preparação de release | Segurança, e-mail/TLS, orçamento, privacidade, candidato e rollback verificados; publicações com autorização própria |
| E8 — condicionada | DOG-01 integrado e portões humanos I5 | Definir critérios e registrar evidências próprios de DOG-01 e de cada VH-01–VH-03; dogfooding do fundador não comprova automaticamente a validação humana de I5; decidir continuidade |

Além da autorização restrita de E2.1, os demais incrementos E2–E5 são candidatos,
não compromissos de implementação. Antes de ativá-los,
resolver expressamente seu enquadramento nos condicionantes I5/I6+.
O resultado de DOG-01 orientará a continuidade; não representa adoção comprovada.
DOG-01, VH-01, VH-02 e VH-03 exigem critérios, participantes e evidências
identificados separadamente; nenhuma equivalência automática será presumida.

### Decisões pendentes

- Delimitar quais incrementos candidatos podem preceder I5 e sob quais
  exceções, sem transformar autorizações específicas em liberação geral.
- Deliberar continuidade/persistência da proposta além da revisão temporária E2.1,
  capacidades, matching e
  reivindicação antes de materializar novas entidades ou vínculos.
- Preservar autenticação ≠ perfil ≠ representação ≠ publicação ≠ verificação.
  Declaração de fundador ou interpretação da IA não estabelece propriedade.
- Manter a dívida CONTRACT abaixo: organizações v1, PF/coletivos v2 e
  leitor dual até intervenção especificamente autorizada.

Detalhes e fontes permanecem na
[matriz de rastreabilidade](../docs/investigacoes/MATRIZ-RASTREABILIDADE-CONVERSAS-2026-11-15.md).
Este painel não duplica nem aprova suas propostas canônicas.

### Aceite e evidências de E1

**Execução local concluída; aceite humano registrado em 15/11/2026.**
Evidências finais: [resultado](../operations/evidence/e1-aceite-20261115T151151Z/E1-RESULTADO.json),
[E2E E1](../operations/evidence/e1-aceite-20261115T151151Z/e2e.json),
[regressão E2E](../operations/evidence/e1-aceite-20261115T151151Z-regressao/e2e.json),
[integração](../operations/evidence/e1-aceite-20261115T151151Z/integration.json) e
[unitários/componentes](../operations/evidence/e1-aceite-20261115T151151Z/unit.json).

Os relatórios técnicos permanecem íntegros com o status do momento da execução;
o aceite humano posterior é registrado neste plano. As falhas preliminares
foram de seletor e seleção dos testes, corrigidas sem mudanças de produção.
Auth, PF e sujeitos sintéticos E1 remanescentes: zero. O servidor próprio foi
encerrado; mensagens sintéticas podem permanecer no Mailpit conforme as fixtures.
Não houve inferência paga, commit, push, deploy ou mudança Cloud na E1.
Os critérios abaixo foram exercitados no escopo local; não comprovam operação
em produção, Kimi real, DOG-01 ou VH-01–VH-03.

- Duas identidades fictícias percorrem confirmação, login → Praça e
  Meu espaço; comprovar conclusão PF, não duplicação, sessão persistente,
  logout e segundo login.
- Acessar Descreva sua ideia pela interface e receber as sete categorias,
  trechos de origem e condição de não verificadas.
- Usar aplicação, Auth e banco locais reais, com destinos validados.
  Exercitar a rota HTTP real; simular somente o Gateway no servidor,
  sem substituir o endpoint por resposta mockada no navegador.
- Rejeitar visitante, conta não confirmada/bloqueada, origem inválida e
  identidade enviada pelo cliente antes de chamar a IA.
- Comprovar isolamento, limites, bloqueio de duplicidade e falha segura,
  sem créditos reais ou criação de registros definitivos pela IA.
- Exigir zero FAIL/SKIP nos cenários obrigatórios, regressão pertinente,
  TypeScript, ESLint e diff check aprovados; registrar contagens reais.
- Registrar HEAD, diff inicial, comandos, exit codes, duração, cenários,
  condição do mock, limpeza das fixtures próprias e Git final.
  Não sobrescrever evidências ou registrar segredos/dados pessoais.

### Parada e rollback

Ambiente indisponível significa BLOQUEADO. Interromper diante de destino
não local, chamada paga, falha de autorização, exposição de dados,
alteração inesperada ou limpeza incompleta.

Encerrar somente processos próprios. Reverter apenas o diff exclusivo do
incremento, mediante autorização, preservando todas as alterações anteriores.
Não usar reset/clean nem apagar dados permanentes.

Cada release exigirá autorização e procedimento próprio, com deployment
anterior identificado. Este plano não autoriza rollback de produção.

---

## Histórico preservado — fases e dívida CONTRACT

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
