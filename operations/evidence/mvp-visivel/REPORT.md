# MVP visível — 06/11/2026

Base: 5839070. Sem commit. Trabalho anterior de OAuth preservado na árvore, sem retomada de infraestrutura OAuth.

## Entrega visível

- /: agenda que consulta publicActivities.list() existente, renderiza exclusivamente snapshots públicos e diferencia lista vazia de indisponibilidade. Convite para publicar leva ao login ou ao painel da conta.
- /dashboard/pessoa-fisica: nome público do banco, botão Criar Atividade e lista de atividades próprias com estado, descrição e data. Rascunhos continuam privados.
- /dashboard/pessoa-fisica/nova: título, descrição, data/horário e orientação de acesso. Reutiliza ActivityForm e POST /api/atividades. Após sucesso, retorna ao painel PF.
- Cabeçalho compartilhado: identidade da conta e Sair quando autenticada; Entrar e Criar acesso para visitante. Footer preservado.

## Adaptação mínima autorizada

O serviço I3 ainda negava contas publicador em create/list e escrevia apenas organizacao_id. O usuário autorizou explicitamente a adaptação mínima para PF.

Somente criação/listagem ganharam uma alternativa PF. Verifica identidade confirmada, conta ativa e sem organização, filho pessoas_fisicas, sujeito próprio pendente/ativo, vínculo titular atual/ativo e escopo editar (criação) ou ler_privado (lista). Criação nega risco alto. INSERT define sujeito do servidor, organizacao_id NULL e política i4; nunca recebe proprietário do cliente. Listagem filtra sujeito e conta autora. Operações editoriais, publicação, edição e envio continuam com a autorização anterior, sem liberação nova para PF.

Sem alterações em schema, migrations, RLS, grants, função legada ou código de snapshots/hashes. Nenhuma alteração em contas/dados reais nesta tarefa; criação e limpeza restritas aos IDs das fixtures.

## TDD e resultados

- Home RED: exit 1, 4 FAIL. GREEN: 4 PASS.
- Formulário RED: exit 1, 1 FAIL/1 PASS (retorno ao painel ainda não suportado). GREEN UI: 6/6.
- PG PF RED: exit 1. A primeira fixture de escopos tentou alterar uma versão imutável e foi corrigida para criar versões materiais válidas, sem relaxar trigger. RED corrigido: 4 FAIL/2 PASS, por autorização PF ainda inexistente. GREEN: 6/6.
- npm test final: exit 0, 43 arquivos, 413/413.
- Integração completa: exit 0, 10 arquivos, 212/212.
- E2E completo: exit 0, 49 PASS, 0 FAIL, 0 SKIP; e2e-full.json preserva a execução completa.
- I3 B01–B12 + C01–C08: 20/20 critérios PASS, conferidos em i3-20-criteria.json. C02–C04 compartilham um cenário.
- E2E MVP: 2/2, incluindo login real por senha, criação via UI/API, conferência PG, rascunho negado na API pública e logout. Repetido após build para capturas finais: 2/2, exit 0.
- Build, lint, typecheck (inclusive após build) e git diff --check: exit 0.

A suíte unitária inicialmente detectou mudança da ordem de Tab causada pelo botão Google do trabalho anterior. Conforme autorização do pivô, o botão fica desativado por padrão e só aparece com NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true. Testes OAuth simulados habilitam a opção explicitamente; não foi necessário acessar Google.

Três seletores E2E de logout passaram a localizar o botão no cabeçalho. A checagem de conteúdo organizacional negado em /admin passou a usar main, pois o cabeçalho agora identifica legitimamente a própria conta. As verificações de autorização e isolamento permanecem.

O build mudou automaticamente next-env.d.ts; restaurado ao conteúdo do HEAD e typecheck final exit 0. Seu diff final é vazio.

## Para experimentar

Servidor Next deixado aberto em http://127.0.0.1:3215/. Entrar por e-mail/senha, abrir o painel PF, Criar Atividade, salvar e conferir o rascunho na lista. A atividade só aparece publicamente após publicação autorizada; esta entrega não libera publicação PF automática.

Capturas com dados exclusivamente fictícios: home.png, form.png, dashboard.png. Todas as fixtures dessas capturas foram removidas ao fim dos testes. Imagens inspecionadas visualmente. Saídas brutas nos logs e códigos observados em exit-codes.json.

Pronto para revisão humana. Sem commit.
