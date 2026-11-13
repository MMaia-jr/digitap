# INV-ECO-01 — Ecossistema, Governança e Sustentabilidade do DigItap

**Data de verificação:** 13/11/2026  
**Estado:** pesquisa estratégica e técnica, **não** autorização para código, contratação, uso de dados ou constituição institucional.  
**Antecedente:** `INV-OSS-01-reutilizacao-digitap.md`, o Norte do Produto e a documentação vigente de A Praça.  
**Premissa:** diferenciar **fonte verificada**, **analogia arquitetural** e **recomendação/hipótese a validar**. Os endereços nas referências foram consultados nesta pesquisa; licenças sempre devem ser reconferidas no commit/tag efetivamente utilizado.

## 0. Tese executiva

O DigItap não deve tentar ser simultaneamente um Decidim, um banco comunitário, um serviço de nuvem, um mecanismo de pontuação e um ERP de organizações. Deve preservar seu núcleo de sujeitos, vínculos, projetos, atividades, publicação e evidências, e construir **interfaces de governança e confiança com responsabilidades distintas**.

**Três decisões recomendadas:**

1. **Governança primeiro como prática e registro, não como módulo.** Usar um procedimento humano documentado e ferramentas existentes para pauta, discussão, decisão e ata. Construir uma Assembleia Digital própria somente quando houver órgão legítimo, regras deliberadas e lacuna funcional concreta.
2. **PoWth como proveniência contextual, não dinheiro ou ranking.** Adotar o vocabulário W3C PROV e aprender com grafos SourceCred e reconhecimento entre pares Coordinape, sem converter pontuação em veredito sobre pessoas ou distribuição automática de recursos.
3. **Receita por serviço institucional e subsídio cruzado, não por exploração da comunidade.** Testar primeiro serviço de apoio à documentação/portfólios e suporte para organizações com orçamento, preservando acesso básico de PF/coletivos. Nenhum cliente, preço, receita ou parceria está comprovado.

**Fatos que mudam a decisão:** Supabase Cloud oferece São Paulo `sa-east-1` [S17]; Coordinape encerrou seu aplicativo (2021–2025) [S11]; SourceCred tem licença MIT/Apache mas o repositório principal não registra push desde 14/02/2023 segundo metadados GitHub consultados; o modelo é referência, não dependência mantida; ICN está ativo porém seus próprios mantenedores descrevem maturidade desigual e metadados de licenças mistos [S7–S8].

## 1. Plataformas de governança e democracia participativa

### 1.1 Matriz verificada

| Solução | Código e arquitetura | Licença verificada | O que demonstra | Decisão DigItap |
|---|---|---|---|---|
| **Decidim** | [GitHub](https://github.com/decidim/decidim); framework Ruby on Rails, gems/engines e módulos de assembleias, processos, reuniões, propostas, orçamento participativo e prestação de contas | AGPL-3.0; uso de módulos implica cumprir obrigações da licença | Democracia como infraestrutura pública, trilha de decisões e separação de espaços/processos | **Aprender já; instância isolada possível** quando legitimidade institucional justificar; não portar gems Rails para Next.js |
| **Loomio** | [GitHub](https://github.com/loomio/loomio), [deploy Docker](https://github.com/loomio/loomio/blob/master/deploy/README.md); aplicativo completo de discussão, propostas, votações e resultados, self-host ou gerenciado | AGPL-3.0 | Deliberação assíncrona, registro de argumentos e decisões, governança da própria cooperativa | **Melhor candidato de ferramenta pronta** para grupo pequeno/board, condicionado a regras e orçamento; não desenvolver versão própria |
| **Citizen OS** | [API Node](https://github.com/citizenos/citizenos-api) com Sequelize/PostgreSQL, [frontend Angular](https://github.com/citizenos/citizenos-fe); tópicos, argumentos, votos/delegações e histórico | **API Apache-2.0** confirmado por `LICENSE.txt`; não foi encontrada licença explícita no diretório raiz do frontend: **permissão de fork do frontend não confirmada** | Debate estruturado, votação, histórico e participação gratuita | **Aprender/testar serviço**, jamais copiar frontend até licença verificada; identidade e assinatura eletrônica estonianas não são replicáveis automaticamente no Brasil |
| **ICN (InterCooperative Network)** | [GitHub](https://github.com/InterCooperative-Network/icn); Rust, identidade descentralizada, attestations, contratos de governança CCL, receipts, camadas kernel/aplicação, rede P2P | Raiz AGPL-3.0; workspace Rust `MIT OR Apache-2.0` e questões ainda abertas no `LICENSING.md` | Separar instituições, autoridade, política, execução e comprovantes, com interoperabilidade entre cooperativas | **Aprender fronteiras e receipts**, não migrar o DigItap para P2P/Rust nem depender de serviço sem maturidade adequada |

**Leitura de fontes:** Decidim [S1–S3], Loomio [S4–S5], Citizen OS [S6], ICN [S7–S8]. Repositórios foram inspecionados como fontes de arquitetura e licença; não executei instalação ou benchmark.

### 1.2 O aprendizado central do Decidim

O Decidim possui **um contrato social explícito**: código livre, formatos interoperáveis, transparência de decisões, igualdade de participação, proteção dos dados pessoais e prestação de contas sobre o destino das propostas [S2]. A associação responsável pela manutenção do software foi constituída em 2019; a história real diferencia poder público inicial, manutenção de um bem comum e comunidade de prestadores de serviços [S3].

**Aplicação ao DigItap:** criar e adotar institucionalmente uma carta de garantias **antes** de construir recursos de votação. Uma proposta precisa informar quem pode participar, quem vota, quem decide, quais limites, como recorrer e como sua decisão será registrada. Transparência do procedimento não é divulgação do voto individual em qualquer circunstância.

A arquitetura Rails modular do Decidim não é nativa da nossa stack Next.js/TypeScript. Forkar a aplicação inteira nos faria operar uma segunda plataforma. Isso pode ser correto **somente** para assembleias de escala suficiente; não é um atalho para implementar um componente React.

### 1.3 O aprendizado central do Loomio

O Loomio foi construído por uma **cooperativa de trabalhadores**; vende assinatura por organização, self-host e operação privada, preservando exportação de dados [S4–S5]. Seus fluxos colocam **contexto, argumentos, consulta/votação e decisão registrada** no mesmo espaço.

Para a futura assembleia digital de A Praça, isso resolve mais problemas humanos do que simplesmente adicionar um botão «Votar»: permite decisões assíncronas, histórico consultável e acompanhamento de objeções. Um grupo de trabalho preparatório pode testá-lo com dados fictícios e participação autorizada, **sem** declarar legitimidade de assembleia estatutária.

### 1.4 O aprendizado do Citizen OS

O Citizen OS oferece tópicos públicos/privados, estruturação de argumentos, minivotação, delegação e registro temporal de atividade. O serviço se declara gratuito e sustentado por filantropia e fundos europeus [S6]. O backend é Apache-2.0; o frontend angular não tinha licença explícita confirmada no diretório raiz consultado em 13/11/2026. **Código público sem licença verificável não é autorização automática para copiar.** A capacidade de assinatura eletrônica com e-ID na Estônia não equivale a validade de identidade ou voto vinculante no Brasil.

O que reutilizar: formatos de questão/argumento, distanciamento entre moderação do debate e cômputo do resultado, histórico. Não presumir que sua estrutura de financiamento garanta sustentabilidade sem captação.

### 1.5 O aprendizado do ICN

ICN afirma uma divisão entre **domínio institucional**, **política aprovada**, **restrições de execução** e **receipts** verificáveis. Documentação reconhece que o sistema está em construção e partes de governança federada ainda têm limitações de sincronização [S7–S8].

**Tradução arquitetural mínima para o DigItap:**

- **Decisão humana:** ata/resultado aprovado por órgão legitimado.
- **Regra vigente:** versão da política e data de validade, sem substituir estatuto.
- **Autorização:** vínculo/papel/escopo de quem executa.
- **Execução:** evento de curadoria, publicação, pagamento ou outro ato com competência.
- **Recibo:** identificador, versão da regra aplicada, data, autor institucional autorizado, resultado e referência ao histórico; preservar sigilo dos dados internos.

Os recibos não exigem blockchain nem DIDs. Registro versionado com autenticação, controle de autorização e trilha auditável serve como princípio inicial. A confiabilidade de um recibo depende tanto de governança e segurança quanto de seu hash.

### 1.6 Assembleia Digital versus Conselho Curador

**Não são a mesma autoridade.** Recomendação de desenho institucional, a ser deliberada quando houver entidade/estatuto:

| Dimensão | Assembleia | Conselho Curador / instância editorial |
|---|---|---|
| Objeto | Estratégia, regras, mandatos, orçamento e prestação de contas **nos limites da competência estatutária** | Elegibilidade de publicação, aplicação de critérios editoriais, denúncias e revisão de conteúdo |
| Quem tem autoridade | Membros aptos, identificados de acordo com estatuto e regras aplicáveis | Pessoas formalmente autorizadas, sujeitas a regras de impedimento e revisão |
| Registro | Convocação, pauta, quórum, habilitação, deliberação, decisão, ata, recurso | Pedido, regra/versão, decisão motivada, revisão, contestação, retirada/republicação |
| Transparência | Procedimento e resultados acessíveis; dados pessoais e votos protegidos conforme regras | Critérios e resultado público quando cabível; denúncias, pareceres e identidades restritas |
| Risco | Captura por maioria ocasional, participação digital desigual, falsificação de elegibilidade | Autocertificação, conflitos de interesse, censura e ausência de recurso |

O art. 48-A do Código Civil admite assembleias de pessoas jurídicas privadas por meio eletrônico, com direitos de participação e manifestação respeitados, **sem dispensar** estatuto, convocações, quórum e outras obrigações aplicáveis [S24]. Não é autorização automática para chamar qualquer votação no aplicativo de assembleia institucional válida.

**Protocolo mínimo recomendado para decisões institucionais:** pauta e minuta → janela de debate → verificação de elegibilidade e impedimentos → decisão segundo regra previamente aprovada → ata e resultado → publicação expurgada de dados restritos → prazo/canal de revisão. Começar com processo humano apoiado por software pronto, não codificando um sistema eleitoral.

## 2. PoWth, SourceCred, Coordinape e W3C PROV

### 2.1 O que fazem — e o que não resolvem

| Referência | Mecanismo | Valor para DigItap | Principal risco |
|---|---|---|---|
| **SourceCred** | Grafo de contribuições, nós e arestas, distribuição de `cred` por algoritmo inspirado em PageRank e possível distribuição de `Grain`; plugins GitHub/Discourse/Discord [S9] | Entender autoria, suporte, colaboração e conexão com evidências, além de pesos explicáveis | Popularidade/centralidade confundida com valor social; espiral de riqueza/reputação e incentivos para simular contribuições |
| **Coordinape** | Pequenos círculos de pares; cada membro aloca `GIVE` por época; proporções podem orientar um orçamento comum [S10–S11] | Capturar trabalho invisível e relatos de cooperação, incluir conhecimento de quem atuou junto | Coalizões, favoritismo, punição social, desigualdade de poder, trabalho invisível e recompensas automáticas |
| **W3C PROV** | Ontologia de `Agent`, `Activity`, `Entity`, geração, associação, derivação e atribuição [S12] | Interoperabilidade e cadeia de proveniência auditável sem definir pontuação | Provar origem ou atribuição **não prova verdade**, qualidade, consentimento ou benefício social |

**Estado de manutenção:** SourceCred é MIT/Apache-2.0, mas seu repositório principal não teve `push` desde 14/02/2023 nos metadados GitHub consultados; não o tratar como biblioteca de produção mantida. Coordinape tem repositório AGPLv3, mas a aplicação foi descontinuada após 2025. W3C PROV é padrão técnico, não produto de governança.

### 2.2 Como adaptar o aprendizado sem copiar o problema

A proposta segura é separar três planos:

1. **Plano factual (REL-01):** «A e B declaram que colaboraram na atividade X, em certa data, com referências Y»; quem declarou, quem confirmou, o que sustenta a afirmação e quais contestações existem.
2. **Plano contextual (interpretação):** uma consulta pode mostrar colaboração em determinada área, período e tipo de contribuição, incluindo fontes e lacunas. **Não existe uma qualidade universal ou totalização permanente da pessoa.**
3. **Plano distributivo (fundo):** a decisão sobre aplicar recursos exige política humana específica, orçamento disponível, legitimidade de quem delibera, critérios não discriminatórios, impedimentos, prestação de contas e recurso. Não deriva automaticamente de reputação.

Um grafo pode ajudar a navegar: **sujeito — participou de → atividade — produziu → realização — apoiada por → evidência — confirmada por → contraparte**. Cada aresta tem fonte, momento, escopo e situação. Isso é orientação conceitual, não esquema SQL aprovado.

O **PoWth não é uma nota pessoal**. Não calcular ranking público, não fazer uma «moeda da contribuição», não transferir autoridade para PageRank, não comprar visibilidade/verificação. Um vínculo frequente não deve valer automaticamente mais que trabalho de cuidado, trabalho rural ou atuação discreta.

### 2.3 Fundo Comunitário: mecanismo futuro seguro

Recomendo um **fundo orientado a projetos e entregas**, não um «salário algorítmico de reputação».

**Fluxo decisório proposto (não executado):**

1. Fonte de recursos, finalidade, restrições legais/contratuais e saldo disponibilizados em prestação de contas.
2. Assembleia/órgão competente aprova política: elegibilidade, tetos, conflitos, documentação e recursos.
3. Proponentes apresentam necessidades e plano verificável, não uma pontuação de mérito pessoal.
4. REL-01 oferece referências **facultativas e contestáveis** de experiência e cooperação, com dados minimizados e permissão adequada.
5. Instância habilitada delibera, declara conflitos e registra razões e dissensos; pessoas envolvidas não homologam benefício próprio.
6. Execução financeira somente por entidade/arranjo autorizado, com documentação fiscal/contábil e reconciliação; publicação de valores agregados ou nominativos apenas quando juridicamente apropriado.
7. Contestação, correção e auditoria independentes possíveis.

**Não fazer:** porcentagem automática do fundo por `cred`, `GIVE`, seguidores, número bruto de eventos ou volume de fotos. O dinheiro deve seguir decisão legitimada e regras, não o grafo.

**Experimento sem dinheiro:** simular um único período com projetos fictícios, critérios explícitos e participantes autorizados. Avaliar divergência entre pares, possibilidade de manipulação, acesso de pessoas menos conectadas e contestação. Esse é um teste de governança, não uma feature de produção.

## 3. Soberania digital e LGPD no Brasil

### 3.1 Experiências brasileiras com lastro documental

**Cooperativa EITA.** A cooperativa declara atuação em software livre, economia solidária e desenvolvimento participativo. Publica práticas de orçamento por **hora técnica**, Frentes de Trabalho, assembleias periódicas e fundos cooperativos; oferece suporte/capacitação para a plataforma RIOS e desenvolve o plugin Sementes para cestas agroecológicas [S13–S15]. Isso mostra que soberania de dados precisa de serviço, educação, manutenção e governança econômica — não apenas de código aberto. Não há parceria DigItap–EITA estabelecida.

**Instituto Nupef / Projeto Tiwa.** O Nupef documenta infraestrutura própria, AS e serviços IaaS voltados a organizações sociais, com OpenNebula/KVM e uma migração que decorreu de incidente real de infraestrutura. O relato inclui aproximadamente **um ano de transição** e planejamento de redundância futura [S16]. Lição: infraestrutura própria pode aprofundar autonomia, mas custa operação, especialização, prevenção de incidentes e resiliência. Não confundir Nupef com provedor contratado ou disponível para o DigItap.

**Iniciativa Nuvem Brasileira.** O governo federal descreve iniciativa coordenada com MGI, ABDI, Serpro e BNDES para fortalecer infraestrutura nacional [S21]. É referência de política pública — **não** é uma hospedagem pronta, contratável ou garantida para o DigItap.

**BNDES.** O BNDES oferece instrumentos de apoio a projetos e aceleração, não uma licença especial de LGPD nem uma solução automática de nuvem. O Garagem 2026 está com inscrições abertas até 30/11/2026 no site oficial, com módulo Criação para estágio inicial [S22]. Sua aprovação não deve ser pressuposta nem considerada receita recorrente.

### 3.2 Alternativas concretas de hospedagem

| Arranjo | Soberania/residência | Carga operacional | Risco principal | Recomendação |
|---|---|---|---|---|
| **Supabase Cloud na região atual** | A confirmar: repositório informa implantação Cloud, região local não verificada | Menor, gerenciada | Localização, subprocessadores, cláusulas internacionais, dependência de fornecedor | **Manter até existir motivo e teste para mover** |
| **Supabase Cloud `sa-east-1` São Paulo** | Dados primários na região AWS São Paulo; não elimina fornecedores/transferências transfronteiriças secundárias | Menor, gerenciada | Migração de projeto, downtime, backups e autenticação | **Primeira opção a estudar** se residência no Brasil for requisito relevante |
| **Supabase self-hosted em VPS nacional** | Controle de escolha do datacenter/provedor e configuração | **Alta**: OS, rede, HTTPS, Auth, banco, Storage, backups, PITR, observabilidade, upgrades | Falha de backup/restore, indisponibilidade, invasão e ponto único | **Não no P0**; só após capacidade operacional e plano de migração testados |
| **PostgreSQL + serviços selecionados em provedor nacional** | Maior autonomia de componentes; fragmentação de serviços | Média a alta | Reimplementar Auth/RLS/Storage e integrações existentes | Alternativa de longo prazo, com prova de custo/portabilidade |
| **Nuvem comunitária/cooperativa institucional** | Potencialmente forte soberania contratual e organizacional | Depende de operador, SLA e contrato | Confiabilidade e continuidade contratual | Pesquisa de mercado, não contratação antecipada |

A documentação oficial do Supabase confirma região São Paulo e que a **localização dos dados primários não é certificado de compliance** [S17]. O self-hosted usa Docker, requer administração e recursos de servidor (guia: mínimo de 4 GB RAM, 2 núcleos, 40 GB SSD para stack completa; recomendação maior), e não inclui serviços gerenciados como backup/PITR da oferta Cloud [S18]. O ambiente de desenvolvimento da CLI não pode ser exposto como produção.

**Soberania tem quatro dimensões distintas:** (i) onde dados ficam; (ii) quem tem autorização técnica/jurídica; (iii) quem controla regras e acesso; (iv) capacidade de exportar e migrar. Um servidor localizado no Brasil pode falhar nas dimensões (ii)–(iv); um serviço internacional pode atender parcialmente a algumas delas.

### 3.3 LGPD sem imobilizar o projeto

Não existe exceção geral à LGPD por ser gratuito, open source ou cooperativo.

A ANPD disponibiliza **guia, checklist e modelo de registro das operações** para agentes de pequeno porte [S19]. Sua Resolução CD/ANPD 2/2022 prevê simplificações para organizações elegíveis, inclusive certas entidades sem fins lucrativos, mas não dispensa segurança, direitos dos titulares e análise de riscos. A dispensa condicional de encarregado exige canal de titulares [S20]. É necessário verificar critérios de enquadramento.

O regulamento de transferência internacional, Resolução 19/2024, exige hipótese legal para tratamento **e** mecanismo adequado para transferência internacional quando aplicável; cláusulas-padrão e transparência fazem parte da análise [S23]. O fato de dados primários estarem em São Paulo não prova ausência de subprocessadores estrangeiros. O incidente que possa acarretar risco ou dano relevante deve ser tratado segundo a regulamentação de comunicação, sem presumir que todo incidente exige divulgação indiscriminada [S25].

**Pacote operacional mínimo recomendado antes de ampliar dados reais:**

- Inventário por finalidade: conta, sujeitos, representação, atividades, provas, terceiros; base legal e papéis controlador/operador para cada operação.
- Política de privacidade que corresponda ao funcionamento, canal de titulares e prazos de retenção/revisão.
- Permissões por escopo e RLS verificadas no ambiente real; arquivos privados por padrão; histórico de revogação.
- Backup, restauração testada, política de incidentes e acesso operacional protegido por MFA.
- Cláusulas com fornecedores, mapeamento de subprocessadores e transferências, destino/retorno de dados.
- Separação entre transparência **de decisões e processos** e confidencialidade **das pessoas**; consentimento para divulgação não é automaticamente a base legal de todo tratamento.
- Regime especial para menores e dados sensíveis, evitando armazenamento desnecessário de imagens, documentos civis, informações políticas ou de saúde.

Essas são medidas de engenharia e governança; a adequação jurídica concreta exige avaliação competente, especialmente antes de receber dados sensíveis ou criar processos de deliberação vinculantes.

## 4. Sustentabilidade financeira — modelos verificados

### 4.1 Comparação empírica

| Organização | Receita/sustentação documentada | O que DigItap aproveita | Limite da analogia |
|---|---|---|---|
| **Loomio** | Cooperativa worker-owned; **assinatura por organização**, descontos sem fins lucrativos, serviço de instância privada, integrações, suporte [S4–S5] | Quem paga pode ser a organização com orçamento; beneficiários não pagam por voto ou participação | Assinatura é serviço prestado, não prova de que haverá disposição de pagar localmente |
| **Decidim** | Associação de manutenção, contribuições pelo OpenCollective, serviços e parceiros que destinam **3% nos contratos empresariais e 1,5% nos de organizações sem fins lucrativos** à manutenção do comum [S1–S3] | Contribuição contratual ao fundo de manutenção de código e comunidade, **quando houver contratos legítimos** | Não presumir adesão de fornecedores; percentuais são regras Decidim, não obrigação do DigItap |
| **Citizen OS** | Plataforma gratuita financiada por doações filantrópicas privadas, fundos da UE e grants [S6] | O bem público digital pode receber financiamento institucional | **Não** resolve dependência de editais/doações; não é nossa principal estratégia de caixa |
| **Open Food Network** | Federação de afiliadas, software AGPL; exemplos reais de preço proporcional à atividade com faixas gratuitas (Reino Unido, Austrália, Canadá); consultoria, fundos e filantropia continuam relevantes [S26–S28] | Subsídio cruzado, preço progressivo, cobrança conforme capacidade e remuneração por suporte | Modelos diferem por país; cobrar percentual da circulação do território pode gerar extração e fricção |
| **Cooperativa EITA** | Desenvolvimento participativo por contratos/orçamentos, hora técnica e suporte; organização do trabalho por equipes e fundos internos [S14–S15] | Modelo de serviço profissional com custo calculável e governança de trabalhadores | Requer equipe, capacidade operacional, contratos e entidade adequadas |
| **Banco Palmas / E-Dinheiro** | Instituição territorial com infraestrutura regulada de contas pré-pagas, rede de bancos comunitários, serviços financeiros e articulação com políticas municipais [S29] | Foco na circulação local e na construção de rede institucional | **Não** copiar moeda, pagamentos ou operação financeira; regime regulatório e organização são distintos |

**Importante:** o OFN Australiano afirma explicitamente que a tarifa de software **não cobre sozinha** toda sua operação e que consultoria, grants e filantropia complementam receitas [S27]. O exemplo não demonstra «independência total de doações»; demonstra **combinação consciente de receitas**.

### 4.2 Modelo recomendado para o DigItap

**A. Gratuito no acesso cívico essencial.** Cadastro básico, registros autorizados, visibilidade pública não promocional, exercício de direitos e contestação não devem ter pedágio. Evitar cobrar pela «nota» de confiança, por aprovação editorial ou por direito de participar.

**B. Serviço institucional opcional e contratado.** Uma organização que tenha orçamento e tarefa comprovada pode pagar por implantação assistida, capacitação, suporte, migração/exportação, relatórios estruturados e administração de ambiente privado. Isso não cria acesso preferencial às decisões e não substitui autorização de pessoas cujos dados participam dos projetos.

**C. Apoio cruzado por capacidade.** Entidades com mais recursos ajudam a cobrir infraestrutura comum via preço transparente ou patrocínio não interferente; coletivos de baixa renda mantêm acesso suficiente. Critérios e subsídios devem ser publicados quando houver modelo de precificação real.

**D. Contratos públicos (B2G) como canal eventual, não base inicial.** Organizações públicas podem contratar serviços de governo digital, mas compras públicas exigem processo, competitividade, garantias e avaliação jurídica. Referências: Lei 14.133/2021 e instrumentos de inovação, inclusive CPSI na LC 182/2021 [S30]. Contrato público não concede legitimidade democrática ao aplicativo nem transfere propriedade de dados dos titulares.

**E. Editais/fundos como capital de desenvolvimento, não substitutos de mercado.** O BNDES Conexões descreve recursos não reembolsáveis; cada chamada tem escopo e elegibilidade. Não registrar «recurso captado» sem aprovação e instrumento firmado [S31].

### 4.3 Receita, custos e risco de captura

Antes de inventar preços, medir **custo de serviço por entidade**: infraestrutura atribuível + suporte + capacitação + processamento/armazenamento + segurança/backup + desenvolvimento/manutenção + tributação/contabilidade + contingência. Estimar tempo real gasto em piloto acompanhado, em vez de prometer «SaaS por R$ X».

**Risco de captura:** se financiador, patrocinador ou prefeitura puder determinar quem é reconhecido como confiável, o modelo econômico contradiz o Norte. Separar contrato comercial e ato editorial; documentar recusas, conflitos e revisão independente. Não vender listas pessoais, perfis de confiança, prioridade de verificação ou publicidade comportamental.

**Indicadores necessários:** custo por atendimento, tempo para registrar uma realização, proporção de registros autorizados e úteis, capacidade de exportar, taxas de atendimento de solicitações, reincidência de uso, horas de suporte e disposição real de pagar por um serviço específico. Não converter número de cadastros em tração demonstrada.

## 5. Matriz de reutilização: forkar, integrar ou aprender

| Projeto / padrão | Copiar ou forkar? | Arquitetura/processo a aprender | Escolha agora |
|---|---|---|---|
| Decidim | **Fork legalmente possível sob AGPLv3**, mas custo arquitetural muito alto no Next.js; melhor serviço separado quando necessário | Contrato social, processos, assembleias, rastreabilidade, contribuição à manutenção | **Aprender; não forkar** |
| Loomio | **Self-host/instância** sob AGPLv3; não extrair código isolado para núcleo Next.js sem análise | Debate, decisão assíncrona, registro de dissenso e exportação | **Candidato para governança futura** |
| Citizen OS API | Reutilização técnica possível sob Apache-2.0, após revisão; **frontend sem licença identificada** na inspeção | Argumentação estruturada e direitos de votação | **Aprender/testar serviço; não forkar frontend** |
| ICN | **Licença heterogênea**: verificar crate exato, dependências e compatibilidade | Política/autoridade/receipt, fronteira institucional e federação | **Aprender, sem dependência** |
| SourceCred | Dual MIT/Apache permite estudo/fork conforme licença; manutenção recente não comprovada | Grafo de proveniência e interpretações | **Não usar algoritmo de ranking** |
| Coordinape | AGPLv3, mas aplicação encerrada; fork teria custo operacional/risco alto | Reconhecimento entre pares e captura por círculo | **Aprender limites, não adotar** |
| W3C PROV | **Padrão, não software** | Vocabulário de agentes, atividades, entidades e derivações | **Referência conceitual do REL-01** |
| Supabase Cloud São Paulo | **Serviço gerenciado**, não fork | Residência primária dos dados e custo de migração | **Estudar região e contrato; sem migração agora** |
| Supabase self-hosted | Componentes abertos de uso próprio, condicionados às respectivas licenças | Autonomia, backup/restore, operação de banco e Storage | **Plano de contingência futuro** |
| EITA / RIOS / Sementes | Verificar licença de cada repositório antes de uso específico | Cooperativa de serviços, formação, economia solidária, privacidade | **Aprender, sem assumir parceria** |
| Nupef / Tiwa | Sem evidência de licença única de toda a operação; OpenNebula é projeto separado | Soberania operada, resiliência, capacidade institucional | **Aprender, sem contrato presumido** |
| Open Food Network | AGPLv3, mas comércio alimentar não é módulo do DigItap | Rede de afiliadas, subsídio cruzado e mercado territorial | **Aprender; não duplicar marketplace** |
| Banco Palmas / E-Dinheiro | Não identificado como stack open source reutilizável | Finanças comunitárias e regulação | **Aprender; não operar pagamentos** |

**Princípio jurídico:** um software estar no GitHub não basta. Verificar licenças do *código copiado*, dependências e obrigações de distribuição e prestação de serviço em rede. Não presumir que «AGPL do projeto DigItap» esteja totalmente regularizada apenas porque uma página de termos a declara.

## 6. Recomendação de execução com pé no chão

### Portão 0 — Resolver P0 e o Git

Finalizar saneamento e testes locais, reconciliar documentação, isolar REL-01 RED. Não introduzir nova stack, VPS ou módulo de assembleia. O relatório atual não comprova Cloud validada ou autorização de deploy.

### Portão 1 — Governança humana mínima, sem software novo

**Somente com participantes legitimamente envolvidos e autorização do proponente:** usar ferramentas já conhecidas para pauta, registro de argumentos, decisões e atas; publicar apenas o que puder ser público. Definir texto de competência e impedimentos em minuta, a ser deliberada pela futura entidade. **Nenhum «Conselho Curador» vira órgão oficial por ser nomeado no sistema.** Caso uma ferramenta pronta seja necessária, comparar Loomio e Citizen OS em demonstração com dados fictícios.

**Aceite:** quem participou consegue reconstruir a decisão, identificar regra vigente, contestar irregularidade e entender os limites de publicidade.

### Portão 2 — Teste real da utilidade do núcleo

Validar o percurso cadastro → projeto → atividade → registro → referência de evidência → publicação autorizada → portfólio, com consentimento e segurança. Medir barreiras reais. Sem parceiros presumidos ou «pilotos confirmados».

**Aceite:** pessoa consegue realizar tarefa útil sem exposição indevida; falhas documentadas com evidência.

### Portão 3 — Descoberta de serviço pagável

Entrevistar responsáveis por organizações **sem vender antes da hora**; identificar qual tarefa trabalhosa justificaria suporte/implantação/treinamento. Orçar hora técnica, custos de suporte e capacidade de pagar; testar uma oferta voluntária depois de estar juridicamente apto a contratar.

**Aceite:** disposição de pagar observável, custos estimáveis e política de acesso gratuito preservada. Não declarar receita até haver contrato e recebimento.

### Portão 4 — PoWth e Fundo Comunitário

Somente após REL-01 e governança competente estarem validados: testar proveniência, confirmação de contraparte, contestação e eventual simulação de alocação **com recursos fictícios**. Só depois discutir fundo verdadeiro, natureza jurídica, escrituração e poderes de decisão.

**Aceite:** nenhum algoritmo atribui nota social universal ou direito automático a dinheiro; autoridades e recursos são rastreáveis e revisáveis.

### Portão 5 — Soberania de infraestrutura progressiva

Confirmar região Cloud, acordos, exportabilidade e backup/restauração. Comparar custo real de migração para `sa-east-1` e de self-hosting. Migrar **somente** por requisito, teste de restauração, capacidade operacional e autorização humana expressa.

**Aceite:** há plano de reversão, backup restaurado e controles de acesso verificados em ambiente isolado; nenhuma perda de dados nem exposição de segredos.

## 7. Decisões propostas, não aprovadas

1. **Adotar:** governança por decisões e recibos verificáveis, sem blockchain obrigatória.
2. **Adotar:** PoWth como histórico contextual, sem score público, crédito social ou distribuição automática de dinheiro.
3. **Priorizar:** renda por serviço institucional e capacitação, acesso básico gratuito e subsídio cruzado com transparência.
4. **Estudar:** Loomio/Citizen OS como processo pronto; Decidim como referência institucional e eventual plataforma isolada em outra escala.
5. **Estudar antes de migrar:** Supabase Cloud São Paulo; não escolher VPS apenas por retórica de soberania.
6. **Não adotar agora:** fork de ICN, SourceCred, Coordinape, Open Food Network; integração financeira; fundo real; marketplace; votação estatutária própria.

Nenhuma dessas propostas altera o Norte aprovado, a governança de A Praça, os poderes do proponente ou seu repositório.

## 8. Fontes primárias verificadas

### Governança e licenças

- **[S1]** Decidim, repositório/README, licença e financiamento: https://github.com/decidim/decidim
- **[S2]** Decidim, contrato social: https://docs.decidim.org/en/develop/understand/social-contract
- **[S3]** Decidim Association, história e governança: https://decidim.org/about
- **[S4]** Loomio, repositório/AGPL e self-hosting: https://github.com/loomio/loomio ; https://github.com/loomio/loomio/blob/master/deploy/README.md
- **[S5]** Loomio, cooperativa e cobrança: https://www.loomio.com/about/ ; https://www.loomio.com/docs/en/policy/subscriptions/pricing ; https://www.loomio.com/pricing/
- **[S6]** Citizen OS, serviço e repositórios: https://www.citizenos.com/platform/ ; https://github.com/citizenos/citizenos-api ; https://github.com/citizenos/citizenos-fe ; https://github.com/citizenos/citizenos-api/blob/master/LICENSE.txt
- **[S7]** ICN, repositório e licenciamento: https://github.com/InterCooperative-Network/icn ; https://github.com/InterCooperative-Network/icn/blob/main/LICENSING.md
- **[S8]** ICN, arquitetura e limitações: https://intercooperative.network/architecture/ ; https://github.com/InterCooperative-Network/icn/blob/main/docs/architecture/ICN_OPERATING_MODEL.md

### Contribuição, proveniência e atribuição

- **[S9]** SourceCred, repositório, licença e pesquisa do algoritmo: https://github.com/sourcecred/sourcecred ; https://github.com/sourcecred/research/blob/master/algorithm.md ; https://sourcecred.io/docs/beta/plugins/github/
- **[S10]** Coordinape, Circle/GIVE e epoch: https://docs.coordinape.com/get-started/circles ; https://docs.coordinape.com/get-started/give ; https://github.com/coordinape/coordinape
- **[S11]** Coordinape, encerramento: https://coordinape.com/
- **[S12]** W3C PROV-O, recomendação técnica: https://www.w3.org/TR/prov-o/

### Brasil, infraestrutura e LGPD

- **[S13]** EITA, princípios: https://eita.coop.br/nossas-bases/
- **[S14]** EITA, práticas de serviço, orçamentação e fundos: https://eita.coop.br/nossas-praticas/
- **[S15]** EITA, ferramentas RIOS/Sementes: https://eita.coop.br/
- **[S16]** Nupef, AS, OpenNebula e Tiwa: https://nupef.org.br/2026/06/10/nupef-compartilha-sua-experiencia-em-infraestrutura-resiliente-e-autonomia-digital-no-2o-encontro-nacional-pela-soberania-digital/ ; https://nupef.org.br/2026/06/18/instituto-nupef-de-uma-crise-de-infraestrutura-a-resiliencia-de-uma-nuvem-soberana/
- **[S17]** Supabase, regiões e residência de dados: https://supabase.com/docs/guides/platform/regions
- **[S18]** Supabase, diferenças self-hosted e requisitos Docker: https://supabase.com/docs/guides/self-hosting ; https://supabase.com/docs/guides/self-hosting/docker
- **[S19]** ANPD, guia/checklist/modelo de inventário: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte
- **[S20]** ANPD, Resolução 2/2022: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
- **[S21]** MGI/ABDI/Serpro/BNDES, Nuvem Brasileira: https://www.gov.br/governodigital/pt-br/infraestrutura-nacional-de-dados/ambiente-tecnologico/nuvem/nuvem-brasileira/nuvem-brasileira
- **[S22]** BNDES Garagem 2026: https://garagem.bndes.gov.br/inscreva-se/
- **[S23]** ANPD, Resolução 19/2024, transferência internacional: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024
- **[S24]** Código Civil, art. 48-A, assembleias eletrônicas: https://www2.camara.leg.br/legin/fed/lei/2002/lei-10406-10-janeiro-2002-432893-normaatualizada-pl.html
- **[S25]** ANPD, Resolução 15/2024, incidentes: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca

### Modelos econômicos

- **[S26]** OFN, rede de afiliadas, governança e código AGPL: https://openfoodfoundation.org/about-us/ ; https://github.com/openfoodfoundation/openfoodnetwork
- **[S27]** OFN Austrália, preços e subsídio por consultoria/grants: https://about.openfoodnetwork.org.au/software-pricing/
- **[S28]** OFN Reino Unido e Canadá, faixas progressivas: https://about.openfoodnetwork.org.uk/pricing/ ; https://openfoodnetwork.ca/sell?locale=en_CA
- **[S29]** Banco Palmas/E-Dinheiro, operação institucional e serviços: https://edinheirobrasil.org/sobre-nos/ ; https://edinheiro.org/
- **[S30]** MDIC, instrumentos de compras públicas para inovação: https://www.gov.br/mdic/pt-br/acesso-a-informacao/perguntas-frequentes-faq/secretaria-de-desenvolvimento-industrial-inovacao-comercio-e-servicos/quais-as-principais-referencias-legais
- **[S31]** BNDES, instrumentos não reembolsáveis: https://conexoes.bndes.gov.br/sobre/

**Ressalvas de interpretação:** não foram auditadas implantações externas, contas, contratos internos, métricas de rentabilidade ou conformidade jurídica de terceiros. As páginas comerciais são evidência dos *modelos declarados*, não prova independente de balanço ou lucro. Para Citizen OS frontend, não foi localizada licença explícita no diretório raiz. Para ICN, a própria documentação mantém questões de licenciamento em aberto. Fonte de estado do DigItap local: exclusivamente relatórios fornecidos pelo proponente; nenhuma alteração de Git, Cloud ou instituição foi executada nesta investigação.
