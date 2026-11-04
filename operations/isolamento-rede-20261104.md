# Isolamento e integração local — 04/11/2026

Incremento 2: **PENDENTE**; não avançar ao incremento 3.

## Rede

Docker Desktop 4.87.0 / Engine 29.7.2 operacional. Usuário alterou manualmente PortBindingBehavior para default-local-port-binding; nenhuma configuração global foi alterada pelo agente.

Iniciado somente A Praça, a partir do volume existente, com comando autorizado:

```sh
./node_modules/.bin/supabase start --workdir /Users/alexandrechagasleaocryptoboy/projects/a-praca-v1-5 --network-id a-praca-v1-5-loopback --exclude realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

Portas publicadas: API 56151, PostgreSQL 56152, Mailpit 56154. REST/Auth sem publicação direta. lsof demonstra listeners exclusivamente em 127.0.0.1. Três conexões positivas loopback; 42 tentativas pelas interfaces não loopback do Mac sem conexão aceita (recusa/timeout/host inalcançável). ::1 não aceita conexão. Timeout isolado não prova bloqueio.

**Divergência:** docker inspect/docker port ainda informam 127.0.0.1 e ::. A conclusão é de isolamento efetivo observado localmente por listeners e conexões, não de metadados integralmente corretos. Não houve teste de segundo dispositivo na LAN. Ver network.json. Docker 4.88 documenta correção relacionada: https://docs.docker.com/desktop/release-notes/#4880 . Nenhum upgrade foi feito. Supabase permanece em execução; nenhuma exposição efetiva foi detectada. Revalidar a cada reinício; não liberar automaticamente o script bloqueado local:start.

## Correções e RED/GREEN

- Startup inicialmente falhou por caminhos de templates. Regressão tests/auth/email-templates.test.ts: 2 FAIL antes, 2 PASS depois. Corrigidos apenas dois content_path em supabase/config.toml para ./supabase/templates/… .
- Integração original: 88 PASS / 1 FAIL. Três testes negativos aceitavam erro genérico por RPC ausente. Fortalecidos tests/integration/onboarding.database.test.ts para comprovar existência da RPC, grants e códigos de erro específicos: RED 85 PASS / 4 FAIL.
- Catálogo confirmou somente security_foundation aplicada e RPC ausente. Após autorização específica, executada migration up somente local: organization_onboarding aplicada, sem mudar tabelas/RLS ou liberar anon/authenticated. GREEN **89 PASS / 0 FAIL / 0 SKIP**. Catálogo confirma ambas as migrações e a função.

## Resultados reais

- npm run test:onboarding:db: 89 PASS / 0 FAIL / 0 SKIP; banco/Auth/REST locais reais, incluindo concorrência, acesso negado e rollback do vínculo.
- Probe Auth SDK/API + Mailpit: 17 PASS / 0 FAIL. Cadastro, confirmação, login, senha incorreta, logout/refresh revogado, recuperação, troca de senha e replay negado. Conta fictícia removida; sem envio externo. Não comprova cookies SSR ou navegador. Expiração por decurso de tempo NOT RUN.
- npm test: 127 PASS / 0 FAIL / 0 SKIP. npm run lint, typecheck e build: exit 0. Evidências quality.json e logs individuais. Não foram repetidos após migração, que não alterou aplicação/build.
- Navegador local: NOT RUN. Ferramenta retornou apps=[] e browsers=[]; não houve fluxo real da aplicação, nem prova de sessão SSR no navegador.

## Matriz de aceite A01–A09

| ID | Aceite integral | Evidência parcial / falta |
|---|---|---|
| A01 | NOT RUN | Auth, confirmação e vínculo reais testados separadamente; fluxo completo navegador pendente. |
| A02 | NOT RUN | Validação simulada; enumeração/duplicidade no fluxo real pendente. |
| A03 | NOT RUN | Senha incorreta negada no Auth real; interface/SSR pendentes. |
| A04 | NOT RUN | Recuperação e replay reais PASS; expiração temporal e navegador pendentes. |
| A05 | NOT RUN | SQL direto negado e vínculo real testados; isolamento via rotas/browser pendente. |
| A06 | NOT RUN | Grants e papel da RPC reais PASS; tentativa via aplicação/browser pendente. |
| A07 | NOT RUN | Confirmação exigida e vínculo pendente reais; aceite completo pendente. |
| A08 | NOT RUN | Logout SDK/refresh real PASS; cookies, bloqueio e expiração no browser pendentes. |
| A09 | NOT RUN | Cobertura unitária de autorização; rota editorial no browser pendente. |

## Arquivos e preservação

Alterações desta verificação: supabase/config.toml, novo tests/auth/email-templates.test.ts, fortalecimento de tests/integration/onboarding.database.test.ts, este relatório, operations/progresso.md, SECURITY.md e nota na matriz. Scripts/logs em operations/evidence/isolamento-20261104T121252Z/. Demais arquivos sujos já existiam na retomada; ver git-status-final.txt. Não atribuir todos ao trabalho atual.

Sem novas dependências, exclusão de volumes, reset, alterações em outros projetos, deploy, push, SQL remoto ou dados reais. Migração existente aplicada localmente apenas após aprovação explícita. Tokens/senhas/chaves não são impressos nem gravados pelos probes. Pendente: navegador local disponível, fluxos completos A01–A09, expiração temporal e teste externo por segundo dispositivo para ampliar a prova de rede.

## Preparação do checkpoint

Para versionamento, network-summary.json preserva resultados agregados e limitações sem endereços das interfaces do Mac. Os dois JSONs brutos de rede permanecem locais e foram adicionados ao .gitignore; não são incluídos no checkpoint. Nenhum dado de rede foi novamente coletado nesta preparação.
