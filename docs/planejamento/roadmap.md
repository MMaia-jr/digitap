# Roadmap executivo • janelas de decisão propostas

Datas relativas a 20/11/2026. O horizonte 2035 expressa a ambição de tecnologia brasileira economicamente forte, soberania crescente e prosperidade compartilhada. As janelas não são compromissos de execução.

| ID | Horizonte | Objetivo | Motivação | Dependências | Entregável | Aceite | Risco | Reversão | Estado | Autoridade | Prioridade |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 | 0–30 dias | Aprovar leitura vigente | Mandato 20/11 | Pacote e divergências | Versão aceita ou ressalvas por ID | Conferir hashes e registrar decisão por documento | Confundir revisão com adoção | Conservar versão anterior | Decidido quanto à ordem | Proponente | Pré-requisito de qualquer desenvolvimento |
| C02 | Até 30/11, 23h59 Brasília | Decidir candidatura BNDES Criação | Edital 2026 e dossiê final | Conferir requisitos pessoais, representantes e disponibilidade | Decisão privada de concorrer ou arquivar | Registrar justificativa e fatos que sustentam estágio de validação | Declarar adoção inexistente | Arquivar sem envio | Proposto | Proponente | Janela externa fixa; independente da evolução técnica |
| C03 | 0–30 dias | Identificar candidato executável | Plano do beta 16/11 | Acesso autorizado somente leitura ao checkout local | Ficha com branch, SHA, alterações, migrations esperadas, origem e ambiente | Explicar diferenças com main e confirmar se os resultados de teste correspondem à base | Testar revisão errada | Manter execução suspensa | Bloqueado | Proponente e operador autorizado | Evita reaplicar correções ou testar produção |
| C04 | 0–30 dias | Preparar retomada pelo titular | E4.1 e D11 | C01,C03 e autorização específica | Contrato INC-01 e dados sintéticos | Aceite e limites definidos na especificação; registrar primeiro bloqueio | Confundir interesse com entrega | Encerrar demonstração local | Proposto | Proponente | Isola uma tarefa verificável |
| C05 | 0–30 dias | Conhecer custódia e condições para uso humano | SOB-01 e beta | Responsável legitimado | Mapa de contas, cópias, chaves, papéis, retenção e saída sem valores secretos | Identificar destino alternativo e quem autoriza; SMTP, TLS, acesso fechado e privacidade classificados | Expor dados ou segredos | Permanecer sintético | Proposto | Proponente e responsáveis efetivos | Bloqueia uso real sem garantia operacional |
| M01 | 1–6 meses | Verificar compreensão, acessibilidade e continuidade | VH-01–03, E4.1 | C04,C05; homologação e consentimentos específicos | Registro mínimo de tarefas, erros, ajuda, tempo e comparação com método anterior | PF nova responde; titular retoma o pedido em nova sessão; testar celular e acesso assistido; registrar decisão humana | Confundir ensaio com adoção | Suspender participação e atender retirada | Condicional | Proponente e participantes | Mede utilidade antes de ampliar |
| M02 | 1–6 meses | Observar demanda e custo por rede | D6 e INV-ECO-01 | M01 e autorização comercial independente | Planilha de suporte, gasto, horas, alternativa atual e evidência de pagamento ou recusa | Distinguir comprador privado/público, pessoa beneficiada, margem e subsídio do fundador | Projetar receita a partir de interesse | Reduzir escopo sem prender registros | Condicional | Proponente e eventual contratante | Testa financiamento antes de assumir suporte |
| M03 | 1–6 meses | Provar recuperação fora da origem | SOB-01 S1 | C05, custódia e operador substituto | Ensaio sintético em destino limpo | Medir tempo e perda; preservar IDs e negativas a terceiros, reaplicar revogação; conferir mídia separadamente | Backup incompleto | Descartar destino somente com autorização | Condicional | Operador com mandato | Requisito para prometer continuidade |
| L01 | 6–36 meses | Replicar em segunda rede do Brasil | Horizonte 13/11 | M01–03 | Segunda implantação por responsável diferente | Comparar margem, horas, retenção, saída e carga de suporte; repetir sem customização estrutural | Consultoria permanente | Descontinuar piloto com exportação | Condicional | Proponente e responsáveis locais | Prova replicabilidade |
| L02 | 6–36 meses | Formalizar proteção do comum e sucessão | D7–D8 | Titularidades apuradas e parceiros legítimos | Instrumentos de licença, custódia, remuneração e substituição deliberados | Simular venda do operador e saída do principal financiador; identificar direitos exigíveis | Captura pelo operador ou guardiã | Recusar instrumento antes da assinatura | Condicional | Titulares e representantes legitimados | Precede diluição ou transferência de ativos |
| L03 | 6–36 meses | Operar e trocar registros entre redes independentes | SOB-01 e Horizonte | L01–02, recuperação e demanda | Ensaio bilateral com pacote autorizado | Origem, versão, recusa, retirada e operação sem centro único demonstradas; custo e energia medidos | Replicação indevida | Retirar integração mantendo exportação | Condicional | Ambos os operadores | Infraestrutura própria só se justificar custo e responsabilidade |
| L04 | 6–36 meses e horizonte 2035 | Validar expansão internacional | Horizonte estratégico | Demanda externa, margem, suporte e tratamento legítimo de dados | Piloto localizado com parceiro autorizado | Demonstrar utilidade, manutenção local, financiamento e direito de saída em outra jurisdição | Confundir ambição com previsão | Encerrar piloto conforme contrato | Condicional | Proponente e operadores envolvidos | Escala global depende de repetibilidade real |

## Execução dos marcos C01–C05
Janelas indicativas. Responsáveis designam funções a confirmar pelo proponente.

| Tarefa e janela | Dependência | Função responsável | Entrega e aceite | Bloqueio |
|---|---|---|---|---|
| C01a · dias 0–2 · conferir versão | ZIP RC2 | Revisor documental | Conferir manifesto, matriz e base indicados no índice | Arquivo divergente |
| C01b · dias 0–4 · deliberar adoção | C01a | Proponente | Registrar versão, data, documentos aceitos e eventuais ressalvas por ID | Falta de aceite |
| C02a · até 30/11 · conferir candidatura | Independente de C01 | Proponente | Conferir requisitos e disponibilidade no edital já identificado | Falta de informação pessoal |
| C02b · até o prazo oficial · decidir | C02a | Proponente | Registrar concorrer ou arquivar; envio exige decisão separada | Prazo expirado ou ausência de decisão |
| C03a · dias 1–10 · identificar checkout | Acesso autorizado de leitura | Operador local | Registrar branch, SHA, árvore limpa ou alterações, sem segredos | Checkout indisponível |
| C03b · dias 2–12 · confrontar evidência | C03a | Revisor técnico | Relacionar candidato com main e resultados locais datados; classificar o que não é reproduzível | Revisão ou ambiente incerto |
| C04a · dias 5–20 · delimitar teste | C01b e C03b | Responsável pelos testes | Mapear cada linha de INC-01 à cobertura existente ou lacuna | Base incompatível com ownedActivity |
| C04b · dias 7–30 · liberar ou suspender ensaio | C04a | Proponente e operador | Registrar autorização isolada, destino e limites; suspender em falha de preflight | Ausência de autorização ou de stack isolada |
| C05a · dias 3–20 · inventariar custódia | Mandato para leitura | Custodiante autorizado | Identificar titular e substituto por função, destino da cópia e data conhecida, sem valores de chaves | Mandato ou cópia não identificados |
| C05b · dias 10–30 · classificar prontidão | C05a | Responsável operacional e proponente | Registrar SMTP, TLS, privacidade, controle de acesso e restauração como comprovados ou pendentes | Pendência impede etapa com pessoas reais |

## Fila técnica separada

1. C03 é verificação documental de ambiente, sem intervenção.
2. INC-01 é o único candidato a implementação. Inicia por teste após autorização.
3. M03 é uma prova operacional futura com autorização própria. Outros defeitos entram individualmente pela evidência de M01, com cenário RED, correção mínima e regressão. E5, federação e motor REL-01 não integram esta fila.
