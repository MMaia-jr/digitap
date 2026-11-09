# Design de produto — 07/11/2026

Base: aeb52f1. Sem commit.

## Entrega

Home com hero ilustrado em SVG/CSS, identidade verde-floresta/creme/terra, grid de cards, capas gráficas locais e monogramas, calendário, organizador e Ver Detalhes. Estado vazio com ilustração e frase solicitada. Layout responsivo e foco por teclado preservados, com preferência por movimento reduzido.

Página pública de atividade com capa grande, descrição, data, orientação de acesso, estado da programação, link do organizador e botão Vou Participar desabilitado com mensagem de disponibilidade futura. Registros e evidências continuam no corpo da atividade, sob as consultas públicas já existentes.

Perfil público resolve sujeito PF/coletivo/organização e aceita o identificador organizacional legado usado em snapshots v1. Lista publicações pelo sujeito canônico sem o limite de 100 da home, reutilizando as verificações de snapshot, hash e autorização. Não expõe rascunhos nem informações privadas de conta. Perfil sem publicações só é acessível ao titular autenticado e autorizado.

Editar Perfil aparece somente para titular com vínculo atual/ativo e escopo editar. PF e organização têm edição inline do nome público por Server Action que revalida identidade, conta, vínculo e escopo dentro da transação. Nome organizacional é mantido coerente com a referência legada. Nomes de coletivos continuam sujeitos à revisão, sem liberação automática. Snapshots históricos não são reescritos. Não houve alteração de dados reais durante esta tarefa.

Dashboard PF e organizacional ganharam acesso à vitrine; versões públicas continuam com links para a atividade. Header recebeu marca arredondada, ícone de folha e navegação Explorar.

## Verificação solicitada

- npm run build: exit 0; compilação e TypeScript concluídos, incluindo /atividade/[id] e /perfil/[id]. Saída bruta em build.log.
- Um único E2E (DESIGN-01): exit 0, 1 PASS, 0 FAIL, 0 SKIP. Home → Ver Detalhes → Atividade → Perfil. Confirma também Vou Participar desabilitado, edição ausente para visitante e presente para titular, três publicações no perfil e ausência de rolagem horizontal em 390px.
- Sem execução ou criação de testes unitários para componentes visuais. Sem regressão completa nesta etapa, conforme solicitado.
- Servidor temporário explicitamente autorizado, iniciado somente para o E2E e encerrado em finally. Porta 3215 confirmada fechada ao final. Nenhum servidor deixado rodando.
- Fixtures criadas e publicadas por APIs reais existentes e removidas ao fim pelos próprios IDs. Nenhuma atividade fictícia foi deixada publicada.
- git diff --check: exit 0. next-env.d.ts sem diff final.

## Capturas

home.png, atividade.png, perfil.png, home-vazia.png (quando aplicável), home-mobile.png e perfil-mobile.png. Todas usam dados fictícios. Home, atividade e perfil desktop e home mobile inspecionados visualmente. Capas são ilustrações decorativas locais, não fotos dos encontros.
