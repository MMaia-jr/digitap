# G4 — contrato de continuidade decisória privada

## Fronteira existente

A revisão de ideia guarda texto e interpretação de proposta na versão atual. O serviço valida a forma estrita da interpretação, que permanece pendente de revisão e não verificada. Uma revisão manual pode deixar a interpretação revisada nula. A conversão exige a versão esperada da ideia de titularidade da sessão e registra a origem e a versão no evento editorial. O planejamento TAP08 tem versão própria, vínculo com a atividade e autorização privada.

Não há registro de domínio para decisões explícitas, histórico decisório ou fotografia decisória de origem consultável no acompanhamento. O evento de conversão usa uma justificativa restrita com identificador e versão, sem conteúdo decisório. O campo livre do log de auditoria não oferece integridade referencial ou revisão concorrente de decisões. Usar a interpretação ou o texto do plano para essa finalidade também confundiria sugestões, decisões e valores indicativos. A implementação requer autorização para evolução do schema.

## Comando humano

- Uma confirmação distinta e explícita sobre a ideia esperará sua versão atual. O servidor deriva o autor de uma sessão confirmada e exige titularidade atual. A primeira fatia usa a fronteira privada de ideias vigente.
- O comando proposto é action confirm-decisions, com id da ideia, expectedVersion e decisions. Cada decisão tem chave estável dentro da ideia, estado fechado e descrição humana. O servidor limita quantidade e conteúdo, recusa chaves repetidas e valida o estado. Autor, horário e nova versão são produzidos no servidor.
- Ausência de registro significa ausência de decisão. DEFINIDO registra uma escolha confirmada. PROVISÓRIO registra uma escolha expressamente sujeita a revisão. PENDENTE registra uma questão ainda aberta. EXCLUÍDO registra uma alternativa explicitamente descartada e conserva seu histórico.
- Sugestões, alterações de texto, planejamento, realização e anexos não são comandos de transição. Uma decisão exige confirmação humana nova para mudar de estado. Confirmar não cria compromisso, atividade, tarefa ou autorização de publicação. Uma próxima ação pode ser descrita pela pessoa, sem execução automática.
- A confirmação e a atualização da versão precisam ser atômicas. Versão obsoleta retorna 409 sem escrita. Leitura de terceiro continua negada, inclusive após revogação de eventual vínculo. A API de revisão atual continua independente do comando de confirmação.

## Extensão de persistência proposta para autorização

1. Registrar revisões privadas de decisões da ideia, chaves únicas por revisão, quatro estados controlados e autor/horário do servidor. A gravação participa da transação e da checagem de versão da ideia. Uma revisão textual mantém o conjunto decisório e uma confirmação preserva as versões anteriores.
2. Registrar uma fotografia privada das decisões na conversão da versão esperada, vinculada à atividade e ao seu sujeito com a integridade já adotada nos planos. A mesma transação cria a atividade, a fotografia e a proveniência. Repetir a chave idempotente reutiliza a mesma atividade e fotografia. O acompanhamento recupera a fotografia autorizada da atividade. Edição posterior da ideia não muda a fotografia. O recorte inicial de leitura exige titularidade da ideia de origem e acesso privado à atividade. A eventual edição decisória na atividade exige comando e versão próprios em outro incremento.
3. Manter escrita e leitura pelo servidor, com RLS e Data API fechadas para as novas relações privadas. Excluir o conteúdo dos DTOs públicos, snapshots editoriais, projeção E4 e prompts. Discutir a retenção da fotografia após exclusão da ideia antes de aprovar a migração. Sem migração, tentativa de escrita ou autorização implícita neste incremento.

## Critérios de aceite da futura persistência

- Confirmar e reabrir todos os quatro estados, com autoria e versão verificadas.
- Mudar de PROVISÓRIO para DEFINIDO por confirmação e preservar a revisão anterior; rejeitar confirmação concorrente obsoleta.
- Editar texto e remover interpretação sem alterar decisões confirmadas. Recusar decisão injetada em interpretação ou revisão.
- Converter a ideia revisada em atividade privada e reabrir a mesma fotografia no acompanhamento, junto ao plano, sem nova inferência. Alterar depois a ideia e verificar que a atividade conserva a versão de origem.
- Verificar idempotência, rollback atômico, isolamento entre titulares e ausência de publicação. Nenhuma sugestão, evidência ou realização deve virar estado decisório por efeito colateral.

O teste HTTP isolado mantém o RED da confirmação explícita na candidata, com três proteções existentes aprovadas. O teste físico G4 reabre um plano privado na mesma atividade convertida da ideia manualmente revisada, com Gateway simulado e sem nova inferência. Ele cobre a continuidade hoje disponível. A persistência decisória aguarda mudança autorizada de schema.

## Resultados e reprodução

- Contrato novo, 3 PASS e 1 RED esperado. A ação de confirmação retorna 400 na candidata.
- PostgreSQL G4 focal, 4/4. A atividade privada da ideia revisada versão 2 recebeu planejamento, que o titular recuperou. A leitura por terceiro foi negada. O teste conferiu a proveniência da conversão, repetição idempotente, ausência de autorização de publicação e limpeza restrita às fixtures.
- Componentes e contratos focais, 50/50. A realização retrospectiva e os anexos privados reaproveitam as evidências TAP08 já aprovadas em G5. Nenhuma inferência foi executada nesta rodada.
- Typecheck e diff aprovados. O contrato RED é executável com ./node_modules/.bin/vitest run --config operations/evidence/g4-continuidad-decisoria/vitest.config.mjs. O arquivo físico é tests/integration/g4-03-contextual-idea.database.test.ts com configuração vitest.database.config.ts e flags locais de fixture.

G2/G3 está encerrado com artefatos, contratos, recibos e aprendizados preservados. Os manifestos offline e reais foram conferidos. Graphiti permanece experimental. A candidata 6b010b6 segue preservada no Git.
