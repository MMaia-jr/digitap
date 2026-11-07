# Diagnóstico do HTTP 400 — 06/11/2026

## Achados

AuthForm usa window.location.origin + /auth/callback. O SDK instalado @supabase/ssr já fixa flowType pkce internamente. Portanto, não foi comprovado que ausência da opção explícita causava o HTTP 400.

Antes da alteração, uma requisição S256 construída localmente e outra URL gerada pelo SDK real retornaram HTTP 302 do Auth local, com Location em https://accounts.google.com. O SDK gerou code_challenge_method=s256, challenge de 43 caracteres e cookie ap-auth-code-verifier.

## Ajuste e testes

Explicitar auth.flowType='pkce' em src/lib/supabase/browser.ts. Mantidos cookies ap-auth, troca exclusivamente no servidor, detectSessionInUrl=false e autoRefreshToken=false. Não houve necessidade demonstrada de alterar a chamada OAuth ou o callback.

Teste da declaração explícita: RED exit 1, 1 FAIL e 4 PASS (pkce-explicit-red.log). Após ajuste, testes direcionados: exit 0, 4 arquivos, 17 PASS (pkce-green.log). Novo teste usa SDK SSR real com transporte de token simulado: recupera verifier no servidor e comprova que seu SHA-256 corresponde ao challenge do navegador. O HTTP 400 simulado nesse teste apenas interrompe a troca antes de criar sessão; não é falha do Auth real.

## Navegador real / Auth local

O Next estava desligado em 3215: primeiro diagnóstico retornou ERR_CONNECTION_REFUSED (exit 1). Iniciado somente o Next de diagnóstico. A primeira tentativa de clique teve timeout ao aguardar a navegação ao Google bloqueada pelo diagnóstico (exit 1). Corrigido o diagnóstico para não aguardar navegação externa.

Execução concluída (exit 0): GET /login HTTP 200; clique real no botão disparou /auth/v1/authorize com provider=google, redirect_to=http://127.0.0.1:3215/auth/callback, code_challenge_method=s256, challenge de 43 caracteres; resposta HTTP 302. Dados sanitizados em browser-authorize.json. Requisições ao Google foram interceptadas localmente, sem login real ou consentimento externo.

O HTTP 400 original NÃO FOI REPRODUZIDO. Sua causa permanece não demonstrada. O fluxo até o redirecionamento do Auth ao Google foi verificado; o login completo e o retorno real do Google permanecem NÃO VERIFICADOS. Nenhuma regressão completa, build ou alteração no Supabase/DB foi executada. Next iniciado nesta tarefa foi encerrado ao final. Nenhum commit.
