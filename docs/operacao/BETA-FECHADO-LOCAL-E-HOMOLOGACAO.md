# DigItap — candidato local de Beta Fechado

**Estado:** procedimento local preparado; homologação externa não iniciada.
**Escopo:** E1–E4.1 e ECO-01 existentes neste checkout. E5 permanece suspensa.

## Ambiente e configuração

- Node conforme `package.json` (`^22.22.2 || ^24.15.0 || >=26.0.0`), npm,
  dependências já instaladas e Supabase CLI local do projeto.
- Supabase Auth/API em `127.0.0.1:56151`, PostgreSQL em
  `127.0.0.1:56152`; Mailpit local em `127.0.0.1:56154`.
- A stack Supabase precisa estar previamente iniciada e isolada. O preflight
  não inicia nem reinicia Docker. `npm run local:start` continua bloqueado por
  segurança de binding; não contornar esse bloqueio.
- A rede Docker já observada chama-se `a-praca-v1-5-loopback`; sua configuração
  local tinha `host_binding_ipv4=127.0.0.1`, IPv6 desabilitado e label do
  projeto `a-praca-v1-5`. O procedimento não recria nem altera essa rede.
- Para obter o estado de runtime, o supervisor local usa o status da CLI e
  injeta variáveis no processo Next sem imprimi-las. Variáveis reconhecidas no
  código: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
  `SUPABASE_DB_URL`, `SUPABASE_DB_ALLOWED_ENDPOINT`, `SUPABASE_DB_CA_PEM`,
  `APP_ORIGIN`, `VERCEL_URL`, `AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL` e
  `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`. O supervisor local define apenas destinos
  loopback, `APP_ORIGIN` local e credenciais da stack obtidas em memória. Não
  copiar valores de `.env.local` para relatórios ou Git.
- `.env.example` contém placeholders. Não usar credenciais de produção.
  Google OAuth não é necessário para a demonstração; usar o fluxo local de
  e-mail/senha e caixa local.

## Procedimento local reproduzível

Na raiz do checkout, com a stack local já iniciada:

```bash
npm run beta:check
```

O comando valida versão do Node, dependências presentes, API e PostgreSQL em
loopback, conexão PostgreSQL, correspondência das migrations locais com o
histórico aplicado e ausência de contas Auth `@example.invalid`. Apenas informa
migrations pendentes; não aplica nenhuma. Se houver conta sintética residual,
interrompe sem excluí-la.

Para iniciar a demonstração:

```bash
npm run beta:demo
```

O comando repete o preflight e inicia o supervisor `scripts/e2e-server.mjs` em
`127.0.0.1:3215`. O cliente local usa o mock sintético fail-closed do Gateway;
nenhuma chave real é usada e chamadas `fetch` externas fora das exceções locais
explícitas são bloqueadas pelo preload.
Abra `http://127.0.0.1:3215`. Use `Ctrl-C` para encerrar somente o Next iniciado
pelo supervisor. Não inicia serviços Supabase e não cria fixtures.

Para repetir as verificações automatizadas em uma execução autorizada:

```bash
npm test
npm run typecheck
npm run lint
npm run build
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 ECO01_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db
git diff --check
```

Os testes PostgreSQL criam fixtures sintéticas e removem somente as fixtures
da execução; após falha, interromper e investigar antes de repetir. Para E2E,
use dois terminais e um diretório exclusivo que nunca tenha sido usado:

Terminal 1:

```bash
A_PRACA_EVIDENCE_DIR=operations/evidence/beta-e2e-UNICO npm run beta:demo
```

Terminal 2, substituindo `UNICO` pelo mesmo sufixo exclusivo:

```bash
A_PRACA_ALLOW_FIXTURE_CLEANUP=1 A_PRACA_EVIDENCE_DIR=operations/evidence/beta-e2e-UNICO DIGITAP_E1_GATEWAY_MOCK=1 AI_GATEWAY_API_KEY=e1-synthetic-only NODE_OPTIONS="--import=$PWD/tests/e2e/helpers/gateway-preload.mjs" npm run test:e2e
```

O Terminal 1 inicia Next com o mock fail-closed. O terminal 2 executa os
cenários e direciona capturas/relatórios ao mesmo diretório, que o supervisor
cria. Não reutilizar diretório histórico. Encerrar o Terminal 1 com `Ctrl-C`.
Nunca executar as suítes contra Cloud.

## Migrations e integridade

Antes de qualquer validação em outra instância, comparar
`supabase/migrations/` com o histórico daquela instância. O candidato local
espera as migrations E4, E4.1 e ECO-01 versionadas; a verificação local atual
confirmou ECO-01 aplicada. O script `beta:check` não executa DDL. Para qualquer
ambiente novo, a aplicação de migrations exige uma autorização específica,
backup verificável e confirmação explícita do destino. Nunca usar `db reset`.

## Preparação de homologação isolada

Provedores existentes no código: Supabase Auth/PostgreSQL, Vercel para a
aplicação e Vercel AI Gateway com rota Bedrock-only e política Zero Data
Retention solicitada pelo código. Nenhum ambiente remoto de Beta foi criado ou
validado neste pacote. Antes de solicitar autorização operacional:

1. Identificar uma instância Supabase isolada de produção, domínio e contas
   reais; configurar apenas as variáveis listadas acima no escopo de servidor
   ou público indicado pelo prefixo `NEXT_PUBLIC_`.
2. Confirmar TLS/CA, `SUPABASE_DB_ALLOWED_ENDPOINT`, origem canônica, URLs de
   confirmação/recuperação, SMTP e limites do provedor sem imprimir segredos.
3. Confirmar proteção de acesso fechado na plataforma Vercel e separar
   variáveis e dados do domínio de produção.
4. Validar a política de retenção, aviso de privacidade, atendimento aos
   titulares e procedimento de incidentes antes de cadastrar pessoas reais.
5. Revisar migrations pendentes e backup/rollback com um operador autorizado.
6. Só então solicitar autorização separada para recursos remotos, deploy e
   recrutamento/participação de pessoas no Beta.

## Rollback e recuperação

- **Local:** encerrar o processo iniciado pelo supervisor com `Ctrl-C`; os
  serviços e dados Supabase não são alterados pela demonstração. Fixtures de
  teste são removidas pelos próprios testes. Não executar reset nem apagar
  volumes.
- **Código:** reverter apenas commits do candidato Beta, em ordem inversa,
  preservando alterações alheias e evidências. Nenhum rollback foi executado.
- **Homologação futura:** não promover domínio público. Definir backup, versão
  anterior e rollback da aplicação e banco antes de qualquer deploy/migration;
  esses passos dependem de autorização e do ambiente que vier a ser aprovado.

## Limites de aceite

Os resultados automatizados locais estão registrados no painel do projeto.
Eles não comprovam Gateway real, entrega de e-mail em produção, retenção,
isolamento de uma infraestrutura de Beta, operação em produção, DOG-01,
adoção ou os portões VH-01–VH-03. O primeiro uso com participantes reais exige
homologação isolada e autorização própria.
