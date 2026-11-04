# Fronteira de segurança do incremento 1

Todas as nove tabelas têm RLS sem policies e sem grants para PUBLIC/anon/authenticated. Somente o backend privilegiado poderá mediar o acesso. O papel Postgres service_role contorna RLS; isso torna indispensável verificar Auth, conta ativa, papel e organização em cada operação.

`permissions.server.ts` e o adapter importam `server-only`. A autorização usa `auth.getUser()` e relê os papéis em `contas_acesso`; ignora e-mail textual e user_metadata como fonte de permissão. Os endpoints de autenticação e a área da organização já existem. A autorização segue no servidor; os testes novos usam serviços simulados, e a proteção no Supabase real continua pendente.

As fixtures usam domínios example.invalid e UUIDs novos. O suporte anônimo, a publicação, os selos, os agregados e as RPCs editoriais/de apoio não estão habilitados. Não testar esse código contra um banco remoto. A suíte de integração recusa URL/portas diferentes das fixadas para A Praça.

Nenhuma exclusão automática em cascata foi adicionada. Política de retenção e licença permanecem pendentes. O banco local fica parado por limitação de bind a loopback da CLI; não iniciar em rede compartilhada sem resolver e verificar esse ponto.

## Incremento 2

O frontend não instancia Supabase; somente envia JSON a endpoints próprios. Cookies são HttpOnly/SameSite, Origin/Host são verificados, payloads limitados e validados antes do SDK. Chaves privadas ficam em módulos server-only. Configuração bloqueia URLs de app/banco fora do loopback autorizado. O proxy renova a sessão; páginas/rotas fazem as verificações autoritativas.

A RPC de onboarding foi preparada, não aplicada. A função é invoker e somente service_role pode executar; validação da identidade/e-mail cabe ao backend, que deriva o UUID de Auth.getUser. Não aceitar esse UUID em payload HTTP. O cadastro não concede papel editorial, validação institucional nem parceria.

Provider e banco foram simulados nos testes deste incremento. Nenhum fluxo de e-mail real ou revogação de JWT copiado foi comprovado. O banco continua parado. Dependências de execução tiveram 0 avisos na auditoria; ferramentas de desenvolvimento registraram 16 entradas moderadas. Ver operations/incremento-2.md.

## Complementação da Etapa B — 04/11/2026

- O logout válido limpa apenas cookies próprios mesmo quando o cliente de Auth não consegue inicializar. A limpeza ocorre depois de validar origem e payload; requisições cross-site ou inválidas não apagam sessão. Limpeza de cookies não é prova de revogação do JWT já copiado.
- Login e confirmação com falha de transporte, erro do provider ou identidade incompleta encerram uma possível sessão parcial pelo gateway, cujo finally limpa os cookies. Sucesso não encerra a sessão.
- Login, confirmação e redefinição exigem identidade não vazia e e-mail confirmado. O onboarding também nega identidade vazia antes de consultar conta.
- Retry de vínculo só retorna por leitura se a identidade e a conta própria forem válidas, ativas e de papel organizacao. Contas editor/admin/bloqueadas não usam esse caminho para mudar de papel ou reativar vínculo.
- O bloqueio imediato de submits é restrito ao componente. Requisições de abas/processos diferentes continuam dependendo da RPC transacional existente; sua unicidade/concorrência real NÃO foi comprovada nesta etapa.

Nenhum grant, policy RLS, tabela, migração ou cliente privilegiado foi alterado. O Supabase não foi iniciado e não deve ser iniciado enquanto todos os bindings acessíveis não forem comprovados em loopback. Não contornar o bloqueio com alteração global, sudo, prune, exclusão de volumes ou uso de outro projeto. O aceite continua PENDENTE até integração real de Auth/REST/SQL e navegador em ambiente seguro.

## Validação local posterior — 04/11/2026

As observações históricas de banco parado acima foram superadas nesta execução autorizada: Supabase local iniciado, migração de onboarding aplicada com autorização separada e 89 testes reais passando. Listeners observados exclusivamente 127.0.0.1; metadados Docker ainda mostram ::. Controles positivos/negativos locais em operations/isolamento-rede-20261104.md. Sem prova por segundo dispositivo ou navegador/SSR; aceite permanece PENDENTE. Revalidar listeners e todas as portas em cada início, suspender somente A Praça preservando volumes se houver exposição; nunca alterar configurações globais ou iniciar automaticamente baseado nesta evidência histórica.

## Browser real — incremento 2C

A01–A09 verificados em Chromium/Next/Supabase locais; expiração de token/sessão exercitada por timestamps vencidos somente nas fixtures, sem alterar relógio global. HTML inicial mantém submit desabilitado até hidratação. Cookies HttpOnly/SameSite, cache no-store, isolamento, bloqueio e payload de papel foram exercitados na aplicação. Testes sem traces/vídeos/screenshots/storageState, com logs de rotas sem query e comparação de valores secretos sem imprimir credenciais. Binários/resultados temporários ficam ignorados no projeto. Ver operations/incremento-2c.md. Sem mudança de RLS/grants, migrações ou infraestrutura nesta etapa; prova de rede anterior mantém suas limitações.

## Publicação local — incremento 3, B07 (04/11/2026)

Estado vigente: B07 possui publicação explícita em processo local loopback, sem deploy. Textos anteriores de publicação inexistente descrevem apenas etapas históricas. RLS/grants das nove tabelas e migrações permanecem inalterados; acesso SQL direto de anon/authenticated segue negado. Sessão confirmada e conta editorial ativa do banco são obrigatórias em cada publicação, sem papel por payload/metadata.

Snapshot, versão, timestamp, estado e evento são atômicos na transação pg existente. Aprovação nova vincula hash de conteúdo e autorização da atividade/escopo/versão; aprovação antiga sem esse hash não publica automaticamente. Não fazer backfill/alterar registros anteriores para contornar a recusa. Autorização e organização são revalidadas inclusive em repetição; apoios permanecem fechados.

Consultas públicas separadas em `/api/public/atividades` e páginas `/atividades`/`/atividade/[id]`: somente projeção explícita do snapshot, sem contatos, comprovantes, motivo ou auditoria. Elas conferem organização validada e vigência da autorização original, com no-store; falhas não revelam conteúdo privado. Rotas privadas não foram abertas. Scripts de inspeção comparam valores secretos em memória sem imprimi-los. Relatório/evidências em operations/incremento-3-b07.md.

B08–B12, retirada/republicação e demais recursos não foram habilitados. Supabase não foi reiniciado neste recorte; nenhuma prova histórica autoriza reinício automático sem verificar novamente todas as portas. Não alterar Docker/firewall global ou outros projetos. Não há autorização de publicação externa.
