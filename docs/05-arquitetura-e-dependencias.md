# Nota de incorporação das investigações — 13/11/2026

Por autorização humana explícita do proponente, foram incorporadas cópias
integrais de [INV-OSS-01](investigacoes/INV-OSS-01-reutilizacao-digitap.md) e
[INV-ECO-01](investigacoes/INV-ECO-01-governanca-sustentabilidade-digitap.md),
provenientes de `~/Downloads/`, com os originais preservados.
O [índice das investigações](investigacoes/README.md) registra procedência,
datas, hashes SHA-256 e autoria não confirmada.

As fontes passam a estar disponíveis para consulta no repositório.
Esta incorporação documental não aprova suas recomendações nem revalida
suas fontes externas. A decisão humana abaixo permanece com seus limites.
A nota de ausência na consulta inicial é preservada como registro histórico
daquela consulta; a pendência de disponibilidade local foi atendida por esta
incorporação, sem que isso comprove autoria ou adoção das recomendações.

---

# Decisão humana de engenharia — 13/11/2026

**Autoria:** proponente humano do DigItap / A Praça, por instrução
explícita na sessão de continuidade de 13/11/2026.
**Alcance:** método de avaliação das próximas decisões de engenharia
e de suas implicações para o produto.

## Decisão e fundamentos

INV-OSS-01 e INV-ECO-01 são referências obrigatórias de consulta,
não autorização para implementar tudo o que foi pesquisado.

Aplicar a sequência do [Marco Zero](Marco_Zero_2026-11-03.md),
seção 8: **ADOPT → MAP → COMPOSE → EXTEND → BUILD**.

Antes de construir uma capacidade, registrar:
- a necessidade concreta;
- a implementação existente;
- as soluções pesquisadas reutilizáveis;
- o custo, a manutenção, a segurança e os riscos;
- o menor incremento verificável.

## Aplicação e limites

- **P0 e I3:** consolidar e reutilizar a infraestrutura atual.
- **I4:** avaliar a aplicação dos aprendizados de governança,
  atestação, representação, revogação e confiança contextual,
  condicionada à disponibilidade das fontes e às decisões D1–D4.
- **I5:** realizar validação humana VH-01, VH-02 e VH-03.
- **I6+:** expansão somente após deliberação humana posterior a I5.
  Não antecipar portfólio, IA, rede ou novos sistemas de governança.
  Implementações anteriores não autorizam novas expansões.

Não criar pontuação universal de reputação. Não presumir adoção,
receita, instituição constituída ou demanda validada.

Esta decisão estabelece um método de avaliação; não autoriza
implementação, alteração de banco ou infraestrutura, nem implantação.

Referências existentes:
[escopo e ressalva sobre o portfólio já implementado](02-escopo-e-mvp.md),
[modelo de domínio e decisões D1–D4](digitap/01-modelo-de-dominio.md) e
[critérios de progresso e validação humana](07-criterios-de-progresso.md).

## Fontes ainda pendentes

Os registros de INV-OSS-01 e INV-ECO-01 não foram localizados nas
buscas realizadas no repositório e no Google Drive conectado.
Seus identificadores foram informados pelo proponente.

As investigações ainda precisam ser incorporadas como fontes
consultáveis, com localização, autoria, data e versão identificadas.
Este registro não comprova sua consulta nem atribui conclusões
a documentos não encontrados. A consulta obrigatória permanece
pendente enquanto as fontes não estiverem disponíveis.

A ausência temporária dessas investigações não bloqueia correções
P0 previamente autorizadas. A consulta sistemática deve orientar
novas decisões de arquitetura e capacidades.

## Preservação do histórico

O conteúdo anterior segue integralmente abaixo, com suas datas,
ressalvas e afirmações históricas. Esta decisão registra somente
o método acima; não atualiza o inventário técnico nem comprova
execução, validação humana ou constituição institucional.

---

# Nota de revisão vigente — 04/11/2026

**Fonte preservada:** `📘-05-—-ARQUITETURA-E-DEPENDÊNCIAS-Projeto-A-Praça.txt` (Project Files). **Natureza:** atualização de escopo e leitura, com seções exploratórias antigas preservadas para rastreabilidade. **Não é** autorização de publicação, DDL, migração, alteração de RLS/código, consulta ao Git local ou constituição institucional. I3 concluído em 05/11/2026 (commit 623ee50, 20/20 cenários B+C PASS); I4 especificado, não implementado; I5 não iniciado.

## Revisão vigente: implementação local e modelo de titularidade futuro

**Executado localmente segundo checkpoints do Codex:** Next.js/TypeScript, Supabase local/PostgreSQL, autenticação, RLS/grants fechados, fluxo editorial, snapshots de publicação e testes. Checkpoint conhecido `623ee50`, com B07 concluído; B08–B09, B10–B12, C01–C08 concluídos segundo o proponente. Não confundir disponibilidade local com arquitetura de produção ou deploy. As afirmações históricas “não há código”, “PostgreSQL é só proposta” e “MVP usa Forms/Sheets” não descrevem o estado atual.

**I3 permanece intocado em titularidade:** B01–B12 e C01–C08 concluídos sob `organizacao_id`. **I4:** modelo conceitual `sujeitos_publicadores` com `tipo IN ('pessoa_fisica','coletivo_informal','organizacao')`, PF associada à conta, coletivo com representantes/atestantes versionados e vínculo de organização formal. `atividades.sujeito_id` será FK futura; `organizacao_id` legado deverá coexistir durante migração aditiva. Não há DDL, migração, regra RLS nova nem corte de compatibilidade aprovados agora.

**Segurança estrutural:** conta autenticada ≠ sujeito ≠ representante ≠ aprovação editorial ≠ autorização de publicação ≠ realização comprovada. RLS/grants e checks de servidor permanecem deny-by-default. Atestação revogada suspende o vínculo; denúncia volta à curadoria; autorização vincula objeto, escopo, versão, vigência e conteúdo aprovado. Snapshot público é distinto de rascunho/registro privado. `gov.br` OAuth não é dependência do MVP nem identidade civil presumida. Nenhum sistema Célula Zero/Esentya vira dependência técnica automaticamente.

**Próximas capacidades:** I5 = validação humana VH-01/VH-02/VH-03; I6+ condicional. Não iniciar portfólio, prestação de contas de organizações, IA ou rede por conta de possibilidades arquiteturais.

---

📘 05 — ARQUITETURA E DEPENDÊNCIAS: Projeto A Praça
Documento de arquitetura técnica, dependências externas e decisões pendentes
Versão 1.1 · 04/11/2026 · Status: histórico exploratório + estado local implementado + I4 especificado

1. Instruções para o agente (leia primeiro)
Este documento existe para resolver um problema grave dos documentos anteriores: a arquitetura técnica foi tratada como decisão fechada quando, na verdade, é um conjunto de propostas, algumas viáveis, outras dependentes de terceiros, outras ainda não demonstradas.

O caso mais crítico é o gov.br OAuth. O Master Briefing antigo tratava o login via gov.br como "arquitetura decidida". A orientação oficial do Governo Digital (atualizada em junho de 2026) informa que a integração é destinada à administração pública e não está aberta, como regra, ao setor privado ou a associações civis independentes. Exige solicitação formal e análise de elegibilidade. Portanto, para uma associação civil, gov.br OAuth é uma dependência externa não resolvida, não uma capacidade pronta.

Regras para você, agente:

Não trate nenhuma escolha deste documento como decisão tomada. Tudo é proposta, dependência ou hipótese.

Não presuma gov.br OAuth como disponível. O MVP deve funcionar sem ele.

Não presuma PostgreSQL com RLS, multisig ou replicação em 3 nós como decisões. São propostas para quando o projeto justificar.

Não presuma que o MVP precisa de código próprio. A arquitetura mínima do MVP é ferramentas prontas (formulário, mapa, WhatsApp), não infraestrutura sofisticada.

Não confunda "arquitetura proposta" com "arquitetura aprovada". A aprovação é humana, em assembleia.

Não trate Célula Zero e Esentya como base técnica. São inspiração conceitual (ver documento 00, seção 8).

2. O problema que este documento resolve
O projeto tem uma visão clara (documento 01), uma proposta de governança (documento 04) e uma definição de MVP em andamento (documento 02). Mas a arquitetura técnica está num limbo: foi descrita como se fosse decidida, quando não é. Isso gera três riscos:

Risco de dependência bloqueante: o projeto presume gov.br OAuth e descobre, tarde, que não tem acesso.

Risco de sobre-engenharia: o projeto constrói PostgreSQL com RLS, multisig e replicação antes de ter um usuário real.

Risco de falsa soberania: o projeto fala em "soberania digital" mas depende de nuvem estrangeira para produção.

Este documento separa o que é decisão, o que é proposta, o que é dependência e o que é hipótese — e define a arquitetura mínima para o MVP, que não depende de nada disso.

3. A distinção fundamental: decisão, proposta, dependência, hipótese
Categoria	Definição	Exemplo
DECISÃO	Aprovada em assembleia, registrada em ata, com responsável e prazo.	Nenhuma ainda. O projeto está em pré-execução.
PROPOSTA	Recomendação técnica ou estratégica, ainda não aprovada.	PostgreSQL com RLS; multisig 3-de-5; AGPLv3.
DEPENDÊNCIA	Capacidade externa necessária, mas não controlada pelo projeto.	gov.br OAuth; VALIDAR/ITI; IFF; UENF; NValley.
HIPÓTESE	Suposição a ser testada com evidência.	"Moradores vão usar um canal de relato de vazamento"; "o ciclo gera consequência".
Regra: nenhuma proposta se torna decisão sem assembleia. Nenhuma dependência se torna capacidade sem validação formal. Nenhuma hipótese se torna fato sem evidência.

4. A arquitetura mínima do MVP da experiência ÁGUA & CHEIAS — PROPOSTA HISTÓRICA
O MVP definido no documento 02 (Água & Cheias) não precisa de arquitetura técnica própria. Ele precisa de:

Componente	Ferramenta proposta	Dependência	Custo
Formulário de registro	Google Forms (ou similar)	Nenhuma (conta Google)	R$ 0
Mapa público	Google My Maps (ou similar)	Nenhuma	R$ 0
Planilha de acompanhamento	Google Sheets	Nenhuma	R$ 0
Grupo de WhatsApp	WhatsApp	Nenhuma (celular)	R$ 0
Relatório semanal	PDF ou post	Nenhuma	R$ 0
Armazenamento de fotos	Google Drive	Nenhuma	R$ 0
O que isso NÃO tem:

Login gov.br.

Banco de dados próprio.

Multisig.

Replicação em 3 nós.

Código próprio.

Agentes de IA.

O que isso TEM:

Registro de problemas.

Verificação manual (pela equipe).

Encaminhamento para órgão competente.

Acompanhamento de status.

Transparência semanal.

Contestação via grupo.

Conclusão: o MVP é executável hoje, sem nenhuma das dependências técnicas que os documentos anteriores tratavam como pré-requisito. Isso é intencional. O MVP testa a experiência humana, não a arquitetura.

5. As dependências externas (o que não controlamos)
5.1. gov.br OAuth (autenticação) — DEPENDÊNCIA NÃO RESOLVIDA
Status: restrito à administração pública. Associação civil independente não deve presumir acesso. Exige solicitação formal e análise de elegibilidade.

O que isso significa:

O MVP não pode usar gov.br como login.

O projeto precisa de plano B de identidade (ver seção 5.2).

Se, no futuro, a associação conseguir elegibilidade, gov.br pode ser integrado como camada adicional — mas não é pré-requisito.

Plano B (identidade para o MVP):

Fase 1 (MVP): sem login. O formulário é aberto; a verificação é feita pela equipe; a identidade do relator é opcional (nome e contato para retorno).

Fase 2 (se necessário): autenticação própria simples (código por SMS ou WhatsApp), para evitar spam e permitir histórico.

Fase 3 (se elegível): gov.br OAuth como camada de confiança adicional, nunca como única opção.

Regra: nenhuma funcionalidade crítica pode depender de gov.br. Se gov.br cair, o projeto continua.

5.2. VALIDAR/ITI (validação de assinatura) — DEPENDÊNCIA DISPONÍVEL
Status: público e gratuito. Qualquer cidadão ou organização pode validar assinaturas gov.br via upload de PDF, URL ou QR Code.

O que isso permite:

Um cidadão assina um documento pelo portal gov.br (conta Prata/Ouro).

A Praça recebe o PDF assinado.

A Praça submete ao VALIDAR e registra o resultado (aprovado, reprovado, indeterminado).

O que isso NÃO permite:

Emitir assinatura via API (restrito a órgãos públicos).

Autenticar usuários (VALIDAR valida documentos, não pessoas).

Confirmar a verdade do conteúdo (valida autoria e integridade, não fato).

Uso no MVP: opcional. A assinatura gov.br é uma composição candidata para declarações formais, não para todo relato. Exigir assinatura em todo relato aumentaria o atrito e afastaria quem não tem conta Prata/Ouro.

Automação: não começar por Playwright/scraping. Primeiro observar a validação manual de um documento real; só automatizar se o uso recorrente justificar.

5.3. IFF, UENF, NValley — DEPENDÊNCIAS NÃO DEMONSTRADAS
Instituição	O que oferece	Status	Como validar
IFF Campus Itaperuna	Capacidade técnica, laboratórios, estudantes	Existência verificada; disponibilidade não demonstrada	Contato institucional formal; proposta de parceria
UENF	Auditoria, dados, legitimidade acadêmica	Existência verificada; disponibilidade não demonstrada	Contato institucional formal
NValley	Espaço, rede, mobilização	Existência verificada; estatuto e CNPJ não públicos	Pedido formal de estatuto e CNPJ; se recusar, usar como parceiro pontual
Regra: nenhuma dessas instituições é "parceira" até que haja compromisso formal (documento assinado, termo de cooperação, ou equivalente). Existência ≠ disponibilidade ≠ compromisso.

6. Propostas técnicas originais — HISTÓRICO; parte da stack local foi posteriormente implementada
Estas propostas não são decisões. Elas fazem sentido se e quando o MVP de experiência humana for bem-sucedido e o projeto precisar de infraestrutura própria. Não devem ser construídas antes disso.

6.1. Banco de dados: PostgreSQL com Row-Level Security (RLS)
O que é: banco relacional com controle de acesso por linha, garantindo que cada usuário veja apenas o que tem permissão.

Quando faz sentido: quando houver múltiplos usuários, dados sensíveis e necessidade de privacidade granular.

Quando NÃO faz sentido: no candidato histórico sem código, com formulário e planilha.

Status original: proposta. **Revisão 04/11:** PostgreSQL com RLS e Supabase local foram implementados na v1.5 segundo checkpoints; não prova deploy ou aprovação da arquitetura de produção.

6.2. Custódia: multisig 3-de-5
O que é: conta com 5 chaves, sendo necessário 3 para movimentar recursos. Nenhuma pessoa move dinheiro sozinha.

Quando faz sentido: quando houver fundos significativos e risco de má gestão.

Quando NÃO faz sentido: no MVP, que não movimenta dinheiro.

Atenção: multisig é custódia técnica, não substitui personalidade jurídica. A associação (CNPJ) é a entidade legal que assina contratos, recebe recursos e presta contas. Multisig é uma camada adicional, não a base.

Status: proposta. Não decidida.

6.3. Replicação em 3 nós institucionais
O que é: dados espelhados em 3 instituições (ex: IFF, consórcio, investidores), para que nenhum dado seja apagado unilateralmente.

Quando faz sentido: quando houver dados críticos e risco de perda ou censura.

Quando NÃO faz sentido: no MVP, com dados simples em planilha.

Status: proposta. Não decidida.

6.4. Reputação: cadeia de proveniência estrita
O que é: separação rigorosa entre registro, evidência e reputação. A reputação não é comprável; é construída por contribuições verificadas.

Inspiração: Célula Zero (conceito), Esentya (Proof-of-Worth).

Quando faz sentido: quando houver múltiplos contribuidores e necessidade de confiança.

Quando NÃO faz sentido: no MVP, com equipe pequena e verificação manual.

Status: proposta. Não decidida.

6.5. Licenciamento: AGPLv3 (código) + CC BY-SA 4.0 (documentos)
O que é: copyleft forte para código (qualquer modificação que rode em servidor deve permanecer aberta) e compartilhamento igual para documentos.

Quando faz sentido: desde o primeiro código produzido, para garantir soberania digital.

Status: proposta. Recomendada. Mas só se aplica quando houver código; no MVP, não há código próprio.

7. Desenvolvimento vs. produção (a soberania digital na prática)
O Master Briefing antigo mencionava Vercel AI Gateway para agentes de IA no desenvolvimento. Isso é aceitável como ferramenta de produtividade, mas não combina com "soberania digital" se a produção também depender de nuvem estrangeira.

A distinção necessária:

Camada	O que é	Onde pode rodar	Regra
Desenvolvimento	Ferramentas de IA, editores, versionamento	Onde for mais produtivo (inclusive estrangeiro)	Aceitável, desde que não haja dados sensíveis
Produção	Sistema em uso por cidadãos, dados reais	Infraestrutura sob controle da associação ou provedor brasileiro	Dados sob controle da associação; nenhuma dependência crítica de API privada estrangeira
No MVP: não há produção própria (é Google Forms/Sheets). A questão não se coloca.

No futuro: se houver sistema próprio, a produção deve ser decidida com critério de soberania (servidor local, provedor brasileiro, ou nuvem estrangeira com dados criptografados e contrato de proteção).

8. O que a arquitetura NÃO deve fazer
Para evitar sobre-engenharia e falsa soberania:

Não construir banco de dados próprio antes de ter usuários reais.

Não implementar multisig antes de ter fundos.

Não replicar em 3 nós antes de ter dados críticos.

Não construir sistema de reputação antes de ter contribuidores.

Não depender de gov.br OAuth para funcionalidade crítica.

Não usar nuvem estrangeira para produção se o discurso é "soberania digital".

Não reescrever o Célula Zero do zero sem avaliar forkar/reutilizar módulos (se algum dia o Célula Zero for usado, o que não é o caso no MVP).

Não confundir assinatura com autenticação, nem assinatura com verdade.

9. O que o candidato histórico de MVP precisava — NÃO É ARQUITETURA VIGENTE
Necessidade	Solução no MVP	Dependência	Custo
Registrar problema	Google Forms	Nenhuma	R$ 0
Visualizar no mapa	Google My Maps	Nenhuma	R$ 0
Acompanhar status	Google Sheets	Nenhuma	R$ 0
Mobilizar e discutir	WhatsApp	Nenhuma	R$ 0
Verificar evidência	Equipe manual	Nenhuma	R$ 0
Encaminhar para órgão	E-mail/telefone/protocolo	Órgão competente	R$ 0
Publicar transparência	PDF/post semanal	Nenhuma	R$ 0
Autenticar usuário	Não necessário no MVP	—	—
Assinar documento	Opcional (VALIDAR)	VALIDAR/ITI	R$ 0
Custodiar dinheiro	Não há dinheiro no MVP	—	—
Conclusão: o MVP é executável hoje, com ferramentas gratuitas, sem nenhuma dependência técnica bloqueante. A arquitetura sofisticada é para depois, se e quando o projeto justificar.

10. Decisões da fase exploratória — HISTÓRICO; D1–D4 decididas, D5–D8 pendentes
Estas decisões não podem ser tomadas pelo agente. Elas precisam de assembleia:

#	Decisão	Opções	Impacto
1	Identidade no MVP	(a) Sem login; (b) Login próprio simples; (c) Tentar gov.br	Define atrito de participação
2	Assinatura gov.br	(a) Opcional para declarações formais; (b) Não usar no MVP; (c) Usar em todo relato	Define complexidade e atrito
3	Licenciamento	(a) AGPLv3; (b) GPLv3; (c) Outra	Define soberania do código futuro
4	Produção (futuro)	(a) Servidor local; (b) Provedor brasileiro; (c) Nuvem estrangeira com proteção	Define soberania digital real
5	Parceria com IFF	(a) Formalizar; (b) Manter informal; (c) Não buscar	Define capacidade técnica
6	Parceria com NValley	(a) Pedir estatuto/CNPJ; (b) Usar como espaço pontual; (c) Não usar	Define base física
7	Multisig	(a) Implementar quando houver fundos; (b) Não implementar	Define governança financeira
11. O que o agente NÃO deve fazer
Não tratar gov.br OAuth como arquitetura decidida.

Não tratar PostgreSQL com RLS, multisig ou replicação como decisões.

Não construir arquitetura sofisticada antes do MVP de experiência humana.

Não presumir que o MVP precisa de código próprio.

Não presumir que IFF, UENF ou NValley são parceiros sem compromisso formal.

Não confundir assinatura com autenticação, nem assinatura com verdade.

Não usar nuvem estrangeira para produção se o discurso é "soberania digital".

Não reescrever o Célula Zero do zero sem avaliar forkar/reutilizar (se algum dia for usado).

Não promover propostas a decisões sem assembleia.

Não ignorar a LGPD ao propor coleta de dados.

12. A frase que resume este documento — HISTÓRICO PRÉ-SOFTWARE
"O MVP de A Praça não precisa de arquitetura. Precisa de um formulário, um mapa e um grupo de WhatsApp. Tudo o que os documentos anteriores tratavam como 'arquitetura decidida' — gov.br OAuth, PostgreSQL com RLS, multisig, replicação em 3 nós — é proposta, dependência ou hipótese. Nada disso é pré-requisito para começar. O pré-requisito é uma pessoa real, um problema real e uma equipe disposta a verificar e encaminhar. A arquitetura sofisticada vem depois, se e quando o projeto justificar."

Fim do documento 05. Status: proposta a ser decidida pelo coletivo.
