# DigItap — Rastreabilidade das conversas e proposta de reconciliação

**Data:** 15/11/2026. **Autor desta matriz:** assistente Codex, por autorização
humana para incorporação documental local. **Status:** análise para revisão,
sem aprovação de roadmap, alteração canônica ou autorização de implementação.
Este arquivo é uma ponte entre fontes, não outro documento-mestre.

## 1. Fontes, alcance e autoridade

- **S1, principal:** [Reconstrução do produto e decisões](DIGITAP-RECONSTRUCAO-PRODUTO-E-DECISOES-2026-11-15.md).
- **S2, complementar:** [Decisões da conversa](DIGITAP-DECISOES-CONVERSA-2026-11-15.md).
- **S3, complementar:** [Reconciliação ampliada do onboarding](DIGITAP-RECONCILIACAO-AMPLIADA-ONBOARDING-2026-11-15.md).
- **C0:** mensagens diretamente disponíveis na sessão de trabalho: autorização
  de Kimi/Gateway, função de interpretação, execução dos scripts de navegação e
  Meu espaço, interface autenticada e a presente incorporação documental.
  C0 não tem exportação integral incorporada; é evidência conversacional local,
  não fonte primária versionada. Não inventar linha, URL ou transcrição ausente.
- **L0:** leitura da árvore local nesta tarefa: branch `main`, HEAD
  `8a5d1199f4cc26906cd9ff30e75e625578e33cf9`, com incrementos não commitados.
  Existência de arquivo comprova código local, não operação ou publicação.

Hashes, datas e procedência de S1–S3 ficam no [índice](README.md). Cópias integrais
não autenticam os enunciados atribuídos. S1 organiza a análise; não tem autoridade
superior às mensagens humanas explícitas ou ao [Marco Zero](../Marco_Zero_2026-11-03.md),
§10. Não fundir as convenções distintas dos relatórios em uma aprovação geral.

**Classes utilizadas:**

- **H-DIR:** decisão/autorização humana diretamente recuperável em C0, com alcance
  limitado à tarefa expressa; não equivale a decisão coletiva/institucional.
- **H-ATR:** direção atribuída ao humano em S1–S3, sem cotejo independente com a
  íntegra original nesta tarefa. Ratificação pendente quando exceder C0.
- **PERG:** pergunta ou hipótese do proponente, não contrato aprovado.
- **PROP:** proposta do assistente, inclusive critérios de aceite sugeridos.
- **HIST:** antecedente histórico atribuído, vigência não confirmada.
- **CAN:** direção registrada no documento canônico indicado, com suas ressalvas.
- **LOCAL:** comportamento encontrado no código local; não comprova execução.
- **RELATO:** teste/operação reportado na conversa ou fonte; não reexecutado aqui.

As referências § e IDs abaixo são internas às fontes copiadas. Referências à
Library, Célula Zero, anexos não incorporados e mensagens anteriores são
**atribuídas às fontes**: não foram acessadas ou verificadas independentemente.

## 2. Matriz de descobertas → contratos existentes

| ID / tema | Descoberta e classificação | Fonte delimitada | Referência canônica / evidência local | Lacuna, conflito ou decisão necessária |
| --- | --- | --- | --- | --- |
| R01 — IA: direção de experiência | H-ATR: reduzir formulários pela interpretação de linguagem natural; H-DIR: interpretar propostas com revisão humana, sem mutações automáticas. | S1 §2/Eixo A; S2 DEC-CONV-01; S3 HUM-02; C0, pedido da função e da interface. | [Norte](../digitap/00-norte-do-produto.md), §3–5; [Modelo](../digitap/01-modelo-de-dominio.md), §7–8. | Direção assistida não aprova criação automática de identidade, vínculos ou publicações. Persistência depende de outro contrato. |
| R02 — Kimi/Gateway | H-DIR: exclusivamente Kimi via Vercel AI Gateway, modelo inicial `moonshotai/kimi-k2.5`, servidor e mocks sem créditos neste incremento. | C0, “Decisão do proponente”; S1 Eixo A; S2 DEC-CONV-03/04; S3 HUM-04. | [Arquitetura](../05-arquitetura-e-dependencias.md), método de reutilização; [função local](../../src/lib/proposals/interpret.server.ts). | Bedrock restrito e ZDR solicitado são política da implementação local, não comprovação de privacidade, região, elegibilidade ou custo real. |
| R03 — Assistente, chatbot ou híbrido | PERG: forma de interação não fechada; PROP: distinguir descoberta e assistência transacional. | S1 Eixo A e Q-01. | [Escopo](../02-escopo-e-mvp.md); [Horizonte](../digitap/02-horizonte-estrategico.md), limites. | Não transformar a pergunta em arquitetura multi-turno, memória, agentes ou ferramentas aprovadas. |
| R04 — Autonomia operacional | H-ATR: atender sem fundador conectado; PROP: fila persistente e worker idempotente. | S2 DEC-CONV-02 e §4/8; S3 HUM-03; S1 Eixo A. | [Marco Zero](../Marco_Zero_2026-11-03.md), protagonismo humano e método; [Arquitetura](../05-arquitetura-e-dependencias.md). | Não há fila/autonomia durável demonstrada. Disponibilidade desejada não aprova infraestrutura. |
| R05 — Interpretação disponível localmente | LOCAL: função e prévia autenticada, sete categorias, trechos, revisão e limites por processo. RELATO: último incremento informou 41 testes novos e 787 totais PASS. | L0; C0, relatório da interface; S1 §5 e S2 §5 descrevem fotografia anterior sem UI. | [Função](../../src/lib/proposals/interpret.server.ts), [rota](../../src/app/api/propostas/interpretar/route.ts), [página](../../src/app/meu-espaco/ideia/page.tsx), [README técnico](../../src/lib/proposals/README.md). | Código não commitado; testes com mocks. Nenhum teste repetido, inferência paga ou Cloud validado nesta tarefa. S1–S3 não são reescritos para atualizar números. |
| R06 — Cadastro pessoal | H-DIR: PF como entrada principal, organização alternativa; LOCAL: `/cadastro` usa formulário PF e mantém `/cadastro/organizacao`. | C0, ONB-01 e scripts autorizados; S1 Eixo B; S3 §3.1. | [Modelo](../digitap/01-modelo-de-dominio.md), §2–3; [cadastro](../../src/app/cadastro/page.tsx). | Entrada PF não implica obrigar identidade publicadora PF após qualquer login; coletivo autônomo segue não comprovado. |
| R07 — Login e home | LOCAL: login por senha retorna `/` após validação de identidade/conta. A execução do script foi autorizada em C0; formulação universal futura continua a deliberar. | S3 ONB-01/03/12; C0, patch RED e GREEN. | [Fluxo](../../src/lib/auth/flow.server.ts); [testes de navegação](../../tests/auth/navigation-contract.test.ts); [Modelo](../digitap/01-modelo-de-dominio.md), §2. | Não voltar silenciosamente ao contrato antigo de login → dashboard/conclusão PF. Navegação não concede papel nem substitui autorização. |
| R08 — OAuth e conclusão independente | LOCAL: retorno OAuth `/`, sem consulta PF para decidir destino; conclusão PF usa sessão e estado diretamente. | S3 ONB-02/06–09; C0, workspace increment. | [OAuth](../../src/lib/auth/oauth.server.ts), [conclusão PF](../../src/app/cadastro/pessoa-fisica/completar/page.tsx), [testes](../../tests/components/profile-completion-regression.test.tsx). | Não comprova OAuth Google efetivamente configurado/funcional no site; perfil existente não deve ser recriado. |
| R09 — Meu espaço | LOCAL: conta confirmada sem perfil escolhe PF/organização; perfis existentes seguem à área autorizada; entrada de ideia também está na navegação autenticada. | S3 ONB-04/05/08/11; S1 Eixo B; L0. | [Meu espaço](../../src/app/meu-espaco/page.tsx), [Viewer](../../src/components/Viewer.server.ts), [header](../../src/components/AppHeader.tsx); [Modelo](../digitap/01-modelo-de-dominio.md), §3–4. | Múltiplos sujeitos sob uma conta e troca de contexto não estão decididos. Não converter conta organizacional em PF. |
| R10 — E-mails e confirmação | H-ATR: jornada completa deve funcionar; LOCAL: intenção de confirmação/recuperação com origem controlada; RELATO: operação Cloud tem pendências. | S1 Eixo B/Q-06; S2 §5–6; S3 §3.1/5. | [Gateway](../../src/lib/auth/gateway.server.ts), [templates](../../supabase/templates/confirmation.html), [recuperação](../../supabase/templates/recovery.html); [privacidade](../06-privacidade-e-dados.md); README raiz. | README informa Resend, não prova SMTP ou entrega. Nenhuma configuração/e-mail foi consultado nesta tarefa. Recebimento, expiração, reenvio e segundo login exigem evidência própria. |
| R11 — Canal de e-mail para propostas | PERG: Resend/entrada de propostas; PROP: webhook, anexos e processamento assíncrono. | S2 HIP-CONV-04 e §4/8; S1 Q-06. | [Arquitetura](../05-arquitetura-e-dependencias.md); [privacidade](../06-privacidade-e-dados.md). | Não há inbound integrado comprovado. Canal, assinatura, retenção, idempotência e autorização permanecem abertos. |
| R12 — Praça/feed | PERG/HIST: praça comum e vitrines; LOCAL: home lista atividades públicas. | S1 Eixo C, antecedente atribuído à Library ~2309; S1 Q-02/§5. | [Norte](../digitap/00-norte-do-produto.md), §1–2; [home](../../src/app/page.tsx); [consulta pública](../../src/lib/queries/public.server.ts). | Classe `home-feed` não é contrato de feed geral. Itens, ordenação, personalização, moderação e visibilidade dependem de decisão. |
| R13 — Espaços e vitrines | HIST: resposta do assistente “Camada Única, Múltiplas Vitrines”; PROP: vistas de um comum sem silos. | S1 Eixo C e referências históricas §6. | [Modelo](../digitap/01-modelo-de-dominio.md), §3–5/9; [perfil público](../../src/lib/queries/profiles.server.ts). | Fonte original da Library não incorporada. Vitrine não torna dados privados públicos nem transfere titularidade. |
| R14 — Projetos | CAN/LOCAL: agrupamento com sujeito, colaboração e condições de coordenação; PROP: necessidades e entregas ampliadas. | S1 Eixo C; S2 §4/5; S3 §3.3. | [Modelo](../digitap/01-modelo-de-dominio.md), §5; [projetos](../../src/lib/queries/projects.server.ts); [colaboração](../../src/lib/queries/collaboration.server.ts). | Não confundir produto tecnológico, proposta e projeto; ampliar entidades exige contrato e autorização próprios. |
| R15 — Atividades e realização | CAN/LOCAL: atividade proposta, estados editoriais, realização e evidências distintos. | S1 Eixos C/D; S3 §3.3. | [Modelo](../digitap/01-modelo-de-dominio.md), §5–8; [domínio](../../src/lib/activities/domain.ts). | Ideia interpretada não vira atividade nem evento realizado; importação histórica não é percurso demonstrado. |
| R16 — Capacidades | PERG/PROP: capacidade declarada com escopo, disponibilidade, território e visibilidade; LOCAL: categoria na interpretação. | S2 HIP-CONV-03 e §4/6; S1 Eixo C. | [Marco Zero](../Marco_Zero_2026-11-03.md), §1/4; [Modelo](../digitap/01-modelo-de-dominio.md); [função](../../src/lib/proposals/interpret.server.ts). | Não há cadastro persistente de capacidades demonstrado pela extração JSON. Não inferir certificação, disponibilidade, consentimento ou reputação. |
| R17 — Necessidades/oportunidades | PROP: distinguir demanda de atividade/projeto. | S1 Eixo C e §3/4–7. | [Horizonte](../digitap/02-horizonte-estrategico.md), problema universal; [Escopo](../02-escopo-e-mvp.md). | Contrato, estados, acesso e manutenção não aprovados; não afirmar demanda validada. |
| R18 — Matching/encontros | PERG: desejo de espaço de matching; PROP: experimento explicável por filtros. | S1 Eixo C, Q-03, §3/7; inspiração Célula Zero atribuída. | [Marco Zero](../Marco_Zero_2026-11-03.md), encontrar pessoas/capacidades; [Norte](../digitap/00-norte-do-produto.md). | Algoritmo, ranking, notificações, reciprocidade, consentimento e efeitos não decididos. Sem contrato dedicado comprovado nesta inspeção documental. |
| R19 — Reivindicação | PERG: pré-cadastrar ficha e alguém reivindicar; PROP: análise, disputa e vínculo versionado. | S2 HIP-CONV-01/02 e §4/7; S1 Q-04/§5; S3 §3.3. | [Modelo](../digitap/01-modelo-de-dominio.md), §3–4; [Governança](../04-governanca.md). | Autenticação ou declaração de fundador não comprova mandato/propriedade. Tipos reivindicáveis e instância decisora abertos. |
| R20 — PoWth e confiança | CAN: direção contextual, sem pontuação universal ou privilégios compráveis; PROP: ciclo contribuição → evidência → confiança contextual. | S1 Eixo D/Q-07; S2 restrições §4. | [Norte](../digitap/00-norte-do-produto.md), §2/5; [Modelo](../digitap/01-modelo-de-dominio.md), §7–10; [REL-01](../../specs/REL-01-registro-relacoes.md). | Motor completo futuro. IA, apoio, participantes e portfólio não certificam fatos nem legitimidade; competência verificadora permanece aberta. |
| R21 — A Praça/DigItap e propriedade | CAN: A Praça iniciativa independente; separação Comum/empresa é hipótese. PERG: exemplo de fundador e produto. | S2 HIP-CONV-02; S1 Q-05; S3 §3.3. | [Horizonte](../digitap/02-horizonte-estrategico.md), A Praça e DigItap; [Governança](../04-governanca.md); [Governança provisória](../GOVERNANCA-PROVISORIA.md). | Não ratificar arranjo A + D coletivamente, instituição constituída, propriedade intelectual ou titular fundador verificado. |
| R22 — Dogfooding e sequência | H-ATR: preferir teste humano no site com vários percursos; H-DIR: manter testes locais e autorizações específicas durante implementação. | S2 DEC-CONV-05/06 e P4; S3 HUM-01/05 e ONB-14; S1 Q-08; C0. | [Progresso](../07-criterios-de-progresso.md), VH-01–VH-03; [Escopo](../02-escopo-e-mvp.md); [Arquitetura](../05-arquitetura-e-dependencias.md). | Tensão I5/I6+ não resolvida por contagem de testes. Reordenação geral exige ratificação explícita de alcance, etapas e limites. |
| R23 — Persistência e revisão | PROP: caixa privada, versões, continuidade e usuário aprovar o que salva. | S2 §4/3–5; S1 Eixo A e §3. | [Modelo](../digitap/01-modelo-de-dominio.md), §7–8; [privacidade](../06-privacidade-e-dados.md). | Prévia local não tem editor/persistência. Não tratar leitura humana como consentimento para criar registros, nem interpretar autorização de UI como autorização de schema. |
| R24 — Reutilização e antecedentes | CAN: ADOPT → MAP → COMPOSE → EXTEND → BUILD; HIST/PROP: exemplos da Célula Zero. | S1 §6; S2 §5/7; S3 referências. | [Marco Zero](../Marco_Zero_2026-11-03.md), §2/8/10; [Arquitetura](../05-arquitetura-e-dependencias.md); [INV-OSS-01](INV-OSS-01-reutilizacao-digitap.md) e [INV-ECO-01](INV-ECO-01-governanca-sustentabilidade-digitap.md). | Referência de pesquisa não impõe transplante, dependência, worker ou schema. Fontes externas não revalidadas nesta tarefa. |

## 3. Conflitos e tratamento proposto — sem resolução implícita

- **C01, I5/I6+ (R01–05/R22):** arquitetura de 13/11, escopo e critérios
  condicionam IA/rede à deliberação posterior a I5. C0 contém autorizações humanas
  específicas posteriores para interpretação e sua interface com mocks. Pela
  hierarquia do Marco Zero, essas autorizações regem apenas seus incrementos;
  não concluir aprovação de IA autônoma, persistência, matching ou dispensa de I5.
  Proposta: registrar a exceção limitada e solicitar decisão expressa sobre a
  sequência geral. Não registrar VH-01–VH-03 como realizados.
- **C02, fotografia de código (R05/R07–09):** S1–S3 descrevem 693/708/746 testes,
  IA sem UI e sem chamada paga. O último relatório em C0 informa 787 testes com
  interface/HTTP mockados. L0 confirma arquivos, não reexecução. Preservar os três
  relatórios integralmente e datar uma nota operacional, sem atribuir tudo ao
  HEAD commitado ou ao site. Testes E2E de navegação alterados não foram
  executados na rodada posterior dos scripts, conforme relato em C0.
- **C03, entrada PF versus escolha (R06–09):** `/cadastro` PF-first e login → home
  são etapas distintas; não há autorização para forçar perfil no login.
  Persistência/representação institucional continuam sob regras existentes.
- **C04, “IA produz vínculos” (R01/R19/R23):** a formulação ampla das fontes deve
  ser lida como preparação de sugestões. No incremento autorizado, a saída não
  altera identidade, representação, curadoria, publicação ou confiança.
- **C05, e-mail informado versus operação (R10):** referências a Resend e Site
  URL não comprovam configuração atual, entrega ou recuperação completa. Nenhum
  teste de produção é aceito com base somente em mocks, READY ou GET 200.
- **C06, instituição/propriedade (R21):** governança histórica de associação e
  hipótese futura Comum/empresa não constituem ato jurídico nem decisão coletiva.
  Não preencher titularidade, marca, código ou mandato a partir de relato.
- **C07, matching/PoWth (R18/R20):** descoberta explicável é proposta, não ranking
  de reputação. Não usar histórico/evidência ou interpretação como verificação.

## 4. Alterações canônicas sugeridas para aprovação — NÃO APLICADAS

Não criar outro mestre de onboarding. Preferir notas datadas no início ou junto
à seção corrente dos documentos existentes, preservando o corpo histórico.
Aprovação deve identificar cada proposta abaixo e seu alcance separadamente.

| Proposta | Arquivo e posição | Conteúdo mínimo a acrescentar | Dependência / critério de aceite |
| --- | --- | --- | --- |
| P01 | [05-arquitetura-e-dependencias.md](../05-arquitetura-e-dependencias.md), antes das notas de 13/11 | Nota de 15/11 sobre autorizações locais limitadas de Kimi/Gateway, interpretação e prévia autenticada; apontar R01–05/C01. | Ratificar alcance e autoria humana; registrar mocks/limite por processo, sem alegar operação Cloud ou liberar I6+ inteiro. |
| P02 | [07-criterios-de-progresso.md](../07-criterios-de-progresso.md), antes do estado histórico | Separar implementação local, teste relatado e validação humana; apresentar a preferência atribuída de dogfooding integrado como pendente de ratificação. | Decisão explícita sobre sequência; manter VH-01/02/03 e portões de segurança. Não inventar cronograma. |
| P03 | [02-escopo-e-mvp.md](../02-escopo-e-mvp.md), após nota de exceção do portfólio | Descrever somente a exceção autorizada da interpretação sem persistência; listar memória, matching, reivindicação, capacidades persistentes e automação como abertos. | Não transformar autorizações pontuais em roadmap; delimitar o que ainda requer deliberação. |
| P04 | [01-modelo-de-dominio.md](../digitap/01-modelo-de-dominio.md), §2–3 e §7 | Acrescentar distinção autenticação/perfil, home/Meu espaço, sugestão de IA/registro de domínio. | Conferir L0 e testes; evitar descrições contraditórias de login e não aprovar novas entidades ou schema. |
| P05 | [04-governanca.md](../04-governanca.md), nota inicial | Esclarecer que IA/reivindicação não conferem representação e que os enunciados institucionais das fontes são perguntas/hipóteses. | Preservar D1–D4, contestação, revogação e instância competente; não nomear representantes. |
| P06 | [06-privacidade-e-dados.md](../06-privacidade-e-dados.md), nota inicial | Distinguir trechos de proveniência de verificação; envio externo para inferência, minimização, retenção e política ZDR a verificar. | Revisão humana de privacidade e operação; ZDR solicitado não equivale a conformidade ou ausência absoluta de retenção. |
| P07 | [operations/progresso.md](../../operations/progresso.md) e [README raiz](../../README.md), notas iniciais | Ponte para esta matriz e estado local: navegação, Meu espaço, interpretação autenticada, testes relatados e pendências de e-mail/TLS/Cloud. | Informar HEAD + alterações não commitadas e data da evidência; nenhum teste reexecutado nesta incorporação. |
| P08 | [Norte](../digitap/00-norte-do-produto.md), [Horizonte](../digitap/02-horizonte-estrategico.md), [Marco Zero](../Marco_Zero_2026-11-03.md) e [master context](../00-master-context.md) | **Nenhuma alteração recomendada nesta rodada.** Usá-los como âncora e referenciar a matriz a partir dos registros operacionais. | Qualquer mudança futura exige aprovação específica; não diluir o Norte nem reescrever história para encaixar software. |

**Trecho proposto para P01 (não aplicado):**

> Nota para revisão humana — 15/11/2026. O proponente autorizou incrementos
> locais específicos de interpretação de propostas com Kimi via Vercel AI
> Gateway e sua prévia autenticada, com testes mockados e sem inferência paga
> ou persistência. A autorização não cria titularidade, representação,
> publicação ou confiança, não comprova operação em produção e não declara
> I5 cumprido. A reconciliação geral do condicionamento I5/I6+ continua
> dependente de decisão humana explícita. Fontes e limites: matriz de
> rastreabilidade de conversas de 15/11/2026, R01–05/R22 e C01.

**Trecho proposto para P04 (não aplicado):**

> Estado local para revisão — 15/11/2026. Autenticação, escolha do sujeito e
> conclusão de perfil são operações distintas. O código local retorna à
> Praça após login; Meu espaço permite à conta confirmada sem perfil escolher
> PF ou organização e conserva autorização própria de cada área. A prévia
> assistida interpreta menções de sujeitos, projetos, atividades, capacidades,
> relações e fontes como não verificadas; não materializa entidades nem
> vínculos. Código e testes relatados não comprovam sessão, e-mail ou utilidade
> humana no site publicado.

**Trecho proposto para P02 (não aplicado):**

> Preferência atribuída para ratificação — 15/11/2026. As investigações
> registram o desejo do proponente de testar um conjunto de percursos no site
> em dogfooding integrado. Essa preferência não dispensa testes automatizados,
> segurança ou aprovação de release. VH-01, VH-02 e VH-03 não são considerados
> cumpridos por contagem de testes ou existência de software. Confirmar
> expressamente quais ampliações precedem I5 e quais continuam condicionadas
> à deliberação posterior, sem autorização implícita para execução.

## 5. O que esta incorporação não verifica

Não comprova integral recuperação das conversas, autenticidade dos históricos,
autoria literal de todas as regras, deployment, uso público, entrega de e-mail,
RLS/SSL efetivos, saldo/custo de IA, instituição constituída, demanda ou adoção.
Nenhum software, teste, configuração, banco, Cloud ou documento canônico foi
alterado por esta tarefa. Só foram incorporadas as fontes, esta matriz e a
atualização do índice. Não foram executados testes/build nem consulta Cloud.

As propostas P01–P07 exigem aprovação humana antes de gravar nos respectivos
arquivos. PERG/PROP/HIST não se tornam H-DIR por esta matriz, e H-ATR não se torna
confirmação independente por ter sido copiada integralmente ao repositório.

## 6. Conferência documental desta incorporação

As três cópias conferem byte a byte e por SHA-256 com os arquivos exatos em
Downloads. Índice e matriz possuem 89 links locais existentes, sem revalidação
externa. Código, testes, configurações, documentos canônicos e investigações
anteriores foram comparados por hash e preservados.

`git diff --check` dos arquivos rastreados passa. A verificação adicional das
fontes novas com `git diff --no-index --check /dev/null <arquivo>` aponta nove
avisos de espaços finais herdados dos originais (S1: três; S2: quatro; S3: dois),
incluindo quebras de linha Markdown. Nenhuma normalização foi aplicada, para
preservar integralidade. O índice e esta matriz não têm avisos de whitespace.
