# Proposta — primeiro recorte do incremento 3

Estado: **NÃO INICIADO; aguarda aprovação humana após checkpoint**.
Nenhum código, teste ou migração deste recorte foi criado. B01–B04 permanecem NOT RUN.

## Escopo e reaproveitamento

Criar/editar/consultar rascunho privado e enviar (rascunho → enviada), sempre privado. A organização proprietária pode criar/editar/enviar; editor ou administrador explícito, ativo e com e-mail confirmado pode consultar o rascunho pela URL interna, sem editar, revisar ou publicar neste recorte. Outro tenant recebe 404 sem conteúdo nem metadados do objeto. Visitante recebe 401/redirect e conta bloqueada/suspensa recebe negação.

Reutilizar as tabelas atividades, contas_acesso, organizacoes e eventos_editoriais já existentes. Preservar as nove tabelas, RLS e grants; navegador continua sem SELECT/INSERT/UPDATE/DELETE diretos. Reutilizar authorize/createAccessDependencies, userClient com getUser, adminClient server-only, origem/payload/no-store e padrões acessíveis dos formulários. Não alterar as funções de autenticação para contornar regras de atividade.

Não existe CRUD de atividade nem teste específico B01–B04 hoje. Não há registro de realização, apoio, painel ou fluxo editorial a estender neste recorte.

## Testes existentes aplicáveis (sem repetir nesta proposta)

- tests/security/access.test.ts: proprietário versus outro tenant, conta ativa, visitante, editor/admin explícitos e releitura de papel.
- tests/security/adapter.test.ts: identidade Auth verificada e autorização server-side com client privilegiado separado.
- tests/security/database.test.ts: grants/RLS nas nove tabelas, incluindo atividades; integração real preservada.
- tests/auth/http.test.ts: origem/Host, JSON, tamanho do corpo e erros seguros.
- tests/auth/session.test.ts e tests/auth/session-recovery.test.ts: sessão/organização suspensa e identidade.
- tests/components/auth-hydration.test.tsx e auth-concurrency.test.tsx: referências para hidratação/submissão, não cobertura automática do novo formulário.
- tests/integration/onboarding.database.test.ts: referência para fixtures, transação, concorrência e interpretação estrita dos erros.
- tests/e2e/auth.spec.mjs: referência de contextos isolados, Mailpit e relatórios sem segredos. Não modificar seu teste negativo de rota ausente antes de implementar a rota; depois adaptar a expectativa para negação real de publicação (que continuará inexistente).

## Contratos propostos

- POST /api/atividades: organização ativa e autenticada; IDs de organização/autor derivados no servidor; rascunho privado, programação programada, apoios_abertos=false e snapshot público nulo. Rejeitar campos de papel, autor, publicação e estados fornecidos pelo cliente.
- GET /api/atividades: lista privada da organização autenticada. Sem sessão, 401; não vira API pública neste recorte. Editor pode consultar detalhe conhecido, sem criar painel editorial/listagem global agora.
- GET /api/atividades/[id]: proprietário ou editor/admin ativos explicitamente autorizados; selecionar só dados necessários ao rascunho. Outro tenant/ID desconhecido: 404. Estado enviada continua privado.
- PATCH /api/atividades/[id]: somente proprietário enquanto rascunho; versão esperada obrigatória; edição concorrente ou estado já enviada: 409. Não aceitar alteração de estado/organização/autor/snapshot no payload.
- POST /api/atividades/[id]/enviar: somente proprietário; revalidar conteúdo persistido, identidade, papel/situação e organização; rascunho → enviada. Guardar versão e evento com conta autora na mesma transação. Retry da mesma versão já enviada retorna resultado existente sem novo evento; conteúdo/versão incompatíveis: 409.
- /dashboard/nova-atividade e /dashboard/atividade/[id]: formulários/detalhe privados. Dashboard existente passa a listar somente atividades próprias. Editor recebe acesso apenas ao detalhe interno autorizado, sem nova UI de revisão.
- /atividade/[id] e listagem pública permanecem sem conteúdo público implementado. B04 testa que enviada não aparece na home, em HTML/metadata ou por endpoint público; rota interna exige autorização e no-store.

## Validação e limites do schema

As constraints atuais exigem título (3–180), descrição (10–5000), data e orientação (3–600) já no INSERT. Portanto, o rascunho persistido terá esses campos mínimos completos; não prometer persistência de formulário incompleto sem mudar schema, que está fora desta autorização. O formulário pode permanecer incompleto antes de salvar; envio revalida os dados persistidos.

Validar estritamente strings/limites, data ISO com offset explícito e calendário válido, início futuro no servidor, URL opcional http/https sem credenciais e comprimento limitado. Entrada datetime-local deve ser convertida explicitamente de America/Sao_Paulo para um instante inequívoco; não usar fuso implícito do Mac/browser. Rejeitar HTML/script/URLs malformadas, não renderizar conteúdo como HTML e não buscar URLs externas. Testar datas impossíveis, offset ausente, passado, limites, XSS e campos extras. Nome/contato de pessoas não devem ser exigidos no texto da atividade.

Usar versao_submetida como versão corrente do documento, incrementada atomicamente nas edições; o envio registra o número vigente e o estado, sem permitir sobrescrita silenciosa. Documentar essa convenção no contrato antes da implementação. Não confundir essa versão privada com numero_versao_publicada, que permanece nulo.

## Atomicidade sem nova migração

PostgREST em chamadas separadas não garante transação entre atividade e evento. Proposta: conexão PostgreSQL **somente servidor**, local, com pg já instalado; BEGIN/COMMIT/ROLLBACK, releitura da conta/organização e bloqueios das linhas relevantes; nenhuma criação de tabela/RPC, grant ou policy. Envio e evento na mesma conexão/transação. Testar que erro de auditoria reverte envio e que dois envios concorrentes geram um evento.

O módulo de conexão aceita exclusivamente 127.0.0.1:56152 neste recorte, nunca URL arbitrária. A URL privilegiada fica só no ambiente do processo, com placeholder no .env.example, sem logs. A credencial SQL é uma fronteira privilegiada: autorização por identidade, papel, tenant e objeto é obrigatória em cada operação. O auxiliar local pode obter a URL do stack existente em memória, sem reiniciar containers.

pg hoje é devDependency: promover a mesma versão fixada para dependencies para uso pelo servidor (package.json/lockfile), sem adicionar biblioteca nem atualizar versões. Isso só será feito com a aprovação da implementação. Se a conexão transacional segura não estiver disponível, parar o envio; não simular atomicidade com HTTP e não executar migração sem aprovação separada.

## Menor conjunto previsto (21 arquivos)

Código novo (9):

1. src/lib/activities/domain.ts — dados permitidos e validação pura.
2. src/lib/activities/service.server.ts — autorização, operações privadas e transação de envio/auditoria.
3. src/lib/database.server.ts — conexão/transaction pg server-only e limite ao banco local.
4. src/app/api/atividades/route.ts — criação e listagem privadas.
5. src/app/api/atividades/[id]/route.ts — detalhe e edição privados.
6. src/app/api/atividades/[id]/enviar/route.ts — envio privado.
7. src/app/dashboard/nova-atividade/page.tsx.
8. src/app/dashboard/atividade/[id]/page.tsx.
9. src/components/ActivityForm.tsx.

Testes novos (3):

10. tests/activities/activities.test.ts — validação/domínio e serviço com ports simulados.
11. tests/integration/activities.database.test.ts — SQL/RLS, isolamento, concorrência e rollback reais.
12. tests/e2e/activities.spec.mjs — B01–B04 no Chromium/Next reais.

Arquivos existentes (9):

13. src/app/dashboard/page.tsx — lista própria e links internos.
14. vitest.config.ts — incluir tests/activities (configuração de integração já usa glob adequado).
15. package.json — pg na mesma versão, agora runtime.
16. package-lock.json — acompanhar essa mudança.
17. .env.example — somente nome/placeholder da conexão local server-side.
18. scripts/e2e-server.mjs — passar DB_URL local só no ambiente.
19. specs/contratos-api.md — contratos e semântica da versão privada antes do código.
20. specs/matriz-testes-v1.5.md — rastreabilidade B01–B04 por camada, sem PASS antecipado.
21. operations/progresso.md — resultados/bloqueios.

Relatório e evidências de execução futuras serão adicionais a esses 21 arquivos. Não há migração ou nova configuração Docker na proposta. Se os testes demonstrarem necessidade de outro arquivo, justificar antes de ampliar o recorte.

## Ordem TDD e parada

1. B01 RED: visitante, outro tenant, bloqueado e editor sem permissão; GREEN: criar/ler rascunho privado com autor derivado. Incluir regressões de papel/SQL direto.
2. B02/B03 RED: obrigatórios e entradas inválidas, identidade/estado em payload; GREEN: validador mínimo compartilhado nas escritas/envio e formulário acessível.
3. B04 RED: enviada continua privada; conflitos/retry/concorrência e erro de auditoria; GREEN: atualização e evento atômicos.
4. REFACTOR com regressões verdes; executar unitários pertinentes, integração autorizada real, E2E, lint/typecheck/build. Novas fixtures não devem ser apagadas automaticamente sem autorização específica para limpeza, conforme barreira atual do usuário; planejar criação mínima e registrar IDs de teste de forma sanitizada.

Não executar os fixtures existentes com cleanup DELETE sob a nova barreira sem aprovação específica. Não iniciar processo, instalar dependência ou iniciar/parar Supabase nesta proposta. Nenhuma implementação antes do checkpoint aprovado e da aprovação humana do recorte.

Parar após B01–B04 com relatório. Sem revisão, aprovação, publicação, registro de realização, apoio, selo, parceiro ou painel. A07 requer nova prova quando a publicação existir; A08 mantém ressalva de tempo controlado.
