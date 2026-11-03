# Matriz normativa — acompanhamento até o incremento 2

No incremento 1 houve 24 testes unitários e 85 de integração; no incremento 2 foram executados 100 testes de unidade/componentes (incluindo os 24 anteriores) e 14 verificações HTTP sem provider. Esses totais não equivalem aos 74 cenários completos. As 85 verificações reais anteriores não foram reexecutadas no incremento 2. Nenhum cenário integral é declarado PASS neste incremento. NOT RUN abaixo significa que falta executar o cenário completo; a cobertura parcial já executada está discriminada.

| ID | Prioridade | Status integral | Evidência / pendência |
|---|---|---|---|
| A01 | P0 | NOT RUN | Parcial: signup/confirm/login/onboarding simulados PASS; Auth + entrega de e-mail + transação reais NOT RUN. |
| A02 | P0 | NOT RUN | Parcial: e-mail inválido e duplicado genérico simulados PASS; validação HTTP real PASS; duplicado no Auth real NOT RUN. |
| A03 | P0 | NOT RUN | Parcial: erro de senha/credencial e sanitização simulados PASS; senha incorreta no Auth real NOT RUN. |
| A04 | P0 | NOT RUN | Parcial: recovery/verify/update/logout e OTP inválido/expirado simulados PASS; expiração e replay reais NOT RUN. |
| A05 | P0 | NOT RUN | Parcial: tenant derivado e identidade/projeção alheias negados em unidade; fluxo autenticado real NOT RUN. |
| A06 | P0 | NOT RUN | Parcial: payload de papel/id rejeitado e metadata ignorada; HTTP real rejeita elevação; EXECUTE real da nova RPC NOT RUN. |
| A07 | P0 | NOT RUN | Parcial: e-mail não confirmado nega onboarding e sessão imediata de signup é encerrada em simulação. Publicação fora do recorte. |
| A08 | P1 | NOT RUN | Parcial: logout local limpa cookies próprios, conta bloqueada/expiração simuladas; revogação/sessão no Auth real NOT RUN. |
| A09 | P0 | NOT RUN | Parcial: visitante negado pelos módulos e /admin é 404 no HTTP real. Ainda não existe rota editorial. |
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
| H01 | P0 | NOT RUN | Parcial: 13 artefatos públicos sem nomes/prefixos privados pesquisados. Sem credencial real/sintética configurada, scan de logs/sessão completo NOT RUN. |
| H02 | P0 | NOT RUN | Parcial: migração anterior tinha DML negado em banco real no incremento 1; não reexecutado. Nova RPC com EXECUTE fechado só em SQL preparado, teste real NOT RUN. |
| H03 | P0 | NOT RUN | Fora do incremento 1; manter contrato e prioridade P0/P1 do prompt. |
