# Checkpoint local — B01–B04

Base: 954299ece3c831003a221efc37adc9ba304ded2b.
Estado: **stage preparado, sem commit; aguarda autorização explícita**.

## Manifesto e commit proposto

O conjunto exato está em [checkpoint-b01-b04-files.txt](checkpoint-b01-b04-files.txt), um caminho por linha, sem globs. Somente esses arquivos podem entrar no commit. O manifesto inclui código/configuração/testes do recorte, documentos, evidências registradas e a inspeção deste checkpoint.

```text
feat(activities): implementar rascunhos privados e envio auditado
```

Corpo sugerido:

```text
Implementa criação, edição e envio privado com tenant derivado no servidor.
Persiste transição e evento na mesma transação PostgreSQL, com controle de versão e idempotência.
Registra RED/GREEN e validação local: 183 unitários/componentes, 100 integração e 13 E2E passando.
Preserva nove tabelas, RLS, grants permanentes e migrações; A07 permanece pendente.
```

Não foi executado git add .; stage somente pelo manifesto literal. Conferidos nomes/quantidade, conteúdo dos blobs staged, ausência de arquivos privados e git diff --cached --check. Resultados em [stage.json](evidence/checkpoint-b01-b04/stage.json), hashes e revisão em [scan.json](evidence/checkpoint-b01-b04/scan.json).

Após autorização humana futura, revalidar o stage antes de executar git commit com o título acima. Sem Co-Authored-By, push ou deploy.

## Conteúdo revisado

- Novos módulos domain/service e conexão pg server-only; três handlers privados, duas páginas privadas, formulário e alteração do dashboard próprio.
- Validações de conteúdo/data/URL e IDs exclusivamente derivados de Auth/conta. Proprietário e editor/admin explícito no detalhe privado; nenhum fluxo de publicação ou promoção por payload.
- Transação única pg para UPDATE da atividade e INSERT da auditoria; sem transação fictícia entre chamadas HTTP. Conexão restrita ao banco local, senha somente em variável de servidor.
- pg 8.23.1 já instalado movido para dependência runtime com lockfile coerente, sem atualização de versão ou nova instalação.
- Runner/reporter E2E ajustados para evidência independente; regressão Auth atualizada para a nova rota privada, sem alterar código funcional de autenticação.
- Foram conferidos todos os arquivos novos/modificados desde a base. Arquivos explicados no manifesto e no relatório da implementação; nenhuma alteração existente foi descartada.

## Segurança do conjunto a versionar

- Comparação em memória dos valores conhecidos secretos locais e de variáveis privadas disponíveis; busca adicional de chaves/JWT/credenciais literais, e-mails não fictícios e arquivos binários. Nenhum segredo ou contato pessoal real indevido identificado. A inspeção não garante detectar qualquer segredo desconhecido.
- **.env.example é a única exceção documental:** nomes e placeholders, incluindo postgres:SENHA_LOCAL. Essa string não é senha real. Nenhum .env privado ou valor real de conexão será versionado.
- Caches, node_modules, .next, perfis/binários do Chromium, .playwright-results, traces, screenshots, vídeos e storageState não fazem parte do stage. Fixtures de teste contêm somente nomes/domínios reservados e UUIDs aleatórios; nenhuma base de dados ou dump de dados foi incluído.
- Os dois JSONs brutos antigos com endereços do Mac seguem ignorados e fora do manifesto. Não foram apagados, editados ou adicionados à força.
- Paths do diretório autorizado e metadados técnicos de reprodução já documentados continuam nos logs/fontes; não constituem promessa de anonimização integral da máquina. Dados de organizações/pessoas reais não foram usados.

## Evidências conferidas, sem repetir as suítes

| Evidência | Resultado registrado |
|---|---|
| unit-red.log | Falha de coleta por módulos ausentes; nenhum teste executado nessa coleta |
| unit-red-behavior.log | RED: 22 FAIL / 27 PASS |
| unit-green.log | GREEN: 49 PASS |
| form-red.log → refactor-green.log | 1 FAIL + 2 PASS → 52 PASS (domínio + componente) |
| input-regressions-red.log → input-regressions-green.log | 2 FAIL + 49 PASS → 51 PASS |
| unit-final.log / quality-final.json | 183 PASS / 0 FAIL / 0 SKIP |
| integration-first.log | 11 testes reais específicos PASS |
| integration-final.log/json | 100 PASS / 0 FAIL / 0 SKIP (89 preservados + 11 novos) |
| e2e.json | 13 PASS / 0 FAIL / 0 SKIP: 9 Auth + 4 atividades |
| lint/typecheck/build finais | exit 0 |

O número 13 do runner não transforma A07 em aceite integral: publicação está ausente e sua prova parcial continua limitada ao 404. A08 conserva datas manipuladas somente nas fixtures. B01–B04 estão PASS na matriz e B05–B06 seguem NOT RUN, ainda sem autorização.

## Preservação de banco e migrações

Revisão dos arquivos SQL confirma as duas migrações idênticas byte a byte à base. Não há novo arquivo de migração ou mudança de configuração Supabase.

Inspeção local nova apenas em **BEGIN READ ONLY → consultas ao catálogo → ROLLBACK**, sem consultar dados pessoais nem criar/remover fixtures. [catalog.json](evidence/checkpoint-b01-b04/catalog.json) comprova nove tabelas, nomes/tipos/nulabilidade das colunas e quantidades de constraints/índices compatíveis com a fundação; definições de constraints/índices registradas e revisadas. RLS habilitada em todas, zero policies, zero grants PUBLIC, nenhuma permissão de tabela para anon/authenticated e DML esperado para service_role. Histórico contém somente security_foundation e organization_onboarding.

A primeira comparação automatizada de colunas tinha parser por linha e indicou diferenças falsas onde a migração tinha múltiplas colunas na mesma linha ou última coluna sem vírgula. Isso foi corrigido na inspeção, sem mudar banco/produção; resultado preliminar preservado em catalog-parser-initial.json, resultado válido final sem divergências em catalog.json. inspect-catalog.mjs permite reproduzir somente a leitura, usando credenciais em memória e proteção de alvo local.

Não se alega um histórico externo completo de toda operação DDL: a confirmação combina diff/arquivos preservados, catálogo atual compatível e testes reais registrados. Nenhuma alteração durável de RLS/grants foi introduzida pelo recorte. O teste legado de concessão SELECT ocorre em transação revertida e não representa nova permissão permanente.

## Comandos deste checkpoint

```sh
git status --short
git log --oneline -3
git diff --stat 954299ece3c831003a221efc37adc9ba304ded2b
git diff --cached --name-only
node operations/evidence/checkpoint-b01-b04/inspect-catalog.mjs
git --literal-pathspecs add --pathspec-from-file=operations/checkpoint-b01-b04-files.txt
git diff --cached --name-only
git diff --cached --check
```

Além disso, scripts locais de inspeção compararam segredos em memória e conteúdo do index, sem imprimir valores. Nenhum npm test/build ou processo de aplicação foi reiniciado neste checkpoint.

## Bloqueios e parada

Nenhum bloqueio técnico detectado após resolver o parser da inspeção. O commit está bloqueado **somente pela autorização humana ainda não concedida**. B05–B06 não iniciados; as restrições para esse futuro recorte foram anotadas na matriz: organização pendente não publica, papel vem do servidor, eventos auditáveis e nenhuma versão privada pública. Não implementar esse próximo recorte agora.
