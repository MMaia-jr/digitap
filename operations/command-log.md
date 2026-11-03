# Registro de execução — incremento 1

Escopo: somente este diretório e recursos Docker criados especificamente para A Praça. Sem acesso a containers/volumes de outros projetos.

Inspeção inicial: diretório inexistente; Node 22.23.2, npm 10.9.8. Docker 29.7.2 respondeu; 12 CPUs, 8321867776 bytes de memória total. Disco: 39 GiB livres. `sysctl hw.memsize vm.swapusage` foi negado pelo sandbox; sem sudo ou alteração global. Portas 54321–54323 sem listeners no host na inspeção inicial. Não serão usadas as portas padrão.

Versões obtidas com `npm view`: Next 16.4.5, React 19.3.1, Supabase JS 2.118.0, SSR 0.12.7, CLI 3.0.0, Vitest 5.1.0, TypeScript 7.0.2, pg 8.23.1.

## Comandos e efeitos efetivamente executados

1. `mkdir -p` somente para a raiz autorizada e subdiretórios. Criação de package.json, gitignore, tsconfig e testes via scripts Python e here-docs locais.
2. `npm view` para versões/engines de Next, React, Supabase JS/SSR/CLI, Vitest, TypeScript, pg, tipos e server-only.
3. Duas tentativas iniciais npm foram interrompidas enquanto sem saída. A tentativa sequencial com `--fetch-retries=0 --fetch-timeout=20000` confirmou ENOTFOUND. Instalação autorizada fora do sandbox: `npm install --no-audit --no-fund --cache ./.npm-cache --fetch-retries=0 --fetch-timeout=20000`. Tipos instalados com `--save-dev --save-exact`.
4. `npm test` antes de implementar (suite ausente), após interface provisória (19 FAIL), após implementação (19 PASS), após escrever testes do adapter (suite ausente) e após adapter (24 PASS). Logs em evidence/.
5. CLI local `supabase --version`, `init --help`, `start --help`, `migration new --help`, `init --workdir <raiz autorizada>`. Configuração gerada adaptada somente neste projeto.
6. Docker somente inspeções de versão/recursos e objetos com nome a-praca-v1-5: `docker version`, `docker info --format`, `docker container inspect supabase_db_a-praca-v1-5` e `supabase_kong_a-praca-v1-5`, `docker network inspect a-praca-v1-5-loopback`. Nenhuma listagem/inspeção dos outros ambientes. Portas verificadas com lsof antes de iniciar.
7. `supabase start --workdir <raiz> --exclude realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor`. Primeira tentativa negada pelo sandbox, tentativa autorizada iniciou serviços próprios. Imagens oficiais novas foram baixadas. A saída padrão inicial da CLI inclui credenciais locais; nas seguintes execuções foi capturada em memória e omitida das evidências.
8. `supabase migration new security_foundation --workdir <raiz>` gerou o nome 20261103221114_security_foundation.sql antes de escrever o conteúdo.
9. `npm run test:db` com banco real sem tabelas comprovou RED (11 FAIL, 72 PASS). SQL escrito depois desse RED.
10. `supabase stop --project-id a-praca-v1-5 --workdir <raiz>` preservou volumes. `docker network create --label project=a-praca-v1-5 --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 a-praca-v1-5-loopback`. Restart usando apenas essa rede via script local. Inspeção comprovou bindings wildcard ainda presentes; problema registrado.
11. `supabase db query --help`, `db advisors --help`, `migration up --help`, `migration list --help`, `stop --help`. `db query --file <migração> --workdir <raiz>` falhou por múltiplas instruções. `migration up --workdir <raiz>` aplicou a migração local e foi confirmado por `migration list --workdir <raiz>`.
12. `npm run test:db` após SQL/adapter real: 85 PASS. Fixtures criadas via Auth local/SQL e removidas por UUID ao final, sem dados de terceiros.
13. `npm run typecheck`: PASS. `supabase db advisors --type security --workdir <raiz>`: nenhum problema reportado.
14. `npm audit --json --cache ./.npm-cache --fetch-retries=0 --fetch-timeout=20000`: DNS negado no sandbox; repetição autorizada resultou em zero vulnerabilidades reportadas.
15. Encerramento final somente via `supabase stop --project-id a-praca-v1-5 --workdir <raiz>`, preservando volumes. Inicialização automática bloqueada até resolver loopback.

Os comandos redirecionaram saídas de teste para arquivos de evidence e consultaram esses arquivos com tail/cat. Todos os caminhos de escrita pertencem ao projeto, exceto recursos Docker locais próprios explicitamente autorizados. Não foi inicializado Git, feito commit/push, criado remoto ou efetuado deploy.
