# Registro de realização — interface PF

Decisão humana: manter revisão editorial; divulgar relato e referências somente após aprovação. Não afirmar aumento de reputação.

Fluxo: dashboard PF → formulário → envio privado e transacional → fila de relatos em /admin/atividades → aprovação do relato e seleção explícita de referências → página pública.

Sem tabelas, migrations, alterações de RLS ou grants. O número declarado de participantes e a data de registro ficam no campo existente origem_informacao, como JSON versionado realizacao-pf.v1. Esse campo já integra o hash e o snapshot do registro. Snapshots anteriores continuam sendo lidos como antes. A publicação de registros foi conectada à titularidade PF ativa, mantendo autorização específica do registro e revisão editorial.

Verificação final:
- npm run build: exit 0 (build.log).
- Um único caso Playwright, tests/e2e/realization.spec.mjs: 1 PASS, 0 FAIL; exit 0 (e2e.json e e2e.log).
- O caso cobre criação/publicação de atividade fictícia, formulário PF, idempotência, rollback com URL inválida, isolamento 401/404/403, privacidade antes da revisão, seleção editorial da referência, publicação do relato, número declarado de participantes e snapshot da atividade inalterado. O estado de apuração permanece declarado.
- Servidor temporário encerrado; verificação de conexão à porta 3215 retornou ECONNREFUSED, exit 0.
- Nenhum teste unitário de UI ou regressão completa foi executado nesta tarefa.

Histórico das tentativas: a primeira execução falhou no salvamento por ausência da data obrigatória autorizada_em na nova inserção de autorização; corrigida sem DDL. A tentativa posterior de melhorar a captura falhou somente na checagem de rolagem (esperado 0, recebido 15). A captura final desativa a rolagem suave apenas no navegador do teste. Os logs anteriores foram conservados.

As capturas usam contas/atividade fictícias e uma ilustração interceptada pelo navegador, identificada como demonstração. Não representam evidência de um encontro real. As fixtures foram removidas ao encerrar o caso.

Capturas:
- formulario.png
- atividade-com-evidencia.png
- evidencia-publica.png
- atividade-mobile.png

Sem commit.
