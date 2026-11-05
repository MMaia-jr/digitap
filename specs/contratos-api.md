# Contratos — incremento 3, B05–B06

Atividades e revisão editorial têm rotas privadas neste recorte. Não há publicação, apoio, selos, indicadores ou administração de contas. As seções B01–B04 e B05–B06 abaixo complementam os contratos de autenticação.

## Fronteira comum

POST com Origin igual a APP_ORIGIN e Host compatível quando presente; Sec-Fetch-Site cross-site negado. JSON apenas, corpo de até 8192 bytes, validação de campos no servidor antes de inicializar o SDK. Respostas privadas/no-store; sem senha, token ou detalhes internos em JSON de erro. A UI não recebe chaves de serviço nem usa Supabase diretamente no navegador. O runtime recusa URLs fora dos endpoints locais autorizados (app 127.0.0.1:3215, Supabase 127.0.0.1:56151).

| Rota | Entrada permitida | Comportamento |
|---|---|---|
| POST /api/auth/cadastro | email, password | Auth signup sem metadata de papel; resposta genérica para novo/duplicado; sessão inesperada é encerrada. Não cria organização. |
| POST /api/auth/login | email, password | Auth signInWithPassword; e-mail confirmado e sessão obrigatórios; relê conta ativa. Sem vínculo conduz a /dashboard/organizacao; organização vai a /dashboard e editor/admin ativo do banco a /admin/atividades. Conta bloqueada/desativada ou papel desconhecido nega acesso e limpa sessão. Falhas de transporte/provider e identidade vazia também negam acesso e limpam eventual sessão parcial. |
| POST /api/auth/sair | objeto vazio | signOut com scope local; cookies próprios removidos também em falha do provider ou de inicialização do SDK, após validar origem e payload; não se declara revogação remota quando o provider falha. Não toca em cookies de outros projetos. |
| POST /api/auth/recuperar | email | resetPasswordForEmail; resposta genérica para conta inexistente/elegível. 429 preservado. |
| POST /api/auth/confirmar | token_hash | verifyOtp de signup; somente confirmação com sessão e identidade não vazia confirmada permite onboarding; falhas limpam eventual sessão parcial. |
| POST /api/auth/redefinir | token_hash, password | verifyOtp de recovery antes de updateUser; encerra sessão temporária no finally. Uma falha após consumir o token exige novo link. |
| POST /api/organizacoes | nome_publico, canal_publico opcional | getUser verificado e e-mail confirmado; identidade derivada no servidor. Se já há conta própria organizacional ativa, retoma o vínculo por leitura, sem repetir escrita. Na ausência de vínculo, chama a RPC service-only existente para criar organização pendente + conta organizacional em transação. Nunca aceita auth_user_id, papel ou organizacao_id do cliente. |

Erros: 400 payload/JSON, 401 autenticação, 403 origem/permissão, 413 limite de corpo, 415 conteúdo, 422 validação/token, 429 limitação do provider, 503 serviço/configuração. Não há redirecionamento fornecido pelo usuário; destinos são fixos e também validados pela UI.

Campos: e-mail normalizado, máximo 254; senha 12–128 caracteres sem trim; nome 2–160, normalização NFC; canal opcional URL http/https sem credenciais, máximo 2048. Não se consulta a URL fornecida, não há upload nem publicação automática.

## Confirmação e recuperação

GET /auth/confirm com token_hash e type=signup ou recovery apenas apresenta o formulário e **não consome OTP**. A verificação ocorre no POST após ação explícita. O token próprio é enviado somente ao endpoint correspondente; a URL é limpa após hidratação. Referrer-Policy no-referrer, noindex e cache privado; logging de URLs de entrada desativado. Os templates locais usam .SiteURL e .TokenHash e foram exercitados com Mailpit local no incremento 2C e nas regressões.

Tokens de confirmação não são usados como autorização de recuperação: o tipo é escolhido pelo endpoint no servidor. Expiração e uso único dependem do provider: consumo/replay foram exercitados no provider real, e expiração foi validada com datas controladas somente nas fixtures, conforme ressalva A08.

## SSR e isolamento

Cookies ap-auth e seus chunks são HttpOnly, SameSite=Lax e Path=/. Secure=false é restrito por configuração a HTTP loopback; este runtime não aceita ambiente remoto. O proxy renova sessão para páginas de dashboard; a autorização permanece no servidor, por Auth.getUser e papel/estado do banco. Sem cache de autorização entre requisições e sem user_metadata/e-mail como fonte de papel. O cliente administrativo é separado e não recebe cookies de usuário.

O dashboard lê somente id/nome/estado da organização vinculada à identidade verificada. IDs do cliente não selecionam o tenant. Org suspensa e conta sem papel organizacional ativo são negadas. A fila /admin/atividades exige editor/admin ativo; o caminho base /admin continua 404. A autorização editorial é refeita no servidor em cada operação.

## Idempotência e falhas parciais

Não existe transação distribuída entre Auth e Postgres. A identidade confirmada pode existir sem conta_acesso: essa condição permite repetir o onboarding, nunca eleva privilégios. Não apagar automaticamente identidade quando o vínculo falha.

A função criar_organizacao_pendente(uuid,text,text) é SECURITY INVOKER com search_path fechado e EXECUTE somente de service_role. O backend é responsável por fornecer apenas o id retornado por getUser confirmado. A função serializa por auth_user_id com advisory lock transacional; verifica conta existente e estado/papel; inserts de organização e conta são atômicos. FK exige usuário existente no Auth. Retry primeiro relê conta e valida identidade/papel/situação; se o vínculo já existe, o backend retorna sem chamar a RPC. Pedidos concorrentes que ainda não enxerguem vínculo continuam dependendo do lock/índice único da RPC, sem renomear ou promover conta. Contas editor/admin/bloqueadas não são convertidas por esse fluxo. Mesmo nome em identidades diferentes não prova que representam a mesma instituição e não é automaticamente mesclado.

A migração de onboarding foi posteriormente aplicada somente no banco local autorizado; 89 testes de integração passaram e A01–A09 receberam validação real no incremento 2C, com ressalvas na matriz. As nove tabelas continuam deny-by-default; não abrir grants/policies de clientes para contornar o onboarding. Ver operations/incremento-2c.md e operations/isolamento-rede-20261104.md.

## Incremento 3 — contrato B01–B04 (antes da implementação)

API de atividades é exclusivamente privada neste recorte. POST /api/atividades cria rascunho completo; GET lista somente o tenant do servidor. GET /api/atividades/[id] permite proprietário e editor/admin explícitos ativos; outro tenant recebe 404. PATCH /api/atividades/[id] aceita os campos de conteúdo e versao_esperada somente em rascunho. POST /api/atividades/[id]/enviar aceita apenas versao_esperada: rascunho → enviada, sem publicação. Sem sessão: 401; conta/papel bloqueado: 403; conflito: 409; inválido: 400/422; respostas no-store.

Campos: titulo 3–180, descricao 10–5000, inicio_previsto ISO com fuso explícito e futuro, orientacao_acesso 3–600, referencia_oficial opcional http/https sem credenciais até 2048. Sem HTML. O schema exige esses mínimos já no INSERT do rascunho; não há persistência de formulário incompleto. Corpo continua limitado a 8192 bytes. Datas do formulário interpretadas explicitamente em America/Sao_Paulo via Intl; sem fuso implícito da máquina.

IDs de organização/autor, estados e snapshots nunca vêm do cliente. versao_submetida é a revisão privada corrente: começa em 1 e incrementa em cada PATCH; envio preserva esse número. numero_versao_publicada/versao_publicada/publicada_em permanecem nulos, apoios_abertos=false. Duas edições da mesma versão conflitam; retry do envio da mesma revisão enviada é idempotente, sem novo evento. Outros estados/versões dão 409.

Auth.getUser fora da transação; conta/papel/situação/organização relidos e bloqueados dentro dela. Envios e eventos_editoriais usam a mesma conexão pg com BEGIN/COMMIT/ROLLBACK. Não usar chamadas HTTP separadas como transação. Conexão server-only aceita só o banco local 127.0.0.1:56152; segredo SUPABASE_DB_URL nunca público. Sem nova migração/RPC/grant. Editor lê detalhe conhecido, sem edição, envio ou interface de revisão.

Fonte técnica: https://node-postgres.com/features/transactions (todas as instruções de uma transação devem usar a mesma instância de client). Não há rota pública de atividade, revisão, aprovação ou publicação neste recorte.

## Incremento 3 — contrato B05–B06 (definido antes da implementação)

POST /api/admin/atividades/[id]/revisar: sessão verificada e editor/administrador ativo relido no banco. Organização e visitante não revisam. Body restrito: acao (iniciar/aprovar/devolver/rejeitar), versao_esperada, estado_esperado (enviada/em_revisao), pedido_id UUID. Aprovar exige autorizacao_id; devolver/rejeitar exigem motivo textual 10–1500, sem HTML. Campos extras de papel/snapshot/autor são rejeitados. Sem senha ou comprovação de autorização em respostas.

Transições: enviada → em_revisao; em_revisao → aprovada; enviada ou em_revisao → devolvida/rejeitada. Aprovar diretamente de enviada é conflito. Versão privada não muda em transições editoriais: revisão vincula exatamente a versão salva, bloqueada para edição organizacional fora de rascunho. Nenhuma transição habilita publicação ou apoio.

Autorização válida: objeto_tipo=atividade, objeto_id igual ao ID, situacao=vigente, revogada_em nula, autorizada_em não futura, validade_ate nula ou futura, escopos divulgacao **e atividade:versao:N** com N igual à versão revisada. Papel autorizante e comprovação restrita não vazios. O marcador da versão é uma restrição explícita no text[] existente; autorização genérica ou de outra versão não basta. Sem nova coluna/migração e sem UI de criação de autorização. A legitimidade material da comprovação continua sendo exame humano restrito, não reputação automática.

Estado da atividade, conta e autorização são bloqueados na mesma transação pg; transição e evento persistidos juntos. Idempotência por pedido_id contextual à atividade: evento guarda metadata JSON textual em justificativa_restrita (tipo revisao.v1, versão, estado esperado, ação, motivo e autorização). Mesmo pedido/autor/payload retorna reconhecimento sem nova transição, condicionado às permissões atuais; reuso com payload/autor diferente ou conflito de versão retorna 409. Mesmo um retry de aprovação revalida a autorização: revogação/expiração passa a retornar 422 sem novo evento. Nenhuma repetição torna autorização inválida utilizável.

GET privado de atividade é estendido aos estados em_revisao/aprovada/devolvida/rejeitada; proprietário e editor/admin autorizados recebem somente o motivo de devolução/rejeição, nunca metadata bruta/prova/autorizações. Outro tenant: 404 antes de consultar motivo. Esses estados permanecem privados. Devolução/rejeição não implementam edição/reenvio neste recorte.

Login de editor/admin ativo confirmado no banco conduz a /admin/atividades, fila privada somente editorial. Nenhum papel vem de payload, e-mail textual ou user_metadata. Organização continua /dashboard. /admin base pode permanecer 404; aprovação não autoriza publicação. SSR privado/proxy também cobre /admin/*.

## B07 — publicação local explícita

POST /api/admin/atividades/[id]/publicar recebe somente versao_esperada e pedido_id UUID. Editor/admin ativo do banco, organização validada, estado aprovada e evento de aprovação compatível são obrigatórios. A autorização é derivada desse evento, não escolhida pelo payload; sua atividade/escopo divulgacao + atividade:versao:N e vigência são revalidados inclusive em retry.

Snapshot de lista branca: tipo atividade-publica.v1, id, versao, título/descrição/data/acesso/link oficial, organização (id/nome), estado_programacao e publicada_em. Sem contatos, motivo, prova ou metadata editorial. Snapshot, número de versão, publicada_em, estado publicada e evento são gravados na mesma transação pg; apoios continuam false. Eventual falha reverte tudo. Uma publicação por atividade neste recorte, sem edição posterior, republicação ou retirada.

Idempotência por pedido_id/autor/versão: mesma operação ainda válida não duplica; outra chave/autor/versão conflita. Consulta pública tem namespace separado /api/public/atividades[/id] e páginas /atividades e /atividade/[id]; /api/atividades continua privado. Somente snapshot projetado é retornado. Leitura revalida organização e a autorização original da publicação, com no-store; ineligibilidade oculta o objeto, erro de banco mostra indisponibilidade. Alterações em colunas privadas não substituem conteúdo do snapshot.

Versões aprovadas já são imutáveis pelas rotas B01–B06. Publicação exige evento de aprovação da mesma versão e vínculo de autorização; não confia só no texto do estado. Evento de publicação registra a aprovação, autorização e hash do snapshot em metadata restrita, sem expô-los. Nenhuma migração/grant adicional é necessária. Páginas só são servidas no processo local loopback; não há deploy, indexação ou publicação externa autorizada.

Na aprovação nova, o evento revisao.v1 registra conteudo_sha256 calculado no servidor sobre ID, versão e conteúdo normalizado. A primeira publicação exige correspondência exata com esse hash, além da versão; aprovação antiga sem hash é recusada (409), sem backfill automático ou alteração de registros anteriores. Este recorte não implementa reaprovação de versões antigas. O replay editorial pré-existente preserva compatibilidade com seus eventos, mas não concede publicação sem a prova adicional. No retry de publicação, a prova é verificada sobre o snapshot persistido, nunca sobre campos privados alterados.

Respostas públicas: GET /api/public/atividades retorna {atividades: PublicActivity[]}; GET /api/public/atividades/[id] retorna {atividade: PublicActivity}. Erros 404 para objeto inelegível/ID inválido, 503 para indisponibilidade, sem dados internos. Listagem limitada às 100 publicações mais recentes de organizações validadas, com filtragem de elegibilidade; sem paginação neste recorte. Não há contador, selo ou botão de apoio.

## B08–B09 — versões pendentes e retirada (contrato vigente)

Este recorte amplia a restrição histórica de B07 de uma única publicação. A primeira publicação continua explícita por POST /api/admin/atividades/[id]/publicar. A organização proprietária pode PATCH sua atividade publicada com os mesmos campos permitidos e versao_esperada. A transação bloqueia a atividade, incrementa versao_submetida e inicia rascunho da versão pendente, sem modificar versao_publicada/numero_versao_publicada/publicada_em. Outra organização recebe 404; visitante 401; editor não edita como organização. Versão desatualizada retorna 409 e não cria outra edição/evento.

Para edição com publicação anterior, evento interno atividade_edicao_iniciada registra autor, estados, números anterior/novo e snapshot_anterior. As publicações novas também arquivam seu snapshot completo no evento atividade_publicada, junto ao hash. Esses registros preservam o conteúdo de versões publicadas anteriores, inclusive da primeira publicação B07 que não tinha cópia completa no evento. Não se edita o snapshot de uma versão: uma aprovação válida de outra versão substitui apenas a projeção pública corrente. Nenhuma nova tabela/coluna é criada.

Enviar/iniciar revisão/devolver/rejeitar a versão pendente não altera o snapshot público anterior. A leitura pública usa numero_versao_publicada e seu evento de publicação específico, mesmo quando a revisão privada está em rascunho/enviada/em_revisao/aprovada/devolvida/rejeitada. Ela continua validando organização atual e autorização original da versão publicada; a autorização da versão pendente não serve para expor a anterior. Rascunho sem snapshot continua privado. Apenas o snapshot autorizado é projetado em lista/detalhe/API, sem campos/metadados pendentes.

Quando já existe publicação e o editor aprova uma nova versão, a mesma transação da aprovação valida organização e autorização específica da nova versão, confirma hash do conteúdo aprovado e integridade do snapshot anterior, substitui snapshot/número/data/estado e audita a publicação nova. Falha em qualquer INSERT de auditoria reverte aprovação e substituição. A resposta fica publicada; não se exige segundo clique em Publicar para uma revisão já publicada. Aprovação inicial sem snapshot continua apenas aprovada e privada. Retry válido da aprovação não duplica evento; retirada ou conflito de versão impede nova transição. Permissões e vigência são revalidadas.

POST /api/admin/atividades/[id]/retirar recebe somente pedido_id UUID, versao_esperada e motivo obrigatório (10–1500 caracteres de texto, sem HTML). Editor/admin ativo confirmado no servidor pode retirar publicação corrente, inclusive durante revisão de uma versão pendente. Na mesma transação: estado retirada, apoios_abertos=false e evento atividade_retirada com autor/data/estado anterior/novo/motivo restrito. O snapshot é preservado para histórico, mas nunca retornado publicamente no estado retirada. Não depende de autorização ainda vigente para poder ocultar conteúdo.

Mesma chave/autor/versão/motivo reconhece retirada já executada; outra chave/autor/payload ou versão conflita (409). Visitante 401, organização 403, payload privilegiado 400, regra/campos 422. Motivo é consultável somente por proprietário e editorial autorizado; outros tenants recebem 404 e público não recebe motivo ou histórico. Publicação, edição e reenvio de retirada permanecem bloqueados. Reabertura após retirada não é implementada: exigirá decisão/novo fluxo com aprovação, sem ressurreição por retry antigo.

Aprovações antigas sem hash continuam não publicáveis. Validações de data futura, conteúdo e URLs dos incrementos anteriores são preservadas. Edição/reenvio de versão devolvida ou rejeitada não são ampliados por este recorte. Não há módulo de apoio, indicador, B10–B12 ou C01–C08 implementado aqui.

## B10–B12 — programação e superfícies públicas

POST /api/admin/atividades/[id]/programacao usa a fronteira JSON/origem/no-store existente e exige editor/administrador ativo confirmado no servidor. Recebe somente pedido_id UUID, versao_esperada, estado_esperado (programada/adiada), estado_programacao (adiada/cancelada) e motivo textual restrito de 10–1500 caracteres sem HTML. Não aceita organização, autor ou papel do cliente. Permite programada → adiada/cancelada e adiada → cancelada para atividade com snapshot publicado, não retirada; não reabre cancelamento nem altera data.

Atividade bloqueada FOR UPDATE, versão e programação esperadas conferidas. Estado atual + apoios_abertos=false + evento atividade_programacao_alterada com autor/data/estados/motivo são atômicos na conexão pg existente. Pedido idêntico do mesmo autor reconhece retry enquanto o estado resultante permanece atual; reuso de chave/payload/autor ou estado/versão incompatíveis retorna 409. Visitante 401, organização 403, objeto inexistente 404, payload extra 400, campos inválidos 422. Sem nova migração/grant/policy.

Snapshot aprovado e seu hash/número/timestamp permanecem imutáveis. Consulta pública confere integridade e autorização original antes de projetar estado_programacao atual, conforme a separação da seção 3.3 da fonte normativa. Conteúdo pendente/motivos/histórico continuam privados. Lista, detalhe e API apresentam programação atual; retirada continua oculta. B11 mantém recusa de HTML nos textos/URLs perigosas no servidor e escape React nas superfícies. B12 retorna lista vazia real com mensagem própria, sem dados fictícios; falha de consulta mostra indisponibilidade.

## C01 — registro factual privado

POST /api/atividades/[id]/registro: organização proprietária ativa, identidade e tenant derivados no servidor; atividade bloqueada durante a criação. Body restrito a data_realizacao (YYYY-MM-DD), descricao_factual (10–5000 caracteres de texto sem HTML), origem_informacao (3–600 de texto sem HTML), versao_esperada e pedido_id UUID. Data deve existir no calendário e não ultrapassar a data corrente em America/Sao_Paulo. Campos de estado/apuração/snapshot/organização não são aceitos. Cria registro privado rascunho/declarado, sem snapshot, sem mudar estado_programacao ou declarar reputação.

Uma linha por atividade, conforme constraint existente. Criação e evento restrito registro_criado são atômicos. Retry de mesmo autor/chave/conteúdo é reconhecido; outra criação conflita. Registro não é publicado automaticamente. GET da mesma rota exige dono legítimo ou editor/admin ativo, com isolamento derivado da atividade; visitante 401, outro tenant 404. Não retorna eventos, autorizações ou comprovantes. Sem schema/migration/grant novos.

## C02–C04 — declaração e referências delimitadas

Registro criado permanece declarado; estado de apuração/editorial e snapshots não são aceitos no payload. Referência não corrobora automaticamente relato nem autoriza publicação. POST /api/atividades/[id]/registro/evidencias exige organização proprietária ativa, registro rascunho e recebe pedido_id UUID, tipo_fonte (3–120), url_publica, afirmacao_sustentada (10–1500) e consultada_em ISO com fuso, não futura. A afirmação delimita o que a fonte sustenta. INSERT em evidencias deixa aprovada_publicacao=false e não altera apuração, programação ou publicação. INSERT e evento restrito evidencia_referenciada são atômicos; mesma chave/autor/conteúdo reconhece retry, reuso conflita. Serialização pelo lock da atividade existente. Sem download de mídia, consulta de URL ou incorporação automática.

C04: a validação de referências rejeita protocolos não HTTP(S), credenciais, hosts locais/IPs literais, contatos/identificadores pessoais detectáveis e parâmetros de credencial/contato. Aplicada também à afirmação/tipo de fonte para padrões detectáveis de e-mail/telefone/identificador. A URL não é buscada; não é possível inferir automaticamente todos os dados sensíveis contidos numa página. Referências ficam privadas e não aprovadas, exigindo exame humano antes de eventual publicação; validação sintática não garante adequação material da fonte.

## C05 — autorização própria e publicação do registro posterior

POST /api/atividades/[id]/registro/enviar é do proprietário; POST /api/admin/atividades/[id]/registro/revisar é editorial (iniciar/aprovar/devolver/rejeitar/publicar/retirar). A fronteira JSON/origem/no-store permanece a mesma. Body: pedido_id UUID, estado_esperado, conteudo_esperado (SHA-256 da projeção privada canônica); acao apenas na rota editorial. Aprovar exige autorizacao_id e evidencias_aprovadas (lista explícita de IDs efetivamente examinados, podendo ser vazia); devolver/rejeitar/retirar exigem motivo restrito. Sem papel/organização/snapshot do cliente.

Autorização para o registro exige objeto_tipo=registro, objeto_id=ID do registro, situacao vigente, revogada_em nula, autorização não futura, prazo válido, papel/comprovação preenchidos, escopos registro_realizacao e registro:versao:1. Esses marcadores expressam a finalidade e versão no text[] existente. A autorização de atividade/divulgacao não satisfaz esse contrato. A legitimidade material da comprovação é examinada por pessoa autorizada. Não se cria UI de cadastro de autorização.

Transições: rascunho → enviada (proprietário); enviada → em_revisao; em_revisao → aprovada; enviada/em_revisao → devolvida/rejeitada; aprovada → publicada; publicada → retirada. Aprovação não publica. Apuração permanece declarado; referências aprovadas sustentam somente a afirmação indicada, nunca corroboram automaticamente o relato total. Aprovação registra hash e autorização; publicação revalida ambos e cria snapshot de lista branca versão 1 com somente referências explicitamente aprovadas. Sem nova versão/edit/reabertura de registro neste recorte. Relato sem autorização própria continua privado mesmo com anúncio autorizado.

Lock da atividade e registro, conta e autorização conferidas no servidor; estado/snapshot/evento na mesma transação pg. Hash esperado evita conflito sem nova coluna de versão. Idempotência contextual por autor/chave/payload; retry de aprovação/publicação revalida autorização e estado resultante. Retirada não exige autorização ainda vigente. GET /api/public/atividades/[id]/registro serve só snapshot íntegro, de registro publicado, organização validada e autorização própria ainda vigente, sob atividade publicamente elegível. Não retorna provas, IDs de autorizações, motivos restritos ou eventos. Registro restrito indisponível retorna 404; erro de banco 503. Sem schema, RLS ou grants novos.

## C06 — revogação restrita e suspensão da publicação abrangida

POST /api/admin/atividades/[id]/autorizacoes/revogar exige editor/admin ativo; recebe apenas pedido_id UUID, autorizacao_id UUID e motivo textual restrito (10–1500 sem HTML). O servidor deriva o vínculo: autorização deve pertencer à própria atividade ou ao registro dessa atividade. Organização/visitante não revogam pela rota editorial. Não há revogação por ID solto ou de parceiro/organização neste recorte.

Locks seguem atividade → registro (se houver) → autorização. Na mesma transação, situacao=revogada, revogada_em do relógio PostgreSQL, evento restrito autorizacao_revogada com autor/data/motivo; para autorização de atividade, apoios_abertos=false. Snapshots/histórico permanecem retidos. As consultas públicas revalidam a autorização original em cada leitura sem cache, tornando-a inelegível imediatamente após o commit. Revogar autorização de registro não revoga a autorização independente do anúncio. Autorizações não abrangidas permanecem válidas. Retry idêntico do mesmo autor reconhece a operação; outra chave/payload/autor de revogação já concluída conflita. Falha na auditoria reverte revogação e fechamento de apoios.

## C07–C08 — auditoria e contestação

Todas as transições anteriores mantêm eventos restritos transacionais com conta autora, relógio PostgreSQL, ação e estados. Payloads de autor/tempo/estado de apuração não são aceitos; APIs públicas não retornam eventos. Criação/referência/envio/revisão/aprovação/publicação/retirada/revogação continuam distintos. Falha no INSERT de auditoria reverte a operação correspondente.

POST /api/atividades/[id]/registro/contestar permite proprietário legítimo ou editor/admin ativo; outro tenant recebe 404 e visitante 401. Body restrito a pedido_id, conteudo_esperado SHA-256, divergencia textual de 10–1500 sem HTML e referencia_publica opcional sujeita às validações C04. Atividade/registro bloqueados; conflito de conteúdo retorna 409. Registra evento registro_contestado com autor/data/estado anterior/novo e divergência restrita, e muda somente estado_apuracao para contestado. Descrição, origem, evidências e snapshot aprovados permanecem intactos. Múltiplas divergências são eventos distintos; mesma chave/autor/payload reconhece retry sem duplicação; reuso incompatível conflita.

Proprietário e editorial consultam a projeção restrita das divergências/data/referência; outros tenants não. Público recebe apenas marcador contestado e mensagem de divergência sem conclusão consensual, depois de validar snapshot e autorização original. Divergência textual/referência privada nunca entram na resposta pública. Aprovação/publicação e seus retries não resolvem nem apagam contestação; enquanto contestado essas ações são bloqueadas. Retirada continua disponível. Não há resolução automática, corroboração, pontuação, versão nova ou módulo de confiança neste recorte.
