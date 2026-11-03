# Contratos — incremento 2

Nenhuma rota de atividades, apoio, selos, indicadores ou administração foi habilitada.

## Fronteira comum

POST com Origin igual a APP_ORIGIN e Host compatível quando presente; Sec-Fetch-Site cross-site negado. JSON apenas, corpo de até 8192 bytes, validação de campos no servidor antes de inicializar o SDK. Respostas privadas/no-store; sem senha, token ou detalhes internos em JSON de erro. A UI não recebe chaves de serviço nem usa Supabase diretamente no navegador. O runtime recusa URLs fora dos endpoints locais autorizados (app 127.0.0.1:3215, Supabase 127.0.0.1:56151).

| Rota | Entrada permitida | Comportamento |
|---|---|---|
| POST /api/auth/cadastro | email, password | Auth signup sem metadata de papel; resposta genérica para novo/duplicado; sessão inesperada é encerrada. Não cria organização. |
| POST /api/auth/login | email, password | Auth signInWithPassword; e-mail confirmado e sessão obrigatórios; relê conta ativa. Sem vínculo conduz a /dashboard/organizacao. Conta bloqueada/desativada ou papel incompatível nega acesso e limpa sessão. |
| POST /api/auth/sair | objeto vazio | signOut com scope local; cookies próprios removidos também em falha do provider. Não toca em cookies de outros projetos. |
| POST /api/auth/recuperar | email | resetPasswordForEmail; resposta genérica para conta inexistente/elegível. 429 preservado. |
| POST /api/auth/confirmar | token_hash | verifyOtp de signup; somente confirmação válida estabelece sessão e permite onboarding. |
| POST /api/auth/redefinir | token_hash, password | verifyOtp de recovery antes de updateUser; encerra sessão temporária no finally. Uma falha após consumir o token exige novo link. |
| POST /api/organizacoes | nome_publico, canal_publico opcional | getUser verificado e e-mail confirmado; identidade derivada no servidor. Chama RPC service-only para criar organização pendente + conta organizacional em transação. Nunca aceita auth_user_id, papel ou organizacao_id do cliente. |

Erros: 400 payload/JSON, 401 autenticação, 403 origem/permissão, 413 limite de corpo, 415 conteúdo, 422 validação/token, 429 limitação do provider, 503 serviço/configuração. Não há redirecionamento fornecido pelo usuário; destinos são fixos e também validados pela UI.

Campos: e-mail normalizado, máximo 254; senha 12–128 caracteres sem trim; nome 2–160, normalização NFC; canal opcional URL http/https sem credenciais, máximo 2048. Não se consulta a URL fornecida, não há upload nem publicação automática.

## Confirmação e recuperação

GET /auth/confirm com token_hash e type=signup ou recovery apenas apresenta o formulário e **não consome OTP**. A verificação ocorre no POST após ação explícita. O token próprio é enviado somente ao endpoint correspondente; a URL é limpa após hidratação. Referrer-Policy no-referrer, noindex e cache privado; logging de URLs de entrada desativado. Os templates locais usam .SiteURL e .TokenHash; foram preparados, não exercitados com entrega de e-mail real.

Tokens de confirmação não são usados como autorização de recuperação: o tipo é escolhido pelo endpoint no servidor. Expiração e uso único dependem do provider; foram simulados nos testes, sem alegação de comprovação real neste incremento.

## SSR e isolamento

Cookies ap-auth e seus chunks são HttpOnly, SameSite=Lax e Path=/. Secure=false é restrito por configuração a HTTP loopback; este runtime não aceita ambiente remoto. O proxy renova sessão para páginas de dashboard; a autorização permanece no servidor, por Auth.getUser e papel/estado do banco. Sem cache de autorização entre requisições e sem user_metadata/e-mail como fonte de papel. O cliente administrativo é separado e não recebe cookies de usuário.

O dashboard lê somente id/nome/estado da organização vinculada à identidade verificada. IDs do cliente não selecionam o tenant. Org suspensa e conta sem papel organizacional ativo são negadas. Não há rota editorial neste incremento; /admin responde 404.

## Idempotência e falhas parciais

Não existe transação distribuída entre Auth e Postgres. A identidade confirmada pode existir sem conta_acesso: essa condição permite repetir o onboarding, nunca eleva privilégios. Não apagar automaticamente identidade quando o vínculo falha.

A função criar_organizacao_pendente(uuid,text,text) é SECURITY INVOKER com search_path fechado e EXECUTE somente de service_role. O backend é responsável por fornecer apenas o id retornado por getUser confirmado. A função serializa por auth_user_id com advisory lock transacional; verifica conta existente e estado/papel; inserts de organização e conta são atômicos. FK exige usuário existente no Auth. Retry retorna vínculo já existente, sem renomear ou promover conta. Contas editor/admin/bloqueadas não são convertidas por esse fluxo. Mesmo nome em identidades diferentes não prova que representam a mesma instituição e não é automaticamente mesclado.

A nova migração não foi aplicada e as garantias SQL ainda não foram executadas em banco real. As nove tabelas continuam deny-by-default conforme a migração anterior; não abrir grants/policies de clientes para contornar o onboarding.
