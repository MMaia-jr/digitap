# Saneamento Git — revalidação local P0

Base inicial: main em fda9da280d8c2902cd172f7490b752ba3e485d66.
Manifesto inicial e hashes em initial-state.json. Não foram lidos arquivos .env.
Commit de higiene anterior: 432eecf; .DS_Store foi retirado somente do índice.

## Resultados reproduzidos antes do commit P0

- Testes específicos: 81 PASS, 0 FAIL, 0 SKIP; exit 0.
- npm run typecheck -- --incremental false: exit 0.
- npm run build: exit 0.

Comandos e hashes dos outputs originais constam em validation.json. Os logs/JSONs
brutos anteriores e desta execução permanecem locais e ignorados; não foram apagados
ou reescritos. Os relatórios RED/GREEN originais foram mantidos integralmente.
Os hashes registrados permitem conferir os arquivos locais sem publicar seus caminhos
pessoais absolutos ou conteúdo bruto. Valores de testes são sintéticos.

## Limites e sequência

As três alterações P0 de produção foram preservadas sem nova correção. Nenhum teste
novo foi criado neste saneamento. Não houve banco real, migration, Cloud, configuração
remota, instalação ou deploy. Build e mocks não validam DNS, certificado/handshake TLS,
RLS efetivo, OAuth Cloud, entrega de e-mail ou implantação. P0 não está liberado para
deploy por estes resultados.

A regressão geral será executada depois de guardar REL-01 no ramo isolado. Este
registro pertence à etapa anterior àquele isolamento e não antecipa seu resultado.
Os resultados finais, SHAs e arquivos de cada commit serão apresentados na entrega;
outputs finais brutos permanecerão locais em arquivos *.log e *.raw.json nesta pasta.

A documentação recebe notas datadas, preservando snapshots, Norte e contrato REL-01.
Apenas testes/fixtures/configuração e relatório REL-01 seguem para o ramo WIP.

## Aceite e rollback

Aceite local P0: resultados específicos, TypeScript e build aprovados, staged restrito
à matriz, sem material bruto sensível. Aceite de release e I5 continuam pendentes.
Rollback futuro por git revert de cada commit, se autorizado; não foi executado.
Reverter o commit P0 reintroduz restrição local e cookies sem Secure em produção.
Reverter higiene volta a rastrear metadado antigo, sem benefício operacional.
O ramo REL-01 não deve ser integrado ao main sem decisão específica.
