# DigItap — checkpoint operacional: Semana 1, dias 1–2

Data: 11/11/2026. Esta nota substitui o estado operacional do checkpoint antigo, preservado abaixo como histórico. Dois checkpoints de trabalho serão registrados nesta execução; não representam dois dias de calendário transcorridos.

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

Validação: primeiro `npm run build` PASS (inclui `/privacidade`, `/termos` e `/contestacao`). Typecheck/lint e inspeção HTTP serão registrados no segundo checkpoint. Código de negócio, banco, migrations, RLS e configuração Auth não alterados.

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
