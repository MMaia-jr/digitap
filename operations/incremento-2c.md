# Incremento 2C — validação real no navegador

Data: 04/11/2026. Diretório exclusivo: ~/projects/a-praca-v1-5.

## Resultado

**9 cenários E2E PASS, 0 FAIL, 0 SKIP, 0 NOT RUN na suíte local.** A01–A09 verificados com Chromium 156.0.8078.4 / Playwright 1.64.1, Next.js real em http://127.0.0.1:3215 e Supabase local existente. Nenhuma chamada SDK para login foi usada como substituto da interface. SDK administrativo e SQL apenas preparam/controlam/consultam/limpam fixtures; confirmação e recuperação são consumidas pelas rotas reais da aplicação. Mailpit é consultado somente para mensagens dos destinatários fictícios únicos.

O incremento 2 atende à validação local de cadastro/autenticação com as ressalvas abaixo. Isso não autoriza publicação, produção nem incremento 3. Os 89 testes de integração e 17 probes anteriores não foram repetidos; continuam evidências da etapa anterior.

## Matriz A01–A09

| ID | Resultado | Camadas e evidência |
|---|---|---|
| A01 | PASS | UI Chromium + Next API + Auth + Mailpit + SQL PASS: confirmação, retomada sem vínculo, organização pendente e sessão SSR em reload/navegação; cookies HttpOnly e no-store. |
| A02 | PASS | API real PASS: e-mail inválido retorna 422; duplicidade responde genericamente 200, sem novo usuário no banco. |
| A03 | PASS | UI + Auth real PASS: senha incorreta não libera dashboard; login válido estabelece sessão SSR. |
| A04 | PASS | UI + Mailpit + Auth real PASS: recuperação, troca, senha anterior e replay negados; expiração da fixture via recovery_sent_at em A08. Não houve espera natural de 30 dias. |
| A05 | PASS | Dois contextos Chromium + Next API + SQL PASS: tenant próprio, payload alheio negado, 6 vínculos concorrentes e retry sem duplicação. |
| A06 | PASS | API + SQL PASS: payload editor/admin negado, papel permanece organizacao. |
| A07 | PASS | UI/HTTP/SQL PASS para o recorte: organização pendente e publicação inexistente respondendo 404. Workflow editorial futuro NÃO foi implementado/testado. |
| A08 | PASS | UI + Auth/SQL PASS: conta bloqueada, organização suspensa, logout, cookie inválido e expiração real controlada por not_after + refresh forçado da fixture. |
| A09 | PASS | Navegador + Next API PASS: visitante redirecionado, vínculo retorna 401 e /admin inexistente retorna 404. |

## Limites precisos

- Expiração testada com tokens e sessões verdadeiros: recovery_sent_at da conta fictícia backdated em 30 dias; auth.sessions.not_after em 1 dia. Timestamp expires_at no cookie da mesma fixture é vencido para obrigar refresh do token real, negado pelo Auth. Não houve mock de Auth, relógio global alterado ou espera natural dessas durações. A expiração de recuperação do cenário A04 é verificada no cenário A08 da mesma suíte serial.
- A07/A09 demonstram que as rotas editoriais/de publicação **não existem (404)** e que não há via disponível para publicar. Não demonstram um workflow editorial futuro. Atividades, apoios, selos, parceiros e painel não foram implementados.
- Browser somente Chromium desktop headless, sem teste nesta etapa de Firefox/WebKit, mobile ou leitor de tela.
- Rede Supabase não foi reauditada nem reconfigurada. As limitações de metadados Docker e teste sem segundo dispositivo da etapa anterior continuam válidas. O Next foi observado em listener 127.0.0.1:3215.
- Mudança de senha, confirmação, replay, login e logout passaram na interface. Isolamento e tentativas de payload são exercitados também pela API real via fetch no contexto do browser; SQL confirma efeitos. Essas verificações de API não são descritas como cliques de interface.

## RED → GREEN

Primeira execução E2E: A01 FAIL / 8 SKIP. Após confirmar, um clique precoce em Sair submetia o formulário nativo antes da hidratação; browser terminava em JSON de erro de origem. Evidência sanitizada: e2e-red-hydration.json.

Regressão SSR em tests/components/auth-hydration.test.tsx: **1 FAIL + 1 PASS** antes da correção (hydration-red.log). Correção mínima em AuthForm: snapshot de hidratação com useSyncExternalStore; botão desabilitado no HTML inicial, habilitado após montagem, sem enfraquecer validação JSON/origem/papéis. GREEN: **2 PASS** (hydration-green.log). O E2E passou em A01 após a correção.

Uma segunda execução encontrou ambiguidade do seletor de alerta com Next Dev Tools (2 PASS / 1 FAIL / 6 SKIP); o teste foi restringido ao alerta do formulário, sem mudar comportamento da aplicação. Execução completa passou 9/9, depois a execução final acrescentou registro de rotas, replay de confirmação e rejeição da senha anterior e passou novamente 9/9. e2e.json contém a execução final; falhas anteriores não são ocultadas pelo resultado final.

## Comandos e resultados

Executados exclusivamente na raiz autorizada:

```sh
npm install --save-dev --save-exact @playwright/test --cache .npm-cache
# Repetido com permissão de rede e limites de timeout:
npm install --save-dev --save-exact @playwright/test --cache .npm-cache --fetch-retries=0 --fetch-timeout=15000
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" ./node_modules/.bin/playwright install chromium
node scripts/e2e-server.mjs
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" ./node_modules/.bin/playwright test --project=chromium
./node_modules/.bin/vitest run tests/components/auth-hydration.test.tsx
npm run test:e2e
npm test
npm run lint
npm run build
npm run typecheck
node scripts/e2e-evidence-check.mjs
git status --short
```

- npm test: **129 PASS / 0 FAIL / 0 SKIP** (127 preservados + 2 da regressão de hidratação), 14 arquivos.
- E2E final: **9 PASS / 0 FAIL / 0 SKIP**, um worker, sem retries.
- Lint, build e typecheck: exit 0; logs próprios. Lint foi reexecutado após o último script auxiliar.
- Instalação reportou 16 vulnerabilidades moderadas na cadeia já documentada; não houve audit fix nem repetição de auditoria ampla.
- Chromium e FFmpeg/headless shell baixados só em .playwright-browsers/, ignorado no Git. Sem dependências globais instaladas.
- Comparação de valores reais secretos em memória: 0 ocorrências nos 25 arquivos de artefatos públicos/evidências então disponíveis. Nenhum HMAC configurado neste incremento. Ver secret-values.json. Não confundir nomes de variáveis server-side com vazamento.

## Console e rotas

0 eventos pageerror. 13 mensagens console.error de HTTP não-2xx correspondem a negativas esperadas: 4 respostas 422, 3 respostas 401, 3 respostas 400, 2 respostas 404 e 1 resposta 403. Sem exceção JS adicional observada. 87 respostas de navegação/API registradas somente com método, pathname sem query e status.

Rotas: /cadastro, /auth/confirm, /login, /recuperar-acesso, /dashboard, /dashboard/organizacao, /, /api/auth/cadastro, /api/auth/confirmar, /api/auth/login, /api/auth/recuperar, /api/auth/redefinir, /api/auth/sair, /api/organizacoes; negativas de /admin e de publicação/atividades ausentes. Ver observations.json e código do teste para requisições diretas adicionais.

## Arquivos desta execução

- package.json / package-lock.json: @playwright/test fixado 1.64.1 e scripts e2e:server/test:e2e.
- playwright.config.mjs: Chromium loopback, sem trace/vídeo/screenshots, sem retries, um worker.
- tests/e2e/auth.spec.mjs e reporter.mjs: cenários reais, fixtures próprias, resultados sanitizados; nenhum storageState persistido.
- scripts/e2e-server.mjs: obtém configuração do stack local em memória, recusa porta ocupada e inicia apenas Next loopback, com logs redigidos.
- scripts/e2e-evidence-check.mjs: comparação segura de valores secretos nos artefatos e evidências desta execução.
- src/components/AuthForm.tsx: única correção funcional deste incremento 2C (barreira de hidratação).
- tests/components/auth-hydration.test.tsx: regressão RED/GREEN.
- .gitignore / eslint.config.mjs: excluem binários e resultados temporários do browser.
- AGENTS.md: gerado automaticamente pelo next dev instalado, lido e preservado. next-env.d.ts foi regenerado pelo Next dev/build, sem diff final.
- specs/matriz-testes-v1.5.md, operations/progresso.md, README.md, SECURITY.md, este relatório e operations/evidence/incremento-2c/: documentação e resultados atuais.

O git-status-final.txt inclui alterações anteriores preservadas. Nem todo arquivo sujo foi alterado nesta execução. Sem git reset, commit, push ou descarte.

## Encerramento

Contas e organizações fictícias desta execução foram removidas; mensagens locais podem permanecer no Mailpit, sem usuários correspondentes. Nenhuma senha, token ou cookie de sessão foi incluído no relatório, traces ou evidências sanitizadas. Apenas o supervisor Next criado nesta execução foi encerrado após conferir a cadeia de processos e cwd; a porta 3215 ficou sem listener. O Supabase não foi iniciado/parado nem teve migrações/configurações alteradas nesta etapa.

Sem publicação, deploy, operações remotas ou mudanças globais. Não avançar ao incremento 3. Próxima decisão é humana.
