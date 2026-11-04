# Matriz normativa — atualização do incremento 2C

Atualização vigente: A01–A06, A08 e A09 PASS no recorte local de autenticação; A07 **PENDENTE no aceite integral**, com evidência parcial de 404 em rota inexistente. Evidência real Chromium/Next/Auth/SQL em operations/evidence/incremento-2c/. A ferramenta registrou 9 testes E2E passando, além de 129 testes de unidade/componentes; isso não equivale ao aceite integral de A07 nem dos 74 cenários. Integração anterior (89 PASS) não foi repetida. A08 foi validado com manipulação temporal controlada apenas nas fixtures, sem espera natural de expiração. As notas históricas no fim preservam o que estava disponível em cada etapa, mas não representam o estado atual.

| ID | Prioridade | Status integral | Evidência / pendência |
|---|---|---|---|
| A01 | P0 | PASS | UI Chromium + Next API + Auth + Mailpit + SQL PASS: confirmação, retomada sem vínculo, organização pendente e sessão SSR em reload/navegação; cookies HttpOnly e no-store. Ver ../operations/incremento-2c.md. |
| A02 | P0 | PASS | API real PASS: e-mail inválido retorna 422; duplicidade responde genericamente 200, sem novo usuário no banco. Ver ../operations/incremento-2c.md. |
| A03 | P0 | PASS | UI + Auth real PASS: senha incorreta não libera dashboard; login válido estabelece sessão SSR. Ver ../operations/incremento-2c.md. |
| A04 | P0 | PASS | UI + Mailpit + Auth real PASS: recuperação, troca, senha anterior e replay negados; expiração da fixture via recovery_sent_at em A08. Não houve espera natural de 30 dias. Ver ../operations/incremento-2c.md. |
| A05 | P0 | PASS | Dois contextos Chromium + Next API + SQL PASS: tenant próprio, payload alheio negado, 6 vínculos concorrentes e retry sem duplicação. Ver ../operations/incremento-2c.md. |
| A06 | P0 | PASS | API + SQL PASS: payload editor/admin negado, papel permanece organizacao. Ver ../operations/incremento-2c.md. |
| A07 | P0 | PENDENTE | Evidência parcial UI/HTTP/SQL: organização pendente e publicação inexistente respondendo 404. Isso não comprova negação pela autorização de uma rota de publicação funcional. **Exige nova prova quando a publicação existir**. Workflow editorial futuro NÃO foi implementado/testado. Ver ../operations/incremento-2c.md. |
| A08 | P1 | PASS (tempo controlado) | UI + Auth/SQL: conta bloqueada, organização suspensa, logout e cookie inválido. **Validado com manipulação temporal controlada** de not_after e recovery_sent_at nas fixtures e refresh forçado; sem espera natural de expiração. Ver ../operations/incremento-2c.md. |
| A09 | P0 | PASS | Navegador + Next API PASS: visitante redirecionado, vínculo retorna 401 e /admin inexistente retorna 404. Ver ../operations/incremento-2c.md. |
| B01 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B02 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B03 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B04 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B05 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B06 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B07 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B08 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B09 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B10 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B11 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| B12 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| C01 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| C02 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| C03 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| C04 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| C05 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| C06 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| C07 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| C08 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D01 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D02 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D03 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D04 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D05 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D06 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D07 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D08 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D09 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D10 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D11 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D12 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D13 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| D14 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| E01 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| E02 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| E03 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| E04 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| E05 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| E06 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| E07 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F01 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F02 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F03 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F04 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F05 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F06 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F07 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F08 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| F09 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| G01 | P0 | NOT RUN | Parcial: SELECT/INSERT/UPDATE/DELETE direto em contas_acesso negados; exposição HTTP da aplicação pendente. |
| G02 | P0 | NOT RUN | Parcial: acesso direto a autorizações/eventos negado; rotas da aplicação pendentes. |
| G03 | P0 | NOT RUN | Parcial: acesso direto à tabela apoios negado; endpoint de apoio/agregado pendente. |
| G04 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| G05 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| G06 | P0 | NOT RUN | Parcial: somente papel explícito ativo dá acesso no módulo/adapter real; bootstrap/rotas pendentes. |
| G07 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| G08 | P1 | NOT RUN | Parcial: Tab/labels/autocomplete em jsdom PASS; navegador e mobile reais NOT RUN por indisponibilidade de browser. |
| G09 | P1 | NOT RUN | Parcial: mensagens associadas a campos e foco em alerta simulados PASS; uso por leitor de tela real NOT RUN. |
| G10 | P1 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| G11 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| G12 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
| H01 | P0 | NOT RUN | Etapa A aprovou o build com canários temporários em 113 artefatos públicos e Git/logs. Não repetido na Etapa B; fluxo autenticado dinâmico e credencial real continuam NOT RUN. |
| H02 | P0 | NOT RUN | Parcial: migração anterior tinha DML negado em banco real no incremento 1; não reexecutado. Nova RPC com EXECUTE fechado só em SQL preparado, teste real NOT RUN. |
| H03 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |

## Atualização real — 04/11/2026, isolamento

Integração real agora executada: 89 PASS, incluindo 85 de segurança e 4 de onboarding após aplicação local autorizada. H02 tem evidência parcial real de grants/RLS e RPC; aceite integral permanece distinto. Auth SDK/API/Mailpit: 17 verificações PASS. A01–A09 continuam integralmente NOT RUN porque navegador/SSR e expiração temporal não foram comprovados. Ver matriz discriminada em ../operations/isolamento-rede-20261104.md; esta nota supera as afirmações históricas de integração não executada, sem reclassificar mocks como prova real.
