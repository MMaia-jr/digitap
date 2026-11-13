# AF-P0 — Parte 1: PostgreSQL e cookies GREEN

## Escopo e autorização

Execução autorizada pelo proponente após preparação somente leitura e aprovação
explícita. Sem banco real, instalação, migrations, seed, configuração remota,
commit, push ou deploy. As únicas consultas web foram documentação pública;
não foram acessados projeto Supabase, Vercel ou credenciais.

Foram preservados os 14 arquivos preexistentes modificados/não rastreados:
REL-01, teste e evidências AF-P0-02 e operations/evidence/.DS_Store.
Comparação SHA-256 antes/depois: nenhuma diferença nesses arquivos.
O teste original de 55 casos não foi modificado e os relatórios anteriores não
foram sobrescritos. Todas as evidências desta execução estão nesta pasta nova.

## TDD e resultados reais

| Execução | Exit code | PASS | FAIL | SKIP |
| --- | --- | --- | --- | --- |
| PostgreSQL original, antes de alterar produção | 1 | 49 | 6 | 0 |
| Cookies novos, antes de alterar produção | 1 | 4 | 4 | 0 |
| Destinos/TLS adicionais, antes de alterar produção | 1 | 11 | 1 | 0 |
| GREEN conjunto específico, após implementação | 0 | 81 | 0 | 0 |

RED PostgreSQL repetiu as seis falhas conhecidas: loopback aceito em produção,
endpoint autorizado recusado, TLS não alcançado, dois erros com input sensível e
transação de produção não alcançada. Cookies tiveram quatro falhas de produção:
SSR, logout, proxy e browser. O teste de browser demonstra a necessidade da alteração
exclusivamente de Secure; a validação de URL e as opções PKCE foram preservadas.
O RED adicional falhou ao tentar usar endpoint externo com PGSSLMODE permissivo;
os testes de rejeição já passavam devido à restrição local antiga.

Cada comando RED usou somente seu arquivo e os parâmetros:

```sh
npm test -- tests/auth/database-config.test.ts --reporter=verbose --reporter=json --outputFile.json=operations/evidence/af-p0-parte-1/postgres-red.json
npm test -- tests/auth/secure-cookies.test.ts --reporter=verbose --reporter=json --outputFile.json=operations/evidence/af-p0-parte-1/cookies-red.json
npm test -- tests/auth/database-hardening.test.ts --reporter=verbose --reporter=json --outputFile.json=operations/evidence/af-p0-parte-1/hardening-red.json
```

Comando GREEN:

```sh
npm test -- tests/auth/database-config.test.ts tests/auth/database-hardening.test.ts tests/auth/secure-cookies.test.ts tests/auth/cookies.test.ts tests/auth/server-cookies.test.ts tests/auth/oauth-pkce.test.ts --reporter=verbose --reporter=json --outputFile.json=operations/evidence/af-p0-parte-1/green.json
```

Seis arquivos: database-config 55, database-hardening 12, secure-cookies 8,
cookies 2, server-cookies 3, oauth-pkce 1. Logs completos em arquivos .log
correspondentes; resultados por caso em .json. Todos os SDKs/Pool envolvidos são
simulados ou usam fetch simulado; nenhuma conexão real de PostgreSQL ou Auth.

TypeScript restrito aos arquivos envolvidos passou com exit 0:

```sh
./node_modules/.bin/tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module esnext --moduleResolution bundler src/lib/database.server.ts src/lib/supabase/server.ts src/lib/supabase/browser.ts tests/auth/database-hardening.test.ts tests/auth/secure-cookies.test.ts
```

Output em typecheck.log (vazio no sucesso). git diff --check: exit 0.
Não executados build, suíte geral, integração de banco ou E2E.

## Implementação

- src/lib/database.server.ts: mantém SUPABASE_DB_URL e o endpoint local original;
  em produção exige SUPABASE_DB_ALLOWED_ENDPOINT independente no formato
  postgresql://host:porta/banco, sem credenciais, query ou fragmento. Compara
  host, porta e caminho do banco. Produção admite somente nome DNS explícito;
  IPs literais, aliases numéricos, localhost e nomes locais são rejeitados.
- SSL de produção é explicitamente {rejectUnauthorized:true}, usando confiança
  padrão do runtime. Parâmetros na URL são proibidos para impedir que o parser do
  pg substitua SSL. Não foi introduzida variável de CA nem relaxamento de TLS.
- Falhas de parsing/validação/construção do Pool geram Error genérico sem manter
  input/cause do erro original. Erros operacionais de conexão/SQL continuam com
  o fluxo anterior; esta parte não substitui a revisão de logs da aplicação.
- Pool conserva limites, timeouts, tratamento de erro ocioso e encerramento.
  begin, commit, rollback e release permanecem com o comportamento anterior.
- src/lib/supabase/server.ts: Secure depende de NODE_ENV=production. A mesma
  configuração protege escritas, exclusão e renovação pelo proxy existente;
  HttpOnly, SameSite, path e nomes são preservados.
- src/lib/supabase/browser.ts: somente secure:false foi substituído pela condição
  de produção. OAuth, validação local do endpoint e PKCE não foram alterados.

Novos testes: tests/auth/secure-cookies.test.ts e database-hardening.test.ts.
Nenhum arquivo de teste preexistente foi modificado.

## Riscos, aceite, rollback e Parte 2

Aceite local desta parte satisfeito: os 55 casos originais e os 26 casos específicos
adicionais/regressivos passaram; TypeScript passou; diff sem erro de whitespace.
Isso não equivale a aceite do piloto ou funcionamento comprovado em produção.

Permanecem pendentes:

- A configuração de produção deve ser preenchida por operador autorizado; não foi
  consultada nem alterada. Host/porta/banco incorretos ou autorização ausente falham
  de forma fechada. A autorização não pode ser derivada do próprio pedido do usuário.
- A CA/cadeia do certificado precisa ser confiável pelo runtime. Se não for, a
  conexão deve falhar. Eventual suporte a CA explícita precisa de avaliação separada;
  não contornar com rejectUnauthorized:false.
- Não houve teste de resolução DNS, DNS que retorna IP privado, handshake/hostname
  TLS, disponibilidade de rede, escalabilidade de conexões ou RLS efetivo. A lista
  explícita depende da confiança na configuração e no DNS. IPs públicos literais
  também são rejeitados nesta política mínima de endpoint DNS.
- Cookies Secure dependem de HTTPS para envio pelo navegador. A política é baseada
  no ambiente, sem confiar em headers encaminhados pelo solicitante. Local permanece
  com secure:false. Comportamento real no navegador não foi exercitado nesta parte.
- Google OAuth Cloud continua bloqueado pela validação antiga do browser e não foi
  habilitado. Logs brutos de cadastro, representação institucional, fluxo histórico
  e documentos privados continuam como pontos do diagnóstico para Parte 2, mediante
  autorização própria. Nenhuma decisão de produto adicional foi assumida.

Rollback: reverter somente as mudanças destes três arquivos de produção, mantendo
REL-01 e AF-P0-02. Como nada foi implantado ou migrado, não há rollback remoto ou
de dados nesta execução. Reverter a segurança dos cookies/TLS reabre os bloqueios
anteriores; não deve ser tratado como solução de produção.

## Referências de implementação consultadas

- Guia local Next: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md.
- Código instalado: pg/lib/connection-parameters.js e pg-connection-string/index.js
  (a connectionString pode sobrescrever opções SSL quando há parâmetros).
- Documentação pública Supabase: https://supabase.com/changelog.md e
  https://supabase.com/docs/guides/auth/server-side/advanced-guide.
  Nenhuma API nova ou migração de SDK foi introduzida.

Parte 1 concluída; parar antes de Parte 2.
