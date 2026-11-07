# I5 — Login Google: implementação antes da regressão

Base: 5839070. Sem commit, sem reiniciar o Supabase e sem alterar banco/migrations.

## Configuração

Provedor Google habilitado em supabase/config.toml, Client ID fornecido e redirect_uri http://127.0.0.1:56151/auth/v1/callback. Allowlist inclui http://127.0.0.1:3215/auth/callback, preservando /auth/confirm. Client Secret somente no .env local (ignorado pelo Git, permissão 0600), referenciado por env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET). .env.example contém somente placeholder.

## Fluxo

Botão Continuar com Google em signin/signup/signup_pf inicia signInWithOAuth com provider google e redirectTo baseado na origem da janela. Cliente SSR em PKCE compartilha o nome ap-auth com o servidor; somente o verifier precisa ser acessível ao browser. A troca do código e os cookies de sessão HttpOnly permanecem no servidor; detecção automática de sessão pela URL e auto-refresh do cliente de início estão desabilitados.

/auth/callback troca code por sessão, verifica usuário confirmado e estado da conta no banco. Novos usuários vão a /cadastro/pessoa-fisica/completar. PF ativa/pendente com vínculo válido vai ao dashboard PF. Organizações e contas editoriais mantêm seus destinos. Contas bloqueadas são negadas; falhas de troca limpam cookies locais. Destinos são fixos; parâmetros next ou headers encaminhados não definem destino.

A nova tela pede Nome público, não usa automaticamente o nome do Google e não confere permissões por metadata. POST /api/auth/completar-pf usa a fronteira HTTP existente (origem, JSON, tamanho), identidade verificada no servidor e RPC criar_pf_com_sujeito existente. Curadoria e escopos PF permanecem os da RPC. Não há DDL novo.

## TDD direcionado

Comando: npm test -- tests/components/google-auth.test.tsx tests/auth/oauth-callback.test.ts tests/auth/oauth-profile.test.ts

RED: exit 1; 3 arquivos falharam, 7 testes falharam. Botão ausente, ação complete_pf ausente; suíte de callback não carregou por rota inexistente. Saída bruta em red.log.
GREEN: exit 0; 3 arquivos e 15 testes passaram. Saída bruta em green.log. Cobertura: botões nos três modos, argumento OAuth e erro seguro; callback novo/PF/editor/admin/organização/sem code/troca inválida/conta bloqueada; perfil com nome validado, nome inválido e visitante.

## Pendências deliberadas

Supabase não reiniciado: usuário fará no terminal normal. Não houve ida real ao Google, nem troca de credenciais reais ou criação de conta por esta tarefa. Build, lint, typecheck, testes completos, integração PG e E2E NÃO EXECUTADOS nesta etapa, conforme pedido para parar antes da regressão. O funcionamento real do provedor permanece NÃO VERIFICADO até o reinício e teste manual.
