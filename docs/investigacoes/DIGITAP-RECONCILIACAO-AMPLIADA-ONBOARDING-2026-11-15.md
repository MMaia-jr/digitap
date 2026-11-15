# DigItap — Reconciliação ampliada da conversa: cadastro, onboarding e decisões dispersas

**Data:** 15/11/2026  
**Natureza:** suplemento corretivo da reconciliação anterior; não substitui decisões canônicas nem autoriza implementação, publicação ou alterações em produção.  
**Cobertura real:** mensagens visíveis desta conversa, resumo de continuidade disponível e materiais preservados nesta sessão (`Markdown colado.md`, `Texto colado.txt`, `digitap_green_auth_navigation.py`, `digitap_workspace_increment.py`). **Não é uma transcrição integral de todas as mensagens antigas**. Quando a autoria humana de uma regra não pode ser reconstituída literalmente, marco como comportamento implementado ou inferência, não como decisão do proponente.

## 1. Por que a reconciliação anterior ficou incompleta

O documento `DIGITAP-DECISOES-CONVERSA-2026-11-15.md` concentrou decisões recentes sobre IA/Kimi, registros reivindicáveis, e-mails e dogfooding. Deixou de tratar em detalhe o percurso **visitante → cadastro → confirmação de e-mail → login → escolha de identidade → conclusão PF ou organização → área autorizada**. Esse percurso já foi objeto de dois incrementos locais e contém contratos de produto que precisam constar no histórico.

## 2. Inventário recuperado do onboarding — com status de evidência

| ID | Regra/produto que emergiu nos incrementos | Evidência técnica preservada | Classificação segura | Ponto para validação humana |
| --- | --- | --- | --- | --- |
| ONB-01 | **Após login por e-mail/senha, retornar à home `/`**, e não empurrar automaticamente para um dashboard ou completar PF. | Script de GREEN modifica `src/lib/auth/flow.server.ts` e testes `auth/flow.test.ts`, `auth/pf-flow.test.ts`. | Comportamento local relatado pelo Codex, testado com mocks. | Confirmar se a home deve ser sempre destino ou se futuramente há destinos explícitos `next` seguros. |
| ONB-02 | **Após callback Google OAuth, retornar à home `/`** para papéis PF, organização, editor/admin; não criar PF no callback. | Script de GREEN modifica `src/lib/auth/oauth.server.ts` e `tests/auth/oauth-callback.test.ts`. | Comportamento local relatado. | Confirmar regra de retorno para fluxos específicos legítimos. |
| ONB-03 | **Login e cadastro de perfil são operações distintas**: não forçar conclusão PF apenas por autenticação. | Testes atualizados do callback; mudança de `next` pós-login; rota de conclusão PF explícita. | Regra operacional observada no código. | Verificar como comunicar etapa pendente na interface pública. |
| ONB-04 | Conta verificada **sem vínculo/perfil escolhe PF ou organização conscientemente** em `/meu-espaco`, nunca vai direto ao cadastro organizacional. | `tests/components/workspace-entry.test.tsx`, `tests/auth/viewer-workspace.test.ts` e criação `src/app/meu-espaco/page.tsx`. | Comportamento local relatado. | Aprovar rótulos, linguagem e alternativas de onboarding. |
| ONB-05 | **Meu espaço é entrada de navegação autenticada**, sem substituir autorização de cada dashboard. | Atualização `src/components/AppHeader.tsx`; rota `/meu-espaco`. | Implementação local reportada. | Navegação futura para múltiplos sujeitos sob a mesma conta ainda não definida. |
| ONB-06 | **Conclusão PF autônoma** deve consultar sessão e estado PF diretamente; não depender de redirecionamento de OAuth/login. | Reescrita `src/app/cadastro/pessoa-fisica/completar/page.tsx`; `profile-completion-regression.test.tsx`. | Correção local reportada. | Revisar UX de retomar cadastros incompletos. |
| ONB-07 | **PF já existente não deve ser recadastrada**; o fluxo redireciona à área PF. | Teste `PF-REG` de PF ativa. | Regra testada com mocks. | Confirmar caso de vários vínculos/identidades. |
| ONB-08 | Conta organizacional não é convertida silenciosamente em PF. | Testes de perfil concluído e estados de conta. | Regra testada com mocks. | Definir futuro suporte de pessoa + representação institucional sob um login. |
| ONB-09 | **E-mail não confirmado, conta bloqueada ou consulta indisponível não recebem onboarding liberado**; falha de serviço não é interpretada como ausência de perfil. | `viewer-workspace.test.ts`, `workspace-entry.test.tsx`, `profile-completion-regression.test.tsx`. | Requisito de segurança refletido em testes locais. | Nenhum. Verificar em produção no gate de segurança. |
| ONB-10 | **Nome público PF sem CPF/documentos; sujeito fica pendente de curadoria**, sem publicação automática. | Texto de `PROFILE_PAGE` no script do incremento e regra preexistente do modelo de domínio. | Comportamento de interface implementado no script. | Revisar informação de privacidade e clareza do retorno editorial. |
| ONB-11 | **Coletivo informal não foi omitido conceitualmente**, mas a escolha `/meu-espaco` ainda não oferece cadastro autônomo de coletivo. | Texto de `NEW_PAGE` e modelo de domínio (`sujeitos_publicadores`). | Limitação explicitamente visível, não funcionalidade pronta. | Qual será o percurso de cadastro de coletivo? Não presumir que associação sem CNPJ seja organização formal. |
| ONB-12 | Papéis (`publicador`, `organizacao`, `editor`, `administrador`) não são concedidos por navegação; acesso continua segregado. | `Viewer.server.ts`, testes de contas e fluxo; modelo de domínio. | Invariante técnica a preservar. | Nenhum quanto à separação; UX multimodal permanece pendente. |
| ONB-13 | Navegação E2E foi atualizada para observar primeiro `/` e abrir dashboard explicitamente. | Script de GREEN alterou expectativas dos E2E. | Testes alterados, **não executados** na validação descrita. | Validar em produção posteriormente, sem declarar que já passou no navegador. |
| ONB-14 | **Não testar navegador local repetidamente; consolidar dogfooding no `digitap.com.br`** após release autorizado. | Mensagem expressa do proponente nesta conversa. | **Decisão explícita do proponente.** | Definir gate de publicação, contas sintéticas e reversão antes de dados reais. |

**Observação:** ONB-01 a ONB-13 são evidências de comportamento projetado/implementado, mas não há mensagem literal suficiente nesta superfície para atribuir todas as regras como decisões formuladas pelo proponente. O histórico deve respeitar essa distinção.

## 3. Contratos de experiência que precisam ser considerados juntos

### 3.1 Jornada inicial

1. Visitante conhece o conteúdo público e pode iniciar cadastro/login.
2. A autenticação verifica sessão/e-mail, mas não adivinha qual sujeito o usuário deseja representar.
3. Após login ou OAuth o usuário retorna à home pública.
4. `Meu espaço` permite descoberta do espaço próprio. Para conta nova confirmada sem vínculo, apresenta escolha explícita entre PF e organização; coletivo informal fica identificado como opção futura não implementada.
5. PF completa nome público, entra em curadoria e não ganha publicação automática. Organização segue onboarding institucional já existente com suas próprias regras.
6. Cada área restrita aplica autorização no servidor; não basta a URL ou o nome que o usuário declarou.

### 3.2 Tensão nova surgida nesta conversa

A experiência de **IA que interpreta identidade, projetos, coletivos e capacidades com menos formulários** afeta esse mesmo onboarding. Não se deve criar um segundo cadastro paralelo que contorne o fluxo de sessão, PF e organização já existente. A IA deverá preparar dados e sugerir preenchimento, **mas a identidade escolhida, vínculo e curadoria só são efetivados pelos serviços autorizados existentes**. É proposta de composição ainda não implementada, não decisão técnica já aceita em seus detalhes.

### 3.3 Casos que ainda não têm contrato fechado

- Uma conta que é **pessoa física** e **representante de uma ou mais organizações/coletivos**: o modelo de vínculos pode admitir distinções, mas a UX de troca de contexto não está decidida aqui.
- Cadastro de **coletivo informal**: modelo de domínio e atestações existem, mas o onboarding autônomo não foi demonstrado.
- Organizações já existentes pré-cadastradas e **reivindicáveis**: proponente levantou hipótese; critérios de reivindicação, disputa e autoridade não estão definidos.
- **A Praça** como iniciativa/organização/coletivo e **DigItap** como produto: relação institucional e propriedade não podem ser inferidas da narrativa.
- **Atividades históricas**: criar retroativamente uma atividade não é o mesmo que lançar um relato de realização passado; o domínio atual não comprova fluxo de importação histórica.
- Distinção entre **propostas**, **projetos**, **atividades** e **capacidades** interpretados por Kimi: exigir contrato próprio antes de materializar registros.

## 4. Decisões explícitas do proponente recuperáveis das mensagens visíveis

| ID | Enunciado humano recuperável | Interpretação estrita |
| --- | --- | --- |
| HUM-01 | “Nao quero ficar testando navegador local, se for pra testar navegador, melhor testar logo o nosso site digitap.com.br nao?” | Preferência por dogfooding de navegação em produção, não abandono de testes automatizados. |
| HUM-02 | “Eu nao gosto de ter que preencher as coisas, seria mais facil se tivissemos uma IA que interpreta e ja traça identidade, projetos, organizaçao, capacidades...” | UX assistida por IA, com mínima digitação, é objetivo de produto. |
| HUM-03 | “e se eu estiver dormindo e outras pessoas usando?” | A solução deve ser operacional sem o proponente online. |
| HUM-04 | “Prefito usar Kimi dentro da Vercel, é mais barato” | Modelo da família Kimi via Gateway Vercel, sujeito à validação de custo e qualidade. |
| HUM-05 | “depois no final de tudo testar o site comigo em dogfooding , mas quero ter muitas coisas pra testar” | Preparar experiências integradas antes do teste humano final. |
| HUM-06 | “nesta conversa aqui tem novas decisões , novos planos , que não levamos a repositório . Precisamos levar” | Consolidar decisões e pendências em documento navegável no repositório. |
| HUM-07 | “Tem mais decisões, decisões de on Boardiang, decisões de cadastro ... fora do contexto” | Revisão anterior insuficiente; ampliar recuperação sem declarar completude. |

Não inventar enunciados humanos antigos nem elevar sugestões anteriores do assistente a decisões.

## 5. Implementações reportadas, lacunas de validação

- Primeiro GREEN (autenticação): 693 testes PASS relatados. Login retorna à home; OAuth alinhado; testes E2E tiveram expectativas alteradas.
- Segundo GREEN (`Meu espaço`, conclusão PF): 708 testes PASS, typecheck/lint/diff PASS relatados. E2E não executado por ausência do servidor Next na porta local prevista.
- Terceiro GREEN (interpretação Kimi): 38 testes específicos PASS e 746 totais PASS relatados; servidor sem rota pública, sem persistência e sem chamada paga.
- Essas marcas são **relatos de Codex apresentados na conversa**, não provas de estado de branch remoto nem de deploy.

## 6. O que não consigo garantir recuperar desta sessão

- A sequência **completa** de todas as mensagens anteriores à janela de contexto disponível, com autoria, data e redação literal.
- Quais decisões anteriores de cadastro/onboarding foram expressamente aprovadas pelo proponente versus apenas implementadas em resposta a um prompt gerado pelo assistente.
- Eventuais decisões de UX/design, fluxos específicos de cadastro, convite ou papel que não apareçam nos materiais preservados.

Para preencher essa lacuna fielmente, usar uma exportação ou transcrição da parte antiga da conversa como **fonte documental primária**. Não reconstruir o texto original por dedução de código. O documento atual serve como mapa de lacunas e evidências, não como declaração de que toda a conversa foi recuperada.

## 7. Como incorporar ao repositório sem perder autoridade

1. Guardar a reconciliação anterior como **registro parcial**, e este suplemento como evidência complementar.
2. Enlacar ambos por índice de decisões/contexto; não sobrescrever arquivos canônicos 00–08 por reflexo.
3. Marcar `ONB-*` como *contrato técnico observado / origem humana a confirmar* até confrontar mensagens originais.
4. Validar as decisões humanas `HUM-*` com os enunciados disponíveis.
5. Verificar no branch local (não apenas em `main`) quais arquivos refletem os comportamentos relatados.
6. Somente depois consolidar num documento canônico de onboarding; o contexto deve distinguir `DECIDIDO / IMPLEMENTADO LOCAL / TESTADO MOCK / VALIDADO EM PRODUÇÃO / PENDENTE`.

**Critério de conclusão:** onboarding, cadastro, identidade, IA e automação ficam rastreáveis a fontes, com lacunas transparentes. A tarefa é de preservação do contexto; não acrescenta autorização implícita para migração, publicação, gasto, vinculação de sujeitos reais ou abertura de cadastros públicos.
