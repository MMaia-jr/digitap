# Interpretação de propostas — incremento local, 15/11/2026

`interpretProposal(texto)` é uma função **server-only**, sem persistência,
ferramentas ou acesso ao banco. A interface autenticada descrita abaixo chama
essa mesma função, sem outro cliente do Gateway. Retorna apenas
`estado: revisao_humana_pendente`, `verificacao: nao_verificada` e sete listas:
sujeitos, projetos, atividades, capacidades, relações, fontes e informações não
verificadas. Todos os itens são menções/sugestões, inclusive os tipos de sujeitos.
Trechos literais permitem rastrear a extração; não provam o conteúdo nem que a
interpretação esteja correta. Relações são alegações textuais, não vínculos do banco.

Nenhum resultado concede titularidade, representação, curadoria, publicação,
confiança ou autorização. Não há comando para aplicar a saída. Conteúdo futuro
na interface deve ser renderizado como texto; nunca como HTML ou ação executável.
O texto enviado pode conter dados pessoais: a função não é um anonimizador.

## Configuração exclusivamente no servidor

- `AI_GATEWAY_API_KEY`: obrigatória. Sem credencial, não faz requisição.
- `AI_GATEWAY_MODEL`: opcional; padrão `moonshotai/kimi-k2.5`.
  Aceita somente identificadores `moonshotai/kimi-*` de formato restrito.
  Outro modelo Kimi exige conferir disponibilidade/capacidade no Gateway antes
  do uso real; essa configuração não é recebida do usuário.
- Endpoint fixo: `https://ai-gateway.vercel.sh/v1/chat/completions`.
- Roteamento fixo: `providerOptions.gateway.only: ['bedrock']`, sem fallback
  de modelo/provedor; `zeroDataRetention: true`. Se a política não puder ser
  atendida, a operação deve falhar; não remover a restrição para obter resposta.

Não configurar chave em `NEXT_PUBLIC_*`. Não foram criadas chaves nem alteradas
variáveis da Vercel. OIDC não é usado neste incremento.

Requisição única, sem retries; timeout de 30 segundos, entrada até 20.000 unidades
UTF-16, saída HTTP até 128.000 bytes. Cada categoria permite até 20 itens e cada
campo até 1.000 unidades UTF-16. Schema JSON estrito é solicitado ao Gateway e
validado novamente no servidor, incluindo chaves exatas e trechos existentes.
Respostas incompletas, tool calls, recusa, campos de autoridade, JSON inválido ou
markup são rejeitados; falhas não retornam corpo, causa ou mensagem do provedor.
Não há logs de entrada, saída ou credenciais.

## Fontes e privacidade verificadas em leitura

- [Catálogo público](https://ai-gateway.vercel.sh/v1/models) e
  [endpoints do Kimi](https://ai-gateway.vercel.sh/v1/models/moonshotai/kimi-k2.5/endpoints):
  em 15/11/2026, Bedrock declara `structured-output`, `response_format`,
  `has_zdr: true`, `has_no_training: true`. O outro endpoint listado não oferece
  as mesmas garantias; não é autorizado pela função.
- [Structured outputs Chat Completions](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/structured-outputs).
- [Provider filtering](https://vercel.com/docs/ai-gateway/models-and-providers/provider-filtering-and-ordering).
- [Zero Data Retention](https://vercel.com/docs/ai-gateway/security-and-compliance/zdr):
  política de roteamento depende de elegibilidade/acesso da equipe. Metadados do
  catálogo e configuração da requisição não comprovam cumprimento contratual,
  região de processamento ou ausência absoluta de retenção em todos os sistemas.
- [Modelo no Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-moonshot-ai-kimi-k2-5.html).

Os testes interceptam `fetch` com mocks. Nenhuma inferência paga foi executada.
Antes de disponibilizar a função ao público: autorizar e validar uma requisição
real, confirmar modelo/provedor efetivos, política ZDR da equipe, minimização de
dados e tratamento de erros; a futura rota precisa de autenticação, autorização,
CSRF e limites de uso próprios. Não há alegação de qualidade semântica comprovada.


## Experiência autenticada local

Entrada **Descreva sua ideia** em Meu espaço e na navegação autenticada:
`/meu-espaco/ideia`. Mostra sete categorias, trechos de origem e aviso de revisão
humana obrigatória; não há botão de aplicar, publicar ou criar vínculos.

`POST /api/propostas/interpretar` aceita exclusivamente `{texto: string}` com até
2.000 unidades UTF-16, limitado também a 8KiB de JSON pela fronteira HTTP existente.
Reutiliza `handleMutation` para método, JSON, Origin/Host, bloqueio cross-site e
respostas privadas/no-store. Autentica com `currentUser()` no servidor, exige
confirmação e rejeita conta bloqueada/identidade divergente. Uma identidade
confirmada ainda sem perfil pode usar a prévia. A IA só é chamada depois disso.
IDs, modelos, papéis e permissões enviados pelo navegador são rejeitados.

Proteção de custo **por processo**: três tentativas por identidade em dez minutos,
uma interpretação simultânea por identidade, duas simultâneas no total e vinte
tentativas agregadas por dez minutos. Falhas também consomem tentativas. A memória
do limitador guarda apenas IDs Auth e contadores temporários, não texto. Reinícios,
HMR ou múltiplas instâncias reiniciam/fragmentam essa proteção: não é quota global.
Antes de ativar em produção, deliberar controle distribuído/orçamentário do Gateway,
verificar credenciais e política de dados e autorizar teste real com custo limitado.

Os testes da interface e da rota usam mocks de sessão, interpretação e rede; não
comprovam sessão real, cobrança, disponibilidade do modelo ou funcionamento online.
A revisão humana ocorre lendo a prévia; não há editor nem salvamento neste incremento.
