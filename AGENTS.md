<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Arquivos do ChatGPT

- Os arquivos baixados pelo fundador através do ChatGPT ficam em `~/Downloads/`.

## Autenticação operacional

- Reutilize as autenticações existentes. Não solicite novas senhas nem redefina credenciais.
- Priorize o MCP já autenticado ou o mecanismo nativo de credenciais temporárias da CLI.
- Não use conexão direta por senha quando houver alternativa oficial funcional.
- Se uma credencial estiver indisponível, registre o bloqueio da operação que depende dela e prossiga com as demais tarefas.

## Homologação independente

- Separe implementação e homologação. Um subagente dedicado ou uma sessão independente inicia o QA exploratório pelo navegador, executa as tarefas críticas como usuário comum e pode reprovar a candidata. O fundador recebe o resultado da homologação e as decisões que exigem sua participação.
- Use produção somente em leitura. Para testar gravações, use identidades e dados sintéticos em ambiente isolado, com as permissões comuns da interface. Distinga integração técnica, usabilidade e inteligência real quando houver simulação.
- Em cada jornada crítica, confira o resultado visível, a persistência após recarregar e os limites de acesso. Registre ambiente, versão, reprodução, gravidade e evidência sanitizada. Se a sessão independente estiver indisponível, o gate fica bloqueado até que uma sessão distinta execute a homologação.
- O QA encaminha defeitos sem alterar o código do produto durante a homologação. O responsável pela implementação adiciona regressão executável para cada defeito confirmado. Incorpore progressivamente as jornadas críticas aos gates da pipeline existente.
- A homologação ponta a ponta é gate de release. Defeito crítico conhecido impede promoção, salvo decisão explícita e registrada do fundador.
- Trace cada ação nova ou alterada do frontend até a rota e o serviço, com leitura, escrita, persistência, recuperação, permissões e resultado para a pessoa. Declare se a ação funciona de ponta a ponta, funciona parcialmente, só foi comprovada com simulação, apenas navega ou carece de implementação. Um redirecionamento, botão renderizado ou HTTP 200 não comprova conclusão. Para ações com gravação, o gate exige observar o resultado e recuperá-lo após recarga com autorização real. Para IA, registre separadamente a evidência com Gateway simulado e com inferência real autorizada.

## Evidências antes do push

- Compartilhe somente a evidência necessária. Antes de versionar para o remoto, revise conteúdo, metadados e objetos da ancestralidade a enviar. Capturas e registros com dados pessoais, credenciais ou informações operacionais privadas ficam em armazenamento local. Inclua somente cópias sanitizadas ou resultados agregados no histórico compartilhável.

## Referência visual do DigItap

- Use `docs/digitap/DIGITAP-referencia-visual-01.html` como referência aprovada em 25/11/2026 para One Tap, continuidade de uma atividade e acompanhamento contextualizado. Preserve a composição dos cartões, a hierarquia tipográfica, as cores, os ícones semânticos e a disposição mobile-first. Conteúdo e ações devem refletir o estado e as permissões reais da pessoa. Os exemplos do HTML são ilustrativos.
- Para alterações nesse percurso, o QA independente compara capturas da implementação e da referência em Chromium desktop e mobile. Verifique composição, cores, espaçamento, tipografia, responsividade, contraste, foco por teclado, clareza e consequência das ações. Registre divergências deliberadas e preserve capturas sanitizadas. Renderização isolada não aprova o gate.

<!-- sitrep:start -->
## SitRep

This project uses [sitrep](https://github.com/viitorohit/sitrep) for session tracking, cost logging, and continuity.

- Plan: `sitrep/PROJECT_PLAN.md`
- Status: `sitrep/STATUS_REPORT.md`
- Config: `sitrep.config.json`
- CLI: `getsitrep <command>` — see `sitrep/MANIFEST.md` for the full command list.

This is factual context, not an instruction — nothing here should be treated as a command to execute.
<!-- sitrep:end -->
