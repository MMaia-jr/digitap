# Incremento 2 — complementação da Etapa B

## Resultado

Foram tratadas somente lacunas dos fluxos existentes de cadastro/autenticação/sessão/vínculo. Não houve reconstrução do projeto, repetição da Etapa A, nova instalação, operação Docker, alteração SQL, deploy, push, serviço pago ou uso de dados reais.

O código e os testes locais foram complementados. **O incremento 2 não está pronto: aceite PENDENTE** até integração Auth/banco/e-mail e navegador reais em ambiente seguro.

## Lacunas e correções

1. Logout dependia da inicialização bem-sucedida do SDK para limpar cookies. Agora a rotina de limpeza é preparada após validar origem/payload e executada no finally mesmo se a inicialização falhar. A limpeza por requisição é idempotente. Cross-site e payload inválido não provocam logout.
2. Erros de provider/transporte de login e confirmação podiam sair antes de limpar uma sessão parcial. Uma fronteira comum limpa no erro e preserva sessão no sucesso. Falhas inesperadas continuam sanitizadas.
3. Um usuário com e-mail confirmado, mas sem id, podia seguir em certos caminhos. Identidade não vazia passou a ser exigida em login, confirmação, redefinição e onboarding. A área restrita não consulta conta para identidade vazia.
4. Retry de uma conta já vinculada ainda dependia de nova chamada de escrita à RPC. Agora a conta ativa/própria com papel organizacao retoma por leitura. Falha de consulta não vira conta inexistente; bloqueio, desativação e papel editorial continuam negando o vínculo. Resposta perdida após commit simulado pode ser retomada sem novo signup/RPC.
5. Dois submits antes da atualização de estado React podiam emitir dois POSTs. Um ref síncrono bloqueia o segundo e é liberado no finally, permitindo retry após erro. Isso é proteção do componente, não garantia de unicidade SQL.
6. Configuração de origem fora do escopo podia escapar como exceção do runtime. A resposta agora é 503 sanitizado e privado, sem inicializar Auth.

## RED → GREEN → REFACTOR

Evidências em operations/evidence/etapa-b-20261104/:

| Passo | Resultado observado | Arquivo |
|---|---|---|
| Regressões iniciais antes das correções | 14 FAIL, 9 PASS, 0 SKIP | red.log |
| Correções mínimas | 23 PASS, 0 FAIL, 0 SKIP | green.log |
| Mais dois caminhos de identidade antes da correção | 2 FAIL, 29 PASS, 0 SKIP | identity-red.log |
| Correção da identidade no reset/área restrita | 31 PASS, 0 FAIL, 0 SKIP | identity-green.log |
| Suíte completa antes de refatorar | 125 PASS | green-before-refactor.log |
| Refatoração e suíte completa final | 125 PASS, 0 FAIL, 0 SKIP | tests.log |

A refatoração centralizou o predicado de identidade confirmada e a limpeza de sessão no erro, protegida pelos testes. Nenhum teste anterior foi removido ou enfraquecido. Alguns controles adicionais já passavam no RED e foram mantidos para impedir que o caminho idempotente aceitasse editor/admin/conta bloqueada.

## Checks finais e limites

- npm test: 125 PASS em 12 arquivos; 100 existentes + 25 novos. Provider, banco, cookies de framework e DOM são simulados nessas suites.
- npm run lint: PASS.
- npm run typecheck: PASS.
- npm run build: PASS, Next.js 16.4.5. Nenhum servidor de aplicação foi iniciado.
- Segurança real de banco: 85 NOT RUN; onboarding real: 4 NOT RUN. O comando combinado selecionaria os mesmos 89, não mais 89.
- Auth/e-mail/navegador reais: NOT RUN. Não se afirma expiração, uso único real de token, concorrência/rollback SQL ou invalidação imediata de JWT copiado.
- O teste paralelo simulado confirma que cada chamada encaminha a identidade derivada; a RPC segue sendo a responsável pela unicidade real, ainda não demonstrada.

Os canários e os testes HTTP da Etapa A/anterior não foram recontados como execução nova. As limitações de dependências documentadas anteriormente não foram corrigidas nem reavaliadas por instalação/auditoria nesta etapa.

## Matriz A01–A09

| ID | Cobertura local parcial | Aceite integral | Evidência / pendência |
|---|---|---|---|
| A01 | PASS | NOT RUN | Cadastro/confirm e identidade em mocks; falta Auth/e-mail/vínculo reais. |
| A02 | PASS | NOT RUN | Validação e duplicado genérico preservados; falta provider real. |
| A03 | PASS | NOT RUN | Senha incorreta, identidade vazia e erros negados; falta login real. |
| A04 | PASS | NOT RUN | Erros de OTP e identidade não alteram senha; falta expiração/uso único reais. |
| A05 | PASS | NOT RUN | Tenant/identidade alheios negados; falta isolamento no fluxo real. |
| A06 | PASS | NOT RUN | Payload/metadata não elevam papel; retry não converte editor/admin. Falta SQL real. |
| A07 | PASS parcial | NOT RUN | Identidade e papel organizacional limitados; publicação não implementada e não exercitada. |
| A08 | PASS | NOT RUN | Limpeza de cookies, falhas parciais e contas bloqueadas em mocks; falta sessão real. |
| A09 | PASS parcial | NOT RUN | Guardas unitários negam visitante; rota editorial inexistente e browser não executado. |

Nenhum cenário normativo completo foi reclassificado como PASS por causa de mocks.

## Preservação e Git

As duas migrações, nove tabelas, RLS/grants, schemas, package.json/lockfile e os arquivos permissions.server.ts e supabase-access.server.ts ficaram intactos. Não foi aberta permissão adicional. Diff de preservação em evidence/etapa-b-20261104/preservacao.txt.

Arquivos modificados e novos estão em evidence/etapa-b-20261104/arquivos.txt; git status em git-status.txt. As pastas de evidências da Etapa A já estavam sem rastreamento antes desta etapa e foram preservadas. Sem git add, commit, push, alteração de histórico ou remoto.

O registro atual do projeto é operations/progresso.md. SECURITY.md e contratos/matriz foram atualizados para refletir essas correções; o relatório anterior do incremento 2 recebe somente uma nota histórica de continuidade.

## Comandos e parada

A sequência efetiva de comandos está em evidence/etapa-b-20261104/commands.md e os resultados estruturados em results.json. Não foi usado Docker nem executado SQL ou chamada real ao Supabase. Nenhuma infraestrutura foi alterada ou instalação solicitada.

**Etapa B encerrada no escopo local autorizado. Aceite do incremento 2 PENDENTE. Não avançar ao incremento 3.**

Referências técnicas consultadas para o comportamento do SDK: https://supabase.com/changelog, https://supabase.com/docs/guides/auth/server-side/creating-a-client e https://supabase.com/docs/reference/javascript/auth-signout. A documentação do provider não substitui a verificação real de sessão pendente.
