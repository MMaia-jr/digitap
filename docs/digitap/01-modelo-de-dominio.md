# DigItap — Modelo de Domínio

## 1. Leitura e limites

[DECIDIDO] O [Norte do Produto](00-norte-do-produto.md) orienta o DigItap como infraestrutura cívica de confiança relacional: registrar atividades, preservar evidências e construir históricos contextualizados. A prioridade é estabilizar o núcleo existente antes de implementar o motor relacional completo. Este documento não altera o Norte nem autoriza novas funcionalidades.

[CÓDIGO] Este inventário descreve a árvore local sobre a base Git `fda9da2`, incluindo alterações ainda não versionadas de configuração PostgreSQL/cookies e os arquivos locais de REL-01. Migration presente significa definição em SQL; teste presente significa cenário escrito. Nenhum dos dois comprova aplicação de schema, execução atual ou disponibilidade remota.

| Etiqueta | Como interpretar |
| --- | --- |
| [DECIDIDO] | Direção de produto aprovada no Norte ou decisão explicitamente registrada nas fontes canônicas. Não significa implementação ou governança institucional constituída. |
| [CÓDIGO] | Estrutura, comportamento ou teste encontrado nos arquivos locais referenciados. |
| [CONTRATO] | Especificação de comportamento ainda não implementado; não é capacidade disponível. |
| [PENDENTE] | Decisão, validação humana, segurança operacional ou confirmação de infraestrutura ainda necessária. |

[CÓDIGO] Fontes de contexto: [master context](../00-master-context.md), [arquitetura](../05-arquitetura-e-dependencias.md), [privacidade](../06-privacidade-e-dados.md), [README](../../README.md) e [progresso](../../operations/progresso.md). As notas históricas dessas fontes não substituem a inspeção do código corrente.

## 2. Contas e autenticação

[CÓDIGO] Autenticação usa Supabase Auth para cadastro, login, confirmação de e-mail, recuperação de senha e encerramento de sessão. A aplicação verifica o usuário com `getUser`; senha e sessão não são atributos do sujeito publicador. Fontes: [gateway](../../src/lib/auth/gateway.server.ts), [fluxo Auth](../../src/lib/auth/flow.server.ts) e [permissões](../../src/lib/auth/permissions.server.ts).

[CÓDIGO] `contas_acesso` associa `auth_user_id` ao papel de aplicação (`organizacao`, `publicador`, `editor` ou `administrador`), situação (`ativa`, `bloqueada` ou `desativada`) e organização legada quando aplicável. Metadados de usuário podem registrar intenção de cadastro PF e nome, mas não concedem papel editorial ou acesso a outro titular. Fontes: [permissões](../../src/lib/auth/permissions.server.ts) e [fluxo](../../src/lib/auth/flow.server.ts).

[CÓDIGO] As operações protegidas exigem identidade e autorização no servidor. A configuração local atual mantém cookies HttpOnly no servidor, SameSite e `Secure` em produção; o browser ajusta somente `Secure`, sem habilitar novos destinos OAuth. Fontes: [cookies SSR](../../src/lib/supabase/server.ts), [browser](../../src/lib/supabase/browser.ts), [proxy](../../src/proxy.ts) e [testes Secure](../../tests/auth/secure-cookies.test.ts).

[PENDENTE] Controle de uma conta/e-mail não comprova identidade civil, mandato institucional ou verdade de uma declaração. Configuração remota de cadastro, entrega de e-mail e OAuth não foi verificada por esta documentação.

## 3. Pessoas físicas, coletivos e organizações

[DECIDIDO] As decisões D1–D4 registradas no [master context](../00-master-context.md) distinguem pessoa física, coletivo informal e organização. Inclusão desses sujeitos não implica dispensar autorização de representação ou curadoria.

[CÓDIGO] `sujeitos_publicadores` é o identificador comum do titular de publicações, com tipo fechado `pessoa_fisica | coletivo_informal | organizacao`, nome público, estado, risco, modo de publicação, versão e origem. `pessoas_fisicas` associa o sujeito à conta; `coletivos_informais` registra nome em curadoria e referências à decisão; organizações mantêm correspondência com `organizacoes` por `organizacao_legada_id`. Fonte: [I4 EXPAND](../../supabase/migrations/20261106003448_i4_expand.sql).

[CÓDIGO] Estado do sujeito (`pendente`, `ativo`, `suspenso`, `encerrado`), modo de publicação (`curadoria_previa`, `autopublicacao`) e papel da conta são dimensões diferentes. A organização legada também possui validação institucional própria. A presença do valor `autopublicacao` no schema não demonstra que todo titular tenha um percurso de autopublicação disponível.

[CÓDIGO] O onboarding de organização cria organização pendente, sujeito e vínculo; o onboarding PF usa RPC específica. Identidade deriva da sessão verificada. Fontes: [gateway](../../src/lib/auth/gateway.server.ts), [compatibilidade I4](../../supabase/migrations/20261106014443_i4_compat.sql) e [onboarding legado](../../supabase/migrations/20261103230507_organization_onboarding.sql).

[PENDENTE] Cadastro autodeclarado de organização não equivale a reconhecimento de representação institucional. Estrutura SQL, validações e fixtures de coletivo não comprovam um onboarding completo disponível a visitantes. A operação e a validação humana dos diferentes percursos precisam de evidência própria.

## 4. Vínculos e representação

[CÓDIGO] `vinculos_publicadores` liga conta a sujeito, com papel (`titular`, `representante`, `membro`), escopos (`ler_privado`, `editar`, `enviar`, `publicar`, `gerir_vinculo`), situação, versão e indicação de versão atual. O vínculo não se confunde com o papel global da conta. Fontes: [I4 EXPAND](../../supabase/migrations/20261106003448_i4_expand.sql) e [acesso ao perfil](../../src/lib/queries/profiles.server.ts).

[CÓDIGO] A migration protege a identidade material e o histórico versionado do vínculo. Para representação de coletivo, contém requisitos de duas atestações elegíveis e decisão editorial; revogação de atestação vinculada pode suspender a representação ativa. Isso é integridade da representação, não verificação independente de todos os fatos publicados. Fonte: [regras e triggers I4](../../supabase/migrations/20261106003448_i4_expand.sql).

[CÓDIGO] Serviços de atividades e gestão do perfil verificam titularidade, situação e escopo conforme o percurso. No caminho organizacional legado, o isolamento também usa `contas_acesso.organizacao_id`; não se deve descrever toda autorização atual como uma única política genérica de vínculos. Fontes: [serviço de atividades](../../src/lib/activities/service.server.ts) e [ownedProfile](../../src/lib/queries/profiles.server.ts).

[PENDENTE] Duas contas distintas não garantem duas pessoas independentes. Reconhecimento de mandato, conflitos de interesse, revogação operacional e prevenção de conluio exigem critérios e acompanhamento humanos; não são resolvidos por contagem de atestações.

## 5. Projetos e atividades

[CÓDIGO] Projeto é agrupamento pertencente a um sujeito, com título, descrição e ano. A criação institucional exige titularidade ativa e escopo de edição; o formulário atual não permite que PF crie projeto institucional. Fontes: [schema de projetos](../../supabase/migrations/20261109145628_projetos_bio_portfolio.sql), [ações de gestão](../../src/app/dashboard/actions.ts) e [consulta de projetos](../../src/lib/queries/projects.server.ts).

[CÓDIGO] Atividade registra título, descrição, início previsto, orientação de acesso e referência oficial opcional. Possui titularidade, autoria, versão submetida, estado editorial, programação e vínculo opcional a projeto. O serviço deriva a identidade do autor da sessão, valida o projeto e restringe a leitura privada ao escopo autorizado. Fontes: [domínio de atividades](../../src/lib/activities/domain.ts) e [serviço](../../src/lib/activities/service.server.ts).

[CÓDIGO] `vinculos_colaboracao` liga sujeito a projeto, com papel de colaboração e status. Não é vínculo de representação: aceitar colaboração não transfere titularidade da conta ou do espaço privado. O código contém convite, resposta, remoção e decisão de coordenação sobre atividades propostas. Fontes: [migration de colaboração](../../supabase/migrations/20261109200957_colaboracao_projetos.sql), [serviço de colaboração](../../src/lib/queries/collaboration.server.ts) e [cenário E2E](../../tests/e2e/collaboration.spec.mjs).

[CÓDIGO] A migration posterior de colaboração remove a exigência inicial de que todo projeto e atividade tenham o mesmo sujeito. Preserva `criado_por_sujeito_id` e exige colaboração ativa e aprovação da versão pela coordenação quando a atividade pertence a outro sujeito. Essa aprovação não substitui a curadoria editorial. Fontes: [migration posterior](../../supabase/migrations/20261109200957_colaboracao_projetos.sql) e [requireCoordination](../../src/lib/activities/service.server.ts).

[CÓDIGO] O fluxo editorial distingue rascunho, envio, revisão, aprovação, publicação, devolução, rejeição e retirada. Programação (`programada`, `adiada`, `cancelada`, `realizada`) é uma dimensão separada. Edição de publicação pode iniciar nova versão privada enquanto a leitura pública conserva o snapshot anterior autorizado. Fontes: [serviço](../../src/lib/activities/service.server.ts), [publicação](../../src/lib/activities/publication.ts) e [consultas públicas](../../src/lib/queries/public.server.ts).

[CÓDIGO] Apoio e intenção de presença usam `confirmacoes`: escolha única por atividade/sujeito, WhatsApp opcional privado e divulgação opcional do nome mediante escolha explícita. Contadores e intenção não comprovam comparecimento. Fontes: [participação](../../src/lib/participation/service.ts), [tipos de saída](../../src/lib/participation/types.ts) e [migration](../../supabase/migrations/20261111222337_confirmacoes_apoio_intencao.sql).

## 6. Registros de realização

[CÓDIGO] `registros_realizacao` registra um relato por atividade, com `data_realizacao`, descrição factual e origem da informação. Nasce `declarado` e `rascunho`. Possui apuração (`declarado`, `corroborado`, `contestado`) separada do estado editorial e snapshot de publicação próprio. A presença do estado `corroborado` no schema não fornece, sozinha, um procedimento de corroboração. Fontes: [schema](../../supabase/migrations/20261103221114_security_foundation.sql), [validação](../../src/lib/activities/domain.ts) e [registros](../../src/lib/activities/records.server.ts).

[CÓDIGO] `createRecord` aceita data efetiva passada ou atual, rejeita data futura e não reescreve a data de criação da atividade. O schema do registro não define `criado_em`; o lançamento é rastreado pelo evento editorial com `ocorrida_em`. Fonte: [criação e auditoria](../../src/lib/activities/service.server.ts).

[CÓDIGO] O formulário simplificado de realização PF é outro percurso: exige atividade publicada já iniciada, usa o dia do lançamento como `data_realizacao`, recebe participantes declarados e autorização de divulgação após revisão. Esses dados adicionais ficam codificados na origem da informação. Fontes: [serviço](../../src/lib/activities/service.server.ts) e [contrato do formulário](../../src/lib/activities/realization.ts).

[PENDENTE] Não há percurso histórico completo comprovado para criar agora uma atividade antiga: a criação normal exige início futuro, com tolerância limitada para “acontecendo agora”. Não confundir aceitar data passada no registro com importação histórica pronta. Quantidade declarada de participantes não é frequência verificada.

## 7. Evidências e proveniência

[DECIDIDO] Transparência não exige exposição do dado bruto. Registro, evidência e reputação devem permanecer distintos; assinatura ou hash não demonstram a verdade do conteúdo. Fontes: [master context](../00-master-context.md), [privacidade](../06-privacidade-e-dados.md) e [Norte](00-norte-do-produto.md).

[CÓDIGO] `evidencias` contém referência ao registro, tipo de fonte, URL pública, afirmação delimitada, data de consulta e aprovação de publicação inicialmente falsa. O serviço rejeita fontes impróprias e alguns padrões de dados sensíveis; receber referência não corrobora automaticamente o relato. Fontes: [schema](../../supabase/migrations/20261103221114_security_foundation.sql), [validação de evidência](../../src/lib/activities/domain.ts) e [testes de registros](../../tests/integration/records.database.test.ts).

[CÓDIGO] Eventos editoriais registram ação, autor interno, estados e data; hashes associam operações e aprovações ao conteúdo esperado. Essa trilha permite conferir consistência e origem da operação, sem comprovar o fato narrado. Fontes: [serviço](../../src/lib/activities/service.server.ts) e [snapshots de registro](../../src/lib/activities/records.server.ts).

[DECIDIDO] Reutilizar infraestrutura comum, incluindo a direção de usar Supabase Storage para arquivos, está no [Norte aprovado](00-norte-do-produto.md).

[PENDENTE] O núcleo inspecionado trabalha com URLs, sem percurso de upload privado implementado. Integração Storage, regras de acesso, retenção e revisão de documentos continuam pendentes; uma referência privada no banco não protege o arquivo externo. Filtros textuais não garantem remoção de todo dado pessoal.

## 8. Curadoria, autorização e contestação

[DECIDIDO] D1–D4 orientam curadoria inicial e por risco; representação, aprovação editorial, autorização para divulgar e comprovação do fato são responsabilidades diferentes. A direção de governança comunitária do Norte não constitui, por si, uma instância operacional ou verificadora. Fontes: [master context](../00-master-context.md) e [Norte](00-norte-do-produto.md).

[CÓDIGO] A conta editorial revisa e publica por operações autorizadas no servidor. Aprovação exige autorização pertinente ao objeto e à versão; publicação confere aprovação, vigência e consistência do conteúdo. A autorização do anúncio não basta para publicar o registro posterior. Fontes: [serviço](../../src/lib/activities/service.server.ts), [autorização de publicação](../../src/lib/activities/publication.server.ts), [registros](../../src/lib/activities/records.server.ts) e [testes editoriais](../../tests/integration/record-editorial.database.test.ts).

[CÓDIGO] A curadoria inicial PF pode ativar o sujeito ao aprovar sua primeira publicação, sem liberar autopublicação automaticamente. Fonte: [editorial PF](../../src/lib/activities/editorial-pf.server.ts).

[CÓDIGO] Contestação do registro preserva relato e snapshot, acrescenta evento restrito e muda sua apuração para `contestado`; a aprovação/publicação fica bloqueada nesse estado até tratamento específico. Revogar autorização pode ocultar a publicação abrangida sem apagar o snapshot. Fontes: [contestação](../../src/lib/activities/contestation.server.ts), [registros](../../src/lib/activities/records.server.ts), [revogação](../../src/lib/activities/revocation.server.ts) e [consulta pública](../../src/lib/queries/records.server.ts).

[CONTRATO] Essa contestação existente de realização não deve ser confundida com o processo paralelo de contestação do futuro Registro de Relações. As regras futuras pertencem ao [REL-01](../../specs/REL-01-registro-relacoes.md), sem migração implícita dos estados atuais.

[PENDENTE] Critérios operacionais de reconhecimento institucional, tratamentos de divergência ainda sem percurso completo e implementação integral das decisões de autopublicação precisam de validação própria. Papel de editor não concede autoridade para declarar uma relação VERIFICADA.

## 9. Portfólio e visibilidade pública

[CÓDIGO] `/perfil/[id]` apresenta nome público, bio, projetos associados a atividades visíveis e relatos publicados. O visitante recebe atividades e realizações após verificações de snapshot/autorização; a bio e os dados descritivos dos projetos são consultados diretamente das tabelas, não do snapshot da atividade. Fontes: [perfil](../../src/lib/queries/profiles.server.ts), [portfólio](../../src/lib/queries/portfolio.server.ts), [atividades públicas](../../src/lib/queries/public.server.ts) e [registros públicos](../../src/lib/queries/records.server.ts).

[CÓDIGO] O titular pode ver projetos ainda sem atividade pública na gestão integrada ao perfil. Isso não implica que visitantes recebam os mesmos projetos. O botão de PDF chama impressão do navegador, sem emissão de certificado ou assinatura do servidor. Fontes: [portfólio](../../src/lib/queries/portfolio.server.ts), [botão de impressão](../../src/components/PrintPortfolioButton.tsx) e [E2E de portfólio](../../tests/e2e/portfolio.spec.mjs).

[CÓDIGO] Totais de participantes do portfólio são derivados dos relatos com metadados reconhecidos e excluem os contestados desse somatório. Não representam medição independente, ranking ou pontuação PoWth. Fonte: [portfolioEvidence](../../src/lib/queries/portfolio.server.ts).

[PENDENTE] A divulgação de bio, textos e referências exige cuidado editorial e minimização; não há garantia automática de anonimização. Impressão exporta o que foi disponibilizado na página. Validação humana de utilidade, governança e operação de privacidade não decorre da existência dessa tela.

## 10. Relações e PoWth

[DECIDIDO] O Norte situa confiança relacional e PoWth na direção do produto, sem pontuações sociais punitivas ou privilégios compráveis; adia o motor completo até o núcleo estar seguro e validado. Não se descreve esse motor como funcionalidade pronta.

[CONTRATO] O [REL-01 — Registro de Relações](../../specs/REL-01-registro-relacoes.md) é a referência única para entidades, comprovação, privacidade, contestação e revogação do motor futuro. Este documento não reproduz suas transições nem redefine suas regras. Vínculo de representação, colaboração em projeto e confirmação de presença atuais não equivalem à confirmação de uma relação nesse contrato.

[CÓDIGO] No ramo local isolado `wip/rel-01-contract-red`, ficam os testes de domínio REL-01 (`tests/relations/registro-relacoes.domain.test.ts`) e o registro RED (`operations/evidence/rel-01/REPORT.md`); esses arquivos não integram a árvore de `main`. O carregador de teste procura um motor ainda ausente; as falhas registradas por ausência não demonstram 14 vulnerabilidades do produto existente.

[PENDENTE] Competência verificadora, critérios formais, independência de fontes e demais deliberações seguem abertos no REL-01. Não conceder essa competência ao editor atual nem promover quantidade de referências ou valores financeiros a prova automática.

## 11. Evidências locais, divergências e validações restantes

[CÓDIGO] Há testes para [Auth](../../tests/auth/flow.test.ts), [onboarding](../../tests/integration/onboarding.database.test.ts), [isolamento de atividades](../../tests/integration/activities.database.test.ts), [registros](../../tests/integration/records.database.test.ts), [publicação/contestação](../../tests/integration/record-editorial.database.test.ts), [colaboração](../../tests/e2e/collaboration.spec.mjs) e [portfólio](../../tests/e2e/portfolio.spec.mjs). Sua existência não significa reexecução nesta revisão documental.

[CÓDIGO] A árvore local já contém correção P0 de PostgreSQL por ambiente, autorização independente de endpoint e TLS verificado, além de cookies Secure em produção. O [relatório da Parte 1](../../operations/evidence/af-p0-parte-1/REPORT.md) registra 81 testes específicos PASS com mocks. Fontes atuais: [database.server.ts](../../src/lib/database.server.ts) e [cookies](../../src/lib/supabase/server.ts). Isso difere da restrição exclusivamente local ainda descrita no README/progresso; esses arquivos não foram alterados neste escopo.

[CÓDIGO] Os snapshots históricos de contexto/arquitetura tratam I4 como futuro e portfólio como condicionado a etapa posterior. Migrations e serviços locais já contêm sujeitos, representação, projetos e portfólio. Essa divergência de datas deve ser preservada como proveniência, sem concluir aprovação retroativa ou validação humana cumprida.

[PENDENTE] Confirmar aplicação real de migrations, RLS/grants, conexões, certificados, configuração Auth e operação de privacidade requer outro escopo autorizado. As mudanças P0 locais e testes simulados não comprovam disponibilidade de produção. Retenção, direitos dos titulares, fundamentos de tratamento e transferência internacional exigem validação própria; este modelo não é parecer jurídico.

[PENDENTE] A validação humana exigida pelo contexto canônico continua distinta da existência do software e de testes. O Norte é direção aprovada; assembleia operante, soberania de dados concretizada e motor relacional completo não podem ser deduzidos dessa aprovação.
