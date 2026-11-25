# QA-02 independente · Ideias · 25/11/2026

Base Git `8253ce7dcac69e902f99f41109c4d4050142814d` com correções locais de CAP-01, IA-01 e QA-01-A/B. Chromium com sandbox do navegador e viewport iPhone 13. Next local em desenvolvimento e Supabase/PostgreSQL reais isolados em loopback. A configuração local de Supabase aceita os endpoints de loopback no modo de desenvolvimento. Gateway simulado pelo preload existente.

| Perfil | Jornada | Resultado observado | Decisão |
| --- | --- | --- | --- |
| PF comum, fora da autorização de IA | Abrir Organizar uma ideia, verificar comunicação e retomar a ação possível | Explicação de elegibilidade visível. Ação Interpretar e opção de contexto ausentes. A ideia da titular autorizada não é apresentada. A chamada direta autenticada obtém 403 com categoria `interpretationAccess: beta`. O link manual abre o formulário padrão, a atividade é salva com a sessão comum e reaparece após recarga. PostgreSQL confirma rascunho sem versão publicada. | QA-01-A aprovada |
| PF comum inscrita no beta sintético | Interpretar com consentimento contextual, revisar, salvar, reabrir, tomar decisão, editar texto e retomar | Prévia assistida com uma única chamada simulada. Revisão manual e decisão privada recuperadas após recarga. Zero erros de página e zero avisos de chaves React duplicadas. | QA-01-B aprovada |

Gate independente focal aprovado com um cenário Chromium em 13,842 s. Nenhuma inferência real, escrita remota ou alteração nos Taps. O gate não reavalia TAP-UX-01 ou a qualidade das saídas reais do modelo.

## Reprodução e encerramento

- Executar `tests/e2e/qa-02-ideas.spec.mjs` com o mesmo contrato mock local e UUID v4 sintético nos processos de servidor e Playwright do QA-01. Usar o cache Chromium já instalado e validar a raiz e os destinos de loopback pelo harness.
- O provisionamento administrativo cria exclusivamente as contas sintéticas. As gravações de ideias, decisões e atividade passam pela interface e pelas permissões dos perfis comuns. A leitura PostgreSQL serve para verificar a persistência e o estado privado.
- A rodada verificou a remoção das duas contas criadas e executou cleanup por IDs próprios. O servidor iniciou e encerrou dentro da rodada e a porta 3215 deixou de ter listener. O preload contabilizou duas tentativas externas bloqueadas e uma chamada simulada.
- As capturas exibem somente fixtures sintéticas. Os registros contêm checkpoints, caminhos sem parâmetros, status HTTP e auditoria agregada do mock. Nenhum trace bruto, corpo de resposta, credencial ou cookie integra a evidência selecionada.
