# Fase A — nova execução autorizada em 04/11/2026

## Git e preservação

Raiz: /Users/alexandrechagasleaocryptoboy/projects/a-praca-v1-5. Branch main; commit dedc9c6, `chore: estado inicial do projeto A Praça v1.5 (incremento 1 reportado)`. Git já existente; nenhum init/commit/push executado.

`git diff --name-only` ficou vazio antes e depois. As únicas novidades desta rodada são evidências nesta pasta. A pasta etapa-a-20261103T234832Z já estava sem rastreamento antes desta rodada e foi preservada. Nenhum código de produto, dependência ou configuração do Supabase foi alterado. Build/caches ignorados foram atualizados pelos comandos autorizados.

## Arquivos existentes solicitados

```text
src/app/api/organizacoes/route.ts
src/app/cadastro/page.tsx
src/app/login/page.tsx
src/app/recuperar-acesso/page.tsx
src/lib/auth/dashboard.server.ts
src/lib/auth/flow.server.ts
src/lib/auth/gateway.server.ts
src/lib/auth/http.server.ts
src/lib/auth/organization-access.server.ts
src/lib/auth/permissions.server.ts
src/lib/auth/runtime.server.ts
src/lib/auth/supabase-access.server.ts
src/lib/supabase/admin.server.ts
src/lib/supabase/config.server.ts
src/lib/supabase/server.ts
```

Os arquivos já pertencem ao commit atual e não foram recriados. A interface existente também possui /auth/confirm, dashboard, formulário compartilhado e proxy SSR, conforme os contratos locais.

## Verificações novas

| Comando / grupo | PASS | FAIL | SKIP | NOT RUN | Resultado |
|---|---:|---:|---:|---:|---|
| npm test | 100 | 0 | 0 | 0 | 9 arquivos, exit 0 |
| Integração de segurança | 0 | 0 | 0 | 85 | Não executada |
| Integração de onboarding | 0 | 0 | 0 | 4 | Não executada |
| npm run lint | — | — | — | — | exit 0 |
| npm run typecheck | — | — | — | — | exit 0 |
| npm run build | — | — | — | — | exit 0 |

Nenhum resultado de integração ou HTTP/navegador de rodada anterior foi contado como execução nova. O comando padrão usa mocks/portas simuladas para Auth e banco. A execução histórica de 109 era 24 unitários + 85 reais de banco; os 100 atuais são os 24 unitários anteriores + 76 casos de unidade/componentes adicionados. Não são 109 reais reexecutados nem 74 cenários completos aprovados.

## Valores secretos

O verificador gerou canários novos, somente em memória, para SUPABASE_SECRET_KEY e APOIO_HMAC_SECRET e os passou somente ao ambiente do build. Nenhum valor foi impresso ou gravado em .env. O controle positivo do detector passou.

Resultado da comparação dos valores completos e suas representações Base64:

- 113 artefatos destinados ao navegador, incluindo 13 em .next/static: zero correspondências.
- 106 arquivos versionados e 104 blobs do único commit: zero correspondências.
- 62 arquivos de operação examinados e saídas brutas dos quatro comandos: zero correspondências.

Chaves reais não estavam disponíveis: a conclusão é sobre canários neste build. Não comprova ausência de vazamento de uma credencial real desconhecida, respostas autenticadas dinâmicas, cookies ou fluxo de navegador. Encontrar nomes de variáveis em código interno de servidor não seria, por si só, vazamento de valor.

## Feito, faltando e bloqueado

Feito no código existente: cadastro/login/recuperação, confirmação e sessão SSR, vínculo pendente preparado, área restrita mínima, validação e autorização server-only; unidade/componentes e build aprovados nesta rodada.

Faltando comprovar: Auth/e-mail/REST/banco reais, migração de onboarding e idempotência/concorrência/rollback reais, navegação autenticada e aceite integral A01–A09. Os contratos locais anteriores registram PRD/modelo de dados esperados ausentes e CSS local em lugar de Tailwind; nenhuma dessas divergências foi alterada nesta verificação.

Nenhum dos quatro comandos executados falhou. O isolamento de portas do Supabase permanece sem solução comprovada nos registros disponíveis; não foi tentado um novo start, nem usada a integração nesta rodada. Não se declara banco apto a reiniciar ou incremento 2 pronto.

## Reprodução e comandos

`python3 operations/evidence/fase-a-20261104T065521Z/verify.py` repete os quatro comandos, cria novos canários efêmeros, examina artefatos/arquivos/Git e atualiza somente suas evidências e arquivos ignorados de build/cache. Não instala dependências nem inicia serviços. O script foi copiado do verificador existente para preservar integralmente as evidências anteriores.

Comandos de leitura adicionais: git status, git log --oneline -10, git diff --name-only, rg --files nos diretórios solicitados. Outputs em git-log.txt, git-status.txt, test.log, lint.log, typecheck.log, build.log; resumo em results.json.

**Fase A encerrada. Nenhuma implementação da Fase B foi iniciada nesta rodada. Aguardar aprovação explícita. Sem deploy, push, recursos pagos, exclusão de arquivos ou reinício do Supabase.**
