# Semana 1, dia 3 — STOP por falha P0 (11/11/2026)

Rodada estritamente local, base `c1264c1`. Unitários interrompidos com bail: **6 PASS / 2 FAIL / 5 SKIP**, em dois arquivos; outros 47 arquivos não executados. P0 B11 falhou ao encontrar SVG onde o teste esperava ausência de elementos; isso não demonstra XSS, mas impede aceite do gate. Primeira falha não P0: expectativa de texto antigo da Home. Nenhuma correção aplicada.

Após a falha P0, integração, E2E, build, lint, typecheck e testes com contas PF/Organização **NOT RUN**. Docker local também indisponível; nenhuma conta criada ou operação remota executada. Backup/restore Cloud sem comprovação de frequência/retenção; risco registrado no README. [Relatório completo e comandos](evidence/semana-1-dia-3/REPORT.md) · [Totais estruturados](evidence/semana-1-dia-3/summary.json).

---

# DigItap — checkpoint operacional: Semana 1, dias 1–2

Data: 11/11/2026. Esta nota substitui o estado operacional do checkpoint antigo, preservado abaixo como histórico. Dois checkpoints de trabalho registrados nesta execução; não representam dois dias de calendário transcorridos.

## Estado de produção e limites da verificação

- App público: https://www.digitap.com.br; Vercel + Supabase Cloud (projeto informado: `nlvgfrblxckrpflpdemj`). Domínio respondeu por HTTPS nesta revisão.
- Banco criado e migrado e e-mail via Resend funcional: informações fornecidas pelo proponente. Não foram repetidas migrações, testes com usuários reais ou envios de e-mail nesta revisão.
- Código contempla PF/organização, atividades, curadoria, evidências e portfólio exportável via impressão do navegador. Os consertos de produção registrados no Git incluem configuração Cloud, chaves públicas opacas, diagnóstico de cadastro e redirect da recuperação de senha.
- Enable Signup: verificação ainda pendente. Integração Supabase negou permissão ao consultar o projeto; `.env.local` aponta para localhost. Não alterado. Site público não é prova de cadastro aberto ou de beta fechado. Se `disable_signup=false`, registrar **beta aberto**.

## Exceção de escopo: portfólio antes do I5

O documento 02 condicionava portfólio a I5. O portfólio/PDF já foi implementado e disponibilizado antes dessa validação, conforme informado pelo proponente e compatível com o código atual. Esta nota registra a divergência; não inventa uma aprovação histórica que não está documentada.

Justificativa operacional desta reconciliação: permitir apresentar a trajetória e os registros já publicados no beta, sem construir um sistema novo de reputação ou certificação. Condições vigentes: conteúdo autorizado e publicado, distinção entre declaração e verificação independente, contestação acessível, cuidado com terceiros e indicação de que PDF é cópia estática. VH-01, VH-02 e VH-03 permanecem pendentes até evidência e deliberação humanas registradas. A exceção não libera novos módulos nem substitui a decisão de lançamento.

## Dia 1 — documentação e transparência

README reconciliado; privacidade revisada; páginas `/termos` e `/contestacao` criadas; footer global com contato, responsável e links. Linguagem de beta, sem presumir governança institucional formal. Política registra dados, finalidades, consentimento para exposição pública, legítimo interesse limitado à agregação, fornecedores nos EUA, direitos e limitações de retenção. Não foi implementado mecanismo novo de coleta de consentimento.

Validação: primeiro `npm run build` PASS (inclui `/privacidade`, `/termos` e `/contestacao`). Typecheck/lint e inspeção HTTP registrados no segundo checkpoint abaixo. Código de negócio, banco, migrations, RLS e configuração Auth não alterados.

## Dia 2 — consistência e verificação

- Primeiro checkpoint: commit `17b2737`, enviado a `origin/main`.
- Documento 02 recebeu nota atual de exceção ao escopo do portfólio; texto histórico preservado. Governança alinhada ao procedimento de resposta privada e eventual divulgação de decisão sem dados pessoais.
- Segundo `npm run build`: PASS. `npm run typecheck`: PASS. Lint das cinco páginas/layout tocados: PASS; revisão React: páginas informativas renderizadas no servidor, headings e links sem nova dependência ou estado cliente.
- Navegador Chromium contra build local em loopback: **10 verificações PASS**, em larguras 390/1280, nas rotas privacidade, termos, contestação, governança e login; status 200, acesso sem login, links de footer e contato corretos, sem overflow horizontal. [Evidência](evidence/semana1-dias1-2/pages.json). Não é teste de entrega de e-mail nem do ciclo completo cadastro → portfólio em produção.
- `npm test`: **451 PASS / 5 FAIL**, em 49 arquivos (456 testes). As cinco falhas são as mesmas já identificadas antes deste trabalho: três em `editorial-queue`, uma em `public-safety` e uma em `visible-home`. Não foram alterados esses componentes/testes.
- `npm run lint` geral: FAIL em `src/app/dashboard/pessoa-fisica/atividade/[id]/evidencia/page.tsx:13`, regra `react-hooks/purity` por `Date.now()` durante renderização; arquivo idêntico à base `a8c2e45`. Mantido fora do escopo de documentação/controles.
- Enable Signup: **NÃO VERIFICADO**. O MCP retornou falta de permissão ao consultar as chaves públicas do projeto informado. A inspeção dos scripts públicos do cadastro não forneceu chave para `GET /auth/v1/settings`; nenhuma conta foi criada para testar. Solicitado ao proponente o estado do campo ou a chave pública correta; sem resposta registrada neste checkpoint. [Limites da checagem](evidence/semana1-dias1-2/auth-access.json). Quando houver evidência de `disable_signup=false`, atualizar README para “beta aberto para cadastro”. Não classificar como beta fechado enquanto isso.
- Nenhuma alteração de banco, migrations, RLS, credenciais ou configuração Auth. Nenhuma funcionalidade de apoio, parceiro ou prestação de contas adicionada.

## Pendências antes da ampliação

Confirmar Enable Signup; registrar região efetiva e instrumentos de transferência internacional; fechar política de retenção/backups e comprovação de consentimento; consolidar arquivos formais de licença; executar e registrar VH-01–VH-03 e decisão humana. Os textos públicos não são certificação de conformidade nem prova de validação humana. O canal de contestação é atendimento manual do responsável, não sistema automatizado de tickets.

---

## Checkpoint histórico preservado (superado quanto ao estado atual)

# A Praça v1.5 — progresso atual

Base: c015cdeffbe06512a34a4fc9b1242a43834c3adb. B08–B09 implementados e comprovados localmente; nenhum novo stage/commit.

- **B08 PASS local:** organização edita publicada, cria versão pendente e mantém snapshot anterior público; aprovação editorial válida da nova versão substitui/audita atomicamente. Primeira publicação permanece explícita.
- **B09 PASS local:** retirada editorial auditada com motivo restrito, apoios_abertos=false, ocultação pública e bloqueio de republicação/edição/envio. Reabertura não implementada.
- Resultados: **283 unitários/componentes, 163 integrações PostgreSQL reais e 30 E2E Chromium PASS**, zero FAIL/SKIP finais; build/lint/typecheck exit 0.
- A01–A09/B01–B07 preservados; A08 continua com manipulação temporal controlada. Duas expectativas históricas que bloqueavam edição publicada foram ampliadas ao contrato B08, preservando testes de snapshot/privacidade.
- Nove tabelas, RLS, grants permanentes e migrações intactos. Modelo org-only, sem dependência nova ou publicação remota.
- Fixtures fictícias criadas/limpas com autorização específica desta execução. Next loopback encerrado; Supabase preservado sem reinício/reconfiguração. Logs/observações brutos ignorados.
- **I3 não concluído:** B10–B12/C01–C08 não iniciados. Sem I4/I5, pacote documental ou alteração de 00-master-context.md.

[Relatório](incremento-3-b08-b09.md) · [Matriz](../specs/matriz-testes-v1.5.md) · [Rastreabilidade](evidence/incremento-3-b08-b09/traceability.json)

Pronto para revisão de commit local: SIM. **Parar e aguardar “ok commit”; não fazer stage/commit automaticamente.**
