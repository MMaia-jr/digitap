# A Praça — Plano

## Painel operacional — 15/11/2026

Este painel complementa o histórico preservado abaixo. Não autoriza execução
automática, publicação ou ampliação de escopo.

### E2.2 — Minhas ideias: rascunhos privados, 15/11/2026

- **Escopo autorizado:** persistir ideias somente por ação explícita da pessoa;
  listar, retomar, editar com controle de versão e excluir os próprios
  rascunhos. Nenhuma interpretação cria projetos, atividades, sujeitos,
  vínculos, confiança ou publicação.
- **Resultado local e aceite humano:** o proponente aceitou o resultado técnico
  local da E2.2 em 15/11/2026. Duas
  migrações aditivas foram aplicadas somente ao Supabase local: tabela privada
  `public.ideias_privadas` e campo separado `revised_text`. RLS, privilégios
  mínimos e filtros de proprietário foram exercitados no PostgreSQL local.
  Dados preexistentes foram preservados; não houve reset.
- **Validação observada:** `npm test`: **827 PASS**; integração
  `npm run test:onboarding:db`: **232 PASS**; E2E: **4 PASS, 0 FAIL, 0 SKIP**.
  TypeScript, ESLint e `git diff --check`: PASS. A E2E usou duas identidades
  fictícias, aplicação/Auth/PostgreSQL locais e mock somente do Vercel AI
  Gateway. O relatório final registra a limpeza das duas contas sintéticas.
- Os testes RED reproduziram validação incompleta do contrato, limite de corpo
  insuficiente para o texto de proposta e rejeição de Host confiável na rota
  autenticada; as correções permaneceram nos limites autorizados e passaram
  pelas regressões. A interface salva apenas após ação explícita; retomar não
  chama novamente a IA. Texto original e trechos de origem são preservados;
  revisões ficam em campos próprios.
- **Limites:** evidência exclusivamente local. Kimi/Gateway real, Cloud,
  e-mails de produção, operação de produção, DOG-01 e VH-01–VH-03 não foram
  validados. A política de retenção e descarte de produção continua pendente.
  Não houve commit, push, deploy, migration remota ou chamada paga.
- **Estado de sequência:** E2.2 concluída tecnicamente localmente e aceita
  pelo proponente no escopo testado. E2.3 e demais incrementos
  continuam não iniciados e sem autorização. Nenhuma próxima etapa é iniciada
  automaticamente.

### E2.1 — revisão manual temporária, 15/11/2026

- **Autorização humana específica:** editar descrições das categorias existentes,
  corrigir tipos de sujeito somente nos quatro valores do contrato, editar origem,
  destino e tipo das relações, descartar sugestões e restaurar a prévia original.
  Trechos de origem imutáveis; correções somente em memória, perdidas ao sair.
- Base desta execução: `main`, HEAD
  `3f480db68c0132402ca11b426a2dfdb3d5879e1d`, sincronizado com `origin/main`.
  Os dois commits E1 já foram publicados no Git; as 117 evidências não rastreadas
  anteriores foram preservadas. Nenhum commit/push/deploy foi feito em E2.1.
- **Resultado local:** implementação concluída tecnicamente, aguardando revisão
  humana. RED: 20 novos testes falharam por comportamento ausente; 10 existentes
  passaram. GREEN específico: 30 PASS. Regressão `npm test`: **807 PASS**, 69
  arquivos, zero FAIL/SKIP. TypeScript sem emissão/incremental, lint geral e
  `git diff --check`: PASS (exit 0).
- **Aceite humano E2.1:** o proponente aprovou o resultado local desta revisão
  temporária em 15/11/2026. E2.2 permanece não iniciada e sem autorização.
- Testes: `tests/components/proposal-review.test.tsx` e regressões existentes.
  Cobrem edição, descarte nas sete categorias, restauração sem nova requisição,
  trechos imutáveis, limite de 1.000 caracteres por campo, teclado/foco,
  conteúdo malicioso escapado e ausência de persistência ao remontar.
- Escopo efetivo: `src/components/ProposalForm.tsx`, novo teste de revisão e
  este plano. Função `interpretProposal`, contrato e endpoint HTTP intactos.
  Somente mocks; nenhum Kimi real, E2E, integração com banco ou produção
  revalidado neste incremento. Os aceites integrados E1 abaixo são históricos.
- **Limites:** sem salvamento no navegador/servidor/banco, novas entidades,
  representação, vínculos, publicação ou verificação. Campos vazios são rascunhos
  sinalizados para revisão, não dados aprovados. As sugestões continuam não
  verificadas, inclusive após correção humana.
- **Próxima ação:** revisar este diff e o resultado local. Demais incrementos E2,
  persistência e I6+ continuam sem autorização. Não iniciar outra etapa.
  Rollback exige autorização e deve atingir apenas o diff E2.1, preservando
  evidências e demais trabalhos; sem reset/clean.

### Estado e evidências — fotografia do encerramento E1

- Branch: `main`.
- HEAD: `8a5d1199f4cc26906cd9ff30e75e625578e33cf9`.
- Índice vazio na conferência deste checkpoint.
- Working tree com alterações locais legítimas pendentes de navegação,
  onboarding, interpretação assistida, testes e documentação.
- E1 executada localmente: **4 E2E novos, 60 E2E de regressão, 229 testes de
  integração e 787 unitários/componentes PASS**, sem FAIL/SKIP. TypeScript,
  ESLint e diff check aprovados; **não reexecutados neste encerramento**.
- Correspondência das evidências com a árvore local conferida por HEAD,
  hashes dos arquivos preexistentes e diff dos dois testes adicionados em E1.
- Os incrementos recentes permanecem sem commit, push ou deploy.
  Nenhum teste real do Kimi foi realizado.

| Frente | Estado local | Evidência ainda necessária |
| --- | --- | --- |
| Acesso/onboarding | Percurso local de duas identidades até conclusão PF e prévia aprovado em E1, com confirmação, sessão, logout, segundo login e não duplicação | Operação de produção ainda não validada por E1; OAuth real não comprovado por esses testes |
| Assistente IA | Função, interface e rota HTTP real aprovadas em E1 com Gateway mockado; prévia sem persistência | Kimi/Bedrock real, política efetiva, orçamento e limites de produção; limitador atual por processo |
| Feed/projetos/matching | Atividades públicas, projetos e colaboração existentes; feed ampliado, capacidades persistentes e matching ainda candidatos | Contratos, consentimento, visibilidade e percursos aprovados |
| PoWth | Registros, evidências, histórico editorial e portfólio existentes; motor completo futuro | Competência verificadora e contrato operacional, sem pontuação universal |

Código local, testes com mocks, produção e validação humana são estados
distintos. E-mail, PostgreSQL/TLS e configurações Cloud não foram
reverificados neste checkpoint.

### Direção humana e limites

**Direção humana já expressa:** realizar o **DOG-01 integrado depois de
prepararmos diversos percursos funcionais do DigItap**, permitindo avaliar
a experiência conectada.

Essa direção preserva **VH-01 — compreensão, VH-02 — uso e VH-03 — decisão**,
sem declará-los cumpridos. Não dispensa testes automatizados, segurança
ou aprovação de release.

As autorizações recentes de IA têm alcance específico. A preparação de
outros percursos continua condicionada às decisões e autorizações exigidas
por I5/I6+. A ordem desejada para DOG-01 não libera esses incrementos
automaticamente nem aprova todo o conteúdo das investigações.

### Etapa ativa, próxima ação e bloqueios

- **E0 — concluída documentalmente:** painel aprovado pelo proponente e
  registrado; histórico, dívida CONTRACT e alterações anteriores preservados.
- **E1 — concluída tecnicamente, com aceite humano do resultado local:**
  aceite expresso pelo proponente no pedido de encerramento de 15/11/2026.
  Nenhum defeito de produção foi identificado na E1; não houve correção de
  código de produção. Isso não afirma ausência geral de defeitos no produto.
- **E2.1 — revisão manual temporária concluída tecnicamente e aceita pelo
  proponente no escopo acima. E2.2 — rascunhos privados concluídos
  tecnicamente em ambiente local e aceitos pelo proponente em 15/11/2026.**
  E2.3 e demais incrementos continuam não iniciados e sem autorização.
  Nenhuma etapa seguinte está ativa.
- **Pendências:** Kimi real, Cloud, e-mails de produção, PostgreSQL/TLS e sessão
  de produção não validados por E2.2; orçamento e política de retenção de
  produção ainda pendentes.
  DOG-01 e VH-01–VH-03 permanecem não validados.
- O aceite humano desta execução local não equivale a DOG-01 ou I5.
  Não ampliar E2 automaticamente a partir da autorização limitada de E2.1.

### Fila única e sequência condicionada

Somente uma etapa poderá estar ativa. Cada transição exige evidência,
decisão e autorização compatíveis com seu escopo.

| Etapa | Pilar / incremento | Critério de saída ou dependência |
| --- | --- | --- |
| E0 — concluída documentalmente | Planejamento: consolidar este painel | Aprovação documental e gravação; nenhuma implementação |
| E1 — concluída tecnicamente e aceita pelo proponente no escopo local | Acesso/onboarding: jornada autenticada até a prévia, com rota HTTP real e Gateway mockado | 4 E2E novos, 60 E2E de regressão, 229 integração e 787 unitários/componentes aprovados; produção não validada |
| E2.1 — revisão manual temporária concluída localmente e aceita | Assistente IA: editar/descartar/restaurar a prévia, sem persistência | Aceite registrado; sem criação automática de autoridade |
| E2.2 — rascunhos privados concluídos tecnicamente localmente e aceitos pelo proponente em 15/11/2026 | Assistente IA: salvar explicitamente, listar, retomar, editar e excluir ideias privadas | 827 unitários/componentes, 232 integração, 4 E2E (0 FAIL/SKIP), TypeScript, ESLint e diff check PASS; Cloud/Kimi/produção e política de retenção não validados |
| E3 — candidata | Feed/projetos: conectar descoberta e percursos existentes | Definir itens públicos, visibilidade e curadoria; preservar isolamento |
| E4 — candidata | Capacidades/matching: declarações e encontros explicáveis | Aprovar contrato, consentimento, disponibilidade e efeitos; sem ranking universal |
| E5 — candidata | Histórico PoWth: contribuição, proveniência e confiança contextual | Delimitar o incremento; preservar contestação/revogação; não antecipar motor completo ou certificação automática |
| E6 — condicionada | Integração dos percursos autorizados | Jornada conectada e regressões aprovadas; lacunas explícitas |
| E7 — condicionada | Preparação de release | Segurança, e-mail/TLS, orçamento, privacidade, candidato e rollback verificados; publicações com autorização própria |
| E8 — condicionada | DOG-01 integrado e portões humanos I5 | Definir critérios e registrar evidências próprios de DOG-01 e de cada VH-01–VH-03; dogfooding do fundador não comprova automaticamente a validação humana de I5; decidir continuidade |

Além da autorização restrita de E2.1, os demais incrementos E2–E5 são candidatos,
não compromissos de implementação. Antes de ativá-los,
resolver expressamente seu enquadramento nos condicionantes I5/I6+.
O resultado de DOG-01 orientará a continuidade; não representa adoção comprovada.
DOG-01, VH-01, VH-02 e VH-03 exigem critérios, participantes e evidências
identificados separadamente; nenhuma equivalência automática será presumida.

### Decisões pendentes

- Delimitar quais incrementos candidatos podem preceder I5 e sob quais
  exceções, sem transformar autorizações específicas em liberação geral.
- Deliberar continuidade/persistência da proposta além da revisão temporária E2.1,
  capacidades, matching e
  reivindicação antes de materializar novas entidades ou vínculos.
- Preservar autenticação ≠ perfil ≠ representação ≠ publicação ≠ verificação.
  Declaração de fundador ou interpretação da IA não estabelece propriedade.
- Manter a dívida CONTRACT abaixo: organizações v1, PF/coletivos v2 e
  leitor dual até intervenção especificamente autorizada.

Detalhes e fontes permanecem na
[matriz de rastreabilidade](../docs/investigacoes/MATRIZ-RASTREABILIDADE-CONVERSAS-2026-11-15.md).
Este painel não duplica nem aprova suas propostas canônicas.

### Aceite e evidências de E1

**Execução local concluída; aceite humano registrado em 15/11/2026.**
Evidências finais: [resultado](../operations/evidence/e1-aceite-20261115T151151Z/E1-RESULTADO.json),
[E2E E1](../operations/evidence/e1-aceite-20261115T151151Z/e2e.json),
[regressão E2E](../operations/evidence/e1-aceite-20261115T151151Z-regressao/e2e.json),
[integração](../operations/evidence/e1-aceite-20261115T151151Z/integration.json) e
[unitários/componentes](../operations/evidence/e1-aceite-20261115T151151Z/unit.json).

Os relatórios técnicos permanecem íntegros com o status do momento da execução;
o aceite humano posterior é registrado neste plano. As falhas preliminares
foram de seletor e seleção dos testes, corrigidas sem mudanças de produção.
Auth, PF e sujeitos sintéticos E1 remanescentes: zero. O servidor próprio foi
encerrado; mensagens sintéticas podem permanecer no Mailpit conforme as fixtures.
Não houve inferência paga, commit, push, deploy ou mudança Cloud na E1.
Os critérios abaixo foram exercitados no escopo local; não comprovam operação
em produção, Kimi real, DOG-01 ou VH-01–VH-03.

- Duas identidades fictícias percorrem confirmação, login → Praça e
  Meu espaço; comprovar conclusão PF, não duplicação, sessão persistente,
  logout e segundo login.
- Acessar Descreva sua ideia pela interface e receber as sete categorias,
  trechos de origem e condição de não verificadas.
- Usar aplicação, Auth e banco locais reais, com destinos validados.
  Exercitar a rota HTTP real; simular somente o Gateway no servidor,
  sem substituir o endpoint por resposta mockada no navegador.
- Rejeitar visitante, conta não confirmada/bloqueada, origem inválida e
  identidade enviada pelo cliente antes de chamar a IA.
- Comprovar isolamento, limites, bloqueio de duplicidade e falha segura,
  sem créditos reais ou criação de registros definitivos pela IA.
- Exigir zero FAIL/SKIP nos cenários obrigatórios, regressão pertinente,
  TypeScript, ESLint e diff check aprovados; registrar contagens reais.
- Registrar HEAD, diff inicial, comandos, exit codes, duração, cenários,
  condição do mock, limpeza das fixtures próprias e Git final.
  Não sobrescrever evidências ou registrar segredos/dados pessoais.

### Parada e rollback

Ambiente indisponível significa BLOQUEADO. Interromper diante de destino
não local, chamada paga, falha de autorização, exposição de dados,
alteração inesperada ou limpeza incompleta.

Encerrar somente processos próprios. Reverter apenas o diff exclusivo do
incremento, mediante autorização, preservando todas as alterações anteriores.
Não usar reset/clean nem apagar dados permanentes.

Cada release exigirá autorização e procedimento próprio, com deployment
anterior identificado. Este plano não autoriza rollback de produção.

---

## Histórico preservado — fases e dívida CONTRACT

## O que é

Infraestrutura cívica e comunitária para Itaperuna (RJ). Inclui pessoas físicas e coletivos informais, não só organizações. Critério de progresso é humano.

## Fases

- I1 Fundação: ✅ concluído
- I2 Autenticação: ✅ concluído
- I3 Atividades/Editorial/Evidências: ✅ concluído (20/20 cenários, commit 623ee50)
- I4 Titularidade inclusiva: ✅ 4/4 fases concluídas tecnicamente (EXPAND 27e81fc, BACKFILL 0f27cba, COMPAT 70c7ef9, CUTOVER 42be755)
- I5 Validação humana: ⏳ próximo, não iniciado (VH-01 compreensão, VH-02 uso, VH-03 decisão)
- I6+ Portfólio/Contas/IA/Rede: ⏳ condicional ao I5

## Próximo passo (I5 — validação humana)

CUTOVER técnico completo, com fechamento autorizado e lacuna documentada: base vazia, sem PF/coletivo real ainda. A prova humana fica em I5, com uma pessoa real de Itaperuna, sem substituí-la por testes automatizados.

1. VH-01 — compreensão
2. VH-02 — uso
3. VH-03 — decisão

I6+ permanece condicional ao resultado de I5. Esta atualização não inicia a validação humana nem autoriza fases posteriores.

## Dívida CONTRACT — prazo I5 ou I6

Migrar organizações de v1 para v2 na fase CONTRACT posterior, durante I5 ou, no máximo, I6, mediante autorização específica. Até lá, organizações continuam gerando v1 e PF/coletivos usam v2, com leitor dual. Não reescrever snapshots v1 existentes nem recalcular seus hashes.

Plano detalhado: `docs/plans/I4-2026-11-05.md`. Lacunas e limites da verificação: `operations/evidence/incremento-i4-cutover/FIXTURE-REGRESSION.md`.
