# DigItap — One Tap e Memória Contextual

**Identificador:** DIG-IA-MEM-01
**Data:** 22/11/2026
**Destino:** `docs/digitap/03-one-tap-memoria-contextual.md`
**Status:** Reconciliação estratégica; experimento proposto, não autorizado para implementação.

## 1. Contexto e continuidade

O DigItap é uma infraestrutura tecnológica em desenvolvimento para conectar necessidades, capacidades, pessoas, coletivos, organizações e realizações, preservando contexto, autorização e evidências.

Esta investigação acrescenta uma hipótese ao Norte do Produto: o diferencial competitivo do DigItap pode residir não apenas nas funcionalidades ou nos modelos de IA utilizados, mas na qualidade da memória contextual da economia real à qual esses modelos têm acesso.

Essa hipótese complementa, sem substituir, a confiança relacional, a autonomia dos participantes, o PoWth contextual e o horizonte Itaperuna → Brasil → Mundo.

A Praça permanece uma iniciativa comunitária independente. A implementação ou utilização do DigItap por A Praça não determina automaticamente a governança, a propriedade ou a titularidade jurídica de qualquer uma das iniciativas.

## 2. Direção de experiência — One Tap

A expressão **One Tap** representa a ambição de reduzir a complexidade da interação humana com o DigItap.

Uma pessoa deve conseguir expressar uma necessidade ou capacidade de forma simples e receber assistência contextual para encontrar alternativas e avançar em uma realização.

O sistema pode utilizar texto, interfaces simplificadas e, futuramente, outros meios de interação, conforme sua utilidade seja demonstrada.

One Tap não significa autorização irrestrita para executar ações automaticamente.

Interpretar, sugerir, declarar, autorizar, comprometer, realizar e verificar são operações distintas.

A IA auxilia o processo; as pessoas e os mecanismos de autorização preservam o controle.

**Estado:** direção de experiência recuperada do histórico conversacional. Não constitui contrato de interface ou autorização para novas implementações.

## 3. Hipótese tecnológica — HIP-IA-01

Uma IA que recupera informação contextual atualizada, pertinente e autorizada pode tomar melhores decisões assistivas do que uma IA sem esse contexto.

Para testar a hipótese, distinguimos três dimensões de memória:

| Dimensão | Conteúdo |
|---|---|
| Factual | Afirmações, fontes, versões, datas e condições de validade |
| Relacional | Sujeitos, vínculos, compromissos, autorizações e participações |
| Operacional | Necessidades, estados, pendências, resultados, contestações e encerramentos |

A memória deve representar mudanças ao longo do tempo.

Uma capacidade declarada não equivale a disponibilidade confirmada; um compromisso não equivale a uma realização; um relato não equivale a evidência examinada.

Todo registro utilizado pela IA precisa preservar proveniência, temporalidade, situação, escopo e autorização aplicável.

## 4. Hipótese econômica — HIP-ECO-01

A memória contextual pode gerar valor adicional por quatro mecanismos:

1. Mais necessidades efetivamente atendidas.
2. Menor tempo e esforço para encontrar e coordenar soluções.
3. Redução de erros, conflitos e decisões fundamentadas em informações inadequadas.
4. Reutilização de conhecimento obtido em realizações anteriores.

**Simulação exclusivamente ilustrativa:**

| Premissa | Valor |
|---|---:|
| Necessidades mensais | 100 |
| Atendidas sem memória | 20 |
| Atendidas com memória | 28 |
| Ganho de realizações | 8 |
| Margem incremental por realização | R$ 75 |
| Ganho por realizações | R$ 600 |
| 10 horas economizadas a R$ 30/h | R$ 300 |
| Custos adicionais | −R$ 150 |
| Valor incremental hipotético | **R$ 750/mês** |

O aumento de 20 para 28 atendimentos corresponde a 40% de crescimento relativo.

Nenhum desses valores foi observado ou validado no DigItap. Não são receita, projeção de mercado, demanda comprovada ou resultado de clientes.

O eventual valor econômico dos participantes não é automaticamente capturável como receita pela plataforma.

A disposição de pagar, o custo operacional, a sustentabilidade e os mecanismos legítimos de monetização exigem investigação independente.

## 5. Base técnica existente

A investigação deve reutilizar os mecanismos existentes antes de introduzir nova infraestrutura.

**Evidência no repositório remoto:** a função `src/lib/proposals/interpret.server.ts` interpreta propostas utilizando um modelo configurável da família Kimi via Vercel AI Gateway. A implementação inspecionada é limitada à interpretação do texto recebido, sem consultas ao banco de domínio, ferramentas executáveis ou persistência pela função.

**Evidência documental local:** o beta de 16/11/2026 registra PostgreSQL/Supabase, capacidades, necessidades, matching determinístico E4, atividades, projetos, colaboração e evidências. O estado efetivo desse beta deve ser confirmado no checkout local.

**Lacuna:** não há comprovação de uma memória contextual consultável pela IA com recuperação autorizada de informações operacionais.

Não se presume necessidade de treinar modelo próprio, construir banco vetorial, adotar grafo distribuído ou criar sistema de agentes autônomos.

## 6. Experimento proposto — IA-MEM-01

**Objetivo:** isolar o valor adicional da recuperação contextual autorizada.

Comparar as mesmas solicitações em três alternativas:

| Variante | Mecanismo |
|---|---|
| A | E4 — matching determinístico existente |
| B | IA sem acesso à memória do DigItap |
| C | IA com recuperação contextual autorizada |

**Conjunto inicial:** 30 casos sintéticos, com resultados esperados definidos previamente, abrangendo registros atuais, desatualizados, contraditórios, privados, revogados, incompletos e situações sem solução disponível.

**Métricas:**
- Precisão e relevância das alternativas sugeridas.
- Fidelidade às fontes e capacidade de explicar resultados.
- Reconhecimento de informação desatualizada ou contraditória.
- Vazamento de dados entre sujeitos: tolerância zero.
- Tempo de resposta e custo por consulta.
- Capacidade de reconhecer ausência de evidência suficiente.

**Critério de continuidade:** a variante C precisa demonstrar melhoria relevante em relação às alternativas A e B, mantendo as restrições de autorização e custos justificáveis.

O experimento técnico não comprova valor econômico. Essa segunda hipótese exige observação de necessidades e realizações reais, mediante autorização apropriada.

**Estado:** especificação inicial para deliberação. Não implementado por este registro.

## 7. Segurança, soberania e confiança

A recuperação de informações deve obedecer à autorização antes da exposição ao modelo.

Identidade de conta, titularidade de sujeito, representação, autorização editorial, consentimento de divulgação e verificação de fatos permanecem conceitos independentes.

A implementação experimental, caso aprovada, deverá:

- Utilizar dados sintéticos inicialmente.
- Recuperar apenas campos necessários e autorizados.
- Preservar fonte, versão, data e situação da informação.
- Não executar publicação, contratação ou pagamento automático.
- Falhar de modo seguro quando não houver informação suficiente.
- Preservar portabilidade da memória e independência em relação ao fornecedor do modelo.

O modelo de linguagem não decide sozinho permissões de acesso ou legitimidade institucional.

## 8. Trade-offs arquiteturais

| Alternativa | Benefício | Risco ou custo |
|---|---|---|
| Manter E4 determinístico | Simplicidade, explicabilidade e previsibilidade | Capacidade contextual limitada |
| Integrar recuperação relacional controlada | Reutiliza PostgreSQL e a modelagem existente | Exige controle de autorização, versão e atualidade |
| Introduzir busca vetorial | Pode ampliar recuperação semântica | Novos índices, sincronização e risco de informação obsoleta |
| Treinar modelo próprio | Maior controle de determinados componentes | Custo e complexidade sem benefício demonstrado |

**Direção técnica recomendada para eventual experimento:** começar pela recuperação relacional controlada, utilizando os registros e as políticas já existentes.

Nenhuma dessas alternativas está aprovada como implementação neste documento.

## 9. Rastreabilidade das conclusões

| ID | Registro | Situação |
|---|---|---|
| UX-ONE-01 | Experiência humana simplificada, orientada a necessidades | Direção conversacional |
| HIP-IA-01 | Memória contextual melhora a qualidade da assistência | Hipótese não validada |
| HIP-ECO-01 | Essa melhoria produz valor econômico incremental | Hipótese não validada |
| EXP-IA-MEM-01 | Comparação A/B/C com casos sintéticos | Experimento proposto |
| SEC-IA-01 | Autorização antes da recuperação e não divulgação de dados privados | Restrição arquitetural |
| DEC-IA-01 | Autorização para implementar o experimento | Pendente |
| DEC-IA-02 | Critérios quantitativos de aprovação e orçamento | Pendente |

## 10. Continuidade operacional

A incorporação deste registro não modifica os incrementos em andamento.

**Fotografia documental em 22/11/2026:**
- `main` remota inspecionada no commit `ab2da557`.
- PR #1 do gate online somente leitura consta como integrado no GitHub.
- O histórico local fornecido contém commits da branch `release/beta-fechado-20261116`, com último checkpoint apresentado em `f6edb08` em 20/11/2026.
- O mesmo histórico registra alterações de trabalho não integradas.
- Não houve inspeção direta do Git atual do Mac nesta reconciliação.

As diferenças entre remoto e local devem ser conferidas antes de qualquer integração.

Este registro não altera a prioridade operacional do beta, não substitui gates técnicos e humanos pendentes e não autoriza mudanças em banco, serviços, autenticação, produção ou infraestrutura.

## 11. Referências

- `docs/digitap/00-norte-do-produto.md`
- `docs/digitap/01-modelo-de-dominio.md`
- `docs/digitap/02-horizonte-estrategico.md`
- `docs/investigacoes/MATRIZ-RASTREABILIDADE-CONVERSAS-2026-11-15.md`
- `sitrep/PROJECT_PLAN.md`
- `src/lib/proposals/interpret.server.ts`
- Histórico conversacional compartilhado em 22/11/2026, incluindo a discussão sobre ganhos econômicos da memória contextual.
- Registro de terminal fornecido pelo proponente, com checkpoints locais de 20–21/11/2026.

**Conclusão:** a investigação não aprova uma nova funcionalidade. Preserva uma hipótese estratégica verificável: o DigItap pode produzir valor adicional quando combina inteligência artificial existente com memória contextual atualizada, autorizada e ligada a realizações reais.

O avanço dependerá de evidência técnica, validação humana e valor econômico demonstrado.
