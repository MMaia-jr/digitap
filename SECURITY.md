# Fronteira de segurança do incremento 1

Todas as nove tabelas têm RLS sem policies e sem grants para PUBLIC/anon/authenticated. Somente o backend privilegiado poderá mediar o acesso. O papel Postgres service_role contorna RLS; isso torna indispensável verificar Auth, conta ativa, papel e organização em cada operação.

`permissions.server.ts` e o adapter importam `server-only`. A autorização usa `auth.getUser()` e relê os papéis em `contas_acesso`; ignora e-mail textual e user_metadata como fonte de permissão. Ainda não existem endpoints que usem esses módulos: a proteção das futuras rotas será testada quando forem implementadas.

As fixtures usam domínios example.invalid e UUIDs novos. O suporte anônimo, a publicação, os selos, os agregados e as RPCs editoriais/de apoio não estão habilitados. Não testar esse código contra um banco remoto. A suíte de integração recusa URL/portas diferentes das fixadas para A Praça.

Nenhuma exclusão automática em cascata foi adicionada. Política de retenção e licença permanecem pendentes. O banco local fica parado por limitação de bind a loopback da CLI; não iniciar em rede compartilhada sem resolver e verificar esse ponto.

## Incremento 2

O frontend não instancia Supabase; somente envia JSON a endpoints próprios. Cookies são HttpOnly/SameSite, Origin/Host são verificados, payloads limitados e validados antes do SDK. Chaves privadas ficam em módulos server-only. Configuração bloqueia URLs de app/banco fora do loopback autorizado. O proxy renova a sessão; páginas/rotas fazem as verificações autoritativas.

A RPC de onboarding foi preparada, não aplicada. A função é invoker e somente service_role pode executar; validação da identidade/e-mail cabe ao backend, que deriva o UUID de Auth.getUser. Não aceitar esse UUID em payload HTTP. O cadastro não concede papel editorial, validação institucional nem parceria.

Provider e banco foram simulados nos testes deste incremento. Nenhum fluxo de e-mail real ou revogação de JWT copiado foi comprovado. O banco continua parado. Dependências de execução tiveram 0 avisos na auditoria; ferramentas de desenvolvimento registraram 16 entradas moderadas. Ver operations/incremento-2.md.
