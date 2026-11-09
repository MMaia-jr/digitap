# Correção de cookies no layout

Referências consultadas:
- https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework
- https://raw.githubusercontent.com/supabase/supabase/master/examples/auth/nextjs/lib/supabase/server.ts
- Documentação local do Next.js 16.4.5: cookies.md e proxy.md.

Mudanças limitadas à gestão de sessão:
- setAll tolera somente o erro conhecido de escrita em Server Component; outras falhas continuam sendo propagadas.
- O proxy existente também cobre páginas públicas que renderizam AppHeader. Continua validando a identidade com getUser, atualizando cookies no request/response e impedindo cache compartilhado. Arquivos estáticos ficam excluídos.
- Nenhuma alteração de lógica de negócio, schema ou migration.

Validação:
- 3 testes direcionados de cookies: PASS; exit 0 (unit.log).
- npm run build: exit 0 (build.log).
- COOKIE-01: 1 PASS, 0 FAIL; exit 0 (e2e.log/e2e.json). Sessão Auth real de uma PF fictícia; expiração controlada apenas do timestamp local do SDK, preservando JWT/refresh token genuínos. Verifica refresh na Home, Set-Cookie, HttpOnly, navegação, logout e cookie inválido sem erro de renderização. A fixture foi removida.
- Servidor temporário encerrado. next-env.d.ts sem diff.

Limpeza autorizada: removida somente a atividade 3371aaaa-ac00-4e06-ad59-3b6bd5a737a4, título lllll, estado rascunho e sem versão publicada. Antes da remoção, a transação confirmou ausência de registros, eventos, autorizações, apoios e casos vinculados. DELETE retornou exatamente 1 linha; consulta posterior retornou RESTANTES: 0 para esse título. Nenhuma conta ou outra atividade removida.

Sem commit.
