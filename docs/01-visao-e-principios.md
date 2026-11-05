# Nota de revisão vigente — 04/11/2026

**Fonte preservada:** `📘-01-—-VISÃO-E-PRINCÍPIOS-Projeto-A-Praça.txt` (Project Files). **Natureza:** atualização de escopo e leitura, com seções exploratórias antigas preservadas para rastreabilidade. **Não é** autorização de publicação, DDL, migração, alteração de RLS/código, consulta ao Git local ou constituição institucional. I3 concluído em 05/11/2026 (commit 623ee50, 20/20 cenários B+C PASS); I4 especificado, não implementado; I5 não iniciado.

## Revisão vigente de escopo e inclusão

A visão de praça como espaço social, político e comunitário permanece. Na direção de produto atual, o software atua como **infraestrutura de memória, autorização, organização e ação local**, não como agenda isolada. A inclusão de PF e coletivos sem CNPJ é decisão humana (D1–D3), condicionada aos controles editoriais por risco (D4); essa inclusão **não** é filiação automática à futura associação. Os princípios de pluralismo, correção, privacidade e acesso sem barreiras não são relaxados.

A associação e sua propriedade institucional são **governança proposta**: não existe constituição ou titularidade jurídica confirmada neste checkpoint. Afirmações na redação histórica sobre marca, código e dados “pertencerem à associação” descrevem uma **intenção futura**, nunca um fato jurídico consumado. Dados pessoais não são propriedade irrestrita de instituição; os direitos de titulares são preservados e tratados no documento 06.

**Estado de execução:** I3 concluído; modelo org-only preservado; I4 especificado. I4 titularidade inclusiva está especificado e aguarda execução autorizada; I5 exige VH-01, VH-02 e VH-03 antes de decidir I6+. D5–D8 seguem em aberto. A antiga preferência por “MVP sem código próprio” descreve a fase exploratória, não invalida o software local já existente.

---

📘 01 — VISÃO E PRINCÍPIOS: Projeto A Praça
Documento fundacional de visão, missão e princípios
Versão 1.1 · 04/11/2026 · Status: princípios preservados; revisão de escopo e governança proposta

1. Instruções para o agente (leia primeiro)
Este documento define o porquê de A Praça. Ele responde a três perguntas: o que queremos, por que queremos e em que princípios não abrimos mão. Ele não define produto, arquitetura ou governança — isso está nos documentos 02 (Escopo e MVP), 04 (Governança) e 05 (Arquitetura e Dependências).

Regras para você, agente:

Não trate este documento como manifesto fechado. É proposta.

Não transforme princípios em regras operacionais; eles são bússola, não manual.

Não use este documento para justificar decisões técnicas específicas. Visão não decide tecnologia.

Não confunda "o que queremos" com "o que já alcançamos". A visão é horizonte, não estado atual.

Não trate a visão como consenso da cidade. Ela é a visão dos fundadores; precisa ser validada com pessoas reais.

2. O problema que este documento resolve
O projeto tem um diagnóstico territorial, uma proposta de governança e uma definição de MVP em andamento. Mas falta responder a uma pergunta que vem antes de todas: por que A Praça existe? Sem essa resposta clara, o projeto corre três riscos:

Risco de deriva: o projeto se perde em funcionalidades, parcerias e produtos que não têm relação com a razão de existir.

Risco de captura ideológica: qualquer grupo pode preencher o vazio de sentido com a sua própria agenda.

Risco de esvaziamento: o projeto vira "mais um app" ou "mais um coletivo", sem diferença real para a cidade.

A visão e os princípios existem para ancorar o projeto e permitir que qualquer pessoa — fundador, parceiro, cidadão — saiba o que A Praça é e o que ela não é.

3. A visão (o horizonte)
Itaperuna e o Noroeste Fluminense como território onde o conhecimento é público, a participação é real e a ação coletiva é capaz de transformar problemas concretos em consequências observáveis — sem depender de plataformas estrangeiras, de partidos ou de tecnocratas.

A visão tem três dimensões:

Conhecimento público: dados, evidências e interpretações acessíveis a qualquer cidadão, com proveniência e contestação.

Participação real: pessoas conseguem não apenas opinar, mas agir, verificar e cobrar consequência.

Ação coletiva com consequência: o ciclo não termina no registro ou na reclamação; termina em algo que muda a vida de alguém, mesmo que pequeno.

4. A missão (o que fazemos hoje)
Criar e manter uma infraestrutura cívica de confiança, coordenação e ação coletiva para Itaperuna e região, começando por uma experiência real com pessoas reais, e crescendo a partir do que funcionar.

A missão tem três compromissos:

Começar pelo concreto: não construímos plataforma para depois buscar problema; começamos por um problema real e construímos o que for necessário para resolvê-lo.

Crescer a partir da evidência: cada passo é informado pelo que a experiência anterior ensinou; não escalamos o que não funcionou.

Manter a infraestrutura aberta: código, dados e decisões são públicos e contestáveis.

5. Os princípios (o que não negociamos)
A Praça se organiza em sete princípios. Eles são a bússola do projeto. Se uma decisão futura contradiz um destes princípios, a decisão está errada — ou o princípio precisa ser revisto em assembleia.

Princípio 1 — A Praça é de todos, não de um grupo
A Praça não deve ser capturada por partido, fundador, empresa ou coalizão. A futura associação e as decisões de assembleia são instrumentos institucionais **propostos, não constituídos**; nenhuma titularidade jurídica atual foi comprovada. Nenhum grupo terá cadeira cativa permanente por essa proposta. O princípio não autoriza atribuir poder de decisão a pessoas ou instituições ainda não legitimadas.

O que isso significa na prática:

A governança é aberta e as regras valem para todos.

Direção de governança proposta: marca e código sob controle da associação quando legalmente constituída e quando os direitos tiverem sido regularmente transferidos; **não é fato jurídico atual**.

A lista de fundadores não é a lista de donos.

O que isso NÃO significa:

Que todos têm o mesmo peso em todas as decisões (a assembleia decide as regras).

Que ninguém pode liderar (liderança é legítima se for eleita e prestar contas).

Princípio 2 — Tecnologia não é neutra, e a nossa é aberta
Toda tecnologia carrega escolhas: quem controla os dados, quem define as regras, quem lucra. A Praça escolhe a soberania digital: código aberto (AGPLv3), dados abertos, infraestrutura sob controle da associação, e nenhuma dependência crítica de plataformas estrangeiras ou proprietárias.

O que isso significa na prática:

Código é público e auditável.

A associação futura deverá exercer governança responsável sobre dados conforme bases legais e contratos; dados pessoais preservam direitos de seus titulares e **não** são propriedade irrestrita da associação.

Nenhuma funcionalidade crítica depende de API privada que possa ser revogada.

Se usarmos infraestrutura estrangeira (ex: nuvem), é por escolha temporária, não por dependência estrutural.

O que isso NÃO significa:

Que não podemos usar ferramentas prontas (Google Forms, WhatsApp) na fase inicial.

Que precisamos construir tudo do zero.

Que somos contra toda tecnologia comercial.

Princípio 3 — Conhecimento é infraestrutura pública
A Praça trata o conhecimento territorial (dados, evidências, interpretações) como infraestrutura pública, não como propriedade de especialistas. Isso significa: proveniência visível, incerteza registrada, contestação possível, e nenhuma afirmação sem fonte.

O que isso significa na prática:

Toda afirmação tem fonte, ano e limitação.

Toda evidência tem status (registrada, verificada, contestada).

Toda interpretação é separada do dado bruto.

Qualquer cidadão pode contestar uma afirmação; a contestação é registrada e respondida.

O que isso NÃO significa:

Que toda opinião tem o mesmo peso que evidência.

Que dados oficiais são intocáveis.

Que a Praça emite laudos técnicos ou substitui órgãos oficiais.

Princípio 4 — Participação real, não simbólica
A Praça não se contenta com "consulta pública" que não vincula, com "participação" que não decide, com "engajamento" que não gera consequência. Participação real significa que a pessoa consegue agir, verificar e cobrar — e que a consequência é observável.

O que isso significa na prática:

O ciclo termina em consequência, não em registro.

Contestações são respondidas, não arquivadas.

Assembleias decidem de verdade, não apenas homologam.

A pessoa que participa vê o resultado da sua participação.

O que isso NÃO significa:

Que toda participação gera resultado imediato.

Que a Praça promete resolver todos os problemas.

Que a participação substitui a política institucional.

Princípio 5 — Começar pequeno, com pessoas reais, e crescer com evidência
A Praça não começa com uma plataforma completa nem com uma grande campanha. Começa com uma experiência real, com pessoas reais, em um contexto real. Só cresce se a experiência funcionar. Só escala se a evidência justificar.

O que isso significa na prática:

MVP é experiência humana, não produto técnico.

Cada passo é informado pelo que o anterior ensinou.

Não escalamos o que não funcionou.

Não construímos funcionalidade sem uso real.

O que isso NÃO significa:

Que a ambição é pequena.

Que não podemos ter visão de longo prazo.

Que a Praça nunca vai ter plataforma completa (vai, se a experiência justificar).

Princípio 6 — Ação coletiva com proveniência e contestação
Toda ação de A Praça tem proveniência (quem propôs, quem executou, quem verificou, com qual evidência) e é contestável (qualquer pessoa pode discordar, e a discordância é registrada e respondida). Sem proveniência, não há confiança; sem contestação, não há legitimidade.

O que isso significa na prática:

Registro ≠ evidência ≠ reputação (são camadas distintas).

Verificação é feita por comitê independente, com critérios publicados.

Contestação é registrada e respondida em prazo definido.

Nenhuma decisão é irrevogável sem possibilidade de revisão.

O que isso NÃO significa:

Que toda contestação é acatada.

Que a Praça é um tribunal.

Que a verdade é decidida por votação.

Princípio 7 — Antipalanque e apartidarismo institucional
A Praça não é palanque. Não serve para eleger ninguém, não serve para promover partido, não serve para campanha. Candidatos em ano eleitoral não ocupam cargos na gestão. Nenhum partido tem cadeira cativa. Nenhuma decisão é condicionada a apoio eleitoral.

O que isso significa na prática:

Regra antipalanque no estatuto.

Nenhum cargo reservado a filiado.

Sede e recursos não são usados para campanha.

A Praça não endossa candidatos.

O que isso NÃO significa:

Que a Praça é "neutra" no sentido de não ter valores (ela tem: os princípios acima).

Que filiados não podem participar (podem, como cidadãos).

Que a Praça não dialoga com partidos (dialoga, como dialoga com qualquer organização).

6. Os valores que sustentam os princípios
Os sete princípios não flutuam no ar. Eles se apoiam em quatro valores:

Valor	O que significa	Princípios que alimenta
Dignidade	Toda pessoa tem direito a serviços públicos de qualidade, informação clara e voz nas decisões que afetam sua vida.	1, 3, 4
Honestidade epistêmica	Não afirmamos o que não sabemos; registramos a incerteza; separamos fato de hipótese; contestamos com evidência.	3, 6
Solidariedade	O projeto existe para fortalecer a comunidade, não para lucro, carreira ou poder pessoal.	1, 2, 5
Coragem cívica	Não fugimos de problemas difíceis; não nos escondemos atrás de "neutralidade"; enfrentamos a captura, a desigualdade e a desinformação.	4, 6, 7
7. A identidade simbólica (o nome, a metáfora, o pertencimento)
A Praça não é apenas um nome. É uma metáfora de pertencimento: a praça é o espaço público onde todos se encontram, onde a cidade se reconhece, onde a diferença convive. A Praça digital é a extensão desse espaço para o mundo online — e o encontro entre os dois.

7.1. A origem do nome
Itaperuna (Tupi): "Ita" (pedra), "Per" (caminho), "Una" (preta) — "Caminho da Pedra Preta". É a base de confiança, a pedra que sustenta.

A Praça: o território digital onde todos se encontram. Não é um app; é um espaço.

Oçará (proposta): o conselho de governança e o selo de confiança.

Minha Oca (proposta): a área privada do cidadão.

Atenção: a etimologia de "Itaperuna" como "Caminho da Pedra Preta" é interpretação documentada, não consenso acadêmico. O documento deve tratar isso com honestidade e consultar linguistas ou associações indígenas antes de usar publicamente.

7.2. O que a metáfora da praça comunica
Espaço público: de todos, sem dono, aberto.

Encontro: a cidade se reconhece ali.

Diferença: na praça, convivem pessoas diferentes, com ideias diferentes.

Pertencimento: "eu sou daqui" é uma frase que a praça permite dizer.

Ação: a praça é onde se organiza, se protesta, se celebra, se decide.

7.3. O que a metáfora NÃO comunica
Não é um shopping: a praça não é lugar de consumo; é lugar de encontro.

Não é um tribunal: a praça não julga; ela permite o debate.

Não é um partido: a praça não tem ideologia única; ela abriga a pluralidade.

Não é um aplicativo: a praça não é um produto; é um espaço.

8. O que A Praça quer mudar (e o que não quer)
8.1. O que A Praça quer mudar
A relação da cidade com seus dados: de invisibilidade para conhecimento público contestável.

A relação da cidade com seus problemas: de reclamação isolada para ação coletiva com consequência.

A relação da cidade com suas capacidades: de desperdício para conexão e aproveitamento.

A relação da cidade com o poder: de clientelismo para controle social com evidência.

A relação da cidade com a tecnologia: de dependência de plataformas estrangeiras para soberania digital local.

8.2. O que A Praça NÃO quer mudar
Não quer substituir a política institucional: a Praça não é partido, não é governo, não é câmara.

Não quer substituir os órgãos oficiais: a Praça não é Defesa Civil, não é INEA, não é prefeitura.

Não quer ser "neutra" no sentido de não ter valores: a Praça tem princípios claros, e eles orientam a ação.

Não quer ser "de esquerda" ou "de direita": a Praça é de todos que aceitam os princípios.

Não quer ser mais um app: a Praça é infraestrutura cívica, não produto.

9. O que A Praça é (definição curta)
Para uso em comunicação e alinhamento:

A Praça é uma infraestrutura cívica de confiança, coordenação e ação coletiva para Itaperuna e região. Ela torna o conhecimento público contestável, a participação real e a ação coletiva capaz de gerar consequência observável — sem depender de plataformas estrangeiras, partidos ou tecnocratas. Começa pequena, com pessoas reais, e cresce com evidência.

10. O que A Praça não é (definição curta)
Para uso em comunicação e alinhamento:

A Praça não é um aplicativo de prefeitura, não é um partido, não é uma empresa, não é um observatório, não é um tribunal, não é um marketplace, não é um sistema de identidade próprio. É um espaço público digital e presencial, de todos, com regras claras e governança aberta.

11. As tensões internas que a visão reconhece
Nenhuma visão é isenta de tensão. A Praça reconhece quatro tensões que precisam ser gerenciadas continuamente:

Tensão	De um lado	Do outro	Como a Praça lida
Abertura vs. Captura	Participação ampla e plural	Risco de grupo dominar	Governança com cláusulas pétreas e antipalanque
Ambição vs. Realismo	Visão de transformação territorial	Começar pequeno e com evidência	MVP como experiência humana; crescer com evidência
Tecnologia vs. Simplicidade	Plataforma completa e sofisticada	Ferramentas simples e acessíveis	O software local já existe; ampliar complexidade somente mediante evidência e validação humana
Visibilidade vs. Proteção	Transparência radical	Proteção de dados pessoais (LGPD)	Publicar o resultado da verificação, não o dado bruto
Reconhecer as tensões é mais honesto do que fingir que elas não existem. A governança existe para gerenciá-las, não para eliminá-las.

12. O que a visão exige de quem participa
A visão não é um cartaz. Ela exige compromissos concretos de quem participa:

Compromisso com a evidência: não afirmar o que não sabe; registrar a incerteza; contestar com dados.

Compromisso com a abertura: aceitar que a Praça é de todos, inclusive de quem pensa diferente.

Compromisso com a consequência: não se contentar com registro ou reclamação; buscar o resultado observável.

Compromisso com a governança: respeitar as regras decididas em assembleia, mesmo quando discordar.

Compromisso com a proteção: não expor pessoas; respeitar a LGPD; não usar a estrutura para fins pessoais.

13. Perguntas abertas para decisão humana
Estas perguntas não podem ser respondidas pelo agente. Elas precisam ser decididas pelo coletivo:

A visão está clara e mobilizadora? O coletivo a subscreve?

Os sete princípios são os certos? Falta algum? Sobra algum?

Os quatro valores (dignidade, honestidade epistêmica, solidariedade, coragem cívica) representam o projeto?

O nome "A Praça" é o definitivo? Ou o coletivo prefere outro?

A identidade simbólica (Itaperuna, Oçará, Minha Oca) será usada? Com que cuidado?

A Praça quer se posicionar publicamente sobre temas nacionais (ex: boicote, polarização) ou apenas sobre temas locais?

A Praça aceita dialogar com todos os partidos, ou tem restrições?

A Praça tem limites para o que aceita de parceiros (ex: empresas, governos)?

14. A frase que resume este documento
"A Praça existe porque Itaperuna tem problemas que não se resolvem sozinhos, capacidades que não se conectam sozinhas e dados que não se tornam públicos sozinhos. Ela é uma infraestrutura cívica — não um app, não um partido, não uma empresa — que torna o conhecimento contestável, a participação real e a ação coletiva capaz de gerar consequência. Começa pequena, com pessoas reais, e cresce com evidência. É de todos, e nenhum grupo pode tomá-la."

Fim do documento 01. Status: proposta a ser decidida pelo coletivo.

