# Relatório do primeiro incremento — 03/11/2026

## Resultado

Base local isolada criada no diretório autorizado. Nove tabelas do contrato, RLS fechada, grants de clientes revogados, padrão de EXECUTE de futuras funções do proprietário postgres fechado, índices de FKs e idempotência estrutural do apoio por navegador/atividade. A lógica de apoio ainda não existe.

Autorização server-only e adapter Supabase implementados com identidade verificada, e-mail confirmado, papel do banco relido, situação ativa e tenant. A conta autenticada de teste tinha metadata administrativa forjada e permaneceu sem acesso editorial. Não há rotas HTTP ou páginas do MVP nesta entrega.

## TDD e evidências

- `access-red.log`: módulo ausente; suite falhou antes da implementação.
- `access-red-behavior.log`: após interface provisória sem comportamento, **19 testes falharam**.
- `access-green.log`: os mesmos 19 passaram após implementação mínima.
- `adapter-red.log`: módulo de adapter ausente; suite falhou antes de sua implementação.
- `access-adapter-green.log`: **24 testes unitários passaram** após criar o adapter.
- `database-red.log`: banco real sem tabelas: **11 falharam e 72 passaram**. Os 72 pedidos REST já eram negados por ausência de tabelas; isso, isoladamente, NÃO comprovava segurança. Os testes de catálogo/RLS e integridade impediram um falso GREEN.
- `database-green.log`: migração aplicada, tabelas reais, Auth real, fixtures fictícias: **85 testes passaram**, incluindo 72 combinações (9 tabelas × 2 papéis × 4 operações), 9 verificações de catálogo/grants, RLS após GRANT temporário com rollback, duas verificações Auth/papel e integridade das fixtures.
- `typecheck.log`: TypeScript passou.
- `migration-up.log` e `migration-list.log`: migração gerada pela CLI, aplicada e registrada no banco **local**. A chave `remote` no JSON de listagem é o nome genérico da coluna de histórico; o alvo registrado é 127.0.0.1:56152, nenhum projeto remoto.
- `advisors.log`: advisors de segurança locais sem problemas reportados.
- `npm-audit.json`: **0 vulnerabilidades reportadas** na consulta executada; isso não substitui testes de aplicação.

Após GREEN, revisão das fronteiras e typecheck não exigiu refatoração adicional. Não houve alteração comportamental posterior sem revalidação.

Build Next.js, lint, E2E de navegador, scan de bundle, 74 cenários completos e restauração operacional: **NOT RUN**. O aplicativo web e a configuração de lint ainda não foram criados neste incremento focado no banco/acesso.

## Isolamento e bloqueios

- Projeto Supabase: `a-praca-v1-5`; banco `56152`, API `56151`, e-mail de teste `56154`; shadow `56150` reservado, não usado. Nenhum container/volume de outro projeto foi consultado ou alterado.
- Docker 29.7.2 disponível; CLI 3.0.0. Os comandos via CLI precisaram de execução fora do sandbox para acessar o socket. Nenhum sudo/prune/reset/exclusão de volume. Rede própria criada: `a-praca-v1-5-loopback`, com opção host_binding_ipv4=127.0.0.1.
- A CLI publicou em **0.0.0.0 e ::** mesmo na rede própria. Restrição a loopback NÃO comprovada. Não houve publicação em serviço remoto; o stack temporário teve portas wildcard no host durante a execução. Foi encerrado somente o projeto A Praça com backup/preservação de volumes. `local:start` fica bloqueado por padrão. Não alterar Docker global nem outros projetos para resolver isso.
- npm install/audit encontraram DNS bloqueado no sandbox; a execução autorizada fora dele funcionou. Cache npm dentro do projeto.
- `db query --file` falhou por múltiplas instruções em prepared statement, sem aplicar o schema. Foi usado `migration up` local após conferir `--help`, e o histórico confirmou aplicação.
- Valores de credenciais locais não estão nos arquivos de evidência. Não criar `.env.local` com chaves remotas.

## Ajustes no SQL de referência

Mesmo modelo de nove entidades. Adicionados índices nas FKs e fechamento do EXECUTE padrão para futuras funções. Snapshot de atividade exige objeto JSON, número e timestamp coerentes; essa constraint estrutural não comprova ainda a validação de conteúdo/versão/autorização. Referências polimórficas, workflow editorial e todas as RPCs de negócio permanecem pendentes e sem endpoints que as exponham.

## D01–D07 neste incremento

D01: privacidade no banco comprovada, agregados futuros pendentes. D02: nenhum endpoint de apoio habilitado; elegibilidade/rate limit pendentes. D03: módulos/adapter testados, integração em handlers pendente. D04: sem selos/contadores armazenados independentes. D05: FKs sem cascade destrutivo; retenção pendente. D06: stack fixada e licença não inventada. D07: somente fixtures fictícias, sem números de adoção ou parceria.

## Próximo incremento proposto

Resolver e comprovar bind a loopback sem alterações globais; depois implementar somente cadastro/login SSR e criação idempotente/transacional de organização pendente + conta, com testes prévios. Sem publicação editorial, apoios, parceiros ou painel nesse próximo recorte. A execução para aqui, conforme pedido.

## Fontes verificadas

- https://supabase.com/changelog
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/local-development (a opção de rede recomendada não foi suficiente nesta execução; vale a inspeção real dos bindings)
- Versões consultadas no registry oficial via npm view; lockfile contém as resoluções instaladas.
