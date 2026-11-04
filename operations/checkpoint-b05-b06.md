# Checkpoint local B05–B06 — aguarda autorização de commit

HEAD de referência confirmado: 012394d02fd27ce0ca847cb77e521e8acdbece22. Nenhum commit novo, push ou deploy. Não iniciar B07.

## Manifesto e commit proposto

Lista exata versionável: [checkpoint-b05-b06-files.txt](checkpoint-b05-b06-files.txt), um caminho por linha sem globs. O stage foi limitado a esse conjunto revisado; ver [stage.json](evidence/checkpoint-b05-b06/stage.json) e [scan.json](evidence/checkpoint-b05-b06/scan.json) para correspondência, hashes e checagens finais. operations/arquivos-incremento-3-b05-b06.txt é o inventário histórico da implementação e também menciona artefatos locais excluídos; não é o manifesto do stage.

Commit proposto, **ainda não autorizado**:

```text
feat(editorial): implementar revisao e decisoes auditadas
```

Após autorização futura, revalidar o stage e executar somente esse commit local, sem Co-Authored-By. Nenhum comando de commit foi executado neste checkpoint.

## Revisão de segurança e privacidade

- Todos os 58 arquivos pendentes inicialmente foram inspecionados, incluindo código, testes, documentos e materiais de execução; nenhum contato real/credencial literal detectado na busca inicial.
- Logs brutos, server.log, observações de requisições/console, snapshots de git status e intermediários de execução **não entram no stage**, mesmo quando sanitizados. Foram preservados localmente sem exclusão e passaram a ser ignorados por uma lista explícita em .gitignore para este diretório de evidência.
- As cinco evidências de implementação selecionadas são resultados estruturados sem corpos de requisição: quality-final.json, e2e.json, catalog.json, secret-values.json e o inspetor de preservação somente leitura. Resumo dos RED/GREEN com hashes dos logs locais em evidence/checkpoint-b05-b06/evidence-review.json.
- Nenhum .env privado ou .env.example modificado, credencial PostgreSQL literal, token, cookie de sessão, perfil/binário de browser, cache, trace, screenshot, vídeo, dump de dados ou fixture sensível foi incluído. Testes contêm somente dados e domínios reservados fictícios. Nomes de variáveis/cookies e APIs de sessão no código não são valores de credenciais.
- Valores secretos conhecidos do stack local foram comparados em memória, sem impressão ou gravação. Buscas adicionais de chaves/JWT/URLs com credenciais, binários e contatos não fictícios complementaram a revisão. Isso não é garantia de detecção de todo segredo desconhecido.
- Os dois JSONs brutos antigos de rede permanecem locais e ignorados. Paths técnicos do diretório autorizado usados para reprodução/guardas continuam no código/documentação; nenhuma nova identidade/organização real foi introduzida.
- O escopo deste checkpoint é o conjunto novo desde a base: não reescreve commits anteriores que já continham logs.

## Papéis e decisões editoriais

Auth.getUser verifica a identidade; contas_acesso é consultada no servidor e seu auth_user_id, papel e situacao são validados por authorize. Modo editorial estrito não faz fallback para organização. Login de editor/admin depende do papel ativo no banco, não de e-mail textual, payload ou user_metadata. Cadastro/onboarding não promovem papéis.

validateReview rejeita campos extras como papel, autor e snapshot. Transições são escolhidas por mapa controlado no servidor, com estado/versão esperados; não há escrita genérica de estado fornecido pelo cliente. Aprovação consulta autorização compatível com atividade, escopo divulgacao, marcador atividade:versao:N e vigência, inclusive em retry.

Atividade, autorização e conta são protegidas pelos locks existentes e transação pg; UPDATE da decisão e INSERT do evento usam o mesmo client. Idempotência fica na metadata textual restrita do evento. Falhas PostgreSQL no INSERT reverteram a transição nos testes reais. Não foi aberta função SQL ou tabela para clientes.

Motivo é retornado somente após filtro de proprietário/editor autorizado e como projeção de texto, sem metadata/prova de autorização. Outros tenants são negados antes de consultar eventos. Fila/detalhe privados têm no-store/SSR protegido. Nenhuma rota nova de publicação, geração de snapshot público ou habilitação de apoios existe. Aprovação interna não valida representação institucional.

## Evidências conferidas, sem repetir suítes

[Resumo com hashes](evidence/checkpoint-b05-b06/evidence-review.json) coteja diretamente os logs locais, JSON final e os 19 resultados individuais E2E.

- Primeiro RED: 33 FAIL / 39 PASS; GREEN: 72 PASS.
- Formulário: 3 FAIL; conjunto domínio/Auth/UI: 75 PASS.
- Navegação editorial: 1 FAIL / 31 PASS → 32 PASS.
- Retry com autorização revogada: 1 FAIL / 32 PASS → 33 PASS.
- Integração inicial: 26 PASS / 1 FAIL no monitor de lock; correção do snapshot de observação do teste → 27 PASS. Novo caso de retry revogado completou 28 casos novos na suíte final.
- Finais registrados: **223 unitários/componentes, 128 integração real e 19 E2E PASS**, 0 FAIL/SKIP. Lint/typecheck/build exit 0.

As suítes não foram reexecutadas nesta preparação. A revisão do checkpoint não mudou código funcional.

## Banco preservado

Ambas as migrações e supabase/config.toml foram comparados à base e permanecem idênticos. O inspetor existente foi executado apenas para leitura do catálogo local, sem fixtures, DDL, GRANT, migração ou configuração de infraestrutura.

catalog.json confirma nove tabelas com colunas/nulabilidade, constraints/índices esperados, RLS habilitada, zero policies, nenhum grant PUBLIC/anon/authenticated e DML esperado de service_role. Histórico permanece security_foundation + organization_onboarding, sem novas migrações. Definições registradas foram revisadas; nenhuma divergência material identificada. O teste legado que usa GRANT SELECT o faz em transação revertida, não como alteração permanente.

Não se afirma reconstruir todo histórico externo de DDL: a confirmação combina diff/SQL da base, catálogo compatível e regressões registradas.

## Matriz e limites

B05 e B06 continuam PASS; **B07 NOT RUN; A07 PENDENTE** no aceite integral, pois publicação ainda inexiste. A08 mantém tempo controlado em fixtures. **Edição e reenvio após devolução não foram implementados.** Motivos e decisões continuam privados. Autorizações exigem escopo explícito de versão; legitimidade material segue exame humano.

## Verificações do stage e parada

Comandos usados na raiz autorizada:

```sh
git rev-parse HEAD
git status --short
git diff --cached --name-only
node operations/evidence/incremento-3-b05-b06/inspect-preservation.mjs
git --literal-pathspecs add --pathspec-from-file=operations/checkpoint-b05-b06-files.txt
git diff --cached --name-only
git diff --cached --check
```

Inspeção em memória verificou os blobs staged contra os arquivos e hashes revisados. Não foi usado git add . ou inclusão forçada de ignorados. Materiais fora do manifesto permanecem locais/ignorados, sem descarte.

Sem bloqueio técnico identificado; aguardar autorização explícita de commit. Não fazer commit, push, deploy, novas migrações, alterações de infraestrutura ou início de B07.
