# Atualização 05/11/2026

I3 concluído em 05/11/2026 (commit 623ee50, 20/20 cenários B+C PASS: B01-B12 + C01-C08). Este documento preserva a versão 2.1 (04/11/2026) como snapshot histórico. Para o estado atual, ver docs/07-criterios-de-progresso.md. I4 especificado, não implementado. I5 não iniciado.

---

# Nota vigente de revisão — 04/11/2026 (Project Files)

**Natureza:** revisão documental da fonte histórica abaixo; não substitui a versão do repositório, não comprova implantação, adoção comunitária, governança constituída nem autorização para editar código, banco ou infraestrutura. Esta revisão incorpora decisões humanas D1–D4, respeita a hierarquia do Marco Zero e não altera a matriz normativa dos 74 cenários v1.5. Em divergência sobre o estado corrente do Mac, exigir evidência do Git local e dos testes; este arquivo não é telemetria.

**Direção atual decidida:** A Praça é infraestrutura organizacional e comunitária, não apenas agenda. A atividade e o editorial implementados são fundação reutilizável. Pessoas físicas e coletivos informais devem poder participar como titulares; a interface distingue pessoas físicas, coletivos sem CNPJ e organizações formais com CNPJ. Os módulos de portfólio, prestação de contas de terceiros, IA para projetos e rede são **I6+ condicional**, sem autorização de implementação antes de I5.

**Decisões humanas de produto:** D1 = pessoa física nova publica após curadoria inicial; após histórico aprovado, autopublica com pós-moderação; denúncia reabre curadoria. D2 = coletivo informal exige duas atestações de contas distintas de membros, curadoria do nome e primeira atividade; revogação de uma atestação suspende o vínculo até reatestação. D3 = “organização” pode ser guarda-chuva na linguagem da interface, mas o domínio terá tipo fechado `pessoa_fisica | coletivo_informal | organizacao`, sem PF disfarçada de organização. D4 = curadoria por risco: novos PF/coletivos sob revisão, organização com histórico pode autopublicar com pós-moderação, denúncia reabre curadoria. **D5–D8 ficam sem decisão até depois de I5.** D1–D4 não são os IDs D01–D07 de segurança da Fase 3.

**Fluxo aprovado:** I3 continua no esquema vigente `organizacao_id`: I3 concluído em 05/11/2026 (commit 623ee50); B01-B12 e C01-C08 PASS local (20/20). I4 = titularidade inclusiva, **somente especificada**, sem DDL/migração/RLS/código autorizados; I5 = três passos humanos obrigatórios VH-01 compreensão, VH-02 uso acompanhado, VH-03 decisão. I6+ apenas se houver deliberação humana após I5. A governança institucional é frente paralela; associação, CNPJ, estatuto aprovado, ata, diretoria e nomeação formal de responsável LGPD não devem ser presumidos.

**Estado com proveniência (04/11):** último checkpoint Git confirmado pelo proponente `c015cde` (B07); working tree limpo naquela confirmação; B01–B07 PASS local *relatado pelo Codex*, A07 revalidado; B08–B09 em curso, não aprovados; B10–B12 e C01–C08 pendentes; I4 ainda não implementado; I5 sem execução humana. Relatórios 262 unitários/componentes, 152 integração e 27 E2E são resultados relatados pelo Codex, não certificação independente de 74 cenários. Preservar 74 IDs v1.5 como linha de base; variantes v1.6 não adicionam cenários numerados sem decisão. _Snapshot de 04/11/2026; ver Atualização 05/11/2026 no topo._

**Regra de leitura:** as seções antigas que descrevem “MVP indefinido”, “pré-execução”, “Água & Cheias escolhido/recomendado”, “sem código próprio”, “proposta de PostgreSQL” ou cronograma de seis semanas são **fotografia histórica da fase exploratória**, não estado operacional vigente. Seções históricas mantidas para proveniência. Esta versão é um snapshot de 04/11/2026, preservado por proveniência. Estado atual em docs/07.

---

 00 — MASTER CONTEXT: Projeto A Praça
Documento de contexto para agente GPT
Versão 2.2 · 05/11/2026 · Status: I3 concluído em 05/11/2026 (commit 623ee50, 20/20 cenários PASS); I4 especificado; I5 não iniciado; governança institucional não constituída

1. Instruções para o agente (leia primeiro)
Você está trabalhando no projeto A Praça, um projeto de infraestrutura cívica para Itaperuna (RJ) e região. Este documento é o seu contexto inicial. Ele substitui qualquer contexto anterior sobre Célula Zero, Esentya ou versões antigas do Master Briefing.

Regras de trabalho que você deve seguir:

Não promova propostas a decisões. Tudo que está aqui é visão, hipótese, proposta ou recomendação — exceto o que estiver explicitamente marcado como VERIFIED ou DECISÃO. Se não estiver marcado, trate como aberto.

Não use a cifra de R$ 340–500 milhões de "vazamento econômico" em nenhuma apresentação, projeção ou captação. Ela é INCONCLUSIVE (ver seção 6).

Não trate o gov.br OAuth como arquitetura decidida. É uma dependência externa não resolvida para uma associação civil independente (ver seção 7).

Não trate Célula Zero e Esentya como base técnica. Eles são inspiração conceitual, não componentes a reutilizar (ver seção 8).

Não trate a lista de partidos como "fatal" nem como decisão. É um risco a mitigar (ver seção 9).

Não trate Água & Cheias como piloto escolhido. É uma experiência candidata (ver seção 10).

Não confunda assinatura com verdade, nem assinatura com autenticação. São camadas distintas (ver seção 11).

O critério de progresso é humano, não técnico: uma pessoa real consegue fazer algo que antes não conseguia? (ver seção 12).

Se você tiver instruções antigas para "pensar no Célula Zero" ou "desenvolver o Esentya", ignore-as. A prioridade é A Praça. Célula Zero e Esentya são memória e inspiração.

2. O que é A Praça (em uma frase)
A Praça é um espaço cívico e comunitário para Itaperuna e região, que usa conhecimento público, participação e capacidades locais para possibilitar ação coletiva.

Não é um aplicativo de prefeitura. Não é um partido. Não é um produto de tecnologia. É uma infraestrutura de confiança e coordenação que pode se materializar em ferramentas digitais, encontros presenciais e ações coletivas.

3. O problema que A Praça quer resolver
Itaperuna é um polo regional (101.041 hab. no Censo 2022; ~107 mil em 2026), com capacidades instaladas (IFF, saúde regional, comércio), mas enfrenta:

Fragmentação da ação coletiva: cada grupo luta sozinho; o esforço de um não fortalece o do outro.

Ausência de memória: ações não são registradas; o aprendizado se perde; a luta recomeça do zero.

Assimetria de informação: a população não tem acesso fácil a dados públicos (saneamento, saúde, compras) que poderiam fundamentar cobranças.

Captura por plataformas externas: apps multinacionais (99, iFood, Meta) drenam renda local e não prestam contas à comunidade.

A Praça não promete resolver tudo. Promete criar a infraestrutura de coordenação que falta para que a cidade resolva melhor o que já tenta resolver.

4. O que A Praça NÃO é
Não é um fork do Célula Zero. É projeto novo, com escopo próprio.

Não é uma extensão do Esentya. O Esentya inspirou o conceito de reputação, não é componente.

Não é um app de mobilidade (Moto-Praça) nem de delivery (Praça-Food) no MVP. Essas são propostas comerciais posteriores, não produto validado.

Não é uma plataforma partidária. Não terá palanque, não será capturada por sigla.

Não é um observatório ou dashboard. É uma infraestrutura de investigação e ação, com contestação pública.

Não é um sistema de identidade próprio. Usa composições com infraestrutura pública (gov.br, VALIDAR) quando viável, sem presumir integração privilegiada.

5. Estado atual do projeto (referência datada: 04/11/2026)
Dimensão	Estado
Visão	Direção comunitária preservada; infraestrutura organizacional e comunitária assumida como direção de produto
Diagnóstico territorial	Base documental aproveitável, com verificações parciais
Software v1.5	Em desenvolvimento local: B01–B07 PASS reportado; último commit confirmado pelo proponente c015cde _Snapshot de 04/11/2026; ver Atualização 05/11/2026 no topo._
I3, sprint	B08–B09 em execução relatada; B10–B12 e C01–C08 pendentes, ainda no modelo organizacao_id
I4	Titularidade PF/coletivo e curadoria por risco especificadas; D1–D4 decididas; sem implementação/migração autorizada
I5	VH-01, VH-02, VH-03 obrigatórios; não executados
I6+	Portfólio, contas de terceiros, IA e rede condicionais após I5; D5–D8 em aberto
Governança	Proposta institucional; sem comprovação de estatuto aprovado, CNPJ, eleição de diretoria ou nomeação formal
Arquitetura	Stack local construída; produção/deploy não autorizados; gov.br OAuth não assumido
Participação real	Nenhum VH-01–VH-03 executado ou comprovação de adoção reportada
Financiamento e parcerias	Não presumir recursos, acordos ou compromissos institucionais
Conclusão: não é mais fase de pré-execução técnica; há software local e checkpoints. Isso não equivale a lançamento, serviço público operante, governança constituída ou validação humana. As propostas anteriores permanecem históricas.

6. O que está VERIFIED, PARTIAL, INCONCLUSIVE e CONTRADICTED
Use esta tabela como referência de evidência. Não use afirmações INCONCLUSIVE ou CONTRADICTED como fato.

VERIFIED (pode ser usado publicamente)
Itaperuna: 101.041 hab. (Censo 2022); ~107.322 (estimativa 2026)

PIB per capita: R$ 40.257,29 (2023, estimativa IBGE)

Centralidade regional (REGIC/IBGE, Centro Sub-Regional)

Itaperuna é polo de saúde regional (Plano Regional, 14 municípios)

IFF Campus Itaperuna: 150 mil m², ~1.200 estudantes

IDEB rede municipal: 7,4 (iniciais) e 6,3 (finais), INEP 2025

Noroeste administrativo: 13 municípios; Região de Saúde: 14

PARTIAL (reproduzido de base pública, mas linha oficial pendente)
Água: 82,3% de atendimento (SINISA 2024)

Perdas de água: 42,3% (SINISA 2024)

Esgotamento: ~89% (SINISA 2024)

Tratamento de esgoto: 0% (SINISA 2024)

Capacidade do IFF estar disponível para parceria (existência ≠ disponibilidade)

INCONCLUSIVE (não usar como fato)
R$ 340–500 milhões de "vazamento econômico" anual

R$ 27–60 milhões "endereçáveis"

Demanda da população por A Praça

Escolha do MVP

Viabilidade de Moto-Praça/Food em 90 dias

CONTRADICTED (não usar)
IDEB 5,6 como "o IDEB de Itaperuna"

CONSPNOR = 13 municípios

ESTBAN como medida de fuga de riqueza

"Caminho da Pedra Preta" como etimologia consensual

7. Dependências externas não resolvidas
Dependência	Status	Plano B
gov.br OAuth (autenticação)	Não disponível como regra para associação civil. Exige solicitação formal e análise de elegibilidade.	Autenticação própria (SMS/WhatsApp) ou parceria com instituição pública que já tenha integração.
VALIDAÇÃO de assinatura gov.br (VALIDAR/ITI)	Disponível — público e gratuito. Pode ser usado para verificar autoria e integridade de documentos assinados por cidadãos.	Manual (upload no site) ou automação via Playwright como solução de contorno.
IFF (capacidade técnica)	Não demonstrado compromisso.	Contato institucional formal.
UENF (auditoria e dados)	Não demonstrado compromisso.	Contato institucional formal.
NValley (espaço e rede)	Não demonstrado estatuto nem CNPJ públicos.	Pedido formal; se recusar transparência, usar como parceiro pontual, não como casa.
Regra: nenhuma dependência externa deve ser tratada como capacidade pronta. Cada uma precisa de validação formal antes de entrar no MVP.

8. Célula Zero e Esentya: inspiração, não base
Célula Zero inspirou a lógica de proveniência: Registro ≠ Evidência ≠ Reputação, e a ideia de coordenação de contribuições. Não é base técnica. Não há compromisso de reutilizar código, manter compatibilidade ou preservar estrutura de dados.

Esentya inspirou o conceito de Proof-of-Worth e reputação não comprável. Não é componente a integrar.

Se houver conflito entre "o que o Célula Zero faz" e "o que A Praça precisa", A Praça vence. Sempre.

A decisão de "reescrever do zero" no Master Briefing antigo não é sobre o Célula Zero. É sobre A Praça: ela será construída com as ferramentas e a arquitetura que fizerem sentido para o seu próprio escopo.

9. Risco político a mitigar (não "fatal")
O Master Briefing antigo listava apenas UP, PT, PSOL, REDE e AVANTE como co-fundadores. Isso contradiz a proposta de plataforma apartidária. O problema verificável é:

Como impedir captura partidária?

Como assegurar regras justas de participação?

Como não confundir os primeiros mobilizadores com representantes de toda a população?

Correção necessária (duas opções):

Opção A: convidar todos os ~20 partidos com diretório em Itaperuna, com o mesmo texto e o mesmo espaço. Quem não vier, não veio.

Opção B: não ter partidos como co-fundadores institucionais. A governança é de cidadãos e organizações da sociedade civil; partidos participam como qualquer outra organização, sem cadeira cativa.

Recomendação: Opção B é mais coerente com "A Praça é de todos". Opção A é mais realista se o apoio político imediato for necessário. A decisão é humana, não do agente.

10. Experiências candidatas (não escolhidas)
Candidato	O que testa	Dados disponíveis
Água & Cheias	Moradores confrontam dados oficiais (SINISA, INEA) com pontos críticos e encaminham evidência	SINISA, INEA, Defesa Civil
Compras & Capacidades	Organização verifica se existe oferta local antes de contratar fora	PNCP, SICONFI, empresas, IFF
Rotas de Cuidado	Pessoa entende o percurso regional para acessar serviço de saúde	Plano Regional, CNES/DATASUS
Nenhum foi escolhido. A escolha é humana (do coletivo), não do agente.

11. Privacidade, assinatura e verdade (distinções que não podem ser confundidas)
Assinatura ≠ autenticação. O VALIDAR confirma autoria e integridade, não identidade autenticada dentro da plataforma.

Assinatura ≠ verdade. Um documento assinado atesta que alguém assinou, não que o conteúdo é verdadeiro. A verificação cruzada (SINISA, INEA, documentos municipais) é uma camada separada.

Assinatura gov.br é opcional para relatos. Exigir assinatura em todo relato aumentaria o atrito e afastaria quem não tem conta Prata/Ouro. A assinatura é opção para declarações formais, acordos e manifestações que precisem de autoria verificável.

Não publicar PDFs assinados automaticamente. Eles podem conter dados pessoais. Publicar o resultado da verificação, não o documento bruto.

VALIDAR retorna Aprovado, Reprovado ou Indeterminado. Indeterminado não é fraude; é incerteza.

12. O critério de progresso
Uma pessoa real da região consegue compreender uma questão que afeta sua vida, confrontar os dados oficiais com sua experiência, encontrar outras pessoas ou capacidades relevantes e participar de alguma consequência concreta?

Se a resposta for "não", o projeto não avançou — independentemente de quantas linhas de código foram escritas, quantos documentos foram produzidos ou quantas parcerias foram anunciadas.

O que NÃO é progresso:

Ter um MVP tecnicamente sofisticado sem usuários reais.

Ter um estatuto aprovado sem nenhuma ação concreta.

Ter uma cifra de impacto sem memória de cálculo.

Ter uma lista de parceiros sem compromisso formal.

Ter um diagnóstico documental sem validação com pessoas.

13. Próximos passos — ROTEIRO HISTÓRICO PRÉ-EXECUÇÃO (substituído pela nota vigente e I3→I5)
Fechar a lacuna do SINISA: extrair a linha de Itaperuna dos arquivos oficiais (código do indicador, denominador, prestador, ano). Isso resolve os 4 PARTIAL.

Reformular o Master Briefing com as correções deste documento (sem cifra, sem "fatal", sem produto decidido, com gov.br como dependência).

Definir o MVP como teste de experiência humana, não como produto técnico: uma pessoa de Itaperuna, com um problema real, consegue usar um protótipo simples (formulário + mapa + WhatsApp) para registrar, confrontar com dados oficiais e encaminhar para alguém que possa agir? Isso pode ser feito sem gov.br, sem PostgreSQL com RLS, sem multisig.

Pedir parecer jurídico sobre pagamentos, transporte, moeda local e multisig antes de prometer Moto-Praça/Food.

Fazer o pedido formal ao NValley (estatuto + CNPJ). O teste é a transparência.

Contatar IFF e UENF formalmente para parceria técnica e auditoria.

Redigir o estatuto da Associação com cláusulas pétreas antipalanque.

Só depois decidir se o produto técnico (Moto-Praça, plataforma cívica completa, etc.) faz sentido.

14. O que o agente NÃO deve fazer
Não usar a cifra de R$ 340–500 milhões.

Não tratar diagnóstico documental como base de decisão.

Não listar apenas partidos de esquerda como co-fundadores.

Não prometer Moto-Praça/Food em 90 dias.

Não tratar "moeda local" como detalhe técnico (pode ser arranjo de pagamento pelo BC).

Não confundir "existência de instituição" com "parceria disponível".

Não reescrever o Célula Zero do zero sem avaliar forkar/reutilizar módulos.

Não presumir gov.br OAuth como disponível.

Não confundir assinatura com verdade ou com autenticação.

Não promover propostas a decisões sem confirmação humana.

15. A frase que resume o contexto — FORMULAÇÃO HISTÓRICA (ver revisão vigente)
"A Praça tem a alma certa, o diagnóstico certo e a arquitetura certa — mas ainda tem a lista de convidados errada, o produto mal definido e a cifra que não se sustenta. O critério de progresso não é técnico: é uma pessoa real conseguindo fazer algo que antes não conseguia. O resto é hipótese até que alguém, em Itaperuna, use."
