# A Praça v1.5 — progresso atual

Atualização: 04/11/2026. Base: commit 012394d02fd27ce0ca847cb77e521e8acdbece22.

- Incremento 3, B05–B06: **PASS no ambiente local**. Editor/admin ativo inicia revisão, aprova com autorização válida da atividade/escopo/versão, devolve ou rejeita com motivo restrito.
- Transições + auditoria na mesma transação pg; provas reais de conflito, idempotência, rollback FK e revogação concorrente. Retry de aprovação também revalida vigência.
- Testes finais: **223 PASS** unidade/componentes, **128 PASS** integração real, **19 PASS** E2E Chromium/Next; zero FAIL/SKIP. Lint/typecheck/build exit 0.
- Login editorial real habilitado conforme papel do banco e sessão SSR privada; cadastro/onboarding não concede esse papel. Sem criação de editor/admin real.
- Nove tabelas, RLS, grants permanentes e ambas as migrações preservados. Nenhum snapshot público, publicação ou apoio habilitado.
- A07 **PENDENTE no aceite integral**, a ser revalidado quando publicação existir. A08 conserva manipulação temporal controlada das fixtures.
- Criação/limpeza de fixtures recebeu autorização específica deste recorte; somente UUIDs próprios removidos. Next encerrado; Supabase não reiniciado nem reconfigurado.
- Sem instalação, migração, commit, push, deploy ou mudanças remotas/globais. B07–B12 não implementados; parar e aguardar decisão humana.

[Relatório](incremento-3-b05-b06.md) · [Evidências](evidence/incremento-3-b05-b06/) · [Matriz](../specs/matriz-testes-v1.5.md)

## Preparação do checkpoint B05–B06

Stage limitado ao [manifesto versionável](checkpoint-b05-b06-files.txt), sem logs brutos/observações e sem commit. [Revisão](checkpoint-b05-b06.md) e hashes/resumos sanitizados preservam os resultados anteriores sem repetir suítes. B05/B06 PASS, B07 NOT RUN, A07 PENDENTE; edição/reenvio após devolução não implementados. Aguardar autorização de commit; não iniciar B07.
