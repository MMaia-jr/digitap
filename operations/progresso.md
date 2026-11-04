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
