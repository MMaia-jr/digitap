> **Atualização posterior:** a investigação confirmou falso positivo no B11 e o teste foi corrigido no commit `eeec4ce`. As quatro verificações restantes foram executadas sem bail no `npm test`; veja [fechamento](CLOSURE.md) e [totais atuais](closure-summary.json). Os resultados de interrupção abaixo são históricos e não devem ser somados aos totais da nova execução.

# Semana 1 — dia 3: rodada interrompida por P0

Base: `c1264c1eef5d2d8fa5f0b36cca5a4b00d7434ef0`. Execução local em 11/11/2026. Nenhum acesso a produção por curl, fetch ou integração. Nenhuma mudança de aplicação, banco, migrations ou RLS.

## Resultado e interrupção

**P0 B11 FAIL** em `tests/components/public-safety.test.tsx:25`: “nome público legado com HTML é escapado na lista e detalhe”. Classificação P0: `specs/matriz-testes-v1.5.md:28`. Erro: `AssertionError: expected SVGSVGElement{ …(1) } to be null`.

O teste consulta `img,script,svg,iframe,[onerror],[onload]` em toda a página. O elemento recebido é um SVG; isso não prova execução de HTML malicioso ou XSS, pois o seletor também pode atingir ícones legítimos. A falha do gate está comprovada; a causa requer investigação separada antes de corrigir ou aceitar. Não foi alterado o teste para fazê-lo passar. A regra do proponente exige parar e reportar antes de continuar, mesmo que a falha já fosse conhecida no checkpoint anterior.

Depois da falha P0, não foram executados outros testes, build, lint, typecheck, criação de contas ou ensaio de restore. Apenas documentação, consolidação e versionamento das evidências.

## Comandos e totais reais

1. `npm test -- --bail=1 --no-file-parallelism --reporter=json --outputFile=operations/evidence/semana-1-dia-3/unit.json`
   - Exit 1; **1 PASS / 1 FAIL / 2 SKIP por interrupção** no arquivo `visible-home.test.tsx`.
   - Primeira falha: espera texto antigo “A Praça está sendo construída”, ausente na Home atual. Débito de teste/copy ligado ao cenário B12/P1; nenhuma correção feita.
   - 48 arquivos descobertos não chegaram a executar. `--bail=1` e execução serial foram usados para conter a rodada na primeira falha, antes de avaliar sua prioridade.
2. Como a primeira falha não era P0, foi priorizado o gate de segurança: `npm test -- tests/components/public-safety.test.tsx --bail=1 --no-file-parallelism --reporter=json --outputFile=operations/evidence/semana-1-dia-3/p0-public-safety.json`
   - Exit 1; **5 PASS / 1 FAIL / 3 SKIP por interrupção**. Falha P0 B11; parada obrigatória.

**Acumulado dos dois arquivos: 6 PASS / 2 FAIL / 5 SKIP por bail.** Outros **47 arquivos** da suíte descoberta não foram executados nesta rodada; não entram como PASS ou SKIP. São totais parciais, não resultado da suíte completa. O JSON do Vitest registra `pending` nos testes interrompidos, mas `numPendingTests=0` no agregado: os totais acima foram calculados a partir de `assertionResults`, preservando ambos os relatórios brutos.

| Verificação solicitada | Estado desta rodada |
| --- | --- |
| Unitários/componentes | Execução parcial interrompida; totais acima |
| `npm run test:onboarding:db` | NOT RUN: parada P0; Docker também indisponível |
| `npm run test:e2e` | NOT RUN: parada P0; Docker também indisponível |
| `npm run build` | NOT RUN: parada P0 |
| `npm run lint` | NOT RUN: parada P0 |
| `npm run typecheck` | NOT RUN: parada P0 |
| Duas contas PF/Organização e isolamento RLS | NOT RUN; nenhuma conta criada |
| Rascunhos ausentes da Home com banco real | NOT RUN; não há prova nova de não vazamento |

Não reaproveitar os totais PASS do dia anterior como resultados atuais. NOT RUN é diferente de FAIL de asserção ou de SKIP reportado pelo runner.

## Pré-requisito local

`docker ps` foi tentado em leitura; o sandbox negou o socket. A repetição autorizada retornou “Cannot connect to the Docker daemon … Is the docker daemon running?”. Não foi iniciado/reconfigurado Docker nem tentada uma alternativa remota. Integração e E2E exigem Supabase local isolado e Next; a indisponibilidade bloqueia o teste real PF/Organização, independentemente do P0.

## Backup e restore — risco aberto

Não há evidência local que confirme plano contratado, backup automático, frequência, retenção ou último ponto recuperável do Supabase Cloud deste projeto. A restrição de trabalhar somente localmente impede confirmar isso no painel nesta rodada. **Não se conclui que o Cloud não possui backups: a proteção não está comprovada.** Risco registrado no README. Restore não executado e RPO/RTO não aferidos.

Procedimento a completar pelo responsável, sem executar restore em produção nesta rodada:

1. Obter do painel/contrato do projeto os backups disponíveis, frequência, retenção, último sucesso, cobertura do banco e cobertura separada dos objetos de Storage. Registrar data, fonte e plano; não assumir que backup do banco inclui arquivos.
2. Identificar ponto de recuperação e requisitos do procedimento de restore oferecido pelo plano. Registrar indisponibilidade esperada e quem autoriza; guardar uma cópia atual antes de qualquer operação que substitua dados.
3. Ensaiar em destino isolado compatível, com dados protegidos, sem sobrescrever produção. Se o plano não permitir restaurar em outro destino, definir com o provedor uma alternativa segura antes da execução.
4. Conferir integridade, Auth, tabelas, políticas/permissões, PF/Organização, ausência de vazamento de rascunhos, evidências e referências de arquivos. Medir tempo e perda de dados para definir RTO/RPO.
5. Registrar resultado e decisão humana. Se não houver backup disponível, aprovar rotina de exportação criptografada, cópia separada de arquivos, retenção, responsável e ensaio de restore antes de ampliar o beta.

## Débitos e retomada

- P0 B11: investigar seletor/ícones versus escape do nome legado; não afirmar vulnerabilidade nem dispensar a falha sem evidência.
- P1: reconciliar expectativa de texto do estado vazio da Home; não corrigido.
- Histórico do dia 2: demais falhas em `editorial-queue` e lint `Date.now()` já registrados; não reexecutados nem reclassificados nesta rodada.
- Pré-requisito: disponibilizar Docker/Supabase local e comprovar portas isoladas antes de criar fixtures.
- Operação: comprovar backup/restore, frequência, retenção e cobertura dos arquivos.
- Retomar a suíte completa e os testes PF/Organização somente após deliberação sobre o P0 e resolução dos pré-requisitos. Nenhum aceite do núcleo é emitido nesta rodada.
