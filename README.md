# A Praça — MVP v1.5

Software em desenvolvimento local, sem adoção, organização real ou parceria confirmada. Licença definitiva pendente. Nenhum deploy ou recurso remoto criado.

O incremento 2 implementa cadastro de acesso com confirmação de e-mail, login, logout, recuperação, redefinição de senha e cadastro de organização pendente. A interface e a lógica foram verificadas com portas simuladas e com HTTP real no Next.js; **o fluxo completo no Supabase permanece não verificado**, pois o bloqueio de portas Docker continua.

## Executar somente a interface local

Node usado: 22.23.2. Versões fixadas no package-lock.json. A cadeia de testes exige Node ^22.22.2, ^24.15.0 ou >=26.

```sh
npm ci --cache ./.npm-cache
npm run dev
```

A interface fica em http://127.0.0.1:3215. Não use organizações ou pessoas reais. Sem `.env.local` válida e sem o Supabase isolado, operações válidas de Auth retornam 503; campos inválidos continuam sendo validados no servidor. Páginas restritas não exibem dados quando o acesso não pode ser verificado. JavaScript é necessário para o envio interativo dos formulários; o fallback usa POST e nunca envia senha na URL.

**Não iniciar o Supabase agora.** `npm run local:start` continua bloqueado. A CLI 3.0.0 não comprovou bind a loopback; nenhuma configuração global foi alterada para contornar isso. O volume de A Praça está preservado, sem containers ativos. `.env.example` contém apenas placeholders; nenhum segredo real foi configurado neste incremento.

## Verificações

```sh
npm test
npm run typecheck
npm run lint
npm run build
node scripts/check-public-artifacts.mjs
```

- `npm test`: 125 testes de unidade/componentes; inclui 24 regressões do incremento 1. Provider, cookies e banco são simulados nesses testes.
- `scripts/http-smoke.mjs`: 14 verificações HTTP contra o Next.js de produção local, com Supabase parado e sem credenciais. Exige servir o build em 127.0.0.1:3215. Não prova login ou envio de e-mail reais.
- `npm run test:db`: suíte real de segurança do incremento 1, **não reexecutada** neste incremento.
- `npm run test:onboarding:db`: suíte real de segurança + 4 testes preparados de RPC/idempotência/rollback. **NOT RUN**; exige isolamento comprovado e aplicação local da nova migração.

A nova migração foi apenas preparada. Não executar contra um remoto. Primeiro resolver o isolamento de portas; depois seguir operations/autenticacao-local.md.

## Entregas e limites

[Relatório do incremento 2](operations/incremento-2.md), [arquivos modificados](operations/arquivos-incremento-2.txt), [comandos](operations/command-log-incremento-2.md), [contratos](specs/contratos-api.md) e [matriz dos 74 cenários](specs/matriz-testes-v1.5.md).

O cadastro é de duas etapas: Auth confirmado primeiro, organização pendente depois. Falha no segundo passo não apaga identidade nem exige recadastro; a pessoa pode entrar e repetir o vínculo. A RPC mantém uma conta por identidade, serializa tentativas concorrentes e não altera nome/papel em retries. Essas garantias transacionais precisam ser confirmadas no banco real.

Não foram implementados envio de atividades, apoio, selos, painel de movimento, bootstrap editorial ou administração de contas. A interface deste recorte usa CSS local para limitar dependências; Next.js e Supabase permanecem como stack principal.

Auditoria executada: dependências de execução com zero avisos; cadeia de desenvolvimento com 16 entradas moderadas relacionadas a minimatch/ESLint. Há incompatibilidades entre as versões mais recentes de TypeScript/ESLint e os plugins; TypeScript 6.0.3 e ESLint 9.39.5 foram fixados para lint/build funcionarem. O npm indica ESLint 9 fora de suporte. A dívida de atualização está documentada; nenhuma correção forçada foi aplicada.

## Complementação da Etapa B — 04/11/2026

Foram corrigidas lacunas de logout em falha de inicialização, sessão parcial após login/confirmação malsucedidos, identidade vazia e repetição do vínculo já existente. O formulário agora bloqueia dois submits no mesmo instante, sem substituir a garantia de unicidade do banco.

A suíte disponível passou com **125 testes** (100 anteriores + 25 novas regressões/controles), além de lint, typecheck e build. **89 testes reais de banco/Auth e o fluxo em navegador permanecem NOT RUN**. Nenhuma operação Docker, instalação ou migração foi executada nesta etapa.

O incremento 2 permanece com aceite **PENDENTE**. Veja [progresso atual](operations/progresso.md), [relatório da Etapa B](operations/etapa-b-incremento-2.md) e [evidências RED/GREEN](operations/evidence/etapa-b-20261104/). Não avançar ao incremento 3.

## Validação posterior — incremento 2C

Os estados históricos acima foram superados: A01–A09 passaram em Chromium contra Next/Supabase locais, com expiração temporal controlada nas fixtures; 129 testes unitários/componentes e lint/typecheck/build aprovados. Integração anterior 89 PASS preservada. Consulte [relatório e limites](operations/incremento-2c.md). Sem autorização de produção ou avanço ao incremento 3.
