# ESTADO ATUAL — A Praça

Atualizado: 05/11/2026

## O que é o projeto (contexto mínimo)

A Praça é infraestrutura cívica e comunitária para Itaperuna (RJ) e região.
Não é app de prefeitura, não é partido, não é empresa. É espaço de coordenação,
memória e ação coletiva. Nasceu para incluir pessoas físicas e coletivos
informais, não só organizações formalizadas. Critério de progresso é humano:
uma pessoa real consegue fazer algo que antes não conseguia.

## Onde estamos no repo

- HEAD: 70c7ef9 (feat COMPAT commitado)
- Working tree: limpa
- Commits I4: 27e81fc (EXPAND) → 0f27cba (BACKFILL) → 70c7ef9 (COMPAT)
- I3: 20/20 cenários (B01-B12 + C01-C08) PASS, commitado em 623ee50
- docs/: 9 arquivos fundacionais (00-07 + Marco Zero), intactos
- Migrations: 4 (3 antigas + i4_compat)

## O que cada fase do I4 fez

**EXPAND (27e81fc):** criou 6 tabelas novas (sujeitos_publicadores,
pessoas_fisicas, coletivos_informais, vinculos_publicadores,
atestacoes_representacao, casos_moderacao), adicionou sujeito_id nullable
em atividades, RLS deny-by-default nas 6, 22 testes RED→GREEN.

**BACKFILL (0f27cba):** script scripts/i4-backfill.mjs que migra
organizações existentes → sujeitos (testado com fixtures, base real vazia).
8 testes PG PASS, idempotente, invariantes preservadas.

**COMPAT (70c7ef9):** wrapper criar_organizacao_com_sujeito (org + sujeito
+ vínculo na mesma transação), rota /api/organizacoes usa wrapper, grants
mínimos para service_role nas 6 tabelas + 10 funções, função legada
criar_organizacao_pendente intacta. 10/10 PG PASS, 41/41 E2E PASS.

## Decisões tomadas (NÃO reabrir)

- D1=A: PF publica com curadoria inicial, auto-publicação após histórico
- D2=A: coletivo exige 2 atestações de contas distintas + curadoria
- D3=B: tipos fechados (pessoa_fisica | coletivo_informal | organizacao)
- D4=B: curadoria por risco (baixo/médio/alto)
- D5: conta pode representar múltiplos sujeitos (N:N via vinculos)
- D6: histórico aprovado = 3 atividades/365 dias, primeira ≥30 dias,
  zero sanções 180 dias; exceção 1 atividade + 6 meses + curadoria
- D7: baixo autopublica, médio curadoria inicial, alto suspensão
- D8: atestante = conta ativa ≥30 dias, distinta da outra
- D9: moderação aberto→em_analise→procedente/improcedente/encerrado
- COMPAT: Opção C (wrapper no onboarding + script como rede de segurança)

## O que falta no I4: CUTOVER

Última fase. Abre o sistema para PF e coletivos informais publicarem.
Mudanças necessárias:

1. atividades.organizacao_id vira NULLABLE para PF/coletivo
2. contas_acesso.papel ganha 'publicador' (não exige organizacao_id)
3. Snapshot v2: sujeito {id, tipo, nome_publico} em vez de organização
4. Trigger de coerência: organização→ambos preenchidos; PF/coletivo→só sujeito_id
5. Release de recuperação inclusivo (não voltar ao I3 puro)

## Decisões pendentes para CUTOVER (tomar antes de codar)

- Formato exato do snapshot v2 (campos, compatibilidade com v1)
- Como garantir que atividade organizacional antiga continua funcionando
  com o trigger novo (regressão B01-C08 obrigatória)
- Plano de rollback pós-CUTOVER (quando já houver PF/coletivo publicando)

## Depois do I4 (não começar antes)

- I5: validação humana (VH-01 compreensão, VH-02 uso, VH-03 decisão)
  com uma pessoa real de Itaperuna. Não substituir por testes.
- I6+: portfólio, prestação de contas, IA para projetos, rede.
  CONDICIONAL ao resultado de I5. Sem autorização hoje.

## Contexto político (não perder)

- A Praça é para a população, não só organizações formalizadas
- CUTOVER é o coração político do projeto
- Adoção real: começar por comércio local, produtor rural, associação
  de bairro, igreja — NÃO por edital (edital é fatia, não o todo)
- Governança institucional (CNPJ, estatuto, DPO) é frente paralela,
  não pré-requisito para código. Formalizar quando a informalidade
  custar mais que a burocracia.
- Sustentabilidade: captar via edital PF/coletivo ou crowdfunding,
  pagar bolsas, só depois associação/cooperativa

## Onde estão as coisas

- Plano I4 completo: docs/plans/I4-2026-11-05.md
- Documentos fundacionais: docs/00 a docs/07 + Marco Zero
- Matriz de testes: specs/matriz-testes-v1.5.md (28 PASS + A08)
- Contratos de API: specs/contratos-api.md
- Evidências por fase: operations/evidence/incremento-i4-*/
- Script de backfill: scripts/i4-backfill.mjs

## Comandos de verificação rápida

```bash
cd ~/projects/a-praca-v1-5
git log -3 --oneline          # deve mostrar 70c7ef9 no topo
git status --short             # deve estar vazio
nc -zv 127.0.0.1 56152         # Supabase local rodando?
grep -c "| PASS |" specs/matriz-testes-v1.5.md  # deve ser 28
ls docs/                       # deve ter 9 arquivos + plans/
ls supabase/migrations/        # deve ter 4 arquivos
```
