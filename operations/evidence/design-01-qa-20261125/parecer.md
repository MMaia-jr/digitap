# DESIGN-01 · Parecer do QA independente

Referência canônica `docs/digitap/DIGITAP-referencia-visual-01.html`, SHA-256 `24d302e0dacc462e342df64bd5d27c2770b0a794cc70870fb1fe327f74212f76`. Conferi a cópia original em Downloads e a canônica. Capturei ambas as larguras com o mesmo Chromium 1248 e bloqueio completo das requisições no HTML de referência.

Candidata local sobre `3d909c4f4a262a05bc553480a9f12e959a4f8bb0` mais alterações não commitadas de DESIGN-01. Chromium com sandbox, 1440 e 390 pixels, Next local em desenvolvimento, Supabase, PostgreSQL e Storage isolados em loopback e dados sintéticos. APIs e permissões de produto exercitadas com sessões de usuários comuns. O Gateway só recebeu tráfego simulado pelo harness. Nenhuma consulta ou escrita na produção.

## Comparação visual

| Eixo | Observado |
| --- | --- |
| One Tap | Preserva o cartão verde-claro arredondado, seis escolhas em duas colunas, ícones de traço com fundos cromáticos e descoberta em faixa larga. O sistema usa a mesma família `system-ui`. O título ocupa 32 px no desktop e 26 px mobile, frente a 26 px na referência, para indicar uma página real em vez de uma amostra dentro de uma prancha. |
| Hierarquia e espaço | A referência mostra as três amostras lado a lado no desktop e as empilha no mobile. O aplicativo mantém o header, navega por telas reais e usa largura de trabalho própria, até 688 px no One Tap. No mobile, os textos quebram dentro da grade sem corte horizontal. O painel escuro fica depois dos seis cartões e da descoberta, como na referência. |
| Cores e legibilidade | One Tap conserva `#f4f7f5` na superfície e `#173e36` no painel de IA. Contrastes calculados para as cores declaradas no CSS, entre pares visíveis, incluem 11,11:1 no texto principal, 5,62:1 no texto secundário, 11,81:1 em branco no painel e 8,03:1 no CTA menta. Rótulos dos estados decisórios apresentam de 5,58:1 a 6,57:1. Esta medição cobre os elementos citados. |
| Continuidade e TAP08 | Os cartões exibem informações e estados reais e a retomada abre o planejamento existente. Os excluídos ficam sob disclosure. A seção escura de acompanhamento menciona prestação de contas e Aldir Blanc no texto explicativo. As linhas navegam para seções reais de decisão, planejamento, realização e evidências privadas. |
| Controles confiáveis | O painel de IA aparece só para PF autorizada. O quadro branco diz “Exemplo” e não se passa por um campo de texto. Começar abre o editor existente. Acompanhamento só aparece depois de uma atividade disponível. O desenho não inclui o seletor fictício por estágio de edital, certificado ou botão ilustrativo de copiar resumo. |

A primeira captura de viewport mostrou a borda do One Tap sob o cabeçalho global no iPhone. Após o ajuste focal do frontend, o Chromium mediu distância de 24 px em mobile e 17 px em desktop nas quatro variantes. A marca e a borda aparecem inteiras. O fundo externo e a barra global preservam a identidade existente do aplicativo, mais quente e mais escura que a moldura da prancha. Suprimi apenas o indicador de desenvolvimento do Next nas duas capturas de viewport `umtap-pf-beta-pagina-*`.

## Jornadas executadas

| Perfil e tarefa | Resultado |
| --- | --- |
| Autenticada sem perfil em `/meu-espaco` | Seis escolhas com títulos, descrições e destinos. Preparar atividade conduz às etapas PF e organização. Sem painel de IA ou atalho de retomada vazio. |
| PF comum no painel | Perfil aponta para seção real. Acionamento por Tab e Enter leva a capacidades com foco visível, contorno sólido. Descoberta abre a seção de atividades públicas e encontros. Sem IA. |
| Organização em `/dashboard` | Seis escolhas, âncora real do perfil e preparação com destino institucional existente. Sem IA. |
| PF autorizada no beta e continuidade | Começar abre âncora real do editor. Contexto E4, consentimento, prévia simulada, revisão e confirmação das quatro decisões no Chromium. Conversão agendada em atividade privada. A retomada reapresenta os estados ativos e permite expandir a alternativa excluída separadamente. |
| TAP08 em atividade PF | Navegação contextual tem alvos reais. Planejamento e realização privada persistiram após recarga. Anexo privado confirmou e foi recuperado com conteúdo idêntico pela titular. Outra PF não pôde obter o anexo nem visualizar a atividade ou decisão. A retomada do painel abriu diretamente o acompanhamento da atividade. |

O teste focal `tests/e2e/qa-design01-front-c.spec.mjs` passou em 56,681 s. A regressão E2E `tests/e2e/qa-01-private-journey.spec.mjs` passou em 25,458 s, incluindo o novo comportamento de sete caminhos antes de existir atividade e oito depois. O QA-02 independente anterior foi preservado. Este ensaio exercitou a autorização condicional e os caminhos diretamente afetados pelo design. Não houve nova inferência real.

O Gateway simulado registrou três chamadas na rodada, uma do teste focal e duas da regressão, incluindo falha simulada. Duas tentativas externas bloqueadas. Limpeza por IDs confirmada para as quatro fixtures focais e as duas da regressão. Bucket sintético removido e porta 3215 sem listener ao final.

## Defeito preexistente e limite de cobertura

Ao converter uma ideia e marcar “A atividade está acontecendo agora”, o formulário exibe “Pedido inválido”. O código existente mostra que o cliente envia `acontecendo_agora`, rejeitado pela lista de campos do serviço de conversão com HTTP 400, antes de persistir. Reproduzir em conta PF depois de salvar uma ideia, usar “Usar esta ideia para criar uma atividade”, preencher os campos e acionar a opção. O formulário e o contrato já estavam assim antes da alteração visual. A conversão agendada foi aprovada na rodada final. A opção retrospectiva na conversão não foi executada.

Os links do TAP08 e respectivos alvos foram comprovados. O recorte longo do acompanhamento mobile registra o cabeçalho global fixo dentro da imagem durante a captura de elemento. A geometria desse cabeçalho após o salto da âncora não foi medida. Os testes de teclado, foco, rótulos, contraste e largura são focais.

**Parecer.** DESIGN-01 aprovado para o escopo visual e os percursos exercitados. A falha preexistente de conversão em andamento permanece registrada como pendência funcional. O ensaio não equivale a homologação de publicação.

## Artefatos

- Referência integral em `referencia-desktop.png` e `referencia-mobile.png`.
- One Tap com o painel de IA em `umtap-pf-beta-desktop.png` e `umtap-pf-beta-mobile.png`. A composição com o cabeçalho real aparece em `umtap-pf-beta-pagina-desktop.png` e `umtap-pf-beta-pagina-mobile.png`.
- Continuidade em `continuidade-desktop.png` e `continuidade-mobile.png`.
- TAP08 em `acompanhamento-desktop.png` e `acompanhamento-mobile.png`.
- Reproduzir com o harness local G4 mock e um UUID v4 de PF sintética permitida. Usar um bucket novo `oss01d-private-design01-<id>` e o mesmo nome para servidor e runner. Manifesto acompanha artefatos sanitizados. Nenhum arquivo env, credencial, cookie, URL assinada ou trace bruto acompanha a entrega.
