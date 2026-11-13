# REL-01 — Contrato mínimo do Registro de Relações

Status: proposta testável; motor ausente. Este incremento não autoriza implementação,
migration, publicação ou operação com dados reais.

## Fontes e limites

Leitura de referência: docs/00-master-context.md, docs/01-visao-e-principios.md,
docs/04-governanca.md, docs/05-arquitetura-e-dependencias.md,
docs/06-privacidade-e-dados.md e docs/07-criterios-de-progresso.md.
Célula Zero e Esentya são referências conceituais; não se presume integração técnica.
O comitê proposto na governança não equivale a uma instância instituída.

As migrations de sujeitos_publicadores e vinculos_publicadores
(supabase/migrations/20261106003448_i4_expand.sql) distinguem conta, sujeito e
representação versionada. Os serviços de atividades e participação distinguem sessão
verificada, autorização sobre o objeto e saída privada/pública. Esses padrões são
referências; os escopos editoriais atuais não autorizam operações relacionais.

## Entidades e responsabilidades

- Relação: acontecimento declarado entre sujeitos, como serviço, fornecimento ou
  colaboração. Nasce privada e DECLARADA. Não constitui pagamento ou certificado.
- Declaração: versão identificável da afirmação, com autor, sujeito representado,
  vínculo/versionamento, data e escopo. Correções acrescentam versões; não apagam a original.
- Confirmação: manifestação da contraparte sobre sua participação ou versão,
  vinculada à declaração considerada. Não confirma todos os detalhes por extensão.
- Atestação/testemunho: afirmação com identidade da conta, sujeito representado,
  vínculo e versão, origem, data do fato e do registro, escopo e situação de validade.
- Exame: avaliação humana autorizada de pertinência, proveniência, limites e
  independência das fontes. Receber uma atestação não equivale a examiná-la.
- Decisão de verificação: reconhecimento humano de critérios formalizados,
  com competência, critérios, fundamentos e dependências rastreáveis.
- Contestação: processo paralelo com alegação, defesa, correções e evidências;
  sem eliminação das versões anteriores e sem penalidade pública.

## Estados e transições

| Estado | Condição necessária |
| --- | --- |
| DECLARADA | Uma parte registrou uma afirmação autorizada. |
| CONFIRMADA | Contraparte legitimamente vinculada confirmou sua participação/versão. |
| CORROBORADA | Evidências adicionais foram examinadas e julgadas pertinentes, com proveniência e limites. |
| VERIFICADA | Instância humana competente reconheceu critérios formalmente definidos. |

Criação → DECLARADA. Confirmação válida pode levar DECLARADA → CONFIRMADA.
Corroboração exige ato explícito de exame autorizado; não se exige uma escada
universal em que toda relação deva atravessar todos os estados. Confirmação posterior
não deve rebaixar uma corroboração existente. VERIFICADA está bloqueada neste
incremento: a competência institucional ainda não foi definida. Editor de atividades
não recebe essa competência. Nenhum testemunho, valor ou quantidade promove estado
sozinho. A contestação não é um quinto estado nem produz rebaixamento automático.

Revogação preserva o registro da atestação e seu histórico. Uma decisão dependente
fica explicitamente sem vigência e requer reavaliação; não pode continuar apresentada
como verificação vigente. A política de reclassificação posterior permanece pendente.
O teste de revogação usa decisão histórica sintética, não uma autoridade instituída.

## Identidade, representação e autorização

A identidade da conta vem de contexto autenticado confiável, nunca do corpo do pedido.
A representação depende de vínculo vigente, ativo, versionado e autorizado para a
operação e a relação. Selecionar outro sujeito não cria vínculo. O autor não pode
produzir confirmação independente de si mesmo fingindo ser contraparte.

Permissões são específicas por relação e operação. Ser parte, testemunha ou editor
não concede acesso universal. Testemunhar pode produzir apenas um recibo da própria
operação; não exige acesso ao histórico privado completo. Toda consulta e mutação,
inclusive repetição idempotente, revalida autorização. O motor de domínio receberá
fatos de identidade/autorização de uma fronteira confiável; HTTP e RLS terão testes
próprios futuros. Os nomes de capacidades nas fixtures não são novos escopos SQL.

## Privacidade, proveniência e invariantes

Histórico privado por padrão; não há API de publicação neste contrato. Não coletar
contatos ou identificadores civis para estes testes. Proveniência e identidades internas
não viram lista pública. Contas distintas não demonstram independência: vínculos
diretos com as partes precisam ser considerados. Fontes ligadas às partes não bastam,
isoladamente, para verificação independente; conluio não é resolvido por contagem.

Não há pontuação, ranking, privilégio reputacional, penalidade pública, limites
arbitrários entre pares ou promoção baseada apenas em dinheiro. Relações distintas
entre o mesmo par são permitidas. Repetir a mesma operação autorizada com a mesma
chave e conteúdo devolve o mesmo recibo sem duplicar efeitos; reutilizar a chave com
conteúdo diferente é conflito. Chave não substitui autorização.

Contestação preserva declarações/evidências e permite defesa, correção e novas
evidências por pessoas autorizadas. Revogar não apaga rastreabilidade. Retenção e
exercício de direitos sobre dados exigem política humana; não se promete retenção eterna.

## Cenários executáveis primeiro

| Caso | Comportamento exigido |
| --- | --- |
| REL-01 | Criação declarada e privada. |
| REL-02 | Contraparte legítima confirma a própria participação. |
| REL-03 | Autor não confirma fingindo ser contraparte. |
| REL-04 | Confirmação tem escopo e não comprova todos os detalhes. |
| REL-05 | Testemunho registra conta, sujeito/vínculo, origem, datas e escopo. |
| REL-06 | Recebimento não promove automaticamente a corroborada. |
| REL-07 | Fonte diretamente ligada às partes não vira verificação independente. |
| REL-08 | Papel editorial não concede competência de verificação. |
| REL-09 | Contestar preserva declarações e evidências. |
| REL-10 | Defesa, correção e evidência autorizadas continuam durante contestação. |
| REL-11 | Terceiro não autorizado não consulta nem modifica relação privada. |
| REL-12 | Sem mecanismos reputacionais, limite entre pares ou promoção monetária. |
| REL-13 | Repetição é idempotente; conteúdo divergente conflita. |
| REL-14 | Revogação rastreável invalida explicitamente a vigência da decisão dependente. |

## Porta de testes e decisões pendentes

A porta em tests/relations/contract.ts é um vocabulário de teste, não um serviço de
produção nem compromisso de persistência. O carregador procura provisoriamente
src/lib/relations/domain.ts, export criarRegistroRelacoes; o caminho pode ser adaptado
no próximo incremento autorizado. Não existe implementação simulada dos comportamentos.

Dependem de decisão humana: competência/mandato de verificação; critérios formais;
quem pode examinar corroboração; como demonstrar independência e tratar controle
comum/conluio; concessão e revogação granular das permissões; eventual divulgação com
consentimento; retenção e direitos de dados; tratamento final de contestação e
reclassificação/revalidação após revogação. Nenhum prazo, quórum ou limiar é inventado.
