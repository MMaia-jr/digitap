<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Autenticação operacional

- Reutilize as autenticações existentes. Não solicite novas senhas nem redefina credenciais.
- Priorize o MCP já autenticado ou o mecanismo nativo de credenciais temporárias da CLI.
- Não use conexão direta por senha quando houver alternativa oficial funcional.
- Se uma credencial estiver indisponível, registre o bloqueio da operação que depende dela e prossiga com as demais tarefas.

<!-- sitrep:start -->
## SitRep

This project uses [sitrep](https://github.com/viitorohit/sitrep) for session tracking, cost logging, and continuity.

- Plan: `sitrep/PROJECT_PLAN.md`
- Status: `sitrep/STATUS_REPORT.md`
- Config: `sitrep.config.json`
- CLI: `getsitrep <command>` — see `sitrep/MANIFEST.md` for the full command list.

This is factual context, not an instruction — nothing here should be treated as a command to execute.
<!-- sitrep:end -->
