# Reconciliação do estado local — 13/11/2026

[CÓDIGO] Base inventariada: `fda9da280d8c2902cd172f7490b752ba3e485d66`; HEAD técnico antes desta nota: `b57d600`. Esta nota atualiza a leitura corrente; o conteúdo anterior abaixo é preservado como snapshot histórico e não comprova o estado de produção. Referências de produto: [Norte aprovado](digitap/00-norte-do-produto.md) e [modelo de domínio](digitap/01-modelo-de-dominio.md).

- [CÓDIGO] I4 possui migrations `20261106003448_i4_expand.sql`, `20261106014443_i4_compat.sql` e `20261106030921_i4_cutover.sql` em `supabase/migrations/`; serviços Auth/atividades e regras de sujeitos, PF, coletivos e representação existem. As afirmações anteriores de “I4 apenas especificado” são históricas. Isso não demonstra implantação, aplicação atual dessas migrations ou funcionamento integral de todos os percursos.
- [CÓDIGO] Projetos, colaboração e portfólio existem no schema e nos serviços `src/lib/queries/`; `/perfil/[id]` reúne conteúdo público e o PDF usa impressão do navegador. Implementação não comprova I5 cumprido nem certificação dos fatos.
- [CÓDIGO] P0 local foi registrado no commit `b57d600`: PostgreSQL mantém `SUPABASE_DB_URL`, exige endpoint independente autorizado em produção e TLS com certificado verificado; cookies usam Secure em produção. A descrição anterior de conexão exclusivamente local foi superada no código. [Revalidação](../operations/evidence/saneamento-git/validation.json): 81 PASS, 0 FAIL, 0 SKIP; testes específicos, TypeScript e build com exit 0. [Histórico RED/GREEN](../operations/evidence/af-p0-parte-1/REPORT.md) preservado; não se declara P0 implantado ou liberado para deploy.
- [CONTRATO] [REL-01](../specs/REL-01-registro-relacoes.md) define o contrato futuro; o motor não existe. Seus testes intencionalmente RED, por ausência de implementação, serão preservados no ramo local `wip/rel-01-contract-red`, fora de `main`, sem merge. O estado de apuração factual de realização existente não é a comprovação relacional futura.
- [PENDENTE] A direção aprovada é reutilizar Supabase Storage; upload privado não foi comprovado no núcleo atual, que registra referências por URL. A referência privada não protege o arquivo externo.
- [INFORMADO] Implantação pública, hospedagem Cloud e funcionamento de e-mail foram relatados pelo proponente; não foram verificados remotamente neste saneamento.
- [PENDENTE] Cloud, DNS, cadeia/certificado e handshake TLS, RLS/grants efetivos, configuração Auth, entrega de e-mail, backups e release exigem validação autorizada própria. Mocks/build não comprovam essas condições. VH-01/VH-02/VH-03, governança operacional e obrigações de privacidade não são considerados concluídos por existência de código.

[CÓDIGO] [Manifesto inicial e hashes](../operations/evidence/saneamento-git/initial-state.json) e [relatório de revalidação](../operations/evidence/saneamento-git/REPORT.md) registram a proveniência local. Os originais brutos RED/GREEN ficam preservados localmente e ignorados; somente resumos sanitizados são versionados. A regressão geral posterior ao isolamento será informada na entrega, sem antecipar resultado nesta nota.

---

# Nota de revisão vigente — 04/11/2026

**Fonte preservada:** `📘-07-—-CRITÉRIOS-DE-PROGRESSO-E-ROTEIRO-Projeto-A-Praça.txt` (Project Files). **Natureza:** atualização de escopo e leitura, com seções exploratórias antigas preservadas para rastreabilidade. **Não é** autorização de publicação, DDL, migração, alteração de RLS/código, consulta ao Git local ou constituição institucional. I3 concluído em 05/11/2026 (commit 623ee50, 20/20 cenários B+C PASS); I4 especificado, não implementado; I5 não iniciado.

## Revisão vigente: progresso e roteiro I3 → I4 → I5

**Progresso não é volume de código ou testes.** Conclusões técnicas (PASS local reportado) são diferentes de uso humano, utilidade demonstrada, repetição e adoção comunitária. Não converter suíte de testes em taxa de cenário aceito sem rastreabilidade ID→teste→evidência.

| Etapa | Trabalho | Estado/porta |
|---|---|---|
| I3, implementação | B01–B12 + C01–C08, modelo org-only preservado | CONCLUÍDO em 05/11/2026, 20/20 PASS |
| I3, fechamento | B01–B12 + C01–C08; 74 contratos históricos preservados | CONCLUÍDO em 05/11/2026, 20/20 PASS |
| I4, fundação | Pessoa física, coletivo, titularidade, atestações, curadoria por risco | Especificação de D1–D4 fechada; sem DDL/implementação autorizada |
| I5, passo obrigatório VH-01 | Pessoa real compreende objetivo e limites de Praça com dados fictícios | Registrar entendimento e dificuldades; requer autorização e participação |
| I5, passo obrigatório VH-02 | Pessoa real usa fluxo acompanhado de conta, representação, atividade e retorno editorial | Evidência de ação, bloqueios e expectativa; sem contato/convite pré-autorizado |
| I5, passo obrigatório VH-03 | Deliberação humana com base nas observações e riscos | Continuar, corrigir, pivotar ou parar; só então decidir I6+ e D5–D8 |
| I6+ | Portfólio, prestação de contas de usuários, IA, rede etc. | Condicional; nenhum escopo de construção autorizado |

**Governança institucional paralela:** preparar papéis e políticas; assembleia, estatuto, CNPJ, representação institucional e publicação de política só contam como concluídos mediante seus respectivos atos e provas, nunca por documentação proposta.

**Seções históricas abaixo:** “Água & Cheias”, seis semanas, metas numéricas e cronograma de protótipo Forms/Maps descrevem um roteiro exploratório anterior. Estão preservados para proveniência e não são compromisso vigente. O critério de progresso centrado nas pessoas permanece válido; a iniciativa ainda não demonstrou VH-01–VH-03.

---

📘 07 — CRITÉRIOS DE PROGRESSO E ROTEIRO: Projeto A Praça
Documento de métricas, roteiro operacional e critérios de decisão
Versão 1.1 · 04/11/2026 · Status: princípio humano preservado; roteiro exploratório substituído

1. Instruções para o agente (leia primeiro)
Este documento fecha o pacote. Ele responde a duas perguntas que os documentos anteriores deixaram em aberto: como saber se estamos avançando? e o que fazer nas próximas semanas?

Regras para você, agente:

Não trate o roteiro como cronograma aprovado. É proposta a ser ajustada pelo coletivo.

Não trate as métricas como metas de performance. São critérios de aprendizado.

Não confunda "atividade" com "progresso". Fazer reunião, criar formulário, publicar post não é progresso por si só. Progresso é uma pessoa real conseguindo fazer algo que antes não conseguia.

Não presuma que o MVP vai funcionar. O roteiro inclui critérios de parada — se não funcionar, o projeto para ou pivota.

Não use a cifra de R$ 340–500 milhões como métrica de impacto. Ela é INCONCLUSIVE.

Não promova o roteiro a decisão sem assembleia.

2. O problema que este documento resolve
O projeto tem visão (doc 01), MVP (doc 02), governança (doc 04), arquitetura mínima (doc 05) e política de dados (doc 06). Mas falta o roteiro operacional e os critérios de progresso. Sem eles, o projeto corre três riscos:

Risco de deriva: o coletivo se perde em atividades que não geram aprendizado.

Risco de falsa vitória: o projeto celebra atividades (reuniões, posts, formulários) sem que ninguém tenha usado de verdade.

Risco de falsa derrota: o projeto desiste porque não atingiu uma meta arbitrária, sem avaliar se aprendeu algo.

Originalmente, este documento propunha um ciclo exploratório de seis semanas. **Roteiro vigente:** I3→I4→I5 com três gates humanos obrigatórios; o prazo de seis semanas não é compromisso atual.

3. O critério de progresso (o humano, não o técnico)
O critério central de A Praça é:

"Uma pessoa real da região consegue compreender uma questão que afeta sua vida, confrontar os dados oficiais com sua experiência, encontrar outras pessoas ou capacidades relevantes e participar de alguma consequência concreta?"

Tudo o que o projeto faz deve ser avaliado por esse critério. Se uma atividade não aproxima o projeto de responder "sim" a essa pergunta, ela não é prioritária.

3.1. O que é progresso
Sinal de progresso	Exemplo
Uma pessoa usou	Um morador registrou um problema real e recebeu retorno
Uma pessoa confrontou	Um morador comparou o relato com o dado do SINISA e contestou
Uma pessoa encontrou	Um morador encontrou outra pessoa ou organização que podia ajudar
Uma pessoa participou de consequência	Um morador viu o problema ser encaminhado e acompanhou a resposta
Uma pessoa aprendeu	Um morador entendeu o que é o SINISA e por que o dado importa
3.2. O que NÃO é progresso
Sinal de falsa vitória	Por que não é progresso
Formulário criado	Não significa que alguém usou
Post publicado	Não significa que alguém leu ou agiu
Reunião realizada	Não significa que algo mudou
Parceria anunciada	Não significa que há compromisso formal
Estatuto aprovado	Não significa que a associação funciona
MVP tecnicamente sofisticado	Não significa que resolve problema de alguém
Número de cadastros	Não significa que as pessoas voltaram
Número de visualizações	Não significa que houve consequência
Regra: atividade é meio; progresso é mudança observável na capacidade de uma pessoa real.

4. Métricas do candidato histórico Água & Cheias — NÃO VIGENTES
O MVP tem métricas de aprendizado, não de performance. Elas respondem: "o ciclo funcionou?".

4.1. Métricas por etapa do ciclo
Etapa	Métrica	Meta mínima (4–6 semanas)	O que indica
Registro	Relatos válidos (com informação utilizável)	20	Pessoas usaram o formulário
Verificação	Relatos verificados (confrontados com fonte oficial ou observação)	10	A equipe conseguiu verificar
Encaminhamento	Relatos encaminhados ao órgão competente	5	O ciclo chegou ao órgão
Resposta	Respostas recebidas do órgão (mesmo negativas)	2	O órgão respondeu
Contestação	Contestações registradas pela comunidade	3	A comunidade exerceu auditoria
Transparência	Relatórios semanais publicados	4	A transparência foi mantida
4.2. Métricas de qualidade (não apenas quantidade)
Métrica	Como medir	O que indica
Taxa de relatos válidos	Relatos válidos / relatos totais	Se o formulário é claro
Taxa de verificação	Verificados / válidos	Se a equipe consegue verificar
Taxa de resposta	Respostas / encaminhamentos	Se o órgão é responsivo
Taxa de contestação	Contestações / publicados	Se a comunidade acompanha
Tempo médio de resposta	Dias entre encaminhamento e resposta	Se o ciclo é ágil
Retorno de usuários	Pessoas que registraram mais de uma vez	Se há engajamento real
4.3. O que NÃO medir no MVP
Número de visualizações (não indica uso)

Número de seguidores (não indica consequência)

Número de cadastros (não indica retorno)

Alcance de posts (não indica ação)

Cifra de impacto econômico (INCONCLUSIVE)

5. Critérios de parada e pivô — PRINCÍPIO VÁLIDO; métricas abaixo são históricas
O MVP não é um teste de "vamos ver no que dá". Ele tem critérios explícitos de parada e pivô.

5.1. Critérios de parada (o MVP não funcionou)
Sinal	Prazo	O que significa	O que fazer
Nenhum relato válido	2 semanas	Ninguém usou	Parar; investigar por quê (formulário? divulgação? problema?)
Nenhum encaminhamento	4 semanas	O ciclo não avançou	Parar; investigar (verificação? órgão? processo?)
Nenhuma resposta	6 semanas	O órgão não respondeu	Reavaliar; talvez o problema não seja prioritário ou o canal errado
Nenhuma contestação	6 semanas	Ninguém acompanha	Reavaliar; talvez a comunidade não veja valor
Equipe desmobilizada	3 semanas	Voluntários desistiram	Parar; reavaliar formato e carga
5.2. Critérios de pivô (o MVP funcionou em parte)
Sinal	O que significa	O que fazer
Relatos válidos, mas sem verificação	Pessoas usam, mas a equipe não consegue verificar	Simplificar verificação ou aumentar equipe
Verificação, mas sem encaminhamento	A equipe verifica, mas não encaminha	Definir responsável pelo encaminhamento
Encaminhamento, mas sem resposta	O órgão não responde	Buscar outro canal (Câmara, imprensa, Ministério Público)
Resposta, mas sem contestação	O ciclo funciona, mas a comunidade não audita	Mobilizar contestação; tornar o mapa mais visível
Tudo funciona, mas em escala pequena	O ciclo funciona, mas com poucas pessoas	Decidir se escala ou se mantém piloto
5.3. Critérios de sucesso (o MVP funcionou)
Sinal	O que significa	O que fazer
Ciclo completo em pelo menos 1 caso	Registro → verificação → encaminhamento → resposta → contestação	Documentar; decidir próximo passo
Retorno de usuários	Pessoas voltaram a registrar	Sinal de engajamento real
Contestação registrada e respondida	A comunidade exerceu auditoria	Sinal de confiança
Órgão respondeu	O ciclo gerou consequência	Sinal de utilidade
Regra: o MVP é bem-sucedido se pelo menos um caso percorreu o ciclo completo. Não é preciso que todos os casos funcionem; é preciso que o ciclo funcione pelo menos uma vez com uma pessoa real.

6. Roteiro histórico de seis semanas — SUBSTITUÍDO POR I3→I5
Este é o roteiro proposto. O coletivo pode ajustar prazos e atividades.

Semana 1 — Fundação
Atividade	Responsável	Entregável
Definir bairro/área foco	Coletivo	Decisão registrada
Criar formulário (Google Forms)	GT de Tecnologia	Link do formulário
Criar mapa (Google My Maps)	GT de Tecnologia	Link do mapa
Criar grupo de WhatsApp	GT de Mobilização	Link do grupo
Criar planilha de acompanhamento	GT de Tecnologia	Link da planilha
Definir equipe de verificação (3–5 pessoas)	Coletivo	Lista de nomes
Definir encarregado de dados	Coletivo	Nome + contato
Publicar política de dados (versão simples)	Coletivo	Página/post
Definir ponto de contato com órgão competente	GT de Articulação	Nome + canal
Semana 2 — Primeiros registros
Atividade	Responsável	Entregável
Mobilização porta a porta no bairro foco	GT de Mobilização	Visitas realizadas
Divulgação no WhatsApp e redes	GT de Mobilização	Posts publicados
Primeiros registros	Comunidade	Relatos no formulário
Primeira verificação	Equipe de verificação	Relatos verificados
Primeiro relatório semanal	Coletivo	PDF/post
Semana 3 — Primeiros encaminhamentos
Atividade	Responsável	Entregável
Encaminhar relatos verificados ao órgão	GT de Articulação	Protocolos/e-mails
Registrar encaminhamentos na planilha	GT de Tecnologia	Status atualizado
Continuar registros	Comunidade	Novos relatos
Continuar verificação	Equipe de verificação	Novos verificados
Relatório semanal	Coletivo	PDF/post
Semana 4 — Primeiras respostas
Atividade	Responsável	Entregável
Acompanhar respostas do órgão	GT de Articulação	Registro de respostas
Registrar respostas na planilha	GT de Tecnologia	Status atualizado
Mobilizar contestação	GT de Mobilização	Posts pedindo contestação
Primeiras contestações	Comunidade	Registros de contestação
Relatório semanal	Coletivo	PDF/post
Semana 5 — Avaliação intermediária
Atividade	Responsável	Entregável
Avaliar métricas (seção 4)	Coletivo	Planilha de avaliação
Identificar o que funcionou e o que não funcionou	Coletivo	Ata de avaliação
Ajustar processo	Coletivo	Decisões registradas
Continuar registros, verificação, encaminhamento	Todos	Status atualizado
Relatório semanal	Coletivo	PDF/post
Semana 6 — Avaliação final
Atividade	Responsável	Entregável
Avaliar critérios de sucesso (seção 5.3)	Coletivo	Decisão: continuar, pivotar ou parar
Documentar aprendizado	Coletivo	Relatório final do MVP
Decidir próximo passo	Coletivo	Ata de decisão
Publicar resultado	Coletivo	Post/relatório público
7. Decisão após MVP histórico — orientação conceitual, substituída por VH-03 para roadmap atual
7.1. Se o MVP funcionou
Documentar o processo (o que funcionou, o que não funcionou, o que aprendeu).

Decidir se escala para mais bairros, mais temas ou mais funcionalidades.

Só então considerar código próprio, gov.br, PostgreSQL com RLS, multisig.

Só então considerar Moto-Praça/Food como vertical comercial.

Só então buscar financiamento para infraestrutura.

7.2. Se o MVP falhou
Documentar a falha (o que não funcionou e por quê).

Decidir se pivota (outro problema, outro formato, outro público) ou se para.

Não gastar recursos em produto técnico antes de entender por que a experiência humana não funcionou.

Não culpar a comunidade (se ninguém usou, o problema é do processo, não das pessoas).

7.3. Se o MVP funcionou em parte
Identificar o gargalo (registro? verificação? encaminhamento? resposta? contestação?).

Ajustar o processo no ponto específico.

Rodar mais 2–4 semanas com o ajuste.

Reavaliar com os mesmos critérios.

8. As métricas de governança (paralelas ao MVP)
O MVP testa a experiência humana, mas a governança também precisa avançar em paralelo. Métricas de governança:

Métrica	Meta	Prazo
Assembleia de fundação realizada	1	Até semana 6
Estatuto aprovado	1	Até semana 6
CNPJ obtido	1	Até 60 dias após fundação
Encarregado de dados nomeado	1	Semana 1
Política de dados publicada	1	Semana 1
Comitê de verificação formado	1	Semana 2
Ata de todas as reuniões	100%	Contínuo
Prestação de contas publicada	1	Até semana 6
Regra: o MVP pode rodar antes do CNPJ, mas a associação precisa ser formalizada em paralelo para que o projeto tenha continuidade.

9. Os recursos necessários (realista)
Recurso	Quantidade	Custo
Pessoas	3 a 5 voluntários (coordenação, tecnologia, mobilização, articulação, verificação)	R$ 0
Celular com internet	1 por voluntário	Já existe
Google Forms/Sheets/My Maps	Conta Google	R$ 0
WhatsApp	1 número	R$ 0
Impressão de cartazes	50 a 100	R$ 50–100
Transporte	Deslocamento no bairro	R$ 50–100
Total	—	R$ 100–200
Regra: o MVP não precisa de financiamento. Se precisar de mais de R$ 200, algo está errado no escopo.

10. Os riscos do roteiro (e mitigação)
Risco	Probabilidade	Impacto	Mitigação
Equipe desmobiliza	Alta	Alto	Metas pequenas; celebração de cada conquista; turnos
Órgão não responde	Alta	Médio	Escalonar (Câmara, imprensa, MP); registrar a não-resposta
Comunidade não usa	Média	Alto	Mobilização porta a porta; linguagem simples; WhatsApp
Relatos falsos ou spam	Média	Médio	Verificação manual; contestação; registro de padrões
Dados sensíveis expostos	Baixa	Alto	Política de dados (doc 06); triagem antes de publicar
Captura partidária	Média	Alto	Governança (doc 04); regra antipalanque
Expectativa de resultado imediato	Alta	Médio	Comunicar que MVP é aprendizado, não solução
11. O que o agente NÃO deve fazer — princípios preservados, restrições de software reinterpretadas pelo estado atual
Não tratar o roteiro como cronograma aprovado.

Não tratar as métricas como metas de performance.

Não confundir atividade com progresso.

Não prometer que o MVP vai resolver o problema.

Não usar a cifra de R$ 340–500 milhões como métrica.

Não ignorar os critérios de parada.

Não culpar a comunidade se o MVP falhar.

Não escalar antes de o MVP funcionar.

Não construir produto técnico antes do MVP de experiência humana.

Não promover o roteiro a decisão sem assembleia.

12. Perguntas abertas para decisão humana
Qual bairro/área será o foco do MVP?

Quem forma a equipe de 3 a 5 voluntários?

Qual o ponto de contato com o órgão competente?

Qual a data de início e a data de avaliação final?

Qual o critério de sucesso acordado pelo coletivo? (A seção 5.3 é sugestão.)

O que o coletivo fará se o MVP falhar? (Documentar, pivotar ou parar?)

Quem será o encarregado de dados?

A associação será formalizada em paralelo ao MVP? (Recomendado: sim.)

Quem redige o estatuto?

Qual a data da Assembleia de Fundação?

13. A frase que resume este documento — HISTÓRICO DE MÉTODO
"O progresso de A Praça não é medido por formulários criados, posts publicados ou reuniões realizadas. É medido por uma pessoa real que consegue fazer algo que antes não conseguia: registrar um problema, confrontar com dado oficial, encontrar quem pode ajudar e acompanhar a consequência. Se isso acontecer pelo menos uma vez em 6 semanas, o projeto existe. Se não acontecer, nenhum código, nenhuma parceria e nenhuma cifra vão salvar. O roteiro é curto, barato e tem critérios de parada. O resto é hipótese até que alguém, em Itaperuna, use."

Fim do documento 07. Status: proposta a ser decidida pelo coletivo.
