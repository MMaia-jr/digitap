# Nota de revisão vigente — 04/11/2026

**Fonte preservada:** `02-—-ESCOPO-E-MVP-Projeto-A-Praça.txt` (Project Files). **Natureza:** atualização de escopo e leitura, com seções exploratórias antigas preservadas para rastreabilidade. **Não é** autorização de publicação, DDL, migração, alteração de RLS/código, consulta ao Git local ou constituição institucional. I3 concluído em 05/11/2026 (commit 623ee50, 20/20 cenários B+C PASS); I4 especificado, não implementado; I5 não iniciado.

## Revisão vigente de escopo e distinção de estágios

**Direção de produto decidida:** A Praça não é “agenda de Itaperuna”; atividades e publicações são alicerce para infraestrutura organizacional e comunitária. **Estado de execução:** I3 concluído (B01-B12 + C01-C08 PASS). I4 especificado. Modelo org-only (`organizacao_id`) preservado. **Escopo mínimo seguinte:** I4 titularidade de PF/coletivos e curadoria por risco (D1–D4). **Validação obrigatória:** I5 com VH-01, VH-02 e VH-03. **Não aprovado para construção:** portfólio, prestação de contas, IA para escrita de projetos, rede, e demais produtos I6+.

**MVP de software vs. validação humana:** o software local v1.5 existe e seus checkpoints são verificáveis por Git; isso não prova adequação territorial, governança formal, autorização para publicação real nem adoção. A definição de valor continua humana e observável; I5 não pode ser substituído por testes automatizados.

**Titularidade inclusiva (D1–D4):** pessoa física não exige CNPJ nem é “organização de uma pessoa”; coletivo informal tem duas atestações de membros distintos e curadoria de nome/primeira atividade; organização formal se distingue na interface; curadoria posterior varia pelo risco, e denúncia reabre revisão. Camadas de confiança não são prova de realização de atividade. D5–D8 permanecem pendentes até depois do I5.

**Condição do texto de 2026 abaixo:** os candidatos Água & Cheias, Compras, Rotas etc., o protótipo Google Forms/Mapa/WhatsApp, as metas de 4–6 semanas e a recomendação de “não programar antes de teste humano” são **propostas históricas de pesquisa**, não a decisão operacional de MVP em 04/11. Mantê-los documentados é útil para rastrear como o projeto chegou ao estado atual, não para mandar o Codex abandonar I3.

---

Documento de definição de escopo e produto mínimo viável
Versão 1.1 · 04/11/2026 · Status: direção de produto decidida; propostas exploratórias preservadas como histórico

1. Instruções para o agente (leia primeiro)
Esta seção original documenta o bloqueador da fase exploratória: à época, o escopo do MVP estava indefinido. **Não descreve o estado técnico vigente em 04/11/2026.** Os documentos anteriores (Master Briefing, relatório territorial, auditoria) descrevem quatro produtos diferentes como se fossem o mesmo:

Plataforma cívica de coordenação (mural, evidências, auditoria cidadã)

Ecossistema de economia circular (moeda social, reputação)

Moto-Praça e Praça-Food (mobilidade e delivery)

Pilotos de inteligência territorial (Água & Cheias, Compras & Capacidades, Rotas de Cuidado)

No texto original, este documento comparava opções sem decidir MVP. **Desde então**, o proponente decidiu a direção de infraestrutura organizacional e comunitária e os recortes I3→I5; nenhuma adoção comunitária ou lançamento foi presumido.

Regras para você, agente:

Não trate a recomendação deste documento como decisão tomada.

Não presuma que o MVP é técnico. O MVP pode ser um teste de experiência humana com ferramentas simples (formulário + mapa + WhatsApp), sem código próprio.

Não presuma gov.br OAuth como disponível. O MVP deve funcionar sem ele.

Não use a cifra de R$ 340–500 milhões como justificativa de escopo.

Não confunda "o que é possível construir" com "o que deve ser construído primeiro".

2. O problema que este documento resolve
O projeto tem uma visão clara (espaço cívico, conhecimento público, ação coletiva) e um diagnóstico documental aproveitável (com verificações parciais). Mas não tem um produto definido. Isso gera três consequências:

Paralisia: sem MVP, não há cronograma, não há critério de sucesso, não há o que testar.

Dispersão: cada documento puxa para um produto diferente (app de mobilidade, plataforma cívica, moeda social, piloto territorial).

Risco de falsa precisão: sem escopo, qualquer proposta parece viável — e nenhuma é testada.

O objetivo deste documento é reduzir a dispersão a uma escolha clara, com critérios explícitos e uma recomendação fundamentada.

3. O que é um MVP para A Praça (definição)
MVP, aqui, não é a versão mais simples de um produto técnico. É a menor experiência que testa a hipótese central do projeto.

A hipótese central de A Praça é:

"Uma pessoa de Itaperuna consegue compreender uma questão que afeta sua vida, confrontar os dados oficiais com sua experiência, encontrar outras pessoas ou capacidades relevantes e participar de alguma consequência concreta?"

O MVP é a menor experiência que permite responder "sim" ou "não" a essa pergunta com uma pessoa real, em um contexto real, com evidência observável.

Isso significa que o MVP pode ser:

Um formulário simples (Google Forms) + um mapa público (Google My Maps) + um grupo de WhatsApp.

Uma planilha compartilhada + uma reunião presencial + um relatório de uma página.

Um protótipo de tela (Figma) testado com 5 pessoas.

O MVP não precisa de código próprio. Ele precisa de uma experiência real que produza evidência de que a hipótese funciona ou não.

4. Critérios para escolher o MVP
Qualquer candidato a MVP deve ser avaliado por seis critérios. O coletivo pode adicionar ou remover critérios, mas precisa registrar a decisão.

Critério	Pergunta que responde	Peso sugerido
1. Relevância real	A questão afeta a vida de pessoas reais em Itaperuna?	Alto
2. Disponibilidade de dados	Existe pelo menos uma fonte pública que permita confrontar a experiência com dados oficiais?	Alto
3. Viabilidade sem dependências	O MVP pode ser executado sem gov.br, sem PostgreSQL com RLS, sem multisig, sem CNPJ?	Alto
4. Visibilidade pública	O resultado pode ser observado e contestado por outras pessoas?	Médio
5. Baixo risco	O MVP pode falhar sem gerar dano reputacional, jurídico ou político grave?	Alto
6. Aprendizado	O MVP produz aprendizado que informa o próximo passo (seja continuar, pivotar ou parar)?	Alto
Regra: se um candidato falha no critério 3 (viabilidade sem dependências), ele não é MVP — é produto futuro.

5. As experiências candidatas (análise comparativa)
Candidato A — Água & Cheias
O que testa: moradores confrontam dados oficiais (SINISA, INEA) com pontos críticos de vazamento, falta d'água ou risco de cheia, e encaminham evidência para alguém que possa agir.

Dados disponíveis: SINISA 2024 (água, perdas, esgoto), INEA (estações hidrometeorológicas, alertas), Defesa Civil (alertas oficiais), relatos de moradores.

Viabilidade sem dependências: alta. Pode ser feito com formulário + mapa + grupo de WhatsApp.

Risco: médio. Se a plataforma for percebida como "canal de denúncia" sem consequência, perde credibilidade. Se emitir alerta de cheia sem ser órgão competente, gera risco jurídico.

Aprendizado: testa se moradores conseguem confrontar dados oficiais com experiência e se o encaminhamento gera resposta.

Atenção: A Praça não pode emitir alerta de cheia. Pode registrar relatos e encaminhar para a Defesa Civil. Qualquer informação sobre risco de enchente precisa ser claramente diferenciada dos alertas oficiais.

Candidato B — Compras & Capacidades
O que testa: uma organização (associação, escola, comerciante) consegue verificar se existe oferta local/regional antes de contratar fora, e registrar a consequência.

Dados disponíveis: PNCP (contratações públicas), SICONFI (execução fiscal agregada), empresas locais, IFF (capacidade técnica).

Viabilidade sem dependências: média. Depende de acesso a dados de compras públicas (PNCP é aberto, mas a execução granular municipal exige LAI) e de um comprador disposto a testar.

Risco: baixo. Não há risco jurídico em analisar compras públicas.

Aprendizado: testa se a plataforma consegue tornar visível uma oportunidade de substituição local e se isso gera ação.

Atenção: a hipótese de "vazamento econômico" de R$ 340–500 milhões não pode ser usada como justificativa. O MVP testa a metodologia, não a cifra.

Candidato C — Rotas de Cuidado
O que testa: uma pessoa entende o percurso regional necessário para acessar um serviço de saúde (de onde sai, para onde vai, quanto tempo espera, qual custo de transporte).

Dados disponíveis: Plano Regional de Saúde, CNES/DATASUS, gestão local, relatos de usuários.

Viabilidade sem dependências: média. Depende de acesso a dados agregados de saúde (SIA/AIH) e de pessoas dispostas a relatar o percurso.

Risco: alto. Envolve dados sensíveis de saúde (LGPD), risco de exposição de pessoas vulneráveis.

Aprendizado: testa se a plataforma consegue tornar visível um gargalo de acesso que os dados agregados não mostram.

Atenção: qualquer dado de saúde precisa ser agregado, anonimizado e consentido. O MVP não pode expor pessoas.

Candidato D — Plataforma cívica de coordenação (mural + evidências)
O que testa: uma pessoa consegue registrar um problema ou oportunidade, outra consegue se comprometer, uma terceira consegue verificar a evidência, e a comunidade consegue ver o ciclo completo.

Dados disponíveis: nenhum dado oficial é necessário para o ciclo em si. A verificação cruzada com dados oficiais é uma camada posterior.

Viabilidade sem dependências: alta. Pode ser feito com formulário + planilha + grupo de WhatsApp.

Risco: médio. Se o ciclo não gerar consequência, vira "mural de promessas".

Aprendizado: testa a espinha dorsal do projeto (coordenação com proveniência).

Atenção: este é o candidato mais alinhado à alma de A Praça, mas é o mais abstrato. Precisa de um problema concreto para não virar exercício teórico.

Candidato E — Moto-Praça / Praça-Food
O que testa: motoristas e comerciantes locais conseguem operar com taxa justa e o dinheiro circula localmente.

Dados disponíveis: nenhum dado público é necessário para o teste; depende de operação real.

Viabilidade sem dependências: baixa. Envolve regulação de transporte, seguro, responsabilidade civil, pagamentos (arranjo de pagamento pelo BC), e não pode ser feito sem CNPJ, sem jurídico, sem operação.

Risco: alto. Risco jurídico, regulatório e operacional.

Aprendizado: testa o modelo comercial, mas não a hipótese central de A Praça (que é sobre conhecimento e ação coletiva, não sobre mobilidade).

Atenção: não é MVP. É produto futuro, dependente de estrutura jurídica e operacional que o projeto ainda não tem. Pode ser uma vertical posterior, mas não é o primeiro passo.

6. Matriz comparativa
Critério	A. Água & Cheias	B. Compras & Capacidades	C. Rotas de Cuidado	D. Plataforma cívica	E. Moto-Praça/Food
1. Relevância real	Alta	Alta	Alta	Média	Alta
2. Disponibilidade de dados	Alta	Média	Média	Baixa (não precisa)	Baixa
3. Viabilidade sem dependências	Alta	Média	Média	Alta	Baixa
4. Visibilidade pública	Alta	Média	Média	Média	Alta
5. Baixo risco	Médio	Alto	Baixo	Médio	Baixo
6. Aprendizado	Alto	Alto	Alto	Alto	Médio
Leitura: Água & Cheias e Plataforma cívica são os candidatos mais viáveis sem dependências. Moto-Praça/Food é o menos viável como MVP. Compras & Capacidades e Rotas de Cuidado têm risco ou dependência que os tornam candidatos de segunda onda.

7. Recomendação histórica — ÁGUA & CHEIAS NÃO É PILOTO APROVADO
Recomendação: começar pelo Candidato A (Água & Cheias), com a seguinte justificativa:

Relevância real: saneamento é uma das fragilidades mais documentadas de Itaperuna (perdas de 42,3%, tratamento de esgoto 0% no SINISA 2024 — status PARTIAL, a confirmar).

Disponibilidade de dados: SINISA e INEA já existem; não é preciso construir base de dados própria.

Viabilidade sem dependências: pode ser feito com formulário + mapa + WhatsApp, sem gov.br, sem CNPJ, sem código próprio.

Visibilidade pública: vazamento e falta d'água são visíveis e mobilizadores.

Baixo risco: não envolve dados sensíveis de saúde nem regulação de transporte.

Aprendizado: testa o ciclo completo (registro → evidência → verificação → encaminhamento → consequência) com um problema concreto.

Ressalvas:

A Praça não pode emitir alerta de cheia. Pode registrar relatos e encaminhar para a Defesa Civil. Qualquer informação sobre risco de enchente deve ser claramente diferenciada dos alertas oficiais.

Os dados do SINISA são PARTIAL até que a linha de Itaperuna seja extraída dos arquivos oficiais. O MVP pode começar antes disso, usando os dados como estão (com a marcação de "parcial"), mas a extração deve ser feita em paralelo.

A escolha final é humana (do coletivo), não do agente.

Alternativa: se o coletivo preferir começar pelo Candidato D (Plataforma cívica), ele precisa ser ancorado em um problema concreto (ex: um bairro específico, um tema específico) para não virar exercício abstrato. Nesse caso, a Água & Cheias pode ser o primeiro problema dentro da plataforma cívica — o que combina os dois candidatos.

8. O que o MVP NÃO é — CONCEITO EXPLORATÓRIO HISTÓRICO
Para evitar que o escopo se dilua novamente, o MVP não é:

Um aplicativo. Não precisa de app, nem de código próprio, nem de banco de dados sofisticado.

Uma plataforma completa. Não precisa de login, de perfil, de gamificação, de reputação.

Um sistema de identidade. Não presume gov.br; não cria identidade própria.

Um sistema de pagamento. Não envolve dinheiro, moeda social ou cashback.

Um sistema de alerta. Não substitui Defesa Civil, INEA ou órgãos competentes.

Um produto comercial. Não é Moto-Praça, não é Praça-Food, não é marketplace.

Um diagnóstico. Não é um relatório; é uma experiência com pessoas reais.

Uma prova de viabilidade econômica. Não usa a cifra de R$ 340–500 milhões.

9. O protótipo mínimo viável (sem dependências) — CANDIDATO HISTÓRICO
Para o Candidato A (Água & Cheias), o protótipo mínimo é:

Componentes:

Formulário simples (Google Forms ou similar): nome (opcional), bairro, tipo de problema (vazamento, falta d'água, esgoto, cheia), foto (opcional), localização (texto ou GPS), descrição.

Mapa público (Google My Maps ou similar): visualização dos pontos registrados, atualizado manualmente uma vez por semana.

Grupo de WhatsApp (por bairro ou geral): mobilização, discussão, encaminhamento.

Planilha de acompanhamento (Google Sheets): status de cada registro (registrado, verificado, encaminhado, resolvido, contestado).

Relatório semanal de uma página (PDF ou post): o que foi registrado, o que foi verificado, o que foi encaminhado, o que foi resolvido.

Fluxo:

Morador registra problema no formulário.

Equipe (voluntários) verifica se o relato é consistente com os dados oficiais (SINISA, INEA) e com outras fontes.

Equipe encaminha para o órgão competente (prefeitura, Cedae, Defesa Civil) e registra o encaminhamento.

Equipe acompanha a resposta e atualiza o status na planilha.

Relatório semanal é publicado no grupo e nas redes.

Qualquer pessoa pode contestar um registro; a contestação é registrada e respondida.

O que isso testa:

Moradores conseguem registrar problemas de forma utilizável?

A equipe consegue verificar e encaminhar?

O órgão competente responde?

A comunidade acompanha e contesta?

O ciclo gera consequência observável?

O que isso NÃO testa:

Escala (centenas ou milhares de usuários).

Automação.

Sustentabilidade financeira.

Integração com sistemas oficiais.

Isso é intencional. O MVP testa a hipótese central, não a operação em escala.

10. Como medir sucesso do MVP — MÉTRICAS DO CANDIDATO HISTÓRICO
O MVP é bem-sucedido se, em 4 a 6 semanas, produzir:

Indicador	Meta mínima	O que significa
Registros válidos	20	Pessoas reais usaram o formulário com informação utilizável
Registros verificados	10	A equipe conseguiu confrontar com dados oficiais ou outras fontes
Encaminhamentos feitos	5	O ciclo chegou ao órgão competente
Respostas recebidas	2	O órgão competente respondeu (mesmo que negativamente)
Contestações registradas	3	A comunidade exerceu auditoria
Relatórios semanais publicados	4	A transparência foi mantida
O MVP falha se:

Nenhum registro válido em 2 semanas.

Nenhum encaminhamento em 4 semanas.

Nenhuma resposta em 6 semanas.

Nenhuma contestação em 6 semanas (pode indicar que ninguém está acompanhando).

O MVP não falha se:

O órgão competente responder negativamente (isso ainda é uma consequência observável).

A maioria dos registros não for resolvida (o MVP testa o ciclo, não a resolução).

Houver menos de 20 registros, mas os que houverem gerarem aprendizado claro.

A pergunta final do MVP: "Uma pessoa de Itaperuna conseguiu usar esse processo para levar um problema real adiante e obter uma consequência observável?" Se sim, o MVP funcionou. Se não, o que faltou?

11. O que fazer depois do MVP — ROTEIRO HISTÓRICO
Se o MVP for bem-sucedido:

Documentar o processo (o que funcionou, o que não funcionou, o que aprendeu).

Decidir se escala para mais bairros, mais temas ou mais funcionalidades.

Só então considerar código próprio, gov.br, PostgreSQL com RLS, multisig.

Só então considerar Moto-Praça/Food como vertical comercial.

Se o MVP falhar:

Documentar a falha (o que não funcionou e por quê).

Decidir se pivota (outro problema, outro formato, outro público) ou se para.

Não gastar recursos em produto técnico antes de entender por que a experiência humana não funcionou.

Regra: nenhum produto técnico (app, plataforma, sistema) deve ser construído antes de um MVP de experiência humana bem-sucedido.

12. Cronograma histórico proposto (4 a 6 semanas) — NÃO VIGENTE
Semana	Atividade	Responsável
1	Definir o problema exato (qual bairro, qual tipo de problema), criar formulário, criar mapa, criar grupo de WhatsApp, definir equipe de verificação	Coletivo
2	Mobilização inicial (porta a porta, WhatsApp, redes), primeiros registros, primeira verificação	Coletivo + voluntários
3	Primeiros encaminhamentos, primeiro relatório semanal, ajustes no processo	Coletivo
4	Continuar registros, encaminhamentos, relatórios; primeira contestação	Coletivo
5	Avaliação intermediária: o que está funcionando, o que não está	Coletivo
6	Avaliação final: o MVP funcionou? O que aprendeu? Qual o próximo passo?	Coletivo
Recursos necessários: celular, internet, Google Forms/Sheets/My Maps, grupo de WhatsApp, boa vontade de 3 a 5 voluntários, tempo de 4 a 6 semanas.

Custo: R$ 0.

13. Perguntas da fase exploratória — HISTÓRICO; prevalecem D1–D4 e pendências D5–D8
Estas perguntas não podem ser respondidas pelo agente. Elas precisam ser decididas pelo coletivo:

Qual candidato a MVP o coletivo escolhe? (Recomendação: Água & Cheias. Alternativa: Plataforma cívica ancorada em problema concreto.)

Qual bairro ou área será o foco inicial? (Sugestão: um bairro com problema documentado, como Fiteiro, se houver.)

Quem forma a equipe de verificação? (3 a 5 pessoas, com disponibilidade semanal.)

Quem é o ponto de contato com o órgão competente? (Prefeitura, Cedae, Defesa Civil — depende do problema.)

Como a comunidade será informada e convidada a contestar? (WhatsApp, redes, porta a porta.)

Qual é o critério de sucesso acordado pelo coletivo? (A tabela da seção 10 é uma sugestão; o coletivo pode ajustar.)

Qual é a data de início e a data de avaliação final?

O que o coletivo fará se o MVP falhar? (Documentar, pivotar ou parar.)

14. A frase que resume este documento — FORMULAÇÃO HISTÓRICA
"O MVP de A Praça não é um aplicativo. É a menor experiência que testa se uma pessoa real de Itaperuna consegue usar conhecimento público para levar um problema adiante e obter uma consequência observável. Se isso funcionar com um formulário, um mapa e um grupo de WhatsApp, então o projeto existe. Se não funcionar, nenhum código vai salvar."

Fim do documento 02. Status: proposta a ser decidida pelo coletivo.
