> **Atualização posterior com Docker:** migration aplicada apenas localmente e oito testes PostgreSQL do módulo aprovados. A regressão maior parou em uma divergência 403/404 de teste P0 existente; E2E ainda não executado. Veja [retomada e resultados atuais](../semana-1-dias-4-5-docker/REPORT.md). As limitações abaixo descrevem a primeira execução, antes do Docker estar disponível.

# Semana 1, dias 4–5 — apoio e intenção

Execução local em 11/11/2026. Base: `25cad7f`. Os dias indicam checkpoints de trabalho, não dias de calendário transcorridos. Nenhuma consulta ou mudança no ambiente de produção.

## Decisão humana de privacidade

O proponente respondeu à divergência entre “organizador só vê agregados” e lista pública: **“Nomes públicos somente com consentimento opcional explícito; WhatsApp sempre privado”**.

Aplicação: checkbox opcional desmarcado por padrão; `mostrar_nome=false` na validação e no banco. Lista pública contém somente nomes de intenções autorizadas (até 100), sem IDs, WhatsApp ou tamanho dos grupos. O dashboard recebe exclusivamente `apoios` e `intencoes`. A pessoa pode pedir retirada de autorização/exclusão pelo contato de privacidade já existente; não há interface nova de gestão de consentimentos.

## Dia 4 — testes RED

Antes da implementação, foram escritos os testes de serviço e interface. A primeira tentativa falhou por ausência dos módulos (`red-imports.log`); após criar somente tipos/stubs vazios, **28 testes falharam** por falta da implementação (`red.log`, exit 1). Cobertura: apoio/intenção, sessão, confirmação de e-mail, identidade forjada, validação, tradução do conflito UNIQUE, contadores sem campos privados, consentimento e interface.

O primeiro GREEN parcial teve 27 PASS / 1 FAIL: jsdom não implementa `dialog.showModal`. O suporte à API nativa foi simulado no teste, preservando as expectativas (`green-first.log`). Foram acrescentadas verificações HTTP/adapter e tipo inválido; o GREEN atual tem **38 PASS / 0 FAIL / 0 SKIP**, em três arquivos (`green.log`, exit 0).

## Dia 5 — implementação

### Regras

- Perfil autenticado, com e-mail confirmado e vínculo próprio ativo, registra `apoio` ou `intencao`; visitante recebe 401 e não chega à RPC privilegiada.
- Uma única escolha por atividade/perfil, inclusive entre tipos. Não há troca/edição no incremento. UNIQUE no banco garante concorrência; o cliente também bloqueia submit simultâneo.
- `acompanhantes` representa quantidade pretendida no grupo **incluindo quem registra**, padrão 1, limite 20. Intenções contam registros, não pessoas presentes.
- WhatsApp opcional, normalizado e validado (10–15 dígitos, `+` opcional), somente em intenção. Apoio não leva telefone, autorização de nome nem grupo maior que 1.
- Novos registros exigem atividade pública com publicação/autorização vigente, programação programada/adiada e início publicado ainda futuro. Cancelada, retirada, rascunho inicial e atividade já iniciada não recebem novos registros. Edição de um rascunho com snapshot anterior público usa a versão publicada, não os dados privados da edição.
- Texto explícito na UI: “Apoio é simbólico. 'Vou Participar' é uma intenção, não confirmação de presença.” Sem lista de faltosos, reputação, pontuação ou verificação pós-evento.

### Banco e RLS

Migration gerada pela CLI: `supabase/migrations/20261111222337_confirmacoes_apoio_intencao.sql`.

Tabela `confirmacoes` com os campos solicitados, `UNIQUE(atividade_id,sujeito_id)`, validações, índices por atividade/perfil e autor. Campos adicionais: `mostrar_nome` para consentimento e `criada_por_conta_id` para garantir que nem outro titular do mesmo perfil organizacional leia o contato de quem registrou.

RLS permite SELECT somente da própria confirmação, com conta ativa, e-mail confirmado e vínculo atual. Clientes `anon` não têm acesso à tabela; `authenticated` não insere/edita/apaga diretamente nem executa RPCs privilegiadas. Um predicado booleano `SECURITY DEFINER` fica no schema não exposto `participacao_privada`, com `search_path=''`, `auth.uid()` explícito e privilégios restritos; ele não retorna linhas nem contatos.

Escrita e agregados usam funções `SECURITY INVOKER`, executáveis apenas por `service_role`. O backend deriva a identidade do Auth, rejeita campos de identidade no JSON e passa o ID verificado; as RPCs revalidam vínculo/propriedade. A leitura da confirmação própria carrega o JWT do usuário para aplicar RLS. Resumo público valida também a consulta pública já existente antes de divulgar dados. Linhas privadas não são enviadas ao organizador.

**Migration criada, mas NÃO aplicada em banco local ou Cloud.** Docker indisponível. RLS, privilégios e concorrência foram implementados e revisados, mas **não comprovados contra PostgreSQL real** nesta execução.

### HTTP e interface

- `GET /api/atividades/:id/confirmacoes`: contadores, nomes autorizados e estado mínimo da própria escolha (sem WhatsApp).
- `POST /api/atividades/:id/confirmacoes`: origem/JSON/tamanho validados, identidade derivada e erro de duplicidade 409. Respostas privadas `no-store`, sem mensagem interna do banco.
- `GET /api/atividades/:id/confirmacoes/resumo`: somente contadores e somente após validar organizador da atividade.
- Página da atividade: apoio, modal nativo com foco/tecla Escape, campos opcionais e prova social consentida; erro de serviço não é apresentado como contador zero.
- Dashboards PF e Organização/coletivo: contadores por atividade, sem lista privada.
- Privacidade e README atualizados para os dados/limites deste módulo.

## Verificações e outputs

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| RED dos contratos com stubs | Exit 1; 28 FAIL | `red.log` |
| Testes específicos GREEN | Exit 0; 38 PASS / 0 FAIL / 0 SKIP | `green.log` |
| `npm test` completo, sem bail | Exit 1; **490 PASS / 4 FAIL / 0 SKIP**, 52 arquivos (50 PASS / 2 FAIL) | `unit-full.log` |
| Build final | Exit 0 | `build.log` |
| Typecheck | Exit 0 | `typecheck.log` |
| Lint dos arquivos do módulo | Exit 0 | `lint-touched.log` |
| Lint geral | Exit 1; 1 erro preexistente `Date.now()` / `react-hooks/purity` | `lint-full.log` |
| Ensaio Chromium | 7 cenários PASS | `manual-browser.json`, `modal-mobile.png` |
| Integração PostgreSQL | **NOT RUN**, Docker indisponível; oito testes preparados | `tests/integration/participation.database.test.ts` |
| E2E completo com Auth/DB reais | **NOT RUN**, Docker indisponível | `docker-preflight.log` |

As quatro falhas da suíte completa são as três já conhecidas em `editorial-queue` e a expectativa de texto antigo de `visible-home`; nenhuma nova falha P0 foi identificada. Não foram corrigidos esses débitos.

O primeiro build após o ensaio falhou porque `.next/dev/types` ainda referenciava a página temporária removida (`build-stale-dev-types.log`). A saída gerada `.next` foi limpa e o build final passou, sem mudar configuração TypeScript. O primeiro lint também flagrou imports CommonJS no script de evidência; ele foi convertido para ESM, e o lint do incremento passou. Os logs intermediários foram preservados.

## Ensaio de interface: alcance e reprodução

Quatro cenários Chromium usaram **API simulada**: visitante, apoio, intenção sem divulgar nome e intenção autorizando nome. Verificados consentimento inicialmente desmarcado, telefone opcional, grupo, bloqueio após registrar, escape de nome malicioso e layout em celular/desktop. A inspeção visual encontrou e corrigiu a largura do checkbox; ensaio repetido, incluindo overflow interno do modal.

Três verificações HTTP adicionais usaram os handlers locais reais, sem sessão/banco: POST anônimo → 401; POST com origem externa → 403; GET anônimo dos contadores de organizador → 401. Nenhuma conta real foi criada. **Isso não é E2E de login e persistência real.**

Reprodução da parte visual, somente local:

1. Criar temporariamente `src/app/participacao-check-local/page.tsx` com o conteúdo de `manual-page.fixture.txt`.
2. Iniciar Next dev em `127.0.0.1:3215`, com `.env.local` exclusivamente local.
3. Executar `PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" node operations/evidence/semana-1-dias-4-5/manual-browser.mjs`.
4. Encerrar o servidor e remover a página temporária antes de build/commit. O script substitui os resultados GET/POST apenas no navegador; não deve ser usado para afirmar persistência ou RLS reais.

A página temporária foi removida e não consta do build final.

## Liberação e pendências

1. Disponibilizar Supabase **local isolado**, revisar/aplicar a migration local e executar `A_PRACA_ALLOW_FIXTURE_CLEANUP=1 npm run test:onboarding:db` (inclui os oito novos testes). A suíte recusa host diferente de `127.0.0.1:56152` e exige autorização de fixtures/limpeza.
2. Executar E2E com Auth/DB reais, duas contas distintas e concorrência. Não substituir esses resultados pelos dados simulados do ensaio visual.
3. A liberação na nuvem depende de aplicar a migration no projeto correto após revisão. Não houve `db push`, consulta Cloud nem alteração de Auth nesta execução. Até a migration existir, o novo módulo mostra indisponibilidade; não inventa contagens ou gravações.
4. Retenção de confirmações/contatos e retirada manual de consentimento seguem sob responsabilidade operacional. Novos usos de contato ou prova social exigem decisão explícita; nenhum envio de mensagem foi implementado.

Referências consultadas: documentação local Next 16 (páginas/route handlers), [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), changelog Supabase e skills de Supabase/PostgreSQL/React. O desenho mantém funções privilegiadas fora do schema exposto e separa os DTOs públicos das linhas privadas.
