# Matriz normativa — incremento 3, recorte B08–B09

Estado vigente: **A01–A09 e B01–B09 PASS local**, com a ressalva temporal de A08 preservada. B08/B09 foram comprovados com unidade/componentes, PostgreSQL e Chromium reais, com RED/GREEN por cenário. Resultados: **283 unitários/componentes**, **163 integrações** e **30 E2E**, 0 FAIL/SKIP finais; build/lint/typecheck exit 0. Não há aceite de 74/74 ou autorização de produção.

[Relatório B08–B09](../operations/incremento-3-b08-b09.md) e rastreabilidade em operations/evidence/incremento-3-b08-b09/traceability.json. B10–B12 e C01–C08 não foram iniciados. As seções históricas abaixo não substituem esta tabela vigente.

| ID | Prioridade | Status integral | Evidência / pendência |
|---|---|---|---|
| A01 | P0 | PASS | UI Chromium + Next API + Auth + Mailpit + SQL PASS: confirmação, retomada sem vínculo, organização pendente e sessão SSR em reload/navegação; cookies HttpOnly e no-store. Ver ../operations/incremento-2c.md. |
| A02 | P0 | PASS | API real PASS: e-mail inválido retorna 422; duplicidade responde genericamente 200, sem novo usuário no banco. Ver ../operations/incremento-2c.md. |
| A03 | P0 | PASS | UI + Auth real PASS: senha incorreta não libera dashboard; login válido estabelece sessão SSR. Ver ../operations/incremento-2c.md. |
| A04 | P0 | PASS | UI + Mailpit + Auth real PASS: recuperação, troca, senha anterior e replay negados; expiração da fixture via recovery_sent_at em A08. Não houve espera natural de 30 dias. Ver ../operations/incremento-2c.md. |
| A05 | P0 | PASS | Dois contextos Chromium + Next API + SQL PASS: tenant próprio, payload alheio negado, 6 vínculos concorrentes e retry sem duplicação. Ver ../operations/incremento-2c.md. |
| A06 | P0 | PASS | API + SQL PASS: payload editor/admin negado, papel permanece organizacao. Ver ../operations/incremento-2c.md. |
| A07 | P0 | PASS | Chromium + Next API real + SQL: proprietário e organização alheia com metadata admin recebem 403 na rota funcional; payload de papel 400, visitante 401. Editor não publica atividade aprovada de organização pendente (422); nenhum snapshot produzido. Integração real cobre as mesmas negativas. Ver ../operations/incremento-3-b07.md e testes publication. |
| A08 | P1 | PASS (tempo controlado) | UI + Auth/SQL: conta bloqueada, organização suspensa, logout e cookie inválido. **Validado com manipulação temporal controlada** de not_after e recovery_sent_at nas fixtures e refresh forçado; sem espera natural de expiração. Ver ../operations/incremento-2c.md. |
| A09 | P0 | PASS | Navegador + Next API PASS: visitante redirecionado, vínculo retorna 401 e /admin inexistente retorna 404. Ver ../operations/incremento-2c.md. |
| B01 | P0 | PASS | PASS: 51 casos domínio/serviço + 3 componentes (subconjuntos), integração real e Chromium. Criar/editar/listar próprio tenant; outro tenant e visitante negados; editor/admin explícito lê detalhe, sem escrever. Ver operations/incremento-3-b01-b04.md. |
| B02 | P0 | PASS | PASS: obrigatórios validados no servidor; rascunho exige mínimos do schema; envio sem versão ou conteúdo persistido válido é negado. Não persistir formulário incompleto. Unitário/integrado/E2E; ver relatório. |
| B03 | P0 | PASS | PASS: calendário, fuso, futuro, URL, HTML inclusive sem fechamento e limites; API real rejeita entradas. Conversão America/Sao_Paulo validada também com browser Asia/Tokyo. Ver relatório. |
| B04 | P0 | PASS | PASS: rascunho → enviada continua privado; transação pg única para estado/evento; falha FK 23503 reverte ambos, concorrência e retries geram um evento. Unitário, banco real e E2E. Sem publicação. |
| B05 | P0 | PASS | Revisão/aprovação privadas por editor/admin ativo; autorização vinculada à atividade, divulgacao e atividade:versao:N, com vigência/revogação verificadas inclusive em retry. Unitário, integração real e E2E; concorrência, versão e rollback de auditoria. Sem publicação/snapshot/apoio. Ver ../operations/incremento-3-b05-b06.md. |
| B06 | P0 | PASS | Devolução/rejeição atômicas, motivo obrigatório 10–1500 sem HTML; proprietário/editor consultam apenas o motivo, terceiro/visitante negados. Unitário, banco real e Chromium; retries, conflito e falha de auditoria. Edição/reenvio não incluídos. Ver ../operations/incremento-3-b05-b06.md. |
| B07 | P0 | PASS | Publicação explícita por editor/admin ativo, organização validada, autorização original vigente da atividade/escopo/versão e hash do conteúdo aprovado. Snapshot, número, timestamp, estado e auditoria atômicos; concorrência, retries, rollback FK, privacidade e consultas públicas separados. 24 novas integrações + 8 novos E2E; ver relatório B07. |
| B08 | P0 | PASS | Edição própria de publicada cria versão privada com incremento; snapshot anterior continua em lista/detalhe/API/HTML/metadados. Envio/revisão/devolução/rejeição não o substituem; aprovação autorizada da nova versão substitui e audita na mesma transação. Hash/histórico preservados, isolamento/conflitos/rollback/concorrência comprovados. Ver relatório B08–B09. |
| B09 | P0 | PASS | Editor/admin ativo retira com motivo obrigatório, estado retirada, apoios_abertos=false e auditoria atômica. Público perde lista/detalhe/API; motivo só dono/editor. Permissões, idempotência, falha FK, retirada durante revisão e bloqueio de republicação/edição/envio comprovados em PostgreSQL/Chromium. Ver relatório B08–B09. |
| B10 | P1 | PASS | Adiamento/cancelamento editorial com estado público atual, snapshot preservado, apoios fechados e auditoria atômica. Permissões, retries, concorrência e rollback comprovados. Evidências: ../operations/evidence/incremento-3-b10-b12-c01-c08/traceability.md e e2e.json. |
| B11 | P0 | PASS | HTML malicioso recusado no servidor/snapshot e escape nas superfícies públicas comprovado; Chromium sem execução, inclusive nome público legado. Evidências: ../operations/evidence/incremento-3-b10-b12-c01-c08/traceability.md e e2e.json. |
| B12 | P1 | PASS | API/lista vazias reais, sem atividades fictícias ou rascunhos expostos; erro de consulta distinto de vazio. Evidências: ../operations/evidence/incremento-3-b10-b12-c01-c08/traceability.md e e2e.json. |
| C01 | P0 | PASS | Registro factual privado com data efetiva não futura/calendário/fuso, tenant do servidor, retries e auditoria transacional; isolamento e rollback comprovados. Evidências: ../operations/evidence/incremento-3-b10-b12-c01-c08/traceability.md e e2e.json. |
| C02 | P0 | PASS | Declaração permanece declarado/rascunho, sem corroboração ou publicação automática; payload de estado/snapshot negado. Evidências: ../operations/evidence/incremento-3-b10-b12-c01-c08/traceability.md e e2e.json. |
| C03 | P0 | PASS | Referência guarda afirmação delimitada, não aprovada e privada, sem corroborar relato total; concorrência/retries e rollback comprovados. Evidências: ../operations/evidence/incremento-3-b10-b12-c01-c08/traceability.md e e2e.json. |
| C04 | P0 | PASS | Referências impróprias/locais ou com contatos/identificadores/credenciais detectáveis são bloqueadas antes de persistir; exame material humano continua necessário antes de eventual publicação. Evidências: ../operations/evidence/incremento-3-b10-b12-c01-c08/traceability.md e e2e.json. |
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

## Histórico — validação B05–B06

Resultados finais: 223 unitários/componentes PASS (183 anteriores + 33 revisão + 4 Auth + 3 UI), 128 integração PASS (100 anteriores + 28 revisão), 19 E2E PASS (13 anteriores + 6 novos); 0 FAIL/SKIP finais. Lint/typecheck/build exit 0. A07 continua PENDENTE no aceite integral, apesar do PASS técnico de sua checagem parcial de rota ausente. A08 conserva datas controladas nas fixtures. B07–B12 não foram implementados.

## Histórico — validação B07

B07: 39 verificações unitárias/componentes adicionadas (29 publicação, 7 consultas públicas, 2 interface e 1 hash na aprovação), 24 integrações e 8 E2E novos. Regressões anteriores preservadas na execução completa: 262/152/27 PASS, em camadas separadas. A07 PASS pela rota real, com publicação positiva do editor em outro caso de controle; A08 conserva expiração temporal controlada, sem espera natural.

Aprovação interna sozinha continua privada. Aprovações novas registram hash do conteúdo; registros antigos sem essa prova não são publicados automaticamente. Edição/reenvio após devolução não foram implementados. B08–B12 não foram iniciados. Revogação foi aplicada somente a fixtures para verificar leitura/retry; não existe novo fluxo de retirada. Apoios continuam fechados.

Evidências: `operations/evidence/incremento-3-b07/quality-final.json`, `e2e.json`, `integration-final.log`, logs RED/GREEN e relatório. Os resultados simulados estão discriminados e não substituem integração/Chromium. Nenhum novo aceite é inferido para os demais cenários.

## Validação vigente — B08–B09

283 unitários/componentes PASS (262 anteriores + 21 novos), 163 integrações reais PASS (152 anteriores + 11 novos), 30 E2E Chromium PASS (27 anteriores + 3 novos), 0 FAIL/SKIP finais. RED iniciais: 2 unidades e 2 integrações FAIL, uma de cada cenário; Chromium 2 FAIL/0 SKIP por ausência dos controles esperados, depois 3 PASS específicos e 30 PASS completos. Falha acessível do motivo também recebeu RED antes de correção, discriminada no relatório de erros do próprio teste.

Duas expectativas históricas de B07 que exigiam edição publicada bloqueada/ausente foram atualizadas para o contrato B08, mantendo assertivas do snapshot anterior e envio explícito da versão pendente. Isso não muda IDs/prioridades dos 74 cenários. A07 PASS contra rota real preservado; A08 mantém tempo controlado. Não há reabertura de retirada, edição/reenvio de devolvida/rejeitada, B10–B12, C01–C08 ou módulos posteriores neste recorte.
