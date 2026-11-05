# Nota de revisão vigente — 04/11/2026

**Fonte preservada:** `📘-06-—-PRIVACIDADE-E-DADOS-Projeto-A-Praça.txt` (Project Files). **Natureza:** atualização de escopo e leitura, com seções exploratórias antigas preservadas para rastreabilidade. **Não é** autorização de publicação, DDL, migração, alteração de RLS/código, consulta ao Git local ou constituição institucional. I3 concluído em 05/11/2026 (commit 623ee50, 20/20 cenários B+C PASS); I4 especificado, não implementado; I5 não iniciado.

## Revisão vigente: atores, finalidades e limites de exposição

A coleta descrita abaixo para o candidato histórico “Água & Cheias” não é o inventário de tratamento do software v1.5/I4. Antes de usar dados reais, manter um **registro de operações de tratamento** por finalidade e confirmar fundamento jurídico, prazos, destinatários, retenção e canal de titulares. Este documento é proposta técnica, não política já publicada nem parecer jurídico. Não presumir nomeação de DPO/encarregado ou consentimento como fundamento universal.

| Contexto | Dados necessários em princípio | Exposição pública | Retenção/exclusão |
|---|---|---|---|
| PF | Conta autenticada, identidade de usuário interno, nome de exibição opcional | Apenas campos aprovados no snapshot, sem conta/contato/identidade civil | Política a definir e testar |
| Coletivo | Nome público curado, vínculo de representante, versão | Nome do coletivo aprovado; nunca membros/atestantes por padrão | Evento de revogação auditável e minimizado |
| Atestações | Contas distintas, escopo, versão, status e data | Nunca individualmente, salvo base/ato específico | Revogação não apaga automaticamente prova de decisão; prazos a definir |
| Curadoria e denúncias | Protocolo, motivo restrito, decisão e conta editorial | Não divulgar identidade de denunciante ou conteúdo bruto | Revisão LGPD, acesso por necessidade e contestação |
| Atividade/realização | Rascunho privado, autorização, snapshot, registro, evidência | Somente versão explicitamente aprovada e projeção mínima | Preservar distinção registro/evidência/reputação e direitos de titulares |

**D1–D4:** duas atestações não provam identidade civil nem veracidade; reputação/histórico editorial não equivale a consentimento para expor PII. Curadoria por risco deve usar dados minimizados; denúncia abre nova análise, não publicação automática da denúncia. Revogação de atestação bloqueia representação, não desencadeia exclusão silenciosa de histórico.

**Correção jurídica da leitura histórica:** dados agregados efetivamente anônimos não são automaticamente tratamento de dados pessoais que exija “legítimo interesse”; quando ainda identificáveis, a base legal deve ser determinada por finalidade e categoria de dados, inclusive eventuais dados sensíveis. Consentimento não deve ser imposto como fundamento único. Verificar bases, transferência internacional e obrigações do controlador antes da operação real. O eventual regime de dispensa de encarregado não elimina canal de atendimento nem segurança.

**Estado:** sem autorização de usar dados reais ou publicar política em nome da Praça; governança institucional e política de privacidade operacional evoluem em paralelo, com aprovação humana expressa.

---

📘 06 — PRIVACIDADE E DADOS: Projeto A Praça
Documento de política de dados, proteção de pessoas e transparência
Versão 1.1 · 04/11/2026 · Status: proposta em revisão; ainda não é política pública vigente

1. Instruções para o agente (leia primeiro)
Este documento existe porque A Praça vai coletar relatos de pessoas reais sobre problemas que afetam suas vidas — vazamento de esgoto na porta de casa, falta d'água, risco de cheia, problemas de saúde. Esses relatos podem expor pessoas a risco de retaliação, constrangimento, discriminação ou violência. A proteção de dados não é burocracia: é condição de confiança.

Regras para você, agente:

Não trate este documento como parecer jurídico. Ele é proposta de política, a ser validada por advogado antes de ser publicada.

Não presuma que o MVP pode coletar qualquer dado. A regra é minimização: coletar o mínimo necessário, pelo menor tempo necessário.

Não confunda transparência do conhecimento com exposição das pessoas. A Praça publica o resultado da verificação, não o dado bruto.

Não confunda assinatura gov.br com autenticação de usuário nem com prova de verdade. São camadas distintas.

Não trate o Google Forms/Sheets como neutro. Ele é um operador estrangeiro (LGPD, transferência internacional). Isso precisa ser reconhecido e mitigado.

Não crie regra que impeça participação de pessoas sem celular, sem internet ou sem conta gov.br.

2. O problema que este documento resolve
O candidato histórico de MVP “Água & Cheias” previa coletar (NÃO significa coleta atual):

Nome (opcional)

Contato (opcional, para retorno)

Bairro

Tipo de problema (vazamento, falta d'água, esgoto, cheia)

Foto (opcional)

Localização (texto ou GPS)

Descrição

Cada um desses campos tem risco. Uma foto de esgoto na porta de casa pode revelar a residência de uma pessoa. Um nome associado a uma denúncia de vazamento pode expor um morador a retaliação. Uma descrição de problema de saúde pode revelar condição sensível. Sem regras claras, o MVP pode gerar dano antes de gerar confiança.

Este documento define:

O que coletar (minimização)

Como coletar (consentimento)

O que publicar (transparência sem exposição)

O que guardar (retenção)

Como proteger (segurança)

Como corrigir (direitos do titular)

O que fazer em caso de incidente

3. Os princípios de dados de A Praça
A política de dados se organiza em sete princípios, alinhados à LGPD (Lei 13.709/2018) e aos princípios do documento 01.

Princípio	O que significa na prática
1. Minimização	Coletar apenas o dado necessário para a finalidade. Nome e contato são opcionais; foto é opcional; GPS é opcional.
2. Finalidade explícita	Todo dado tem finalidade declarada antes da coleta. Nada é coletado "para o futuro".
3. Consentimento informado	O titular sabe o que está sendo coletado, por quê, por quanto tempo e com quem será compartilhado. Pode recusar sem prejuízo.
4. Transparência do resultado, não do dado bruto	A Praça publica o resultado da verificação (ex: "10 relatos de vazamento no bairro X, 3 verificados"), não o dado pessoal bruto.
5. Segurança por padrão	Acesso restrito a quem precisa; 2FA nas contas; backup; registro de acesso.
6. Direito de correção e contestação	Qualquer pessoa pode pedir correção, contestação ou exclusão do seu dado.
7. Proteção de vulneráveis	Dados de saúde, localização de residência e relatos que possam expor pessoas vulneráveis têm proteção reforçada.
4. A base legal (LGPD): o que permite coletar
A LGPD exige base legal para tratar dados pessoais. Para A Praça, as bases aplicáveis são:

Base legal	Quando se aplica	Observação
Consentimento (art. 7º, I)	Coleta de nome, contato, foto, localização precisa	Deve ser livre, informado, específico e revogável
Legítimo interesse (art. 7º, IX)	Dados agregados para transparência pública	Exige teste de balanceamento; não vale para dados sensíveis
Execução de políticas públicas (art. 7º, III)	Não se aplica — A Praça não é poder público	Não usar essa base
Proteção da vida (art. 7º, VII)	Situações de risco iminente (ex: cheia)	Uso excepcional, com registro
Dados sensíveis (art. 5º, II): saúde, biometria, origem racial, religião, opinião política, vida sexual. A Praça não deve coletar dados sensíveis no MVP. Se um relato mencionar saúde, deve ser tratado com cuidado: não publicar, não associar a nome, não usar para verificação pública.

Regra original da fase exploratória (SUPERADA COMO REGRA GERAL): não aplicar automaticamente consentimento para toda PII nem legítimo interesse a dados anônimos. Determinar bases legais por finalidade, titularidade e categoria de dado, com revisão jurídica antes da coleta real.

5. O que coletar (e o que NÃO coletar)
5.1. Campos do formulário de ÁGUA & CHEIAS — PLANO HISTÓRICO
Campo	Obrigatório?	Base legal	Risco	Mitigação
Nome	Não	Consentimento	Exposição a retaliação	Opcional; não publicado
Contato (telefone/e-mail)	Não	Consentimento	Spam, exposição	Opcional; acesso restrito; não publicado
Bairro	Sim	Legítimo interesse (agregado)	Baixo	Publicado apenas agregado
Tipo de problema	Sim	Legítimo interesse (agregado)	Baixo	Publicado agregado
Foto	Não	Consentimento	Rosto de pessoas, residência	Publicada só com consentimento explícito; rostos desfocados
Localização (texto)	Sim	Legítimo interesse (agregado)	Identificação de residência	Publicada apenas como ponto aproximado (raio de 100m)
GPS	Não	Consentimento	Identificação precisa	Arredondado para 3 casas decimais (~100m)
Descrição	Sim	Legítimo interesse (agregado)	Pode conter dado sensível	Triagem antes de publicar; remoção de dados pessoais
5.2. O que NÃO coletar no MVP
CPF (não é necessário para registrar problema)

RG, data de nascimento, endereço completo

Dados de saúde (se o problema for de saúde, orientar a procurar o serviço; não registrar no mural)

Filiação política, religião, orientação sexual

Dados biométricos

Localização em tempo real (só ponto do problema, não do relator)

Fotos de pessoas identificáveis (se houver, desfocar antes de publicar)

6. O consentimento (como pedir, como registrar)
O consentimento precisa ser livre, informado, específico e revogável. Na prática:

6.1. Texto do consentimento (modelo)
No início do formulário, antes de qualquer campo:

"A Praça coleta estes dados para registrar problemas de água, esgoto e cheias em Itaperuna e encaminhar aos órgãos competentes. Você pode participar sem informar nome ou contato. Se informar, seus dados não serão publicados; apenas o resultado agregado será divulgado. Você pode pedir correção ou exclusão a qualquer momento pelo e-mail [contato]. Ao enviar, você concorda com o uso dos dados para esta finalidade. Saiba mais: [link da política completa]."

6.2. Consentimentos separados
Se a pessoa quiser que a foto seja publicada, precisa de consentimento específico:

"[ ] Autorizo a publicação da minha foto no mapa público. Estou ciente de que ela será visível a qualquer pessoa."

Se a pessoa quiser ser contatada para acompanhamento, precisa de consentimento específico:

"[ ] Autorizo que a equipe da Praça entre em contato comigo para acompanhar o problema."

6.3. Registro do consentimento
O formulário registra data e hora do consentimento.

O consentimento é revogável a qualquer momento (e-mail ou WhatsApp).

A revogação é registrada e o dado é excluído ou anonimizado em até 30 dias.

7. O que publicar (transparência sem exposição)
A regra de ouro: publicar o resultado da verificação, não o dado bruto.

7.1. O que PODE ser publicado
Dado	Formato	Exemplo
Número de relatos por bairro	Agregado	"Bairro Fiteiro: 12 relatos de vazamento"
Número de relatos por tipo	Agregado	"Itaperuna: 45 relatos de vazamento, 20 de falta d'água"
Status agregado	Agregado	"30 verificados, 10 encaminhados, 3 resolvidos"
Mapa de pontos	Ponto aproximado (raio de 100m)	Mapa com círculos, não com endereços exatos
Relato descaracterizado	Texto sem dados pessoais	"Moradores relatam vazamento há 5 dias na região central"
Resultado de verificação	Status	"Relato verificado com base em SINISA e observação local"
7.2. O que NÃO pode ser publicado
Dado	Por quê	Alternativa
Nome do relator	Exposição a retaliação	Publicar apenas "relato de morador"
Contato (telefone/e-mail)	Spam, exposição	Acesso restrito à equipe
Endereço completo	Identificação de residência	Publicar apenas bairro ou ponto aproximado
Foto com rosto identificável	Exposição de pessoas	Desfocar rostos antes de publicar
GPS preciso	Identificação de residência	Arredondar para ~100m
Dado de saúde	Dado sensível (LGPD)	Não coletar; orientar a procurar serviço
Relato que identifique vulnerável	Risco de violência	Triagem antes de publicar; anonimizar
7.3. O que fazer com o PDF assinado (se houver)
Se um cidadão assinar um documento via gov.br e enviar à Praça:

O PDF original fica em acesso restrito (apenas equipe de verificação).

O resultado da validação (VALIDAR: aprovado/reprovado/indeterminado) é registrado e pode ser publicado.

O conteúdo é publicado apenas de forma descaracterizada, se autorizado.

O PDF não é publicado automaticamente.

8. A retenção (por quanto tempo guardar)
Tipo de dado	Prazo de retenção	Justificativa
Relato de problema (dado pessoal)	Até 2 anos após resolução ou arquivamento	Permitir contestação e histórico
Dado agregado (sem dado pessoal)	Permanente	Memória pública da cidade
PDF assinado	Até 2 anos após validação	Comprovação de autoria
Resultado de validação	Permanente (sem dado pessoal)	Auditoria
Contato do relator	Até 1 ano após resolução, ou até revogação	Acompanhamento
Foto original	Até 2 anos após publicação, ou até revogação	Comprovação
Registro de consentimento	Enquanto o dado existir + 5 anos	Comprovação legal
Regra: ao final do prazo, o dado é excluído ou anonimizado (perde a vinculação com a pessoa). A exclusão é registrada.

9. A segurança (como proteger)
9.1. Medidas técnicas mínimas
Medida	Como implementar no MVP
Acesso restrito	Apenas 3 a 5 pessoas têm acesso à planilha e ao Drive
2FA nas contas	Google Accounts com verificação em duas etapas
Senhas fortes	Gerenciador de senhas (Bitwarden gratuito)
Backup	Cópia semanal da planilha em outro local
Registro de acesso	Log de quem acessou a planilha (Google Sheets tem histórico)
Criptografia em trânsito	HTTPS (padrão do Google)
Criptografia em repouso	Google Drive já criptografa; para dados sensíveis, criptografar arquivo antes de subir
9.2. Medidas administrativas
Política de acesso: só acessa quem precisa, pelo tempo necessário.

Termo de confidencialidade: voluntários que acessam dados assinam termo simples.

Treinamento: equipe sabe o que pode e não pode fazer com dados.

Incidente: qualquer suspeita de vazamento é reportada imediatamente ao responsável.

9.3. O risco do Google Forms/Sheets (operador estrangeiro)
O Google é uma empresa estrangeira. O uso do Forms/Sheets envolve transferência internacional de dados, o que a LGPD regula (art. 33). Para o MVP, isso é aceitável se:

Houver consentimento informado (a pessoa sabe que os dados vão para o Google).

Houver minimização (não coletar dado sensível no Forms).

Houver alternativa para quem não quiser usar o Google (ex: relato por WhatsApp, que também é estrangeiro, ou por telefone/presencial).

Houver plano de migração para provedor brasileiro quando o projeto justificar.

Regra: o Google é solução temporária do MVP, não arquitetura definitiva. A política deve declarar isso.

10. Os direitos do titular (o que a pessoa pode pedir)
Qualquer pessoa cujo dado foi coletado pode pedir:

Direito	Como exercer	Prazo de resposta
Confirmação de que o dado existe	E-mail ou WhatsApp	15 dias
Acesso ao dado	E-mail ou WhatsApp	15 dias
Correção de dado incorreto	E-mail ou WhatsApp	15 dias
Anonimização, bloqueio ou eliminação	E-mail ou WhatsApp	30 dias
Portabilidade (receber o dado em formato aberto)	E-mail	15 dias
Eliminação de dado coletado com consentimento	E-mail ou WhatsApp	30 dias
Revogação do consentimento	E-mail ou WhatsApp	Imediata (dado excluído ou anonimizado em 30 dias)
Oposição a tratamento	E-mail ou WhatsApp	30 dias
Informação sobre compartilhamento	E-mail	15 dias
Canal: a Praça deve ter um e-mail e um número de WhatsApp dedicados a direitos do titular, divulgados no formulário e na política.

Registro: toda solicitação é registrada, com data, tipo, resposta e prazo.

11. A contestação e a correção (o que fazer quando alguém discorda)
A contestação é parte do coração de A Praça (documento 01, princípio 6). Ela se aplica também aos dados:

Contestação de relato: alguém discorda de um relato publicado (ex: "o vazamento já foi resolvido"). A contestação é registrada, verificada e respondida em até 30 dias.

Contestação de verificação: alguém discorda do status de verificação. A contestação é registrada, reavaliada pelo Comitê e respondida.

Correção de dado: alguém pede correção de dado pessoal. A correção é feita e registrada.

Regra: nenhuma contestação é arquivada sem resposta. A resposta pode ser "mantido", "alterado" ou "removido", com justificativa.

12. O incidente de segurança (o que fazer se algo der errado)
Se houver suspeita de vazamento, acesso indevido ou perda de dados:

Conter: revogar acessos, mudar senhas, isolar o dado afetado.

Registrar: data, hora, o que aconteceu, quem detectou, o que foi feito.

Avaliar: quais dados foram afetados, quantas pessoas, qual o risco.

Comunicar: se houver risco relevante, comunicar os titulares afetados e a ANPD (Autoridade Nacional de Proteção de Dados), conforme LGPD.

Corrigir: implementar medida para evitar recorrência.

Documentar: relatório público (sem dados pessoais) do incidente e das medidas.

Prazo: a comunicação à ANPD e aos titulares deve ser feita em prazo razoável (a LGPD fala em "prazo razoável", a ANPD orienta que seja o mais rápido possível).

13. A política de dados aberta (o que a Praça publica sobre si)
A Praça deve ter uma página pública de política de dados, com:

Quais dados coleta.

Por quê (finalidade).

Base legal.

Por quanto tempo guarda.

Com quem compartilha (Google, órgãos públicos, VALIDAR).

Como protege.

Como o titular exerce seus direitos.

Como contatar o responsável (encarregado de dados).

Data da última atualização.

Linguagem: simples, acessível, sem juridiquês. Se possível, em dois formatos: resumo (1 página) e completo.

14. O encarregado de dados (quem responde)
A LGPD prevê a figura do encarregado (DPO), responsável por:

Receber solicitações dos titulares.

Orientar a equipe sobre proteção de dados.

Comunicar incidentes.

Manter a política atualizada.

No MVP: uma pessoa da equipe assume a função (não precisa ser dedicada, mas precisa ser identificada). O contato do encarregado é público.

No futuro: se o projeto crescer, pode ser um cargo formal, com remuneração.

15. O que o candidato histórico de MVP precisava — REVALIDAR PARA SOFTWARE LOCAL
Necessidade	Solução no MVP	Custo
Consentimento informado	Texto no formulário + registro de data/hora	R$ 0
Minimização	Campos opcionais; sem CPF; sem dado sensível	R$ 0
Publicação segura	Agregado + ponto aproximado + descaracterização	R$ 0
Acesso restrito	3 a 5 pessoas com 2FA	R$ 0
Backup	Cópia semanal	R$ 0
Direitos do titular	E-mail + WhatsApp dedicados	R$ 0
Contestação	Grupo + planilha de registro	R$ 0
Política pública	Página simples (Google Docs ou post)	R$ 0
Encarregado	1 pessoa da equipe	R$ 0
Incidente	Procedimento documentado	R$ 0
Conclusão: o MVP é executável hoje, com custo zero, desde que as regras deste documento sejam seguidas. A sofisticação (criptografia própria, provedor brasileiro, DPO dedicado) vem depois, se e quando o projeto justificar.

16. O que o agente NÃO deve fazer
Não publicar PDF assinado automaticamente.

Não publicar nome, contato, endereço ou GPS preciso.

Não coletar CPF, dado de saúde ou dado sensível no MVP.

Não tratar assinatura como autenticação nem como prova de verdade.

Não ignorar a transferência internacional (Google).

Não arquivar contestação sem resposta.

Não reter dado além do prazo definido.

Não criar regra que impeça participação de quem não tem celular ou internet.

Não prometer anonimização que não foi feita.

Não tratar este documento como parecer jurídico; ele precisa de validação por advogado.

17. Perguntas abertas para decisão humana
Quem será o encarregado de dados no MVP?

Qual e-mail e WhatsApp serão usados para direitos do titular?

A Praça vai publicar a política de dados em página própria ou em post?

Qual o prazo de retenção para cada tipo de dado? (A tabela da seção 8 é sugestão.)

A Praça vai usar Google Forms/Sheets no MVP ou buscar alternativa brasileira desde já?

Como será feita a triagem de relatos que mencionem saúde?

Quem assina o termo de confidencialidade dos voluntários?

Qual o procedimento de incidente (quem comunica, em quanto tempo)?

A Praça vai consultar advogado antes de publicar a política?

A Praça vai publicar relatos descaracterizados ou apenas dados agregados?

18. A frase que resume este documento — HISTÓRICO DE PRIVACIDADE
"A Praça publica o resultado da verificação, não o dado bruto. Coleta o mínimo, pelo menor tempo, com consentimento claro, e protege quem confia. Transparência do conhecimento não exige exposição das pessoas. Se alguém pedir para sair, sai. Se alguém contestar, é respondido. Se algo der errado, é comunicado. A proteção de dados não é burocracia: é a condição para que a confiança exista."

Fim do documento 06. Status: proposta a ser decidida pelo coletivo, com validação jurídica antes de publicação.
