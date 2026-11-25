# CONS-03C — correção local do cliente Supabase, 25/11/2026

- Diretriz operacional permanente. Reutilizar autenticações existentes, sem solicitar novas senhas ou redefinir credenciais. Priorizar o MCP autenticado ou as credenciais temporárias nativas da CLI. Evitar conexão direta por senha quando houver alternativa oficial funcional. Se uma credencial faltar, registrar apenas o bloqueio da operação dependente e continuar as demais tarefas. A mesma regra consta no `AGENTS.md`.
- A correção em `src/lib/supabase/browser.ts` aceita em produção a raiz HTTPS de um projeto `*.supabase.co` e mantém o endereço de loopback autorizado em desenvolvimento e teste. Preserva chave pública, configuração PKCE e opções dos cookies. A validação ocorre antes de inicializar o SDK.
- RED local com três falhas esperadas e 17 testes aprovados. GREEN focal com 29/29 entre cliente, cookies, OAuth e anexos privados, usando configurações sintéticas e mocks. Typecheck, lint focal e integridade do diff aprovados. A candidata anterior `625698bedc01f54d124aa53e36379b116fe4fbf5` foi preservada. A correção está na worktree. A homologação do upload hospedado permanece pendente. Nenhum acesso à produção ou nova inferência.

---

# CONS-03C — retomada da homologação protegida, 24/11/2026

- Candidata `625698bedc01f54d124aa53e36379b116fe4fbf5` no deployment READY `dpl_2AyyBDykrN1qXThJdWWPRgQUFU6Z`, sem rebuild ou push. Vercel Authentication e sandbox do Chromium preservados. A jornada usou contas confirmadas sintéticas e acessou o Supabase original somente com as próprias fixtures.
- Painel, Tap, seleção E4 e consentimento aprovados. Tentativa de usar contexto de terceiro retornou 403. Uma única inferência contextual real em Kimi K2.6 retornou 200 em 89,376 s, sem retry do SDK e sem timeout do harness. As sete listas e os trechos literais foram validados. Passaram revisão, salvamento, retomada da ideia, consulta por terceiro negada com 404, quatro decisões humanas, conversão e leitura da fotografia decisória privada.
- Em percurso sintético separado, sem nova inferência, o Chromium confirmou criação de atividade, salvamento de planejamento e registro privado de realização, todos com HTTP 200. A homologação do anexo parou depois da autorização de upload, que respondeu 200. O cliente do navegador em `src/lib/supabase/browser.ts` aceita apenas `http://127.0.0.1:56151`, impedindo o uso do Storage hospedado antes da confirmação. A releitura do arquivo e o teste de isolamento do anexo ficaram pendentes. A correção também precisa preservar o consumidor do cliente para PKCE.
- Todos os contextos do Chromium foram encerrados. Cleanup limitado aos IDs das quatro rodadas confirmou zero contas, sujeitos, usuários, ideias, atividades, registros ou metadados de anexo residuais. A consulta ao Storage também confirmou ausência do objeto correspondente à chave emitida. Resultados sanitizados e manifesto verificado em `operations/evidence/cons-03c-homologacao-20261124`.
- Gateway autentica pela chave explícita `AI_GATEWAY_API_KEY`, conforme o adaptador e a configuração Production. O identificador parcial é compatível com a chave cadastrada, que não está vinculada a um projeto dedicado na listagem. Não há orçamentos por chave, por projeto OIDC ou padrões no escopo consultado. O orçamento por projeto só se aplica a chamadas autenticadas via OIDC. Os créditos da equipe passaram de US$ 12,41692217 a US$ 12,40260617, com variação observada de US$ 0,01431600. Sem recibo individual ou contagem de tokens acessível, permanece reservada a estimativa máxima de US$ 0,81911040 e o saldo conservador disponível fica em US$ 0,96768264, além da preservação de US$ 3,054728 em reservas anteriores. A resposta de créditos não expõe a configuração de recarga automática. Nenhuma compra ou recarga foi solicitada, e não se observou recarga no intervalo entre as leituras.
- Beta condicionado a uma chave dedicada com orçamento nativo próprio sem renovação, uma coorte restrita na rota de IA e verificação da recarga automática antes da promoção. O orçamento só impede novas chamadas depois que o consumo contabilizado cruza o limite. É necessário reservar margem para requisições simultâneas. O domínio continua no deployment de retorno `dpl_ovMkpued6TcgVR7ZSFGYLYeX7ohR`. Nenhuma configuração de infraestrutura foi alterada.

---

# CONS-03C — build hospedado e publicação bloqueada, 24/11/2026

- A branch GitHub `release/digitap-cons-03` avançou de `3e2f93b17ee85fd4cc156ab35fbb38b05b707e9e` para a candidata autorizada `625698bedc01f54d124aa53e36379b116fe4fbf5`, sem force. A `main` permaneceu em `cfa65fe37e5aae2113e92dd64c2b410e97f8d16e`. O Preview automático da branch ficou separado do deployment de homologação.
- Deployment Production `dpl_2AyyBDykrN1qXThJdWWPRgQUFU6Z` em READY, criado do arquivo Git do SHA autorizado, excluindo a pasta de evidências da carga. Build hospedado aprovado. O artefato registrou Node 26 e timeout de plataforma de 300 s nas funções de interpretação, ideias, atividades e arquivos privados. O host gerado e o alias automático exigiram Vercel Authentication. Com o acesso de plataforma já configurado, `/login` retornou 200 e o POST de interpretação sem sessão do DigItap retornou 401 antes de qualquer inferência.
- Gate de consumo bloqueado. A proteção da rota limita tentativas e concorrência em memória por processo. A consulta ao AI Gateway no escopo `digitap` retornou zero orçamentos individuais e zero padrões. A promoção habilitaria consumo por contas confirmadas sem um limite agregado verificado. O saldo conservador registrado permanece US$ 1,78679304, mantendo US$ 3,054728 em reservas de cobranças incertas. Nenhuma inferência, custo adicional de IA ou fixture de homologação foi criada nesta rodada.
- A homologação autenticada da jornada e do isolamento entre usuários, com dados sintéticos, segue pendente. A promoção foi suspensa. Os dois hosts públicos continuam atendidos pelo deployment READY `dpl_ovMkpued6TcgVR7ZSFGyLYeX7ohR`, SHA `cfa65fe37e5aae2113e92dd64c2b410e97f8d16e`. Nenhum rollback foi necessário. Banco, Storage e configurações de CONS-03B permaneceram intactos.

---

# CONS-03B — preparação da produção, 24/11/2026

- Candidata `625698bedc01f54d124aa53e36379b116fe4fbf5`. O backup de 24/11 foi reutilizado como ponto de recuperação, com restauração offline verificada no manifesto CONS-03A `20261124T205650Z-qq_bxru3`. A restauração cobre aquele snapshot. Nenhum novo backup ou ensaio foi executado neste incremento.
- Supabase original `digitap` (`ntecccthdcdrpyuvljid`). O ledger tinha 14 versões e as duas migrações autorizadas estavam pendentes. O dry-run listou somente esses arquivos. A CLI nativa aplicou `20261120224204_oss01b_private_evidence_files` e `20261124203300_private_decisions`. A leitura posterior confirmou 16 versões, as chaves estrangeiras esperadas e RLS nas três novas tabelas, com FORCE RLS nas duas tabelas decisórias. A consulta aos privilégios confirmou que `anon` e `authenticated` não têm leitura direta nessas tabelas e que `service_role` pode inserir registros, sem permissão direta de atualização nas tabelas decisórias.
- Criado o bucket `digitap-private-evidence`, privado, com limite de 25 MiB e tipos `image/jpeg`, `image/png`, `image/webp` e `application/pdf`. A API negou a consulta anônima e o catálogo confirmou zero objetos. Nenhum arquivo foi enviado.
- Cadastradas no escopo Production da Vercel `SUPABASE_PRIVATE_EVIDENCE_BUCKET`, `AI_GATEWAY_MODEL` e `AI_GATEWAY_API_KEY`. A chave foi cadastrada como sensível pela entrada padrão a partir do arquivo local protegido. Modelo `moonshotai/kimi-k2.6`. O adaptador da candidata preserva failover nativo, `zeroDataRetention` e `disallowPromptTraining`. A validade operacional da chave em Production permanece sem teste de inferência.
- Vercel Hobby com Fluid Compute e duração padrão configurada de 300 s. A rota de interpretação da candidata não define duração própria. As latências de inferência já observadas no Tap foram 103,505 s no fluxo legado e 72,346 s no fluxo contextual. A configuração oferece margem para essas medições. A duração efetiva do artefato da candidata em Production permanece sem teste.
- O domínio manteve antes e depois o deployment READY `dpl_ovMkpued6TcgVR7ZSFGyLYeX7ohR`, SHA `cfa65fe37e5aae2113e92dd64c2b410e97f8d16e`, preservado para retorno da aplicação. `/login` e `/api/public/atividades` retornaram HTTP 200 após redirecionamento. A compatibilidade observada cobre essas rotas e a revisão do schema. Após inclusão de anexos privados, a chave estrangeira restringe a exclusão de realizações referenciadas. Retornar o deployment não reverte banco, Storage ou configuração.
- Publicação da candidata e validação autenticada posterior dependem de autorização separada. As novas variáveis serão incorporadas a um deployment futuro. Sem push, promoção, deploy, inferência ou contratação neste incremento.

---

# G5 — continuidade decisória consolidada, 24/11/2026

- Implementação, migration privada e testes em `b158ef3bd0c153cd5b5867199ad7367ff7716faa`, descendente de `6b010b6`. A confirmação de exclusão informa que o histórico e a fotografia decisória são apagados quando existem, e que a atividade permanece. RED por ausência do aviso, seguido de GREEN e confirmação no Chromium. Cancelar preserva a ideia.
- Gates afetados aprovados. Componentes e contratos **45/45**, PostgreSQL **13/13**, Chromium **1/1** com Gateway simulado, build, typecheck, lint focal e diff. O teste HTTP decisório passou a integrar a suíte normal. Manifestos anteriores de G2/G3 e G4 preservados e verificados. Evidência G5 em `operations/evidence/g4-03b-recovery-g5-decisoes-20261124T234621Z`.
- CONS-03A já registra `verified_restore=true` e conclusão em `offline restore` no manifesto 20261124T205650Z-qq_bxru3 do snapshot de 24/11. Esse registro supera o bloqueio de backup descrito no checkpoint anterior para aquele snapshot. Não houve nova conexão, exportação ou restauração.
- Publicação continua condicionada a CONS-03B. Conferir o ledger na execução autorizada e aplicar `20261124203300` e `20261120224204` se pendente. O último checkpoint registrou OSS-01B pendente e bucket privado e Gateway ausentes em Production. Configurar o bucket e os vínculos `SUPABASE_PRIVATE_EVIDENCE_BUCKET` e `AI_GATEWAY_API_KEY` antes da ativação. Autorizar separadamente a publicação Git e a ativação dessa candidata em digitap.com.br, mantendo o deployment de retorno. Kimi K2.6 continua padrão com failover nativo e filtros de privacidade. Sem push, deploy, DDL remoto ou gasto nesta rodada.

---

# G4 — persistência e continuidade decisória local, 24/11/2026

- Aplicada exclusivamente no PostgreSQL local a migration `20261124203300_private_decisions`. A confirmação humana explícita grava revisões privadas com estado DEFINIDO, PROVISÓRIO, PENDENTE ou EXCLUÍDO, autoria da sessão e checagem da versão da ideia. Texto e interpretação permanecem independentes. Nenhum caminho de inferência grava decisões.
- A conversão registra a versão de origem e uma fotografia decisória junto com a atividade, na mesma transação. O titular autorizado a recupera no acompanhamento TAP08, com alternativas excluídas separadas da orientação vigente. Edições posteriores da ideia preservam a fotografia. A exclusão explícita da ideia remove histórico e fotografia por cascata e preserva a atividade. A interface consulta as 50 confirmações mais recentes e o banco mantém as demais enquanto a ideia existe.
- RED HTTP de confirmação ausente e GREEN **4/4**, com regressão focal **40/40**. PostgreSQL **8/8** em dois arquivos e repetição focal final **5/5** com retenção verificada. Foram comprovados concorrência 200/409, histórico, titularidade, negação a terceiro e após revogação, e rollback da confirmação e da conversão. Chromium **1/1** com Gateway simulado e TAP08, typecheck, lint focal e diff aprovados. Fixtures removidas e servidor encerrado.
- Candidata `6b010b6` preservada como ponto de recuperação. Evidências em `operations/evidence/g4-03b-recovery-decisoes-20261124T233926Z`. Sem nova inferência, Graphiti, instalação, publicação ou operação em produção.

---

# G4 — continuidade decisória e encerramento experimental G2/G3, 24/11/2026

- G2/G3 encerrado com resultados, contratos, recibos e aprendizados anteriores preservados. Os manifestos do replay e das rodadas reais foram conferidos. Graphiti permanece experimental. Nenhuma nova inferência.
- A revisão já mantém texto, autoria e versão. A conversão confere titularidade e versão e registra origem restrita. O plano TAP08 possui versão e acesso privados próprios. Falta persistência de decisões humanas e da fotografia decisória da ideia na atividade. O próximo incremento depende de autorização para schema privado e transações de confirmação e conversão. Estados propostos mantidos conforme direção humana: DEFINIDO, PROVISÓRIO, PENDENTE e EXCLUÍDO. Ausência de registro permanece distinta de uma decisão PENDENTE confirmada.
- Contrato executável registrou 3 PASS e 1 RED esperado. A confirmação explícita devolve 400 na candidata. PostgreSQL focal **4/4** com Gateway simulado demonstrou revisão humana, conversão e recuperação do plano privado na mesma atividade, com bloqueio a terceiro. Componentes e contratos focais **50/50**, typecheck e diff aprovados. Realização e evidência privada reaproveitam o checkpoint TAP08.
- Contrato, resultado RED e manifesto em `operations/evidence/g4-continuidad-decisoria`. Somente contrato, testes e documentação foram alterados. Candidata `6b010b6`, código de produção e schema preservados.

---

# G3 — execução do par com proveniência refinada, 24/11/2026

- Foram feitas somente as duas chamadas preparadas com Kimi K2.6 e teto de 16.000 tokens de saída, ambas via Moonshot AI. Sem timeout local, retry, mudança de contrato ou Graphiti físico. A recebeu E4. B recebeu E4 e o replay sintético temporal autorizado. Ambos terminaram por stop.
- A passou no contrato em 41,207 s, com 397 tokens de entrada, 1.948 de raciocínio e 172 de resposta. Absteve-se corretamente em vigência, exclusão, mudança e pendência, mas também omitiu a intenção de oficina gratuita que estava no E4. Nenhuma referência foi emitida.
- B terminou em 158,167 s, com 793 tokens de entrada, 4.829 de raciocínio e 268 de resposta. O texto bruto acertou gratuidade, presencial, cobrança excluída e local a definir. Reconheceu indisponibilidade genericamente, sem identificar o Espaço Sintético e sua transição. A intenção foi formulada como responsabilidade atribuída. Os IDs citados eram autorizados. O validador rejeitou três chaves de categoria renomeadas, impedindo considerar B saída válida. O ganho temporal no contrato estrito permanece inconclusivo.
- Custo do par US$ 0,02999850 e acumulado conhecido US$ 0,15847896. Reservas incertas anteriores US$ 3,054728 e saldo conservador US$ 1,78679304 sobre o teto de US$ 5,00. Recibos, avaliação e manifesto em `operations/evidence/g3-proveniencia-pareado-real`. Candidata `6b010b6` preservada.

---

# G3 — contrato experimental de proveniência refinado, 24/11/2026

- O replay offline reproduziu a rejeição da resposta bruta de A com 6.000 tokens. RED por contrato ausente e GREEN **6/6**. O sistema fornece IDs explícitos por braço, exige citação por categoria e resolve cada ID no registro local. Fontes desconhecidas, referências autorizadas só no outro braço, metadados inventados e abstenções incoerentes são recusados.
- O redutor já entrega vigência, exclusão, mudança e pendência às 11h. B passa a receber o estado compacto já resolvido, com o local anterior no histórico. A IA seleciona, explica e cita os fatos disponíveis. A recuperação temporal é medida no replay e a capacidade cognitiva fica sem avaliação até haver resposta concluída. O novo par muda contrato, projeção temporal e limite de saída em relação ao ensaio anterior.
- Próximo par preparado offline com Kimi K2.6 e 16.000 tokens de saída por chamada, sem timeout experimental ou redução de raciocínio. Reserva de US$ 0,878682 por chamada e US$ 1,757364 para o par. Restam US$ 0,05942754 após reservar o par no saldo conservador de US$ 1,81679154. As reservas incertas anteriores permanecem integrais. Zero chamadas e zero gasto neste incremento.
- Testes, dados preparados, relatório e manifesto em `operations/evidence/g3-proveniencia-contrato`. Candidata `6b010b6`, código de produção, laboratório e rodadas anteriores preservados. Nenhuma execução física do Graphiti.

---

# G2/G3 — correção do limite de saída da inferência, 24/11/2026

- **Regra metodológica permanente.** Um término imposto por limite experimental de tempo ou tokens constitui evidência de truncamento do ensaio. A capacidade cognitiva fica sem avaliação quando esse limite impede uma resposta concluída. Preserve o resultado truncado como evidência metodológica. Para o Kimi K2.6, discrimine os tokens de raciocínio e de resposta quando o Gateway os informar.
- Repetição autorizada somente de A/B, com pergunta, contexto, schema, critérios e modelo preservados. O limite de saída passou de 1.200 para 6.000 tokens, já usado em G4. Kimi K2.6 via Moonshot AI nos dois braços, com roteamento nativo, sem timeout local ou retries. B usou o replay sintético autorizado, sem execução física de Graphiti.
- A terminou em 90,174 s com 330 tokens de entrada, 3.747 de raciocínio e 368 de resposta final. A resposta bruta recolheu a intenção de oficina gratuita e se absteve sobre os fatos que a projeção E4 não continha. As referências da lista não obedeceram ao contrato de proveniência, e a saída foi rejeitada. B terminou em 152,794 s por limite de saída, com 916 tokens de entrada, 5.999 de raciocínio e um atribuído à resposta final, sem texto entregue. B permanece sem pontuação e a comparação de ganho temporal continua inconclusiva.
- Reserva do par US$ 1,527364. Custos medidos de US$ 0,01657126 e US$ 0,02446572, total US$ 0,04103698. Acumulado conhecido US$ 0,12848046. Permanecem US$ 3,054728 em reservas incertas anteriores e US$ 1,81679154 de saldo conservador. Rodada anterior de 1.200 tokens intacta. Recibos e manifesto em `operations/evidence/g2-g3-continuidade-pareada-6000`. A candidata `6b010b6` e o código de produto foram preservados.

---

# G2/G3 — rodada real pareada da continuidade temporal, 24/11/2026

- Kimi K2.6 via Moonshot AI nas duas chamadas. Mesma pergunta às 11h, schema e limite de 1.200 tokens de saída. A recebeu a projeção E4. B recebeu a mesma projeção enriquecida com as fotografias do replay temporal sintético autorizado. Sem Graphiti físico, timeout local ou retry do SDK.
- A retornou HTTP 200 em 29,528 s, com 330/1.200 tokens e US$ 0,00511350. B retornou HTTP 200 em 45,246 s, com 916/1.200 tokens e US$ 0,00567020. As duas chamadas terminaram por limite de saída, com texto vazio. Nenhuma saída foi validada. Acertos, falhas factuais, abstenção, vigência, exclusão, mudança, pendência e proveniência ficaram sem pontuação. A comparação real ficou inconclusiva.
- Tarifas reconfirmadas no catálogo público. Reserva prévia de US$ 1,416964 para o par. Custo realizado US$ 0,01078370. Acumulado conhecido US$ 0,08744348, reservas incertas anteriores de US$ 3,054728 e saldo conservador US$ 1,85782852 sobre o teto de US$ 5,00. Duas chamadas, sem repetição. Relatório, critérios e recibos em `operations/evidence/g2-g3-continuidade-pareada`. A candidata `6b010b6` e o código de produto permanecem preservados.

---

# G5 — consolidação local dos incrementos de 24/11/2026

- Base de recuperação preservada em `3e2f93b17ee85fd4cc156ab35fbb38b05b707e9e`. TAP08-01/02/03 em `c9cd035`, interpretação contextual com saída estruturada e cancelamento voluntário em `8254f12`, contrato experimental de recuperação IA-MEM-01 em `12bf473`. OSS-GOV-01 e os resultados experimentais permanecem registrados. A memória experimental fica separada do produto.
- Vitest padrão **1.022/1.022** e IA-MEM-01 isolado **6/6**. PostgreSQL/Storage **284/284** em duas execuções sem sobreposição, com cinco casos executados separadamente após habilitar a flag de limpeza ECO-01. Chromium **7/7** em duas execuções sem sobreposição. Cinco casos passaram inicialmente. O primeiro E4 excedeu o limite do teste, bloqueando o segundo em série. A repetição focal E4 passou **2/2** e confirmou limpeza, sem causa determinada para a interrupção inicial. Build local, typecheck e diff aprovados. Lint sem erros e cinco avisos preexistentes.
- A regressão de navegador usou Gateway simulado. Foram conferidos os manifestos existentes da jornada contextual real e dos ensaios IA-MEM-01. Nenhuma nova inferência ou gasto. Os recibos e artefatos de execução seguem locais, com o relatório da consolidação em `operations/evidence/g4-03b-recovery-g5-consolidacao-20261124T224048Z` e a repetição focal em `operations/evidence/g4-03b-recovery-g5-e4-20261124T224722Z`. A credencial protegida, arquivos gerados e logs ficam fora dos commits.

---

# G4 — jornada contextual real concluída, 24/11/2026

- Chromium local com sandbox **1/1**, 80,331 s totais, zero falhas ou skips. A pessoa sintética abriu o Tap pelo painel PF, consentiu explicitamente e recebeu a prévia não verificada após a recuperação E4 autorizada. O cancelamento foi verificado antes do envio. Na chamada real, o aviso de espera e o controle de cancelamento permaneceram disponíveis. A pessoa revisou a sugestão, salvou a ideia privada e retomou texto e revisão após recarregar, sem nova inferência. PostgreSQL confirmou texto, interpretação original, revisão e versão 1.
- Kimi K2.6 via Moonshot AI, com failover nativo e filtros de privacidade mantidos. A projeção incluiu a capacidade sintética do titular e excluiu identificadores e escopos. As sete listas, a ancoragem e a validação semântica passaram após explicitar os campos no prompt contextual. Gateway 71,820 s e API observada no browser 72,346 s. 650 tokens de entrada e 3.390 de saída. Recibo de US$ 0,01417750 na rodada aprovada. As duas respostas anteriores do Gateway foram rejeitadas pela API. A primeira tentativa parou no harness antes da rede.
- Custo contextual de US$ 0,04979766. Custo conhecido acumulado de US$ 0,07665978. Reservas incertas preservadas em US$ 3,054728. Saldo conservador de US$ 1,86861222 sobre US$ 5,00. Cleanup por IDs confirmou zero resíduos nas tabelas verificadas e a porta 3215 ficou sem listener. Relatórios, recibos e manifesto em `operations/evidence/g4-03b-recovery-contextual-real-20261124T221405Z`.
- Próximo incremento executável no Garagem-30 conforme os checkpoints disponíveis. Estabilizar o delta local posterior ao congelamento G5, com escopo seletivo para G4 real e TAP08-03 e verificação dos gates afetados. OSS-GOV-01 e IA-MEM-01 permanecem preservados. CONS-03B segue condicionado à recuperação atual verificada e à autorização específica. Validação humana permanece pendente. A consolidação não repetiu testes ou inferências nem alterou produção.

---

# G4 — inferência do Tap sem prazo artificial, 24/11/2026

- O adaptador não cria prazo local para a inferência. O sinal da requisição permite distinguir cancelamento voluntário de indisponibilidade. A API mantém a resposta JSON completa e validada e a rechecagem de autorização. Limites obrigatórios de transporte, infraestrutura e provedor continuam aplicáveis.
- A intenção sintética de oficina completou em **103.505 ms** no adaptador local. HTTP 200 via Moonshot AI, Kimi K2.6, 366 tokens de entrada e 3.657 de saída. A saída estruturada foi aceita como prévia não verificada para revisão humana. O tempo de processamento isolado do provedor e o limite da hospedagem não foram medidos.
- RED 70 PASS e 4 FAIL. Regressão focal G4 **115/115**, typecheck e diff aprovados, lint sem erros e cinco avisos preexistentes. Custo da chamada de US$ 0,01477346. Saldo conservador acumulado de US$ 1,91840988 sobre o teto de US$ 5,00, com US$ 3,054728 ainda reservados para cobranças incertas. Evidências em `operations/evidence/g4-tap-inferencia-sem-prazo`.

---

# G3 — contrato de recuperação separado do Tap, 24/11/2026

- O replay offline do Markdown real de M21-B reproduziu `OUTPUT` com HTTP 200. O Tap extrai menções ancoradas na proposta. Recuperação de memória seleciona evidência autorizada e pode registrar abstenção explícita. O Tap manteve schema, regras de ancoragem, timeout de 30 s, failover e filtros de privacidade. O prompt passou a exigir JSON sem Markdown. O teste confirma que o cliente não envia `temperature`.
- RED 42 PASS e 1 FAIL pela falta da instrução JSON. Regressão focal 55/55 e contrato experimental 6/6. Typecheck, lint sem erros e diff aprovados. A intenção sintética de oficina atingiu o timeout do Tap. O par de recuperação M21 passou com 60 s e 1.200 tokens de saída no runner experimental. B se absteve. C selecionou o registro contestado e não verificado com proveniência da projeção sintética. A data de realização do placeholder do harness não conta como evidência temporal. Sem expansão do corpus porque o gate do Tap ficou pendente. D segue pendente.
- Custo conhecido acumulado de US$ 0,01208866 pelos recibos do Gateway. Permanecem US$ 3,054728 de reservas sem cobrança confirmada e US$ 1,93318334 livres pelo ledger conservador. Evidências em `operations/evidence/g3-ia-mem-01-correcao`. TAP08-03 e OSS-GOV-01 preservados.

---

# G3 — roteamento independente de provedor e inferência real, 24/11/2026

- Procedimento permanente para experimentos locais. Guarde `AI_GATEWAY_API_KEY` no `.env.local` ignorado pelo Git, com permissão `0600`. Na raiz da worktree, carregue o arquivo somente no processo experimental com `env -u AI_GATEWAY_API_KEY -u VERCEL_OIDC_TOKEN node --env-file=.env.local …`. Confira apenas presença, permissões e exclusão do Git. Mantenha o conteúdo fora de logs, manifestos e diffs.
- O modelo é configurável dentro da família Kimi. O Gateway faz a seleção e o failover nativo entre provedores elegíveis do mesmo modelo. O adaptador não fixa provedor nem usa fallback de modelo. Preserva `zeroDataRetention`, `disallowPromptTraining`, schema estrito, limite de 6.000 tokens na saída, timeout de 30 s e zero retries no SDK. O erro permanece fechado quando nenhum endpoint é elegível.
- RED 40 PASS e 2 FAIL por fixação em Parasail. GREEN focado 54/54. Typecheck e diff aprovados. Lint com zero erros e cinco warnings preexistentes. As expectativas do harness Chromium e da integração PostgreSQL foram alinhadas ao novo contrato, sem execução física nesta rodada.
- G3 real usou M18 e M21. A evidência A continua histórica. B recebeu dois HTTP 200 via Moonshot AI e o adaptador recusou ambos como `OUTPUT`. Uma saída bruta observada veio em Markdown. C atingiu o timeout nos dois casos. D ficou pendente sem laboratório ativo. M08 permanece sem pontuação. A comparação B/C e a vantagem temporal de D seguem inconclusivas. O adaptador atual extrai menções e exige âncoras na proposta, o que limita sua capacidade de responder às perguntas temporais do catálogo.
- Teto acumulado de US$ 5,00. Gateway informou US$ 0,00792636 nas duas respostas. As reservas de US$ 3,818410 permaneceram contabilizadas, incluindo três tentativas sem custo confirmado, com US$ 1,181590 livres pelo ledger conservador. O próximo par exigia US$ 1,527364. Matriz, reprodução e manifesto em `operations/evidence/g3-ia-mem-01-real`.

---

# G3 — gate de inferência real comparativa, 24/11/2026

- Catálogo do Vercel AI Gateway confirmou Kimi K2.6 no Parasail, com ZDR, ausência de treinamento e tarifas de US$ 0,75/M de entrada, US$ 3,50/M de saída e US$ 0,16/M de leitura do cache. Estimativa de US$ 0,217608 por tentativa, com 262.144 tokens de entrada no limite conservador e 6.000 de saída no adaptador. Nenhuma tentativa reservada ou executada.
- B e C ficaram bloqueados pela ausência de credencial protegida confirmada no ambiente de execução. D permanece pendente pela indisponibilidade do runtime isolado do laboratório. A conserva a evidência G3-R. M08 segue com pontuação suspensa e os bloqueios prévios foram preservados. Zero chamadas, US$ 0,00 consumidos e saldo autorizado de US$ 1,00.
- Resultados históricos, transporte simulado e campos reais pendentes constam na matriz e no manifesto em `operations/evidence/g3-ia-mem-01-inferencia`. E4 mantém a autoridade sobre o contexto. A projeção atual deixa lacunas de versão histórica e vigência, ainda sem evidência de ganho comparativo de Graphiti neste corpus.

---

# G3 — retomada local de IA-MEM-01

- O catálogo M01–M30 manteve o SHA-256 `e4950e7718129667662f4625ccdfed614d753e97bdab9ce0254bda889fedcae9`. A evidência G3-R de E4 foi reaproveitada. M08 continua com pontuação suspensa. Permanecem os bloqueios de M07, M09, M10, M19 e M22 e a decisão de escopo de M13.
- Nesta rodada, **18/18 verificações locais de transporte simulado** passaram. Oito pares B/C usaram as perguntas M16, M17, M18, M20, M21, M23, M25 e M29. B enviou só a pergunta. C enviou os campos suportados pelo projetor atual, incluindo estado, versão e certeza quando disponíveis. A versão histórica anterior de M18 e a programação de M20/M29 não chegaram ao adaptador. O mock retornou o mesmo objeto vazio para B e C. Em M11 e M30, dependências E4 simuladas reprovaram a rechecagem ou rejeitaram a recuperação, e a rota real retornou 403 e 503 sem chamar o transporte.
- Graphiti 0.31.2/FalkorDB e o redutor são evidências separadas do cenário EP-01–03. O readback físico histórico demonstrou o término da vigência do local, com extração simulada. O redutor atua somente sobre eventos normalizados. O runtime e o serviço ativo não estavam disponíveis para uma nova rodada D, e a comparação D sobre M01–M30 permanece pendente. IA-ECON-01 bloqueou a estimativa do primeiro episódio com teto zero. Nenhuma inferência, medição física nova, instalação ou gasto.
- A proposta de próximo ensaio exige autorização separada para inferência e limites de custo e, para D, disponibilidade isolada do laboratório e um contrato de entrada autorizado. O comparativo de transporte não estabelece qualidade de resposta, latência de inferência ou ganho de Graphiti. Evidências, matriz e manifesto em `operations/evidence/g3-ia-mem-01-retomada`. TAP08-03 e OSS-GOV-01 preservados.

---

# TAP08-03 — acompanhamento privado e retrospectivo

- A condição de atividade publicada e já iniciada veio da ampliação do fluxo editorial de realização PF em `7ac0577`. O modelo de domínio distingue esse formulário, que colhe consentimento e envia à revisão, do registro factual privado em rascunho. A condição permanece no formulário simplificado e nas transições editoriais.
- Titular PF com escopo de edição pode registrar uma realização e referências privadas de atividade própria em rascunho que já começou. A data efetiva deve estar entre o dia de início informado e o dia atual em America/Sao_Paulo. A opção retrospectiva grava a declaração para o horário e a versão informados. O relato nasce declarado, a auditoria mantém o momento real do registro e nenhum snapshot ou autorização de divulgação é criado.
- A organização continua usando os controles existentes. As restrições de representação e as permissões de anexos permanecem. Nenhuma mudança de schema.
- A jornada PF retrospectiva passou do painel à retomada do planejamento, relato e anexo. Chromium confirmou ausência de snapshot e autorização de divulgação, resposta 404 nas consultas públicas das duas atividades sintéticas e limpeza das fixtures. Organização e interface do representante restrito ao envio passaram na mesma rodada. Vitest 1.019/1.019, PostgreSQL 71/71 e Chromium 2/2. Evidências em `operations/evidence/g4-03b-recovery-tap08-digitap-tap0803-bwwlh1k5`.

## OSS-GOV-01 — frente complementar

Investigação de reaproveitamento restrita a três candidatos para deliberação organizacional. O Garagem-30 e o TAP08-03 continuam no caminho principal. Nenhum código, schema, serviço ou dependência foi incorporado nesta rodada.

1. **Rallly, horários para consulta de disponibilidade.** Adaptar os casos de Vitest de horários inexistentes, repetidos e intervalos após meia-noite ao tratamento de fuso já existente no DigItap. `getTimeOptions` depende do wrapper Day.js e `wallTimeToInstant`/ `wallTimeExists` dependem dos ajustes de fuso do Rallly. A fatia de menor acoplamento começa pelos testes, mantendo a escolha humana de horário. AGPL v3. [Testes de opções](https://github.com/lukevella/rallly/blob/33fed0f6350c82ea8771d8decaa30735a359e654/apps/web/src/features/poll/components/forms/poll-options-form/utils.test.ts) · [Funções de fuso](https://github.com/lukevella/rallly/blob/33fed0f6350c82ea8771d8decaa30735a359e654/apps/web/src/lib/datetime/wall-time.ts) · [Licença](https://github.com/lukevella/rallly/blob/33fed0f6350c82ea8771d8decaa30735a359e654/LICENSE)
2. **Choices, contrato de resposta individual em consulta interna.** Adaptar a invariável de unicidade da resposta por consulta e pessoa autenticada e os testes de estado da própria resposta. O SQL de origem inclui remoção de duplicatas e depende da identidade de usuário do Choices. Reaproveitar apenas o contrato de unicidade e adaptá-lo à identidade do DigItap após decisão sobre elegibilidade. O arquivo de licença traz MIT e termos adicionais de biometria, fora desta fatia. [Índice de unicidade](https://github.com/choices-project/choices/blob/dc42a1428bd70ebbbb6ad4981c38ae761fa962fb/supabase/migrations/20260313000001_add_poll_rankings_unique_constraint.sql) · [Testes de contrato](https://github.com/choices-project/choices/blob/dc42a1428bd70ebbbb6ad4981c38ae761fa962fb/web/tests/contracts/polls-vote-status.contract.test.ts) · [Licença](https://github.com/choices-project/choices/blob/dc42a1428bd70ebbbb6ad4981c38ae761fa962fb/LICENSE)
3. **Supabase Realtime Chat, apresentação de conversa privada.** `useChatScroll` usa apenas React. O componente `ChatMessageItem` pode ser adaptado à interface existente sem copiar o cliente do registry. `useRealtimeChat` demonstra Broadcast por canal e limpeza da inscrição; o exemplo usa autoria fornecida pelo cliente e não persiste mensagens. Antes de qualquer integração, decidir retenção, autoria verificada e autorização por vínculo, com entrega em tempo real separada do registro de decisões. Apache 2.0, preservar os avisos aplicáveis. [Rolagem](https://github.com/supabase/supabase/blob/9298ed68c1580bb48e6d864511acc3f8aa0d9351/apps/ui-library/registry/default/blocks/realtime-chat/hooks/use-chat-scroll.tsx) · [Mensagem](https://github.com/supabase/supabase/blob/9298ed68c1580bb48e6d864511acc3f8aa0d9351/apps/ui-library/registry/default/blocks/realtime-chat/components/chat-message.tsx) · [Licença](https://github.com/supabase/supabase/blob/9298ed68c1580bb48e6d864511acc3f8aa0d9351/LICENSE)

Loomio e Decidim ficam como referências de domínio. `StanceService.create/update` e `OutcomeService.create` separam posição de resultado no Loomio; `AnswerProposal`, seus testes, e `Decidim::Accountability::Result` oferecem referência para decisão e acompanhamento. O acoplamento a Rails e aos papéis próprios de cada aplicação supera o ganho de portar código nesta etapa. Loomio declara AGPL v3 e Decidim AGPL-3.0-or-later. Aplicar a política do DigItap por trecho, preservando proveniência e avisos. [Loomio](https://github.com/loomio/loomio/tree/200d7001d35e9ca2b746fb95d9acdbd76d757df0) · [Decidim](https://github.com/decidim/decidim/tree/645e94fc49ba8981f637a47eeae29d814a2a1a54)

---

# TAP08-02 — jornada local de acompanhamento

- Em Chromium com sandbox, uma organização titular criou uma atividade sintética pelo painel, salvou recursos e custo previsto, reabriu o planejamento, declarou a realização, anexou um arquivo privado e reabriu o conjunto pelo Tap. O arquivo recuperado coincidiu byte a byte com a fixture. A atividade permaneceu em rascunho.
- Em pessoa física, a jornada validou criação, acesso pelo Tap, planejamento persistido e reabertura. A regra vigente exige atividade publicada e já iniciada para registrar a realização de pessoa física. A rodada preservou essa regra e não fez publicação local ou remota.
- O representante sintético com escopo de envio viu a interface restrita, sem plano, relato ou controle de anexos. O cenário existente de evidência privada também passou, incluindo leitura sem upload para colaborador autorizado e rejeição de novos acessos após revogação.
- Testes focais 31/31 e Chromium 2/2. A rodada final devolveu o banco e o Storage às contagens iniciais e encerrou o servidor. Ajustes do teste de navegador trataram a captura de IDs após navegação e a espera pela habilitação do campo de arquivo. Não houve mudança de autorização, schema ou requisito de prestação de contas.

---

# TAP 08 — acompanhamento para prestação de contas

- Primeira fatia local sobre `3e2f93b17ee85fd4cc156ab35fbb38b05b707e9e`. O Tap leva pessoas físicas e organizações à lista de atividades do respectivo painel. A partir de uma atividade, o atalho **Acompanhar** abre planejamento, relato e evidências na área existente, respeitando as permissões de leitura, envio e edição.
- A Política Nacional Aldir Blanc é uma aplicação inicial desse acompanhamento. Planejamento de recursos, realização declarada e evidências continuam distintos. Requisitos de instrumentos específicos, consolidação financeira e entrega formal ainda dependem de validação.

---

# CONS-03A — preservação e recuperabilidade, 24/11/2026

- **Direção do fundador.** Entregar até 30/11 o máximo de capacidades úteis, funcionais e seguras. Garagem-30 é um marco de entrega. A Praça está em governança fundacional individual. O poder de decisão será compartilhado progressivamente conforme contribuições, compromissos e responsabilidades efetivamente assumidos.
- **Escuta e evolução.** A oficina de prestação de contas de 26/11, informada pelo fundador, é oportunidade de escuta e validação em campo. Aldir Blanc é uma aplicação inicial de uma capacidade mais ampla de acompanhar relações, compromissos, realizações, recursos e evidências. Sustentabilidade integral e multidimensional orienta o produto. A taxonomia específica segue em elaboração.
- **Experimentos preservados.** Inteligência relacional e memória contextual e temporal são direções de evolução. REL-01, IA-MEM, ValueFlows e Graphiti seguem experimentais, com integração incremental baseada em evidências. Sem mudança de arquitetura, schema ou implementação do TAP 08 nesta missão.
- **GitHub e Vercel.** `release/digitap-cons-03` aponta para `3e2f93b17ee85fd4cc156ab35fbb38b05b707e9e` e `main` permanece em `cfa65fe37e5aae2113e92dd64c2b410e97f8d16e`. A consulta prévia indicava criação automática desabilitada, mas a operação gerou o preview Git `dpl_B754kgfz3V798jm8BehtX7ur3vFD`, com proteção observada na requisição anônima. O target Production permaneceu em `dpl_ovMkpued6TcgVR7ZSFGyLYeX7ohR`. Nenhum PR, promoção ou mudança de configuração.
- **Banco.** Supabase original em PostgreSQL 17.11, 14 migrations, TLS observado e zero buckets e objetos. A exportação atual está bloqueada pela ausência de conexão PostgreSQL recuperável em canal autorizado. Um arquivo histórico de 19/11, com 11 versões no ledger, passou em ensaio isolado de restauração. Esse resultado cobre o snapshot histórico. CONS-03B permanece preparado e condicionado a um ponto de recuperação atual verificado e autorização específica.
- **Evidências.** Relatório e manifesto em `~/projects/digitap-evidencias/cons-03a/20261124-preservacao-3e2f93b`. Artefatos de banco em diretório privado separado. Sem DDL ou escrita de dados em produção.

---

# CONS-02 — integração local, 24/11/2026

- Integração local em `3e2f93b17ee85fd4cc156ab35fbb38b05b707e9e`, com pais `934f7efde02f88ac5ddb448375555e82d990c3a9` e `cfa65fe37e5aae2113e92dd64c2b410e97f8d16e`. SitRep conserva LIC-01B e os checkpoints técnicos. Aplicação, scripts, schema e lockfile preservados.
- Vitest 1.010/1.010, Chromium 5/5 com Gateway simulado, typecheck, lint sem erros e build aprovados. PostgreSQL/Storage amplo chegou a 283/284 após alinhar as fixtures legadas ao consentimento. O arquivo restante passou 28/28 depois de ajustar o detector do lock real. Limpeza local confirmada e servidor encerrado.
- Produção permanece em `cfa65fe`, deployment `dpl_ovMkpued6TcgVR7ZSFGyLYeX7ohR`. Deploy automático por Git desabilitado. As três migrações anteriores constam no ledger e somente `20261120224204` está pendente entre as quatro examinadas. Não há bucket no Storage original nem configuração de bucket ou Gateway no ambiente Vercel Production. Auth exige confirmação e tem SMTP configurado. Backup listado vazio e PITR desativado. É necessário comprovar recuperação antes de DDL.
- CONS-03 requer autorizações específicas para Git remoto, recuperação/DDL, bucket e variáveis, deploy manual e homologação autenticada. A meta de 30/11/2026 permanece vigente. Relatório e manifesto conferidos em `~/projects/digitap-evidencias/cons-02/20261124T201110Z`. Nenhuma configuração ou dado remoto foi alterado.

---

# CONS-01 — consolidação para entrega de produto, 24/11/2026

- **Direção do fundador.** Disponibilizar até 30/11/2026 a versão mais completa, funcional e útil que possa ser entregue com segurança. Garagem-30 é marco de entrega. A limitação anterior a uma demonstração G4/G6 foi superada. IA-MEM e Graphiti permanecem preservados para integração incremental posterior.
- **Candidata.** `recovery/g4-20261124` em `934f7efde02f88ac5ddb448375555e82d990c3a9`, filho de `917b9e3644a16ce59460559a5eba61c92107cb0e`. O commit contém os 12 arquivos G5 conferidos contra a cópia congelada. Valem como evidência de checkpoint os 1.010 testes padrão, 184 físicos e cinco E2E. A rodada focal posterior aprovou 83 testes. O arquivo gerado `next-env.d.ts` e as evidências locais ficaram fora do commit.
- **Reconciliação preparada.** O GitHub confirmou `cfa65fe37e5aae2113e92dd64c2b410e97f8d16e` em `main`. A simulação de três vias com objetos descartáveis identificou somente `sitrep/PROJECT_PLAN.md` e `sitrep/STATUS_REPORT.md`. Em ambos, preservar o bloco da candidata dentro dos marcadores e manter o bloco LIC-01B já incorporado fora deles. `package.json` foi combinado automaticamente. O gate online de `ab2da55` equivale a `67d58f4` por patch-id. As superfícies de licença, contribuição, README e Termos do squash remoto coincidem com as equivalentes da candidata. A origem/licença pendente do ZIP associado ao módulo experimental ValueFlows continua registrada.
- **Gate da árvore integrada.** Após autorização para integrar, resolver os dois blocos acima, conferir a árvore resultante e executar `git diff --check`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, a suíte PostgreSQL/Storage com `npm run test:onboarding:db` usando o ambiente local isolado e as credenciais de teste, e os specs `e4.spec.mjs` e `g4-03b-contextual-idea.spec.mjs` pelo harness local com Gateway simulado. Registrar versão testada e limpeza de fixtures. Os resultados anteriores continuam vinculados ao checkpoint G5.
- **Gate de infraestrutura antes da atualização.** Confirmar em leitura no Supabase original o ledger, tabelas e políticas, Auth/SMTP, TLS, backup verificável e bucket privado `SUPABASE_PRIVATE_EVIDENCE_BUCKET`. Em relação a `cfa65fe`, a candidata acrescenta a migração `20261120224204` de evidências privadas e liga Storage no ambiente local. A inspeção de 19/11 também encontrou ausentes `20261115230335` (E4), `20261115233000` (necessidades de atividade) e `20261116120000` (planos de execução). Determinar o conjunto real pendente pela leitura atual, antes de aplicar qualquer DDL. Confirmar no Vercel original o deployment de retorno, vínculo da branch e gatilho automático, configuração Supabase, bucket e presença da configuração do Gateway sem exibir segredos.
- **Publicação sujeita a autorização específica.** Autorizar separadamente a integração Git, o push e incorporação à `main`, eventual DDL pendente e configuração de ambiente/bucket, e a ativação em produção. Se a incorporação à `main` acionar deploy automático, liberar essa ação apenas após o gate de infraestrutura e com autorização de deploy. Executar então o gate público existente com `./node_modules/.bin/playwright test --config=playwright.online.config.mjs --project=chromium`. Ele observa o domínio público e não cria conta ou atividade. Homologação autenticada com fixtures e eventual inferência real exigem autorização própria. Se a ativação falhar, voltar ao deployment anterior e tratar o banco separadamente, sem remoção automática de dados ou tabelas.
- Nesta rodada houve commit local e leitura do GitHub. Nenhum merge, push, deploy, migration, instalação ou inferência paga.

---

# G5 — estabilização e congelamento local, 24/11/2026

- [CÓDIGO] R4 versionado seletivamente em `917b9e3644a16ce59460559a5eba61c92107cb0e` (`BASE_G5`), filho de `146ffd135d5b56f47b880edc1f4c3ca4174845c0`. Os quatro arquivos e os manifestos independentes de R4 foram conferidos. G5 permanece sem commit. `next-env.d.ts` continua separado como artefato gerado pelo Next.
- [CÓDIGO] Revogação E4 efetiva no commit da mudança de status. RED concorrente com três PASS e dois FAIL. GREEN com os cinco cenários aprovados na regressão PostgreSQL. Revogação anterior à coleta exclui o projeto e preserva o contexto próprio. Quando observada na rechecagem anterior ao interpretador, a revogação impede a chamada. Quando observada após o início da inferência, descarta a resposta ainda pendente. A colaboração ativa conserva a projeção mínima. Permanecem as janelas entre cada leitura e a ação seguinte, além da possibilidade de revogação e reativação entre as leituras. A rechecagem não apaga dados já enviados nem cancela o provedor. URLs assinadas já emitidas permanecem válidas até o TTL aplicável de até 300 segundos.
- [CÓDIGO] Vitest padrão passou 1010/1010 em 96 arquivos. Regressão local PostgreSQL e Storage passou 184/184 em nove arquivos, incluindo falha após inserir a atividade e antes de registrar sua auditoria, rollback e repetição do pedido. O teste de conversão passou a recusar namespace ocupado, com limpeza restrita aos IDs da rodada. Fixtures editoriais e do E4 foram alinhadas ao consentimento já exigido, usando a autorização emitida pelo fluxo vigente.
- [CÓDIGO] Chromium com sandbox passou 5/5, sem skips. O teste de teclado cobre Taps, foco visível e ordem lógica, nomes acessíveis, consentimento, alerta, descarte de sugestão e revisão manual. O RED expôs a perda de foco após salvar. O GREEN confirma retorno ao status de salvamento. O percurso essencial funcionou sem Graphiti. O Gateway simulado registrou cinco chamadas, três contextuais e uma falha simulada, com duas tentativas de `fetch` externo bloqueadas. Servidor encerrado e zero resíduos nos namespaces sintéticos e buckets verificados. A cobertura de acessibilidade se limita à jornada exercitada.
- [CÓDIGO] Build versionado, typecheck e diff passaram. Lint teve zero erros e quatro avisos preexistentes. O redutor temporal externo passou 11/11 offline e permanece separado do candidato. Os contratos experimentais IA-MEM e o Graphiti físico não estavam no checkout. O plano Garagem-30 original não foi localizado nos arquivos locais consultados. A reconciliação local e a missão do fundador orientaram esta execução.
- [DECIDIDO] TAP 08 — Prestação de Contas da Lei Aldir Blanc é um incremento independente, condicionado à pesquisa dos instrumentos e requisitos aplicáveis em Itaperuna. A implementação fica fora de G5.
- [EVIDÊNCIA] Relatório, matriz concorrente e manifesto em `operations/evidence/g5-20261124`. A rodada Chromium final está em `operations/evidence/g4-03b-recovery-20261124T180439Z`. O destino do congelamento local independente é `~/projects/digitap-evidencias/g5/20261124T180439Z`. G6, prontidão de produção e inferência real permanecem fora deste resultado.

---

# R4 — recuperação e validação física local, 24/11/2026

- [CÓDIGO] Em `BASE_R4` (`146ffd135d5b56f47b880edc1f4c3ca4174845c0`), o candidato Kong já corrigido foi reutilizado. Os logs da tentativa anterior mostraram início de workers e leitura da configuração declarativa cerca de três segundos após a partida. `State.Error` estava vazio, sem OOM, e o exit 137 ocorreu no intervalo do rollback. Os eventos disponíveis foram incompletos. A causa exata da leitura inicial do binding permaneceu indeterminada.
- [CÓDIGO] A ativação aguardou publicação e prontidão em janela limitada. Docker confirmou a publicação exclusiva em `127.0.0.1:56151` após 0,4 s, seguida de HTTP 200 para Auth, PostgREST e Storage. O original permanece desligado como `supabase_kong_a-praca-v1-5-rollback-20261124T173340Z`, com reinício desativado. IDs, horários de início, contagens de reinício e montagens dos demais serviços foram preservados na ativação.
- [CÓDIGO] Preflight SQL somente leitura confirmou 14 tabelas, o RPC, colunas exigidas, 15 migrations já aplicadas e namespace vazio na instância Docker local. PostgreSQL passou 4/4 com Gateway simulado. Chromium com sandbox habilitado passou no smoke e os dois cenários Playwright passaram (2 PASS, 0 FAIL, 0 SKIP). O Gateway simulado registrou quatro chamadas, duas contextuais e uma falha simulada. Duas tentativas de `fetch` externo foram bloqueadas pelo preload. O isolamento observado se refere ao harness e às interfaces verificadas.
- [CÓDIGO] O servidor Next desta rodada foi encerrado e o cleanup dos testes foi confirmado por IDs próprios e consulta posterior somente leitura, com zero usuários sintéticos G4 e zero marcadores. Typecheck e diff passaram. Lint teve zero erros e quatro avisos preexistentes. O Next gerou apenas a troca dos imports de tipos em `next-env.d.ts` para `.next/dev/types`; o arquivo foi preservado para revisão e fica fora de um futuro commit R4.
- [EVIDÊNCIA] PostgreSQL e readiness em `operations/evidence/g4-03b-recovery-kong-20261124T173340Z`. Playwright, Gateway, bloqueios, encerramento e cleanup em `operations/evidence/g4-03b-recovery-20261124T173552Z`. Cópia sanitizada independente conferida por SHA-256 em `~/projects/digitap-evidencias/g4-recovery/20261124T173552Z`. Validação física local de R4 concluída, sem inferência real, instalação, migração, commit ou deploy. G5, G6 e prontidão de produção permanecem fora do escopo.

---

# R4 — tentativa integrada de recuperar o Kong, 24/11/2026

- [CÓDIGO] Na base `146ffd135d5b56f47b880edc1f4c3ca4174845c0`, os metadados do Docker confirmaram que `kong.yml` mantinha conteúdo e modo, mas o dono havia mudado de `0:0` para `100:65533`. Os outros três arquivos estavam ausentes ou ilegíveis no candidato inicial. A cópia dos TARs sem a opção de remapeamento do proprietário corrigiu a divergência. A leitura de retorno confirmou conteúdo, UID, GID e modo dos quatro arquivos antes da ativação.
- [BLOQUEADO] A tentativa integrada iniciou a ativação do candidato com configuração de porta `127.0.0.1:56151`. A verificação imediata do binding efetivo falhou e acionou rollback. O original voltou ao nome `supabase_kong_a-praca-v1-5`, desligado com exit 127 e política `unless-stopped`. O candidato ficou desligado com política `no` e nome `supabase_kong_a-praca-v1-5-failed-20261124T172912Z`. PostgreSQL, Auth, PostgREST, Storage e Inbucket foram observados em execução após o rollback. A causa da divergência do binding não foi comprovada.
- [PENDENTE] Auth, PostgREST e Storage via Kong ficaram sem validação. Os quatro testes PostgreSQL e os dois testes Playwright permanecem sem execução. A frente foi encerrada após esta tentativa integrada. Nenhum volume foi removido e nenhuma fixture foi criada. Evidência sanitizada em `operations/evidence/g4-03b-recovery-kong-20261124T172912Z`.

---

# R4 — recuperação estática, 24/11/2026

- [CÓDIGO] Em `BASE_R4` (`146ffd135d5b56f47b880edc1f4c3ca4174845c0`), o spec e o preload foram recuperados do snapshot verificado e o patch complementar foi aplicado com `git apply --check` seguido de `git apply`. Os hashes das fontes estão no registro de preflight anterior. O Playwright descobriu os dois cenários seriais. A raiz da worktree persistente é conferida pelo diretório corrente e pelo caminho real do módulo.
- [CÓDIGO] `scripts/e2e-server.mjs` integra o preload somente no modo G4-03B. Esse modo exige configuração sintética explícita, recusa arquivos env que o Next carregaria e passa um ambiente restrito ao filho. Os testes estáticos verificaram guardas de raiz e configuração, destinos bloqueados, falha simulada e rejeição de projeção fora do contrato. Um processo filho Node com o mesmo parser e formatador de opções do Next recebeu o preload. A árvore de processos do Next real permanece sem verificação.
- [CÓDIGO] O preload bloqueia destinos externos de `fetch` e redirecionamentos no transporte local. O spec mantém interceptação HTTP do contexto, bloqueia service workers e restringe WebSockets ao Next local. As chamadas `page.request` usam a origem fixa do Next e desativam redirecionamentos. O cliente Supabase do spec também restringe a origem e recusa redirecionamentos. Esses controles atuam nas interfaces testadas, sem comprovar isolamento de rede no sistema operacional.
- [INFORMADO] O fundador validou Chromium no Terminal e reportou Docker operacional, PostgreSQL ativo em 56152 e Kong encerrado com exit 127, sem listener na porta 56151. O diagnóstico do sandbox da rodada anterior permanece registrado abaixo.
- [BLOQUEADO] Os dois cenários Playwright exigem a API local em 56151. Os quatro cenários PostgreSQL também dependem dela, apesar das consultas SQL diretas e dos handlers em processo. O `beforeAll` chama criação de usuários Auth e o RPC `criar_pf_com_sujeito` via HTTP, e o `afterAll` exclui os usuários pelo Auth. A suíte original e seu hash foram preservados. A execução segue condicionada à API local isolada, conferência de schema e RPC, namespace sintético vazio e limpeza por IDs.
- [EVIDÊNCIA] Verificações do harness em `operations/evidence/g4-03b-recovery-20261124T170707Z`. As chamadas registradas são simulações do preload, sem servidor Next, navegador ou execução física. Nenhuma fixture foi criada. G4 mantém os gates físicos pendentes.

---

# R4 — preflight bloqueado, 24/11/2026

- [CÓDIGO] `BASE_R4` é `146ffd135d5b56f47b880edc1f4c3ca4174845c0`, filho direto de `1fd3d721c0676cf4041ed09cbfbfddaf413c214d`. O commit R3 contém os nove arquivos esperados. A worktree iniciou limpa e a regressão 123/123 de R3 permanece vinculada a essa base.
- [CÓDIGO] Os hashes do snapshot G4-03, do spec, do preload, do ZIP complementar, do patch e da suíte PostgreSQL conferem. O README e o patch foram lidos. As fontes permaneceram no pacote nesta rodada. A adaptação da raiz, a integração do preload no servidor e seus testes negativos ficaram pendentes após o bloqueio de preflight.
- [BLOQUEADO] O CLI local do Supabase retornou exit 1 por acesso negado ao socket do Docker. Origem da instância, Auth, schema e namespace sintético ficaram sem confirmação. O Playwright 1.64.1 encontrou Chromium 1248 no cache do projeto principal. O smoke com as proteções do Chromium habilitadas terminou com `SIGTRAP` antes de abrir a página. A causa do sinal não foi comprovada.
- [PENDENTE] Quatro cenários PostgreSQL preparados e dois cenários Playwright identificados nas fontes. Nenhum foi executado. Nenhuma fixture foi criada, nenhum servidor foi iniciado, nenhuma chamada ao Gateway ocorreu e nenhum arquivo gerado mudou. O isolamento do harness e a validação física seguem pendentes. Typecheck e diff passaram. Lint teve zero erros e quatro avisos preexistentes.
- [EVIDÊNCIA] Preflight sanitizado, hashes das fontes e manifesto em `operations/evidence/g4-03b-recovery-20261124T165356Z`. A escrita da cópia independente foi recusada pelo sandbox. G4 permanece com gates pendentes. G5 e G6 continuam fora deste escopo.

---

# Recuperação seletiva do G4, R3 — 24/11/2026

- [CÓDIGO] O fundador versionou R2 em `1fd3d721c0676cf4041ed09cbfbfddaf413c214d` (`BASE_R3`), filho de `487669e8e510a19f5e4703342ce95f20c2bdc29b`. O gate de minimização registrado abaixo confirmou titularidade e colaboração ativa com dados sintéticos. A projeção anterior falhou em 2 de 11 testes por enviar `provenance.access`; o código versionado passou 11/11. A regressão de R3 incluiu os dois casos.
- [CÓDIGO] R3-A recuperou os patches RED e GREEN de `digitap-g4-03-correcao-revisao-manual.zip` (SHA-256 `42f9841e2483ddf1490b25943758b9b9c8d71b3514a6ba85bb2d286589e126f8`). RED com 5 PASS e 3 FAIL por prévia e sugestões obsoletas na edição, lista e preparação. GREEN com 23/23 na regressão de componentes. A revisão humana prevalece. A edição invalida a interpretação anterior, pode ser salva sem nova inferência com `revisedInterpretation: null` e respeita `expectedVersion`. O histórico original é preservado. Um ajuste local com regressão garante que restaurar a prévia de uma ideia revisada recupere apenas sugestões da versão revisada.
- [CÓDIGO] R3-B recuperou os patches RED e GREEN de `digitap-g4-03-activityform-incremento.zip` (SHA-256 `0233f09cdb4bdb730692926d9907eeeb527c7e64e8044761e43ee1b9a918444e`). RED com 2 PASS e 2 FAIL pelo preenchimento da descrição com a interpretação antiga. GREEN com 4/4. Com texto revisado e interpretação nula, o campo inicia vazio e a pessoa informa a descrição antes de confirmar a criação do rascunho privado.
- [PENDENTE] R3-C aplicou `01-teste-persistencia.patch` de `digitap-g4-03-persistencia-manual.zip` (SHA-256 `ea06d0422f28f21249900d398cbc312cb2fe5a439209a2efb1ae4c5009b8effc`). O quarto cenário foi inserido antes da revogação, com fixtures e limpeza originais preservadas. **4 CENÁRIOS PREPARADOS — EXECUÇÃO PENDENTE.**
- [CÓDIGO] Regressão conjunta com mocks de R1, R2, R3 e HTTP passou 123/123 em 10 arquivos. Typecheck e diff passaram. Lint registrou zero erros e os mesmos quatro avisos preexistentes. A sessão não executou inferência real, publicação, banco, build, deploy ou Playwright. R3 permanece sem commit. A regressão de navegador de R4 e a revogação concorrente de G5 permanecem pendentes.

---

# Recuperação seletiva do G4 — 24/11/2026

- [CÓDIGO] R1 foi versionado localmente pelo fundador no commit `487669e8e510a19f5e4703342ce95f20c2bdc29b`, que é a `BASE_R2`. O snapshot B forneceu `ParticipationTaps.tsx`, as páginas de Meu espaço e do dashboard PF e os dois testes de R1. O dashboard organizacional foi reconstruído a partir do HEAD anterior, com import, renderização após autorização e âncora junto ao perfil. Histórico de R1 com 7 PASS e 6 FAIL no RED e 13/13 no GREEN. A revalidação focal antes do commit também passou 13/13.
- [CÓDIGO] Proveniência de R2 conferida por SHA-256. Snapshot A (`digitap-g4-02-fontes-20261124-020022-82238.tar.gz`, `9ff14bbe24bf4f0dc3ef234bb83a071ec1dad5d3dc06e7ec26c83c4b15d42644`) forneceu `src/lib/proposals/interpret.server.ts` e `tests/activities/proposal-interpretation.test.ts`. Snapshot B (`digitap-g4-03-fontes-20261124-021919.tar.gz`, `1345951be947108db1fea1e5f2d5aaa284d519e53d4779d0a8cf50ac6f5a4d40`) forneceu a rota `src/app/api/propostas/interpretar/route.ts`, `src/lib/proposals/context.server.ts`, `src/components/ProposalForm.tsx` e os testes `g4-01-idea-context.contract.test.ts`, `proposal-form.test.tsx`, `g4-03-contextual-idea-journey.test.tsx` e `g4-03-contextual-idea.database.test.ts`. A projeção de projetos manteve o campo de proveniência da fonte e omitiu a modalidade de acesso.
- [CÓDIGO] RED de R2 com 55 PASS e 9 FAIL funcionais (exit 1). Quatro falhas ocorreram porque a rota recusava o formato contextual antes do E4, uma porque o interpretador só enviava o texto legado e quatro porque faltava o controle de contexto no formulário. GREEN com 64/64 e regressão focal com 108/108, incluindo R1 e a suíte HTTP. Typecheck passou e lint registrou zero erros e quatro avisos preexistentes. Os testes focais usaram mocks de rede, Gateway e persistência.
- [CÓDIGO] R2 recupera o contexto opcional com escolha e consentimento explícitos, autorização no servidor, projeção mínima e revisão humana. Ativar, desativar ou trocar o sujeito invalida a interpretação anterior. A troca de sujeito revoga o consentimento. R3 permanece pendente e abrange os patches posteriores de revisão manual, ActivityForm, persistência manual e segundo E2E. R2 permanece sem commit.
- [CÓDIGO] Gate adicional de minimização de R2 em `tests/activities/g4-01-idea-context.contract.test.ts`. Dois cenários sintéticos de titularidade e colaboração ativa verificam na rota que título, descrição, ano e fonte chegam ao interpretador simulado sem IDs internos, escopos ou modalidade de acesso. A resposta permanece uma prévia para revisão humana, sem concessão de autorização ou chamada externa. A projeção original do snapshot B foi exercitada em cópia isolada e produziu 9 PASS e 2 FAIL pelo campo `provenance.access`. O código vigente passou 11/11, sem alterações de produção. Typecheck passou e lint registrou zero erros e os mesmos quatro avisos preexistentes.
- [PENDENTE] PostgreSQL **PREPARADO — EXECUÇÃO PENDENTE DE AUTORIZAÇÃO**. Os três cenários originais cobrem modo legado, autorização e projeção com salvamento e conversão privados, e revogação antes de nova recuperação. A revogação concorrente permanece pendente de G5. A sessão ocorreu sem conexão ao banco, inferência real ou deploy.
- [HISTÓRICO] A worktree temporária anterior foi perdida. A causa permanece sem comprovação. Para manter a continuidade, usar worktrees persistentes e versionar cada incremento após o aceite técnico.

---

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
