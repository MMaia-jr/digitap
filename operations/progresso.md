# A Praça v1.5 — progresso atual

Atualização: 04/11/2026. Base: commit 7c8c80d478890cf1e350b6c397151ed3aa767f3e.

- Incremento 3, **B07 PASS local**: publicação explícita de snapshot autorizado, por editor/admin ativo; organização validada e autorização original específica, vigente e vinculada à versão/conteúdo aprovados.
- Snapshot + número + timestamp + estado + evento na mesma transação PostgreSQL. Repetições/concorrência não duplicam; falha FK de auditoria reverte tudo. Leitura pública separada das rotas privadas, por lista branca, com no-store e revalidação de elegibilidade.
- **A07 PASS** reexecutado contra publicação real; A08 conserva manipulação temporal controlada das fixtures. A01–A09 e B01–B06 preservados nas regressões.
- Testes: **262 PASS** unitários/componentes, **152 PASS** integrações reais, **27 PASS** E2E Chromium/Next; zero FAIL/SKIP finais. Lint/typecheck/build aprovados. Não equivale a 74/74.
- Nove tabelas, RLS, grants permanentes e duas migrações preservados; nenhuma dependência instalada ou migração executada. Aprovações antigas sem hash de conteúdo não são publicáveis; não há backfill automático.
- Fixtures fictícias e regressões criadas/limpas com autorização específica desta execução; Next loopback encerrado, porta 3215 livre; Supabase preservado sem reinício/reconfiguração.
- **Sem commit, push, deploy ou operação remota/global**. B08–B12 não iniciados. Edição/reenvio após devolução, republicação, retirada, apoios, selos e indicadores continuam fora deste recorte.

[Relatório B07](incremento-3-b07.md) · [Evidências](evidence/incremento-3-b07/) · [Matriz](../specs/matriz-testes-v1.5.md)

## Checkpoint B07 preparado

Stage limitado ao [manifesto versionável](checkpoint-b07-files.txt), com hashes e revisão de evidências em [checkpoint-b07.md](checkpoint-b07.md). Logs/observações/processos brutos permanecem locais e ignorados. Nenhuma suíte repetida ou código funcional alterado na preparação. A07/B07 PASS local, A08 com ressalva temporal e B08–B12 NOT RUN. **Aguardar autorização de commit; não iniciar B08.**
