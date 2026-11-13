# AF-P0-02 — testes RED do adaptador PostgreSQL

## Execução e limites

Comando executado exclusivamente para o arquivo novo:

```sh
npm test -- tests/auth/database-config.test.ts --reporter=verbose --reporter=json --outputFile.json=operations/evidence/af-p0-02/vitest.json
```

Resultado final: exit code **1**, **55 testes: 49 PASS, 6 FAIL, 0 SKIP**;
1 arquivo FAIL. Output completo em vitest.log; resultados em vitest.json.
A execução anterior teve os mesmos totais. Na revisão dos testes foram corrigidas
as fixtures de configuração ausente para não serem substituídas pelos argumentos
padrão do helper. O resultado final corresponde ao arquivo atual.

O módulo pg é integralmente substituído por mock de Pool; server-only é simulado.
Cada caso reinicializa módulos para isolar o singleton. Não se lê arquivo .env,
consulta segredo, instala pacote ou conecta a banco. URLs e senhas são fixtures
inventadas; o host externo usa domínio reservado .example.

TypeScript restrito ao arquivo novo passou (exit 0):

```sh
./node_modules/.bin/tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module esnext --moduleResolution bundler tests/auth/database-config.test.ts
```

## Falhas RED observadas

- AF-P0-02-B — produção não admite destinos internos ou não autorizados rejeita 127.0.0.1 mesmo explicitamente listado.
- AF-P0-02-C — endpoint explícito de produção aceita exatamente o endpoint autorizado sem derivar autorização da própria URL.
- AF-P0-02-D — TLS obrigatório com verificação configura verificação de certificado explicitamente no Pool de produção.
- AF-P0-02-F — erros sanitizados não expõe URL, usuário ou senha em Error/cause/propriedades 0.
- AF-P0-02-F — erros sanitizados não expõe URL, usuário ou senha em Error/cause/propriedades 1.
- AF-P0-02-G — regressão transacional sem PostgreSQL preserva begin, timeouts, commit, release e reutilização do Pool em production.

Causas:

- B: loopback local é aceito mesmo com NODE_ENV=production. Os demais destinos
  proibidos da matriz foram rejeitados antes da criação do Pool.
- C: endpoint externo explicitamente autorizado ainda é rejeitado pela trava local.
- D: a mesma trava impede alcançar a asserção de ssl.rejectUnauthorized=true.
  Este RED não demonstra um handshake inseguro: a conexão externa nem foi criada.
- F (dois casos): o Error de new URL preserva a URL sintética malformada em input;
  serializar suas propriedades/cause expõe usuário/senha sintéticos. Isso não prova
  vazamento HTTP atual; demonstra erro do adaptador sem sanitização própria.
- G/production: a trava local impede exercitar a transação em produção.

PASS não equivale a implementação da futura allowlist: o código atual rejeita todos
os destinos externos. Os testes positivos C/D/G impedem que rejeitar tudo satisfaça
sozinho o contrato. A proibição de parâmetros TLS por query passou com a trava atual.

## Contrato de configuração proposto (ainda não implementado)

- SUPABASE_DB_URL continua sendo a URL com credenciais, somente no servidor.
- Local mantém exclusivamente os protocolos postgres/postgresql, usuário postgres,
  host 127.0.0.1, porta 56152 e banco /postgres, com senha; sem query/fragmento.
- Produção requer SUPABASE_DB_ALLOWED_ENDPOINT independente: endpoint exato
  postgresql://host:porta/banco, sem credenciais, wildcard, query ou fragmento.
  A autorização é definida pelo operador em configuração confiável, nunca derivada
  da própria URL de conexão ou de dados do usuário. O nome da variável é proposta.
- Produção rejeita loopback, localhost e IP privado/local mesmo quando listados;
  host, porta e banco diferentes do endpoint autorizado são rejeitados.
- Pool de produção requer ssl com rejectUnauthorized:true. Usar CA confiável do
  ambiente ou CA explícita validada; nenhum caso autoriza desativar verificação.
  Nesta proposta não são admitidos parâmetros de URL, inclusive sslmode, para
  impedir sobrescrita das opções TLS por connectionString.
- Configuração inválida falha antes de construir Pool/connect e sem executar
  operação. Erros próprios não preservam URL/credenciais em mensagem, stack,
  input, cause ou demais propriedades. Não registrar configuração no console.
- Preservar begin/commit/rollback, statement_timeout=5s, lock_timeout=3s,
  max=4, idleTimeoutMillis=5000, connectionTimeoutMillis=3000, reutilização e
  encerramento do pool. Sempre liberar cliente adquirido e descartá-lo se
  rollback falhar, preservando o erro original.

## Riscos e critério de aceite

Aceite futuro: todos os 55 casos PASS sem enfraquecer asserções, sem conexão real
nesta suíte e sem alterar REL-01. Os testes locais protegem o comportamento atual;
a mudança deve acrescentar uma política explícita de produção, sem liberar hosts
genericamente ou transferir autorização para a entrada do solicitante.

Mocks provam as opções entregues ao Pool, não negociação TLS, cadeia/hostname do
certificado, DNS, conectividade, capacidade do pool na Vercel ou RLS. Nomes DNS que
resolvem para IP privado, mudanças de DNS e confiança da configuração exigem análise
adicional; esta matriz cobre nomes locais conhecidos e IPs literais indicados.
Um endpoint autorizado errado continua sendo erro operacional: revisão da configuração
é necessária. Nenhum destes limites autoriza acesso remoto nesta execução.

## Preservação e diferença Git

Antes: operations/evidence/.DS_Store modificado e nove arquivos não rastreados de
REL-01. Preservados integralmente; comparação de hashes/diff antes e depois.
Novos nesta execução: tests/auth/database-config.test.ts e este relatório,
vitest.log, vitest.json em operations/evidence/af-p0-02/.
Código de produção, banco, migrations, infraestrutura e testes REL-01 intactos.
Não houve commit, push ou deploy. Correção não implementada.
