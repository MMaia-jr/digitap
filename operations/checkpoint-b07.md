# Checkpoint local B07 — aguarda autorização de commit

HEAD confirmado: `7c8c80d478890cf1e350b6c397151ed3aa767f3e`. Objetivo desta etapa: revisão e stage exato, **sem commit**, sem novas funcionalidades ou execução de suítes.

## Manifesto e verificações

[checkpoint-b07-files.txt](checkpoint-b07-files.txt) é o manifesto versionável de **41 arquivos**, um caminho por linha, sem globs. O inventário histórico `arquivos-incremento-3-b07.txt` inclui materiais brutos locais e não é a lista do stage. Correspondência de nomes, hashes SHA-256 revisados e blobs staged registrada em [scan.json](evidence/checkpoint-b07/scan.json) e [stage.json](evidence/checkpoint-b07/stage.json).

Commit proposto, **ainda não autorizado**:

```text
feat(publication): implementar publicacao controlada de snapshots aprovados
```

Antes de eventual commit futuro, revalidar HEAD, manifesto, hashes e `git diff --cached --check`. Não adicionar Co-Authored-By. Nenhum comando de commit foi executado nesta preparação.

## Publicação, hash e acesso

`publish` executa pelo modo editorial estrito. Auth.getUser valida identidade, contas_acesso é relida no banco e authorize exige papel editor/administrador ativo e correspondente à identidade. Payload não escolhe papel, organização, autorização, snapshot ou estado publicado. Organização proprietária deve estar validada.

A atividade é bloqueada com FOR UPDATE; organização/autorização são consultadas sob lock na mesma transação. O mesmo client pg executa UPDATE de snapshot/número/timestamp/estado e INSERT de auditoria, seguido de COMMIT; erro leva a ROLLBACK. O teste real de falha FK 23503 comprova ausência de publicação parcial. Concorrência/idempotência estão cobertas nas evidências registradas, sem novos testes nesta preparação.

A aprovação registra SHA-256 calculado pelo servidor sobre ID, número de versão e campos normalizados (título, descrição, início, orientação e referência oficial). A primeira publicação recalcula esse hash sobre os mesmos campos usados para construir o snapshot; atividade fica bloqueada durante a verificação e persistência. O hash não é aceito do cliente. A atribuição da organização e a programação vêm do banco; o hash separado da publicação cobre toda a projeção pública do snapshot, incluindo esses dados e a data pública.

**Aprovações antigas sem conteudo_sha256 não podem publicar (409)**. Não há backfill automático, alteração de eventos anteriores ou reaprovação implementada neste recorte. No retry de publicação, a prova do conteúdo vem do snapshot já persistido; alterações em colunas privadas não o substituem. O evento de publicação vincula a aprovação e a autorização original, e registra o hash do snapshot.

As consultas públicas fazem allowlist do snapshot e verificam seu hash, ID/organização/versão, organização atual validada e autorização original vigente da atividade/escopo/versão. Revogada, expirada, com prazo vencido, revogada_em preenchido ou incompatível falha fechada; organização suspensa/pendente não satisfaz o predicado validada. Não se substitui autorização original por outra válida. Esse comportamento é confirmado pelo código; as provas reais públicas registradas incluem revogação e perda de validação. Não foi inventado um E2E específico de suspensão/prazo que não conste nos registros.

Campos privados, motivos, comprovantes, contas e dados brutos de auditoria não são projetados. `/api/public/atividades[/id]` é namespace separado; `/api/atividades[/id]` permanece byte a byte como na base e mantém sessão/tenant. As páginas públicas não importam o serviço privado. Respostas públicas e privadas evitam cache público; erro de banco retorna indisponibilidade, objeto inelegível 404. Não foi implementado B08 nem novo fluxo de retirada.

## Evidências revisadas

Os 67 arquivos pendentes inicialmente foram inventariados, incluindo os não rastreados. Os hashes de todas as evidências descritas em quality-final.json conferiram antes da preparação. [evidence-review.json](evidence/checkpoint-b07/evidence-review.json) preserva resumos/hashes dos logs RED/GREEN que permanecerão locais.

- Publicação: 27 FAIL → 27 PASS.
- Consultas públicas: 7 FAIL → 34 PASS no conjunto publicação/consultas.
- Interface: 2 FAIL → 36 PASS no conjunto com interface.
- Vínculo de conteúdo aprovado: 3 FAIL / 60 PASS → 63 PASS (publicação/revisão).
- Finais registrados: **262 unitários/componentes, 152 integração real, 27 E2E Chromium PASS**, 0 FAIL/SKIP; lint/typecheck/build exit 0.
- Integração específica B07 teve 24 PASS na primeira execução; os RED anteriores são unitários/componentes, não simulação de execução PostgreSQL.
- Dois erros iniciais de E2E eram do seletor e da expectativa de envelope JSON do teste. Foram corrigidos antes dos 8 específicos e dos 27 completos PASS. Resultados iniciais/hashes preservados no resumo.
- A07 usa rota real funcional: visitante 401, proprietário/terceiro 403, papel forjado 400, organização pendente bloqueada por editor 422; controle positivo de publicação em outros casos. A descrição histórica incorreta do log Auth está esclarecida em observations-errata.md, sem alterar o bruto para ocultar a divergência.

**Nenhuma suíte repetida nesta preparação**, nenhum código funcional alterado. A07/B07 permanecem PASS local; A08 mantém manipulação temporal controlada; B08–B12 continuam NOT RUN. Não há aceite de 74/74 ou de produção.

## Banco e privacidade

Ambas as migrações, supabase/config.toml, dependências/lockfile e módulos existentes de transação e autorização foram comparados à base e permanecem idênticos. O inspetor existente foi executado apenas em leitura do catálogo: nove tabelas, RLS, ausência de policies/grants PUBLIC/anon/authenticated, permissões esperadas de service_role e histórico de duas migrações. Nenhuma mudança permanente ou migração foi feita. Ver comparação registrada em evidence-review.json.

Logs, server.log, observações de requisições/console, processos com identificação do usuário local e intermediários ficam somente locais/ignorados. Não entram no stage, mesmo quando sanitizados. Resumos selecionados não contêm corpos de requisição, credenciais ou cookies. Os dois JSONs antigos com interfaces de rede do Mac continuam ignorados. Nenhum material foi apagado.

A busca de valores secretos conhecidos usa somente memória, sem impressão. Inspeção adicional de JWT/chaves, URLs com credenciais, arquivos binários/temporários e contatos não fictícios complementa a revisão do manifesto; bundles .next/static e public também são conferidos por valores. .env privados, caches, perfis/binários de navegador, resultados de execução e fixtures sensíveis são excluídos. Testes usam dados artificiais e domínios reservados, com autorização específica de criação/limpeza registrada na implementação. Paths técnicos do diretório autorizado são guardas/referências de reprodução, não dados públicos da aplicação. Isso não garante detectar todo segredo desconhecido nem reescreve commits históricos.

## Stage e parada

Stage autorizado exclusivamente por manifesto literal, sem `git add .` e sem forçar ignorados. A conferência final verifica nomes exatos, conteúdo staged igual aos arquivos revisados, hashes e whitespace. O scan exclui o próprio arquivo do mapa de hashes para evitar autorreferência; ele também é comparado integralmente entre disco e index na validação final.

Sem instalação, containers/processos iniciados, alterações de Docker/firewall, fixtures novas, migração, push ou deploy. Aguardar autorização humana de commit. **Não iniciar B08.**

Resultado da preparação: 41 arquivos no conjunto revisado; comparação de valores e inspeção de 88 arquivos (candidatos, brutos originais e bundle) sem achados. Ver stage.json para o resultado efetivo do index.
