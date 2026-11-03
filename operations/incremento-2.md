# Relatório — incremento 2: cadastro e autenticação

## Resultado e escopo

Implementados os fluxos de cadastro de acesso, confirmação de e-mail, login, logout, recuperação e redefinição de senha, mais cadastro de organização pendente com nome e canal público opcional. Páginas/rotas usam Next.js e Supabase Auth SSR. Não foram habilitados atividades, apoios, selos, painel de movimento ou administração de papéis.

A implementação foi validada com testes simulados e HTTP real no Next.js. **Não foi validada de ponta a ponta no Supabase real**, que permaneceu parado. A nova migração e os templates estão preparados, não aplicados. Não está aprovado lançamento, teste com pessoas reais ou a matriz de 74 cenários completa.

## Evidências executadas

| Verificação | Resultado | Evidência |
|---|---|---|
| Unidade/componentes | 100 PASS em 9 arquivos; 24 regressões anteriores + 76 novos casos | evidence/incremento-2/unit-components.log |
| HTTP real no Next.js local | 14 PASS, sem provider/banco | evidence/incremento-2/http-smoke.json |
| TypeScript | PASS | evidence/incremento-2/typecheck.log |
| ESLint | PASS, sem regras desativadas | evidence/incremento-2/lint.log |
| Build Next.js 16.4.5 | PASS | evidence/incremento-2/build.log |
| Bundle público | 13 arquivos, zero referências privadas pesquisadas | evidence/incremento-2/public-artifacts.json |
| Auditoria npm completa | 16 entradas moderadas, 0 altas/críticas | evidence/incremento-2/npm-audit.json |
| Auditoria npm de execução | 0 vulnerabilidades reportadas | evidence/incremento-2/npm-audit-production.json |
| Nova RPC no Postgres/Supabase | NOT RUN | tests/integration/onboarding.database.test.ts preparado |
| Segurança real da migração anterior | NOT RUN neste incremento; 85 PASS históricos não reclassificados como execução nova | relatório do incremento 1 |
| E-mail/OTP/expiração/replay reais | NOT RUN | bloqueio Docker |
| Browser/mobile real | NOT RUN: CUA retornou No browser is available | bloqueio de ferramenta |

A inspeção do bundle usa nomes/prefixos privados, sem credenciais reais configuradas. Não comprova H01 completo. A validação de acessibilidade cobre labels, autocomplete, erros associados, foco e ordem de Tab simulada; não substitui browser/leitor de tela reais.

## RED → GREEN → REFACTOR

Testes foram escritos antes dos módulos e componentes correspondentes; logs flow-red, http-red, gateway-red, components-red e session-cookies-red registram falhas. Nas suites com módulo ausente, a importação impediu execução dos casos; isso não foi apresentado como dezenas de asserções RED executadas.

Regressões de comportamento comprovadas antes das correções:

- session-cookies-red: 2 FAIL — propriedade name poderia sobrescrever chunks; logout não removia o code-verifier. Correção mantém nome do chunk e remove somente cookies ap-auth próprios.
- regressions-red: 3 FAIL — sessão imediata de signup, Host incompatível e SDK inicializado antes da validação. Correção fecha essas fronteiras e extrai validação compartilhada para execução antes do SDK.
- form-method-red: 1 FAIL — formulário não definia POST; fallback poderia usar GET antes da hidratação. Correção fixa method/action e protege senha de envio na URL.
- channel-red: 4 FAIL — canal opcional ausente; implementada validação URL e encaminhamento à RPC.

Depois das correções, todos os 100 casos passaram, lint/typecheck/build passaram. Uma primeira tentativa do teste de rate limit de recuperação continha password indevido e foi corrigida mantendo a asserção 429 e a rejeição de campos extras. Os testes SQL foram escritos antes do arquivo final da função, mas seu RED/GREEN **não pôde ser executado**; nenhuma alegação de TDD real de banco foi feita.

## Idempotência e autorização

Cadastro em duas etapas elimina a falsa ideia de transação distribuída: primeiro Auth confirma a identidade, depois o vínculo é concluído no banco. Se Auth conclui e banco falha, a pessoa pode entrar e retomar o onboarding. Não há exclusão automática de usuário como compensação.

A RPC preparada serializa a mesma identidade com advisory lock transacional, cria organização pendente + conta com papel organizacao em um único comando, retorna o vínculo existente em retries e não converte editor/admin/conta bloqueada. O índice único de auth_user_id é a segunda barreira. Um erro no segundo insert deve reverter o primeiro; os quatro testes reais preparados cobrem concorrência, EXECUTE negado, bloqueio e rollback. Esses comportamentos SQL ainda precisam de prova no stack isolado.

A aplicação valida usuário por getUser, confirmação de e-mail, conta ativa, papel e tenant; user_metadata/e-mail textual não concedem autorização. O cliente de serviço é server-only e separado de cookies. As tabelas continuam sem acesso direto de clientes; a RPC é service-only. O dashboard deriva a organização do servidor e não usa ID enviado pelo cliente.

Recuperação exige OTP com tipo recovery antes de updateUser e encerra sessão temporária mesmo em falha. Confirmação usa tipo signup. Expiração/uso único são responsabilidades do provider e foram somente simuladas nesta etapa. Logout limpa cookies deste navegador; não se presume que JWT de acesso já copiado seja imediatamente invalidado.

## Portas, ambientes e dados

Supabase não foi reiniciado. db/kong de A Praça inexistentes na inspeção, volume supabase_db_a-praca-v1-5 preservado; portas 56151/56152/56154 sem listeners. Não foi feita tentativa de mudar configurações globais ou de outros projetos. O bloqueio do incremento 1 e scripts/start-local.mjs permanecem intactos.

O Next foi iniciado somente em 127.0.0.1:3215 para HTTP e depois encerrado; porta livre ao final. Não foi criado .env.local nem configurada credencial real. Dados usados são fictícios e apenas de testes. Sem usuário/organização real, projetos remotos, deploy, push, convites, serviços pagos ou SQL remoto.

## Dependências e limitações

TypeScript 7.0.2 do incremento 1 falhou no typescript-eslint. ESLint 10 também ficou fora dos peers dos plugins do Next. Foram fixados TypeScript 6.0.3 e ESLint 9.39.5, com lockfile atualizado. O npm sinaliza ESLint 9 fora de suporte. Isso é uma dívida de atualização da cadeia de ferramentas, sem desativação de regras.

As 16 entradas moderadas decorrem da cadeia de desenvolvimento minimatch/ESLint, conforme JSON de auditoria; a auditoria omitindo dev reportou zero. A correção sugerida automaticamente envolve mudanças incompatíveis e não foi aplicada com force. A dívida permanece explícita, sem aprovação de produção.

A UI usa CSS local para o pequeno conjunto de formulários, sem nova biblioteca visual ou framework adicional. Stack principal Next.js + Supabase preservada. Aviso de privacidade definitivo, retenção, canal de atendimento, licença e autorização de publicação continuam pendentes.

## Arquivos e operação

O manifesto completo está em arquivos-incremento-2.txt e os comandos em command-log-incremento-2.md. Os principais grupos são src/app (telas e endpoints), src/components/AuthForm.tsx, src/lib/auth (fluxo/adapters/acesso), src/lib/supabase (clientes SSR/admin), src/proxy.ts, migração/templates, testes e documentação.

Consulte autenticacao-local.md para a sequência futura após comprovar isolamento. Próximo passo delimitado: resolver o isolamento e executar Auth/e-mail/SQL reais e regressões A01–A09 antes de avançar a funcionalidades de atividade. A execução encerra aqui.

## Fontes técnicas consultadas

- https://supabase.com/changelog
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://nextjs.org/docs/app/guides/authentication

As assinaturas também foram conferidas nos SDKs instalados e as versões no registry oficial npm. A leitura de documentação não substituiu testes reais que permaneceram bloqueados.
