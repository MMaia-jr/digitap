# Autenticação local — preparação do incremento 2

O bloqueio de exposição das portas permanece. Não iniciar Supabase, não trocar portas globais e não reutilizar projeto/credencial alheio.

## Estado entregue

- Next.js compilado e testado via HTTP em loopback, depois encerrado.
- Supabase de A Praça não reiniciado; containers db/kong ausentes, volume supabase_db_a-praca-v1-5 preservado.
- scripts/start-local.mjs permanece bloqueado e não foi alterado.
- Migração 20261103230507_organization_onboarding.sql gerada pela CLI, preenchida, não aplicada.
- Templates e config.toml locais preparados, não carregados em stack ativo.
- Sem .env.local, segredos reais ou usuários reais neste incremento.

## Quando o isolamento estiver comprovado

Somente no projeto autorizado, após resolver o bind sem afetar configurações globais/outros projetos:

1. Verificar permissões, recursos, portas e bindings reais **antes de liberar o stack para uso**. A opção de rede que falhou no incremento 1 não constitui prova de isolamento.
2. Revisar a migração, conferir CLI --help da versão instalada e aplicar somente no banco local de A Praça. Não usar --remote, reset, --all ou --no-backup.
3. Configurar .env.local ignorado pelo Git com chaves exclusivamente desse stack, obtidas sem colar valores em logs/relatórios. Não copiar credenciais de outro projeto.
4. Manter confirmação de e-mail habilitada, mínimo de senha 12 e templates confirmation/recovery locais. Mailpit somente local para endereços fictícios example.invalid; não conectar SMTP externo.
5. Executar npm run test:onboarding:db e confirmar RLS, EXECUTE negado a anon/authenticated, concorrência de retries e rollback do segundo insert. Não considerar o SQL aprovado só porque a migração foi aplicada.
6. Executar a história real completa: signup → e-mail de teste → GET do link sem consumir → POST confirmar → organização pendente → logout → login → recuperação → nova senha → token consumido/expirado negado. Conferir cookies, headers e ausência de dados em logs. Testar falha no vínculo após Auth confirmado e retomada por login.
7. Conferir conta bloqueada e expiração de sessão na API e na tela, tenant alheio negado e tentativa de elevação por payload/metadata. Logout limpa este navegador e revoga o refresh da sessão local; não presumir invalidação imediata de JWT de acesso já copiado. Antes de futuras operações sensíveis, avaliar verificação de sessão revogada no servidor.

## Falhas e retomada

- Falha no Auth: apresentar erro genérico e repetir ou recuperar; resposta de signup não revela se a conta existe.
- Auth confirmado, banco indisponível: manter identidade, entrar novamente e repetir a organização. Não fazer insert avulso seguido de outro insert por HTTP: ambos pertencem à RPC transacional.
- Resposta do vínculo perdida após commit: repetir retorna a mesma organização. Nome/canal do primeiro vínculo não são sobrescritos por retries.
- Falha em updateUser após consumir OTP de recuperação: sessão temporária é encerrada; solicitar novo link.
- Falha do provider no logout: cookies próprios são limpos, mas não declarar revogação remota comprovada.
- Não há endpoint de troca de papel, convites ou entrada em uma organização existente.

Sem testes reais passando, o fluxo não está pronto para teste fechado com pessoas reais. Aviso de privacidade, retenção, canal de correção, licença e autorização de publicação continuam pendentes. Não executar deploy/push ou migração remota.
