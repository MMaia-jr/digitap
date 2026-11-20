# INC-01 — Retomada de um pedido pela conta criadora
Proposta documental. O objetivo é verificar continuidade entre sessões da mesma conta PF titular, após uma manifestação de outra PF. Sucessão entre pessoas permanece hipótese futura.

**Evidência na base d93891f.** Em src/lib/capabilities/service.server.ts, activityNeedInterests exige ownedActivity. Esse método verifica sujeito, atividade sem organização legada, autorização por ownedProfile e igualdade entre a conta autorizada e criada_por_conta_id. Outra conta vinculada ao sujeito não satisfaz a última condição. myInterests restringe ainda por owner_auth_user_id. O cenário E4.1 de tests/e2e/e4.spec.mjs prepara contas sintéticas e revoga uma autorização de publicação; isso não demonstra transferência de titularidade ou revogação de mandato.

| Cenário a especificar antes de qualquer implementação | Aceite observável |
|---|---|
| B manifesta interesse no pedido elegível de A; A encerra a sessão e entra novamente | A vê o interesse ativo na área privada da atividade. A interface permite distinguir pedido e manifestação, sem registrar compromisso ou realização. |
| B tenta consultar a lista privada de A | A consulta é negada sem revelar a lista; B conserva acesso à sua própria manifestação. |
| A autorização de publicação deixa de ser vigente | O pedido deixa de admitir nova manifestação pelo acesso público obsoleto, conforme E4.1. Não inferir transferência ou perda de titularidade. |

**Execução futura.** Após aceite documental, identificação do checkout e autorização, comparar cobertura com E4.1, escrever apenas o cenário ausente e registrar o resultado inicial. Se passar, encerrar sem alteração de produção. Se falhar, descrever a divergência antes de autorizar correção. Usar apenas loopback isolado previamente preparado, credenciais sintéticas e gateway simulado. Não criar perfil de sucessor, alterar escopos, compartilhar credenciais ou usar serviço privilegiado para simular a leitura do usuário. Interromper em desvio de ambiente ou necessidade de novo mandato. Reversão: encerrar a sessão isolada e preservar o estado anterior do candidato. Nenhuma execução integra a RC2.
