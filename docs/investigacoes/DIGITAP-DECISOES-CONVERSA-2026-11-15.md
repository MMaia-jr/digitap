# DigItap — Reconciliação das decisões desta conversa

**Data de consolidação:** 2026-11-15  
**Origem:** mensagens do proponente e respostas nesta conversa no projeto A Praça — Itaperuna e Região.  
**Natureza:** registro de decisões e pendências, **não** autorização de código, migrations, acesso Cloud, uso de créditos, publicação, criação de instituições ou atribuição de representação.  
**Destino sugerido:** `docs/decisoes/2026-11-15-conversa-digitap-ia-onboarding.md` (ou o padrão já existente no repositório).  
**Fonte preferencial:** o enunciado original do proponente. Propostas do assistente e relatos do Codex são identificados separadamente; não se convertem automaticamente em decisões.

## 1. Mudança de orientação que esta conversa estabelece

DigItap não deve obrigar as pessoas a transcrever suas trajetórias em vários formulários. A experiência desejada é **declarar em linguagem natural → IA interpretar → usuário corrigir/aprovar → sistema estruturar registros e vínculos sob autorização → acompanhar histórico e oportunidades**.

O sistema deve continuar disponível para usuários quando o proponente estiver offline. Esta conversa no ChatGPT serve ao desenvolvimento e à revisão, **não** como motor operacional obrigatório da plataforma. A validação humana integrada deve ocorrer, preferencialmente, no site `digitap.com.br`, após construção e verificações técnicas de um conjunto mais amplo de funções. Essa direção **não é** autorização para publicar a versão local agora.

## 2. Decisões explicitamente tomadas pelo proponente

| ID | Decisão ou preferência do proponente | Evidência na conversa | Consequência técnica | Situação |
| --- | --- | --- | --- | --- |
| DEC-CONV-01 | **Evitar o preenchimento manual de formulários**; a IA deve interpretar propostas, identidade, projetos, organizações, capacidades etc. | “Eu nao gosto de ter que preencher as coisas, seria mais facil se tivissemos uma IA que interpreta...” | UX conversacional/assistida e prévia editável | Decidida como direção de experiência; escopo de cada entidade pendente |
| DEC-CONV-02 | **Atendimento a outras pessoas mesmo quando o proponente está dormindo**. | “e se eu estiver dormindo e outras pessoas usando?” | Inferência executada pelo backend do DigItap, não pela sessão privada de ChatGPT | Decidida como requisito operacional |
| DEC-CONV-03 | **Vercel AI Gateway como acesso aos modelos** aproveitando os créditos já existentes. | “Prefito usar Kimi dentro da Vercel” | Chamada no servidor, orçamento e isolamento de segredos | Decidida; saldo, elegibilidade, custo efetivo e limites não confirmados |
| DEC-CONV-04 | **Kimi** como família de modelos preferida. | “Prefito usar Kimi, é mais barato”; “Prefito usar Kimi dentro da Vercel” | Modelo inicial configurável; o Codex reportou `moonshotai/kimi-k2.5` | Decidida; versão é escolha técnica inicial, não bloqueio de evolução |
| DEC-CONV-05 | **Não gastar esforço com testes manuais de navegador local como rotina**; preferir testar o site real. | “Nao quero ficar testando navegador local, se for pra testar navegador, melhor testar logo ... digitap.com.br” | TDD/unitários/integrados durante construção; dogfooding manual no site após release autorizado | Decidida; não dispensa gates de segurança/testes automatizados |
| DEC-CONV-06 | **Acumular diversos percursos funcionais antes do dogfooding integrado com o proponente**. | “depois no final de tudo testar o site comigo em dogfooding, mas quero ter muitas coisas pra testar” | Planejar entregas integradas e um gate de release final | Decidida como preferência de sequência; contrapõe-se à condição I5→I6+ anteriormente documentada, que deve ser reconciliada formalmente |
| DEC-CONV-07 | **Trazer ao repositório o conteúdo novo desta conversa** em vez de iniciar mais um roteiro genérico. | “nesta conversa aqui tem novas decisões, novos planos, que não levamos a repositório. Precisamos levar ... ficou disperso” | Registrar decisões, propostas, resultados e pendências de forma auditável | Autorização para preparar este registro; nenhuma escrita no repositório foi feita neste atendimento |

## 3. Necessidades e hipóteses trazidas pelo proponente — ainda não aprovadas como implementação

| ID | Tema | O que foi dito | Estado correto | Decisão pendente |
| --- | --- | --- | --- | --- |
| HIP-CONV-01 | **Cadastro antecipado e reivindicação** | “nao tem como a gente criar organizaçao e atividade, e depois alguem reivindicar?” | Hipótese de produto explicitamente levantada; assistente propôs fluxo de reivindicação com análise | Quais tipos são reivindicáveis, quem pode criar a ficha, critérios de prova, disputa e revogação |
| HIP-CONV-02 | **A Praça, DigItap e fundador** | “criar ... a praça como organizaçao, digitap como projeto/produto de a praça, depois eu logaria como Marcos, reivindicaria como fundador” | Exemplo de experiência, **não** comprovação de pessoa jurídica, nome do titular, propriedade do DigItap ou mandato | Como classificar A Praça (iniciativa/coletivo/organização), registrar o produto DigItap e descrever a relação declarada de origem sem presumir propriedade |
| HIP-CONV-03 | **IA para reconhecer identidade e capacidades** | “interpreta e ja traça identidade, projetos, organizaçao, capacidades ...” | Visão de produto; ainda requer limites de extração/consentimento | Esquema de capacidades e apresentação, critérios de visibilidade e revisão |
| HIP-CONV-04 | **Resend para receber propostas** | “Eu poderia usar o Resend para receber estas propostas por email aqui direto no Chat GPT?” | Canal de entrada considerado; conexão direta com esta conversa não existe como serviço contínuo | Se e quando usar Resend Inbound/webhook, subdomínio, retenção, segurança de anexos e consentimento |
| HIP-CONV-05 | **ChatGPT como processador inicial de baixo custo** | “De Inicio acho que pra economizar dinheiro ... usar aqui ... como ... voltaria para digitap?” | Alternativa inicial; **superada como caminho operacional principal** pela exigência posterior de automação e escolha do Gateway/Kimi | ChatGPT continua como apoio ao proponente; importação manual JSON é alternativa/fallback, não fluxo principal decidido |
| HIP-CONV-06 | **Antigravity Free** | “ou talvez o Antigravity free?” | Alternativa consultada, não adotada como backend | Nenhuma ação; não torná-lo dependência de produção |

## 4. Desenho do produto proposto nesta conversa (assistente; confirmar detalhe antes de implementar)

Abaixo estão **propostas técnicas**, não decisões institucionais implícitas:

1. **Entrada livre da proposta:** texto, documentos ou e-mail; IA não exige campos longos. Primeiro canal viável: texto autenticado. Resend é canal complementar posterior.
2. **Interpretação com proveniência:** saída estruturada e validada com possíveis sujeitos, projetos, produtos, atividades, capacidades, relações e referências; cada afirmação com trecho de origem e estado de não verificada.
3. **Revisão humana:** usuário corrige, aceita ou descarta sugestões; declarar autoria não concede titularidade; publicar é ato independente.
4. **Caixa privada e continuidade:** manter original, versões da interpretação, decisões e histórico; retomar em outra sessão sem perder dados.
5. **Criação assistida:** aproveitar serviços existentes para PF, organização, projeto, atividade, curadoria, relato de realização, evidências e portfólio. Não forçar “produto tecnológico” ao tipo `organizacao`.
6. **Capacidades declaradas:** o sujeito descreve o que sabe fazer; visibilidade sob seu controle; nenhuma reputação ou certificação gerada pela IA.
7. **Ficha pré-cadastrada e reivindicação:** solicitação autenticada → conferência humana → vínculo versionado e autorizado → contestação/revogação, sem elevação automática de privilégios.
8. **Automação 24/7:** eventos de formulário/e-mail → fila persistente → worker idempotente → Vercel AI Gateway/Kimi → validação de resposta → rascunho privado → revisão humana. Falhas/custos e repetição devem ser controlados.
9. **Dogfooding de conjunto:** percorrer no domínio público contas, propostas, A Praça, DigItap, projetos, atividades, capacidades, reivindicação, e-mail, curadoria e portfólio, após liberação expressa.

**Restrições de domínio preexistentes a preservar:** conta autenticada ≠ sujeito ≠ vínculo de representação ≠ autoria ≠ curadoria ≠ publicação ≠ fato comprovado; declaração ≠ evidência ≠ verificação; A Praça não é automaticamente pessoa jurídica; DigItap não tem propriedade intelectual atribuída pela narrativa; o motor REL-01/PoWth completo não foi implementado.

## 5. Execução já reportada nesta conversa (não confundir com Cloud)

| Marco | Evidência relatada | Estado verificável a partir desta conversa |
| --- | --- | --- |
| Login e retorno à home | Codex informou GREEN local e suíte anterior de 693 testes | Implementado localmente segundo relato; não comprovado no site publicado |
| `Meu espaço` e onboarding PF | Codex registrou 708 testes PASS, typecheck, lint, diff check | Local com unitários; E2E não realizado porque Next não estava na porta 3215 |
| Interpretação Kimi | Codex relatou `src/lib/proposals/interpret.server.ts`, `tests/activities/proposal-interpretation.test.ts` (38 testes), README, total de **746 PASS** | Código de servidor com mocks; sem chamadas pagas, sem rota/UI pública e sem persistência |
| Roteamento do modelo | Codex relatou Kimi K2.5, Bedrock e ZDR solicitado | Política contratual/efetiva na conta ainda não verificada; não equivale a conformidade LGPD |
| Célula Zero como referência | Assistente examinou adaptadores Kimi/Gateway, testes e worker persistente em `MMaia-jr/celula-zero` | Reutilização seletiva sugerida; **não** integração obrigatória nem transplante de código |
| Resend / email inbound | Debatido na conversa | Não implementado neste incremento segundo o histórico compartilhado |
| Publicação no `digitap.com.br` | Proponente informa site existente | Green local não foi publicado; versão e problemas do Cloud exigem verificação independente |

O número de testes é uma informação do relatório do Codex, não uma verificação independente da árvore local neste atendimento. Os estados do Git local e do Cloud não foram alterados nesta consolidação.

## 6. Pendências decisórias objetivas

**P0 — antes de expor dados reais ou gastar créditos:** confirmar saldo e orçamento do Gateway, políticas de privacidade/roteamento e segurança do envio; verificar login, conectividade PostgreSQL/TLS, migrações e e-mail do site publicado; definir limites por usuário e retenção de propostas; analisar RLS e plano de rollback.

**P1 — antes de criar registros automaticamente:** separar `proposta` de `projeto` e `produto`; determinar quais estruturas já existem; definir titularidade de ações e revisões; definir o que acontece quando a IA sugere uma entidade que já existe; decidir se capacidades serão estrutura própria ou apresentação de dados existentes.

**P2 — antes de reivindicação institucional:** critérios de autenticação e representação, atores autorizados a decidir, documentos/atestação mínimos, disputa, contestação e revogação; não vincular a pessoa que diz ser fundadora sem validação aplicável.

**P3 — antes de Resend automático:** contrato do webhook, remetentes forjados, assinatura, anexos, idempotência, endereços/dominio, retenção, privacidade, custos e fila recuperável.

**P4 — mudança do gate I5/I6+:** registrar explicitamente que o proponente prefere um conjunto funcional mais amplo antes do DOG-01, mantendo testes e revisões de segurança intermediários; não registrar VH-01/02/03 como concluídos.

## 7. Ordem sugerida de reconciliação no repositório — DOCUMENTAÇÃO PRIMEIRO

**Passo D0 — salvar este registro:** localizar a convenção já utilizada para decisões e notas. Adicionar este documento **como registro desta conversa**, sem reescrever o Marco Zero nem o Norte do Produto e sem apagar ressalvas históricas.

**Passo D1 — atualizar índice/ponteiros existentes:** criar apenas o menor link de navegação a este registro, caso haja um índice próprio de decisões. Não editar 00–08 como efeito colateral.

**Passo D2 — conferir rastreabilidade:** conferir que cada `DEC-CONV-*` reflete manifestação expressa do proponente, que `HIP-CONV-*` permanece hipótese, e que o código reportado não foi promovido a produção/documentado como verificado.

**Passo D3 — só depois, trabalhar em incrementos de código:** tratar primeiro a UX de proposta + persistência segura; integrar sujeitos/projetos/atividades existentes; discutir capacidade, reivindicação e Resend em etapas com autorização própria para migrations, custos e Cloud. Não instalar dependências, alterar infraestrutura, publicar ou criar contas reais por ter registrado este documento.

**Critério de aceite documental:** leitor que só conhece o repositório consegue identificar: (a) o que o proponente decidiu nesta conversa, (b) o que foi apenas considerado, (c) o que o Codex já reportou, (d) quais decisões são necessárias antes da próxima implementação, sem inferir CNPJ, propriedade, representação, uso público ou adoção.

## 8. Correções de interpretação de respostas anteriores

- O plano `DIGITAP-DOG-01-plano-integrado.md` foi entregue **antes** desta reconciliação. É **roteiro proposto pelo assistente**, não inventário autoritativo de decisões da conversa. Não o transformar em decisão canônica sem revisão do proponente.
- A resposta de que “já temos 746 testes” deve ser entendida como **relato do Codex**; não prova funcionamento de usuários reais ou implantação da IA.
- “Criar A Praça como organização” e “DigItap como produto de A Praça” foram **exemplos de uma possibilidade trazida pelo proponente**, não autorização para estabelecer entidade formal, propriedade ou fundador verificado.
- A comparação de preços entre provedores não basta, sozinha, para provar economia no fluxo real. Kimi via Vercel é a escolha de modelo/provedor do proponente; ela deve ser medida contra consumo, orçamento e qualidade nos casos do DigItap.
- “Teste final no site” não deve apagar testes automatizados, segurança de banco, validação de permissões ou condições de release.

## 9. Referências internas para conferência pelo Codex

- `docs/Marco_Zero_2026-11-03.md`
- `docs/00-master-context.md`
- `docs/digitap/00-norte-do-produto.md`
- `docs/digitap/01-modelo-de-dominio.md`
- `docs/digitap/02-horizonte-estrategico.md`
- `docs/04-governanca.md`
- `docs/05-arquitetura-e-dependencias.md`
- `docs/06-privacidade-e-dados.md`
- `docs/07-criterios-de-progresso.md`
- `specs/REL-01-registro-relacoes.md`
- Célula Zero, **somente como referência técnica:** `apps/web/lib/domain/ai-gateway.ts`, `apps/web/lib/genesis/gateway.ts`, `scripts/move2-vs1-worker.mjs`.

**Ponto de controle:** manter este documento em status *reconciliação de conversa para validação*; decisões explícitas podem ser citadas como direção humana, mas nenhum item deste arquivo autoriza, por si, intervenção em sistemas externos ou novos gastos.
