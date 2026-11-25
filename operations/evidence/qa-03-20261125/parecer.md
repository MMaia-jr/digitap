# QA-03 independente

Checkpoint RED `b9e92b1b4a70d3dcb5ba63edb5d8741e63c672cd`. Chromium 1248 com sandbox, emulando iPhone 13 com viewport de 390 × 664 px. Next local em desenvolvimento, Supabase/PostgreSQL e Storage isolados em loopback. Gateway com transporte mock e egress bloqueado. Nenhum dado real ou inferência paga.

## RED observado

- Converter uma ideia privada com decisão e “A atividade está acontecendo agora” devolveu HTTP 400 e “Pedido inválido”. O formulário enviou o marcador do modo, rejeitado pelo contrato. Para medir navegação mesmo com essa falha, a fixture foi convertida pelo modo agendado existente. O registro de realização de geometria foi preprovisionado e pertence apenas à fixture.
- No acompanhamento, a barra termina em y=185. Na entrada e nos três retornos pelo histórico o título começa em y=194. Nos saltos internos, os títulos começaram em y=128 (decisões), y=182 (planejamento), y=159 (realização) e y=112 (evidências), parcialmente ou completamente sob a barra.
- “Voltar à área restrita” levou a PF titular para o painel institucional e exibiu “Acesso indisponível”.

O primeiro ensaio capturou a resposta 400, mas a leitura do corpo da conversão agendada perdeu o identificador DevTools durante a navegação. O ensaio RED concluído coletou o código sem depender da leitura do corpo de respostas exitosas. A tela de erro e todas as medidas são do Chromium, não inferidas do CSS.

## GREEN observado

- A conversão em andamento devolveu HTTP 200. O início persistido em ISO coincide com o instante enviado e com a janela entre clique e resposta. A declaração de horário da versão e a fotografia decisória permaneceram associadas à atividade. A atividade ficou como rascunho, sem versão publicada.
- Após anexo e recarga, a titular recuperou a realização, a decisão e os bytes originais do arquivo privado. Outra PF teve acesso negado com 403, e a API pública devolveu 404 para a atividade.
- Cabeçalho fora da área visível após salto. Os títulos ficaram completamente no viewport em oito de oito verificações. Coordenadas y de 82 para entrada e três retornos pelo histórico, 16 para decisões, 70 para planejamento, 46 para realização e 0 para evidências. O link de retorno terminou no painel da PF.
- Cada rodada concluída registrou uma chamada ao mock e duas tentativas externas bloqueadas. O RED deixou zero resíduos da conta, atividade e registro sintéticos. O GREEN verificou zero resíduos das duas contas, atividade e registro e confirmou a remoção do bucket dedicado e do objeto. Next encerrado, porta local 3215 liberada.

## Observações adicionais somente leitura

- Em uma sessão PF autenticada, “Cadastrar uma organização” abriu `/cadastro/organizacao`, com o título “Crie seu acesso”. Nenhum cadastro foi submetido.
- O código da Biblioteca gera links “Adaptar” para `/dashboard/pessoa-fisica/nova?modelo=...` sem considerar o perfil. A rota requer uma PF habilitada. A sessão exclusivamente institucional não foi exercitada nesta rodada.

**Parecer.** QA-03 aprovado para conversão em andamento, privacidade após recarga e navegação por âncoras a 390 px. As questões adicionais foram registradas. O ensaio mediu visibilidade geométrica, sem validar transferência de foco por hash ou outras larguras.

## Reprodução

Usar o harness local existente e o cache Chromium da worktree principal. Copiar os dois arquivos de roteiro deste diretório para `/private/tmp/digitap-qa-03/`. Executar `/bin/zsh /private/tmp/digitap-qa-03/runner.zsh red` no checkpoint RED e `/bin/zsh /private/tmp/digitap-qa-03/runner.zsh green` na árvore corrigida. O roteiro inicia e encerra o servidor local, configura uma credencial sintética de Gateway e gera somente dados locais. O manifest contém as capturas selecionadas e os resultados sanitizados.

## Complemento da Biblioteca

Verificação independente posterior com organização exclusivamente institucional, Chromium desktop a 1440 × 1000 e PostgreSQL local. A organização abriu o catálogo pelo One Tap e consultou 12 modelos. Os 12 controles “Adaptar” referenciam o aviso de perfil PF. O Playwright validou a descrição acessível no primeiro link. Ao acioná-lo, a rota PF apresentou “Acesso indisponível” sem formulário. As contagens de atividades, ideias e perfis PF da fixture permaneceram em zero. O aviso e a descrição informam a exigência antes do clique. O destino exibido ainda é a rota PF.

Limpeza confirmou zero resíduos da conta, organização e sujeito. Servidor encerrado, porta 3215 liberada e Gateway sem chamadas. Preservados apenas o resultado sanitizado e a captura do catálogo. O recorte da negativa foi excluído da entrega por incluir a identificação pública do operador no rodapé. Sem repetição das demais jornadas QA-03.
