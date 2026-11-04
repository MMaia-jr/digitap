# Etapa A — verificação do estado existente

Verificação local concluída no commit `dedc9c6`. Nenhuma implementação foi criada, corrigida ou substituída. Nenhuma dependência foi instalada. Este relatório não autoriza Etapa B nem declara o incremento 2 pronto.

## Estado real e divergências

- Diretório confirmado: `/Users/alexandrechagasleaocryptoboy/projects/a-praca-v1-5`.
- Git existente, limpo antes da verificação, um commit: `dedc9c6 chore: estado inicial do projeto A Praça v1.5 (incremento 1 reportado)`. Nenhum remoto configurado no resultado de `git remote -v`.
- O commit inicial já contém telas, rotas, sessão SSR, fluxo de autenticação e a migração preparada de organização. Apesar do rótulo do commit, o código não está limitado ao incremento 1. Não deve ser reinicializado nem duplicado.
- `specs/prd-v1.5.md` e `specs/modelo-de-dados-v1.5.md` não existem. A cópia integral do contrato da Fase 3 também não foi localizada em specs/. Foram consultados os contratos locais, matriz e relatórios permitidos; nenhuma outra pasta do computador foi pesquisada.
- `src/lib/supabase/client.ts` não existe: a implementação atual é server-only, sem cliente Supabase no browser, conforme contratos-api.md. O callback equivalente é a página `/auth/confirm` mais os endpoints POST de confirmação/redefinição. Isso não é comprovação do fluxo real.
- Tailwind não está instalado; as telas usam CSS local, conforme o relatório anterior. Nenhuma mudança de stack foi feita nesta verificação.
- SECURITY.md já registra o bloqueio da rede e o uso de testes simulados; conserva também trecho histórico dizendo que não existem endpoints, anterior à seção do incremento 2. A inconsistência documental foi registrada, sem reescrever o arquivo nesta Etapa A.

## Ferramentas conferidas

Node 22.23.2; npm 10.9.8; Next 16.4.5; TypeScript 6.0.3; Supabase CLI 3.0.0. Versões do SDK, React, ESLint e demais dependências constam no package.json/lockfile existentes. Não houve instalação, atualização nem consulta a outro projeto.

## Execuções novas

| Comando / suíte | PASS | FAIL | SKIP | NOT RUN | Resultado |
|---|---:|---:|---:|---:|---|
| npm test (unidade/componentes) | 100 | 0 | 0 | 0 | 9 arquivos, exit 0 |
| Segurança real de banco (test:db) | 0 | 0 | 0 | 85 | Supabase parado; não executada |
| Onboarding real de banco | 0 | 0 | 0 | 4 | Nova RPC não aplicada; não executada |
| npm run lint | — | — | — | — | exit 0 |
| npm run typecheck | — | — | — | — | exit 0 |
| npm run build | — | — | — | — | exit 0 |
| HTTP/browser autenticado real | — | — | — | NÃO EXECUTADO | Nenhum servidor/stack iniciado nesta Etapa A |

`npm run test:onboarding:db` seleciona segurança + onboarding: os mesmos 89 casos, não um segundo grupo de 89 para somar. O comando padrão exclui intencionalmente esses testes reais. PASS em mocks não foi convertido em PASS de integração.

### Reconciliação dos 109 testes

O relatório do incremento 1 tem evidência histórica de **24 unitários + 85 de banco = 109**. A suíte atual de unidade/componentes contém esses 24 mais **76 novos = 100**. Os 85 reais antigos não foram reexecutados, e existem 4 casos novos de banco preparados. Portanto, não houve uma execução atual de 109 nem uma regressão aritmética de nove testes: a seleção e a modalidade são diferentes.

Foram lidos `operations/evidence/access-adapter-green.log`, `database-green.log`, `migration-up.log` e `migration-list.log` anteriores. Esses resultados são históricos, não foram reemitidos como provas novas.

## Migrações

1. `20261103221114_security_foundation.sql`: arquivo presente com nove tabelas, RLS e grants de clientes fechados. As evidências anteriores mostram aplicação local e histórico em 127.0.0.1:56152. O estado atual do banco desligado não foi reconfirmado por consulta.
2. `20261103230507_organization_onboarding.sql`: função invoker com EXECUTE somente a service_role no arquivo. Os documentos indicam que foi preparada e não aplicada. Sem consulta ao banco, não se declara aplicação ou comportamento transacional comprovados.

Não houve `start`, reset, migration up, migração remota, SQL, criação de conta ou edição de config.toml nesta verificação.

## Rede Docker

`docker ps` foi filtrado exclusivamente por nomes do stack A Praça e retornou vazio, exit 0. Sem container próprio ativo, `docker port` ficou NOT RUN por ausência de alvo. As portas 56150/56151/56152/56153/56154/56157/56159 não tinham listeners na inspeção. Resultado e comandos em docker.txt.

O problema histórico de bind em 0.0.0.0 e :: **continua sem solução comprovada**. Supabase mantido desligado; ausência de containers não equivale a prova de configuração segura para reinício. Nenhum recurso de outro projeto ou configuração global foi inspecionado em detalhe ou alterado.

## Comparação segura de valores secretos

Diferente da verificação anterior, este build recebeu dois valores canários aleatórios somente no ambiente do processo: SUPABASE_SECRET_KEY e APOIO_HMAC_SECRET. Os valores não foram escritos em .env, script, relatório ou Git, nem impressos. Foram descartados ao fim do processo.

O detector passou por controle positivo em memória. A busca comparou os valores completos e suas representações Base64, não apenas os nomes das variáveis. Resultado:

- 113 arquivos destinados ao navegador, incluindo 13 de `.next/static`, HTML, RSC e demais respostas pré-renderizadas: **zero correspondências dos valores**.
- 106 arquivos versionados: zero correspondências.
- Histórico Git: 1 commit, 104 blobs únicos: zero correspondências.
- 52 arquivos de operação examinados e saídas brutas dos quatro comandos antes de gravar os logs: zero correspondências. O gravador também redige valores caso apareçam; não foi necessária redação nesta execução.
- Chaves reais não estavam disponíveis no ambiente/arquivos locais: a comparação foi feita com canários, não se afirma ter testado uma credencial real.

A presença do nome da variável em código/sourcemaps internos do servidor não é vazamento de valor. O teste não cobre respostas dinâmicas autenticadas, cookies, envio de e-mail nem um valor histórico desconhecido e revogado. H01 integral permanece pendente; o teste de build com canários passou.

## A01–A09: aceite integral

| Cenário | Status integral | O que existe / o que falta |
|---|---|---|
| A01 | NOT RUN | Signup, confirmação e vínculo simulados passaram; falta Auth/e-mail/banco/browser reais. |
| A02 | NOT RUN | Validação e duplicidade genérica simuladas passaram; falta duplicidade no provider real. |
| A03 | NOT RUN | Senha incorreta simulada é negada; falta login real. |
| A04 | NOT RUN | Recovery, tipo de OTP, erro de expiração e limpeza simulados passaram; faltam expiração e uso único reais. |
| A05 | NOT RUN | Identidade e tenant alheios negados em unidade; falta fluxo autenticado real. |
| A06 | NOT RUN | Payload e metadata não elevam papel em unidade; falta prova real de EXECUTE e persistência. |
| A07 | NOT RUN | Identidade não confirmada é negada em unidade; publicação não está implementada e não foi exercitada. |
| A08 | NOT RUN | Logout/cookies/conta bloqueada simulados passaram; falta sessão expirada/revogação real. |
| A09 | NOT RUN | Guardas unitários passam; não há rota editorial e não houve fluxo real em browser nesta etapa. |

Esses status não anulam os 100 PASS de unidade/componentes; indicam que as condições de aceite completas solicitadas não foram demonstradas.

## O que está feito, faltando ou bloqueado

Feito: estrutura, nove tabelas em SQL, autorização server-only, implementação parcial dos fluxos do incremento 2, testes unitários/componentes, build e teste de canários.

Faltando: PRD/modelo de dados locais esperados, integração Auth/REST/RPC e e-mail reais, concorrência/rollback reais da nova migração, fluxo em navegador e aceite A01–A09. A auditoria anterior registra 16 entradas moderadas de desenvolvimento; essa dívida não foi corrigida nem a auditoria reexecutada nesta Etapa A.

Bloqueado: isolamento de portas para iniciar Supabase. Nenhum dos quatro checks de qualidade executados está falhando agora. Isso não significa ausência de falhas funcionais/segurança em caminhos não executados.

## Reprodução e arquivos

Executar, a partir da raiz autorizada: `python3 operations/evidence/etapa-a-20261103T234832Z/verify.py`. O script executa somente os quatro checks, gera canários em memória e examina arquivos/Git; não inicia serviços nem instala dependências. A reprodução gera novos canários e atualiza exclusivamente suas evidências e artefatos de build ignorados.

Logs: test.log, lint.log, typecheck.log, build.log. Resultados estruturados: results.json. Git: git-log.txt e git-status.txt. Docker: docker.txt. Comandos: commands.md. Nenhum arquivo preexistente versionado foi alterado; apenas esta pasta de evidências foi criada. `.next/` e caches ignorados foram atualizados pelos checks autorizados.

**Etapa A encerrada. Incremento 2 permanece com aceite PENDENTE. Aguardar aprovação explícita antes de qualquer implementação/complementação da Etapa B. Sem deploy, push, remoto, serviço pago ou convite.**
