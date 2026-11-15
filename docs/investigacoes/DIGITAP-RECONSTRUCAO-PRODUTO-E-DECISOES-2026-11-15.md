# DigItap — Reconstrução da visão, decisões e lacunas

**Data de referência:** 2026-11-15  
**Natureza:** investigação documental e mapa de reconciliação. **Não é** roadmap aprovado, autorização de implementação, publicação, migração ou ato institucional.  
**Fontes examinadas:** mensagens recuperáveis da conversa atual, relatos de execução do Codex reproduzidos pelo proponente, notas de reconciliação anteriores desta conversa, arquivos canônicos do DigItap consultados em `MMaia-jr/digitap` (`main`), `MMaia-jr/celula-zero` (`main`), documentos do projeto e histórico antigo preservado na Library como `Texto colado(20261103-171942).txt`. O conteúdo anterior a esta janela conversacional **não foi integralmente recuperado**. 

## 0. Resultado principal

O registro anterior recuperava implementação técnica, mas deixava de fora o desenho do produto: **praça/feed compartilhado; espaços de pessoas/coletivos/organizações; oportunidades; capacidade de encontro (matching); assistência por IA; processo de colaboração; e ciclo de contribuição→evidência→confiança contextual (PoWth)**. Não tratar as lacunas como autorização para construí-las automaticamente.

A sequência **experiência humana → integração de capacidades → relações e consequências reais** é mais importante que inventários de páginas. A exigência atual do proponente é preparar vários percursos conectados antes de DOG-01 no site real, mantendo testes automáticos e portões de segurança. Isso altera a ordem prática desejada, mas exige reconciliação documental com condicionantes I5/I6+ anteriores.

## 1. Convenção de autoridade e evidência

- **HUM-DECIDIDO**: orientação expressa do proponente recuperável em mensagem nesta conversa; o enunciado original pode ser citado.
- **HUM-PERGUNTA**: usuário introduziu necessidade ou hipótese; não é autorização de arquitetura ou de implementação.
- **ANTECEDENTE**: trecho identificável de conversa histórica/documento preservado; sua vigência não está automaticamente confirmada.
- **CANÔNICO**: decisão registrada em documento atual do repositório, respeitando data/alcance.
- **CÓDIGO-REMOTE**: implementação encontrada no `main` remoto; não confirma branch local nem produção.
- **CODEX-RELATADO**: resultado do Codex descrito pelo proponente; não confirma deploy.
- **ASSISTENTE-PROPOSTA**: sugestão técnica do assistente, não promovida a decisão humana.
- **ABERTO**: contrato funcional, titularidade, validação ou critério ainda não decidido.

Nunca inferir que identidade autenticada comprova representação, que cadastro equivale a pessoa jurídica, que evidência comprova fato, ou que proposta/assistente conferem capacidade de publicar.

## 2. Os quatro eixos recuperados

### EIXO A — Assistente IA / chatbot / combinação

**HUM-DECIDIDO:** o usuário rejeita o preenchimento extensivo de formulários; deseja uma IA capaz de interpretar descrições e produzir identidade, iniciativas, projetos, atividades, capacidades e conexões. A IA precisa atender outras pessoas sem que o fundador esteja online. Escolheu **Kimi por Vercel AI Gateway** (modelo inicial técnico K2.5), com o ChatGPT como espaço de planejamento, não execução obrigatória do app.

**HUM-PERGUNTA nesta mensagem:** "Uma IA assistente, ou Chatbot Assistente ... ou um mix dos 2". A forma precisa **não está fechada**. O desenho de produto pode distinguir **chat de descoberta/ajuda** de **assistente transacional** que prepara uma ação, mostra prévia e pede autorização antes de persistir. Não declarar que chat é autorização para mutações, publicação ou representação.

**CODEX-RELATADO:** função server-only `src/lib/proposals/interpret.server.ts`, teste `tests/activities/proposal-interpretation.test.ts` com 38 cenários, 746 testes totais PASS, Kimi K2.5 com roteamento Bedrock e ZDR solicitado, **somente mocks**, sem UI, rota pública, persistência ou chamada paga. Não confundir com feature disponível.

**Pontos em aberto:** memória/contexto durável por usuário; contexto privado versus público; consentimento e LGPD; diálogo multi-turno; ações permitidas; orçamento/rate limits; fila para execução autônoma; reconciliação de mensagens vindas do Resend; qualidade dos registros extraídos; acessibilidade; tratamento de prompt injection.

**Aceite de produto proposto (não aprovado):** um novo usuário descreve livremente o que pretende, recebe interpretação fiel e auditável, corrige, salva privadamente e continua depois, sem que a IA publique nem atribua autoridade. A repetição funciona mesmo com logout e com novos usuários.

### EIXO B — Cadastro, login, onboarding e e-mail de ponta a ponta

**HUM-DECIDIDO agora:** cadastro, login, onboarding, e-mails de cadastro e verificação "tudo precisa estar funcionando". **HUM-DECIDIDO anteriormente:** privilegiar teste manual no `digitap.com.br`, não navegador local repetitivo.

**CODEX-RELATADO:** (a) após login convencional e OAuth Google, retorno à home `/`; (b) `Meu espaço` como entrada autenticada; (c) conta confirmada, sem identidade publicadora, escolhe PF ou organização, sem seleção forçada; (d) conclusão PF desacoplada do retorno OAuth; (e) usuário PF já concluído não recadastra; (f) não conceder privilégios por navegação; (g) suíte local 693 → 708 → 746, sem E2E funcional publicado.

**CANÔNICO/CÓDIGO-REMOTE:** Supabase Auth; papéis de conta separados de `sujeitos_publicadores` e `vinculos_publicadores`; onboarding organizacional e PF com curadoria; coletivo informal existe como tipo, mas sem jornada autônoma comprovada. O `main` remoto pode diferir do branch local. Email, sessão, OAuth Google, confirmação, recuperação e rotas do Cloud exigem verificação real; testes mock não provam que as mensagens chegam.

**Matriz de jornadas a preservar:**
1. Visitante → cadastrar por e-mail → mensagem efetivamente recebida → link único de confirmação → conta verificada → login → home → Meu espaço.
2. Conta não confirmada → acesso restrito e orientação de reenvio/expiração (não presumir mecanismo já implementado).
3. Recuperar senha → e-mail recebido → token consumido → senha atualizada → sessão correta.
4. Google OAuth → retorno estável → identidade de conta distinta de escolha de sujeito.
5. Nova PF → conclusão → edição/curadoria; organização → cadastro e escopos próprios; coletivo → estado **pendente**, não promessa.
6. Mesma conta com PF + possíveis vínculos de múltiplas organizações/coletivos → **arquitetura/UX ainda aberta**, não forçar papéis globais.
7. Logout, retorno, bloqueio, sessão expirada e erro do servidor → nenhum bypass de autorização.

**Pontos abertos:** se/como usar escolha inicial de papel versus fluxo progressivo sem formulários; reenvio de verificação; mensagens transacionais Resend e templates; tratamento de falha de entrega; acesso depois de confirmação; organização pré-cadastrada e reivindicação; consentimento e atribuição de fundador/representante.

### EIXO C — Experiência DigItap: feed, atividades, projetos, capacidades, oportunidades e matching

**HUM-PERGUNTA agora:** usuário resgata "feed, atividades, projetos, lugar para Matching" como desenho do app que as sínteses anteriores omitiram. O princípio de **descoberta e encontros** foi retomado; layout, critérios de feed e algoritmo **não foram recuperados como decisões expressas vigentes**.

**ANTECEDENTE histórico identificável:** na Library `Texto colado(20261103-171942).txt`, por volta da linha 2309, o usuário perguntou: **"E aí então, cada organização terá seu mural e seu acesso? Bem como a nossa?"**. O assistente antigo respondeu com o modelo **"Camada Única, Múltiplas Vitrines"**: espaço comum de descoberta com vistas próprias por organização, evitando silos. Em outro trecho (aprox. 3835), o usuário levantou avaliação/apoio com justificativa, auditoria cidadã e separação entre fatos e opiniões, além de beta anterior à apresentação pública. Isso é **evidência de conversa**, não implementação autorizada nem obrigação de usar conselhos, gov.br, verificação coletiva automática ou publicar tudo; há aspectos históricos incompatíveis com privacidade/autorização atuais.

**CÓDIGO-REMOTE:** `src/app/page.tsx` já contém seção visual `home-feed`, explora atividades públicas e mostra cards; `src/app/atividades/page.tsx` lista atividades; `/perfil/[id]` e dashboard mostram bio/projetos/portfólio; os serviços suportam colaboração e curadoria. **Não identifiquei no `main` um contrato dedicado de matching** nem um feed que una capacidades, necessidades e projetos; `home-feed` é classe de UI, não demonstra matching.

**Design a recuperar e deliberar:**
- **Praça / Feed geral**: experiências, atividades, projetos, oportunidades, realizações. Distinção entre material público autorizado e rascunhos privados.
- **Espaço próprio**: identidade da pessoa, seus projetos, trajetória, capacidade, atividades e relações; contexto organizacional sem se apropriar da pessoa.
- **Vitrine de organização/coletivo**: perfil e destaques autorizados sobre recursos comuns, sem criar silos de dados, sem expor registros privados.
- **Projeto**: objetivo continuado, vínculo com sujeitos, colaboradores, necessidades, atividades e entregas.
- **Atividade**: evento/ação concreta, planejamento, execução, relato, evidência e curadoria; não confundir evento futuro com realização histórica.
- **Capacidade**: aquilo que alguém declara poder oferecer; disponibilidade, escopo, território, condições e visibilidade sob controle do titular.
- **Necessidade/oportunidade**: demanda concreta, contexto, condições e status; categoria distinta de atividade e de projeto.
- **Matching / Encontro**: lugar onde se conectam necessidade↔capacidade, pessoas↔projetos, propostas↔colaboração, sujeito↔oportunidade. **Algoritmo, ranking, notificações, reciprocidade e estados da interação permanecem indefinidos.** Primeiro experimento candidato: matching explicável baseado em filtros, sem inferir disponibilidade ou consentimento.

**Riscos:** feed pode se tornar rede social de vaidade; matching pode divulgar dados privados, classificar pessoas injustamente ou apresentar interesse como compromisso; espaço próprio pode virar silo; apoio/"like" não equivale à comprovação nem à decisão institucional.

### EIXO D — Proof of Worth (PoWth), relações e confiança contextual

**CANÔNICO:** `docs/digitap/00-norte-do-produto.md`: PoWth é direção central da infraestrutura de confiança relacional, **sem ranking social punitivo e sem privilégios compráveis**. `docs/digitap/01-modelo-de-dominio.md` e `specs/REL-01-registro-relacoes.md`: registro relacional diferencia declaração, confirmação da contraparte, exame/corroboração, verificação competente, contestação e revogação. **Contrato REL-01 ainda não é motor público implementado.**

**CÓDIGO-REMOTE:** existem atividades, registros de realização, evidências referenciadas, histórico editorial, colaboração, portfólio; a soma de participantes não é reputação/PoWth. Não afirmar que isso já confere valor certificado.

**Design a preservar:** pessoa/coletivo/organização age → participação/entrega é declarada → registro guarda origem/versão → contrapartes podem confirmar o escopo próprio → evidências são examinadas → decisão competente e contestável quando houver governança → trajetória fica disponível **só nos limites de consentimento e autorização** → pode tornar oportunidades descobríveis sem privilégio comprado.

**ABERTO:** instância legítima verificadora, independência e conflito de interesse, visibilidade relacional, critérios de reconhecimento, contestação, mitigação de conluio, relação exata entre PoWth e matching, qualquer consequência econômica. Não usar tokenomics antigos da Esentya como contrato do DigItap.

## 3. A conexão entre os quatro eixos: percurso de produto para DOG-01

**Isto é um cenário integrador candidato, não um contrato aprovado:**
1. Pessoa visita a praça/feed e conhece atividades e projetos publicados.
2. Cria conta, recebe e confirma e-mail, entra, escolhe ou conclui identidade em Meu espaço.
3. Conversa com o assistente em linguagem natural: “Tenho uma ideia e posso colaborar com ...”.
4. IA gera **rascunhos** de perfil/capacidades/projeto/atividade/necessidade, cada um com origem, incerteza e possibilidade de correção.
5. Pessoa aprova o que pode declarar e salvar; direitos sobre organização/coletivo são verificados por um processo independente.
6. O conteúdo público autorizado pode aparecer no feed e na vitrine respectiva.
7. Espaço de encontro sugere possibilidades explicáveis; duas partes **optam por colaborar** e registram condições, sem automação de consentimento.
8. Atividade é realizada; há relato, evidência, eventual confirmação de contraparte, curadoria/contestação.
9. Perfil/portfólio apresenta o histórico contextual; PoWth não vira nota nem certificado automático.
10. Outro usuário repete o percurso enquanto o fundador não está conectado; processamento assíncrono e custo permanecem controlados.

## 4. Questões de autoridade que impedem promoção automática de ideias em decisões

| ID | Tema | O que a fonte demonstra | O que ainda precisa de decisão |
|---|---|---|---|
| Q-01 | Assistente vs chatbot vs híbrido | Desejo de IA fluida, autônoma para outros usuários | Quais ações/superfícies e memória a IA terá; quais autorizações por etapa |
| Q-02 | Feed e arquitetura de espaços | Usuário levantou feed/matching; histórico inclui mural comum + vitrines | Tipos de item, filtragem, personalização, privacidade, critérios de ordenação |
| Q-03 | Matching | Desejo explicitado nesta mensagem; Célula Zero contém inspiração de oportunidades/propostas | Significado de match, atributos, consentimento, explicabilidade, prioridade/ordem e visibilidade |
| Q-04 | Onboarding e múltiplas identidades | Conta ≠ sujeito; PF e organização distintos; UX atual incompleta | Conta PF + vários vínculos, coletivo e reivindicação; escolha de contexto |
| Q-05 | A Praça e DigItap | A Praça é iniciativa; DigItap pode servir outras comunidades | Não inferir pessoa jurídica nem propriedade de produto/marca |
| Q-06 | Emails | Resend informado em produção; desejo de tudo funcional | Templates, confirmação, recuperação, reenvio, bounce, suporte, testes com inbox sintética |
| Q-07 | PoWth | Direção aprovada; REL-01 como contrato futuro | Competência verificadora, corroboração e integração com matching |
| Q-08 | Sequência | Proponente prefere bateria ampla de DOG-01 no site | Registrar alteração de preferência frente ao condicionamento histórico I5/I6+ sem inferir validação já cumprida |

## 5. Matriz da realidade — não confundir documentação, código, operação e adoção

| Capacidade | Fontes | Estado demonstrável |
|---|---|---|
| Home com cards de atividades | `src/app/page.tsx` em `main` | Código remoto; não prova feed ampliado nem disponibilidade Cloud |
| Projetos/portfólio/colaboração | Modelo de Domínio e `src/app/dashboard/**` | Infraestrutura de código remoto, sob autorizações existentes |
| Login/PF/Meu espaço | Relatos Codex e scripts locais | Implementação e testes locais relatados; não publicada/validada no site por esta investigação |
| Email transacional | README informa Resend | Implantação relatada; entrega real e casos de erro não testados aqui |
| Kimi interpreta texto | Relato Codex, 38 casos e 746 totais | Implementação mock local; sem uso público e sem fatura comprovada |
| Feed integral | Antecedente histórico + desejo atual | Conceito; home atual não basta |
| Matching | Desejo explícito atual + referências históricas CZ | Sem contrato do DigItap e sem implementação comprovada |
| PoWth / REL-01 | Norte + contrato | Direção aprovada, motor relacional futuro, não pronto |
| Reivindicação | Pergunta expressa do proponente | Hipótese; sem fluxo autorizado comprovado |
| Dogfooding | Preferência do proponente | Ainda não realizado nesta rodada |

## 6. Evidências e URLs identificadas

**DigItap**
- https://github.com/MMaia-jr/digitap/blob/main/docs/digitap/00-norte-do-produto.md
- https://github.com/MMaia-jr/digitap/blob/main/docs/digitap/01-modelo-de-dominio.md
- https://github.com/MMaia-jr/digitap/blob/main/docs/digitap/02-horizonte-estrategico.md
- https://github.com/MMaia-jr/digitap/blob/main/specs/REL-01-registro-relacoes.md
- https://github.com/MMaia-jr/digitap/blob/main/src/app/page.tsx
- https://github.com/MMaia-jr/digitap/blob/main/README.md
- https://github.com/MMaia-jr/digitap/blob/main/docs/05-arquitetura-e-dependencias.md

**Célula Zero — inspiração/reutilização seletiva, não base obrigatória**
- https://github.com/MMaia-jr/celula-zero/blob/main/apps/web/lib/domain/ai-gateway.ts
- https://github.com/MMaia-jr/celula-zero/blob/main/apps/web/lib/genesis/gateway.ts
- https://github.com/MMaia-jr/celula-zero/blob/main/scripts/move2-vs1-worker.mjs
- https://github.com/MMaia-jr/celula-zero/blob/main/apps/web/app/projects/%5Bslug%5D/opportunities/%5BopportunityId%5D/page.tsx

**Histórico conversacional anterior preservado:** `Texto colado(20261103-171942).txt` (Library), linhas aproximadas 2309–2404 (mural por organização e praça comum) e 3835–3940 (apoio justificado, auditoria, beta). Atenção: histórico contém recomendações antigas sobre gov.br, instituição/assembleia, acesso de organizações e informação pública, algumas superadas ou incompatíveis com a modelagem atual. Usar como pista de intenção/ideia, não como comando de implementação.

**Notas produzidas nesta conversa e ainda não promovidas a canônicas:**
- `DIGITAP-DECISOES-CONVERSA-2026-11-15.md`
- `DIGITAP-RECONCILIACAO-AMPLIADA-ONBOARDING-2026-11-15.md`
- `DIGITAP-DOG-01-plano-integrado.md` — planejamento preliminar incompleto; não usar como fonte absoluta para produto/feed/matching.

## 7. Critério para incorporar ao repositório

Primeiro, **documentar**, sem atualizar código. Criar um índice de rastreabilidade das fontes e uma nota de reconciliação, seguindo a estrutura real do projeto; não sobrepor silenciosamente `00-master-context.md` ou transformar conversa antiga em nova decisão. Cada afirmação precisa de ID, classificação, referência e data; as questões Q-01–Q-08 ficam com status ABERTO até decisão humana. Confirmar no branch local mudanças que não estão em `main` e preservar os testes.

**Próxima ação permitida:** entregar este inventário à revisão humana e preparar incorporação documental read-only primeiro. **Não autorizados neste documento:** PR/merge/commit/push, migrações, chaves, consumo pago, criação de organizações reais, convite de pessoas, deploy.
