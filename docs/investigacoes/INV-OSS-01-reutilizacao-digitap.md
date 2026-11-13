# INV-OSS-01 — Investigação de reutilização open source para o DigItap

**Data da verificação:** 13/11/2026  
**Estado:** pesquisa técnica, não decisão de implementação nem autorização para alterar repositório/infraestrutura.  
**Princípio:** reutilizar o comum; construir o distintivo.

## 1. Base examinada

- Stack observada em `package.json` do repositório remoto `MMaia-jr/digitap`: Next.js 16, React 19, TypeScript, PostgreSQL, `@supabase/ssr` e `@supabase/supabase-js`.
- `src/lib/queries/portfolio.server.ts`: composição do portfólio a partir de consultas públicas com verificação existente de autorização/revogação.
- `src/components/RealizationPhoto.tsx`: exibe foto/vídeo mediante URL externa aprovada para publicação; não armazena arquivo privado.
- `src/components/PrintPortfolioButton.tsx`, conforme README: impressão do navegador para salvar PDF, não geração server-side.
- Contexto de produto: `docs/digitap/00-norte-do-produto.md` relatado como criado localmente; sua última versão local e o P0 ainda não foram verificados por acesso ao Git local. Os snapshots de GitHub podem divergir.

**Não confundir:** integração open source com custo zero, recurso instalado com funcionalidade entregue, fluxo RED/GREEN local com produção validada.

## 2. Matriz de decisão

| Categoria | Solução/versão | Reutilização | Licença/condição | Custo de integração | Decisão nesta fase |
|---|---|---|---|---|---|
| Evidências privadas | Supabase Storage | Buckets privados, API, RLS, URLs temporárias | Serviço open source + custo operacional Cloud possível | Médio: permissão por sujeito, metadata, revogação, política de dados | **Primeiro candidato pós-P0**, se a validação precisar de arquivo privado |
| Upload robusto | TUS + Uppy | Upload retomável e progresso | Uppy MIT; TUS aberto | Baixo-médio **depois** do contrato de Storage | **Condicional** a arquivo grande ou rede instável |
| Portabilidade | CSV nativo (sem biblioteca) / PapaParse | Exportar registros autorizados; PapaParse ajuda parse/import | API nativa / MIT | Baixo para exportação simples; elevado para segurança de exportação em massa | **Candidato a pequeno experimento**, sem dependência de início |
| DOCX | `docx` | Arquivos .docx estruturados | MIT | Médio: formatação, anexos e definição do relatório | **Adiar** até formato real de relatório ser validado |
| PDF programático | PDFKit ou pdf-lib | Gerar/editar PDF por código | MIT | Médio: layouts, fontes, paginação, acessibilidade | **Adiar**; usar impressão existente quando adequada |
| Campo offline Android | ODK Collect + Central | Formulários offline, fotos, sincronização, API/OData | ODK Central Apache 2.0 | Alto: servidor adicional, identidade, mapeamento, operação | **Estudo de viabilidade**, não integrar agora |
| Administração | React-admin | UI administrativa REST/GraphQL | MIT | Médio: auth/roles e adaptação das APIs | **Não introduzir** sem lacuna demonstrada no painel atual |
| Planilhas administrativas | Grist Community | Interface de planilha relacional self-host | Apache 2.0 | Alto: segunda aplicação, acesso, dados duplicados | **Não integrar agora** |
| Proveniência | W3C PROV | Vocabulário para agentes, atividades e entidades/proveniência | Padrão de interoperabilidade, não pacote | Baixo para **estudo de modelo**, alto para criar protocolo completo | **Referência conceitual** para REL-01, não implementação |

## 3. Oportunidades concretas de reutilizar o que já existe

### A. Evidências privadas — Storage no fluxo existente

A integração mais coerente reutiliza as tabelas e as autorizações de `registros_realizacao`/`evidencias`, sem criar um cadastro paralelo. O blob deve ter identidade e metadados próprios; a decisão de publicação acontece na projeção autorizada, nunca automaticamente após upload.

**Portas de aceite para eventual incremento:**

1. Usuário anônimo não obtém arquivo privado.
2. Conta autenticada sem vínculo/escopo sobre o sujeito não obtém nem lista arquivo alheio.
3. Upload não publica prova automaticamente.
4. Arquivo pertence a objeto, sujeito e afirmação identificáveis.
5. Tipo/tamanho são validados também no servidor; não confiar em extensão/MIME do cliente.
6. Registro público usa versão/snapshot aprovado; rascunhos e arquivos brutos permanecem privados.
7. URLs assinadas têm duração mínima adequada. Revogação de acesso **não invalida instantaneamente** uma URL previamente emitida; desenhar expiração, exclusão/substituição ou mediação.
8. Não publicar EXIF/localização e outros metadados identificadores sem necessidade/consentimento aplicável.
9. Falhas de upload não criam evidência “existente” sem blob consistente, nem deixam arquivos órfãos sem política de limpeza.
10. Credenciais service-role nunca chegam ao navegador; conferência de permissão precisa ser no servidor e/ou RLS testada.

**Não fazer agora:** criar bucket, migration, RLS ou instalar pacote.

### B. Exportação CSV mínima

O PostgreSQL e o portfólio já têm dados estruturados. Uma exportação de **campos autorizados** pode anteceder qualquer gerador de relatórios. Pode ser produzida com APIs nativas e cobertura de testes, sem biblioteca externa.

**Portas:** colunas aprovadas; UTF-8; ordenação determinística; proteção de células interpretadas como fórmulas por planilhas; ausência de campos privados; autenticação e autorização para exportações privadas; versão/metadata de proveniência.

**O que NÃO prova:** CSV não substitui prestação de contas em formato oficial nem fornece verificação independente dos fatos.

### C. Relatórios

O portfólio já imprime usando o navegador. Antes de instalar bibliotecas, levantar o formato real requerido. `docx` serve a Word; `pdf-lib` edita/gera PDF; PDFKit oferece paginação e layout de PDF. Nenhum desses componentes adiciona comprovação factual, autorização ou assinatura certificadora automaticamente.

### D. Coleta offline

ODK Collect é sólido para Android e permite preencher offline; ODK Central recebe formulários, anexos e dispõe de APIs. Contudo, a infraestrutura extra precisa de hospedagem, backup, autenticação e esquema de sincronização. A definição de um dado no ODK não coincide automaticamente com sujeito, atividade, registro e evidência do DigItap.

**Experimento futuro, apenas se justificado:** formulário fictício sem dados pessoais; exportar submissão e comparar campos com contrato DigItap; medir conflitos de identidade, duplicatas e revogação. Não implantar Central de produção como experimento.

### E. Interfaces administrativas

O DigItap já possui `/admin/atividades` e dashboards específicos. Grist ou React-admin podem servir como referência de UI. A integração pode abrir caminhos paralelos de acesso e quebrar a centralização de autorização. Não substituir sem lacuna observada e teste de não regressão.

### F. PoWth/proveniência

W3C PROV distingue **entidade**, **atividade** e **agente** — útil como inspiração para proveniência de registros. Não fornece confiança social, atribuição de autoridade, confirmação de contraparte, consentimento, contestação ou regras de PoWth prontos. O contrato REL-01 deve continuar separado do estado de apuração de uma realização.

## 4. Ordem recomendada

1. **Agora:** finalizar saneamento Git e P0, sem instalar dependências.
2. **Após P0 validado:** observar qual tarefa real a ausência de upload/exportação impede; escolher **um** incremento somente.
3. **Se o bloqueio forem comprovantes privados:** avaliar Storage, escrever testes RED de autorização e publicação, implementar o mínimo.
4. **Se o bloqueio for portabilidade/planilha:** avaliar exportação CSV com testes e sem pacote novo.
5. **Só depois:** relatórios DOCX/PDF formatados, sincronização offline ou ferramentas administrativas completas, conforme evidência humana.

A prioridade entre 3 e 4 depende da necessidade observada, não do entusiasmo com a tecnologia.

## 5. Riscos transversais

- **Licença:** verificar no tag/versão adotado e conservar avisos obrigatórios; dependência MIT/Apache não determina a licença do DigItap.
- **Dados:** LGPD, base legal, retenção, localização/transferência e direitos dos titulares não são resolvidos pelo rótulo open source.
- **Operação:** self-host gratuito em licença não implica custo zero de infraestrutura, atualização, segurança e backups.
- **Portabilidade:** manter SQL e APIs do domínio próprios, não acoplar conceitos centrais a detalhes de um provedor.
- **Comparação temporal:** versões atuais do repositório remoto não refletem necessariamente P0 e documentos ainda não commitados localmente.
- **Estimativas:** não existem dados suficientes para afirmar “uma semana de integração” ou “economia de 18 meses”. Medir spikes reais antes de estimar.

## 6. Fontes verificadas

- Supabase Storage — buckets privados: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage — RLS: https://supabase.com/docs/guides/storage/security/access-control
- Supabase — upload retomável TUS: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- Supabase — limitações de revogação de links: https://supabase.com/docs/guides/storage/serving/downloads
- Uppy, MIT: https://github.com/transloadit/uppy
- ODK Collect: https://github.com/getodk/collect
- ODK Central — REST API: https://docs.getodk.org/central-api/
- ODK Central — instalação/operação: https://docs.getodk.org/central-install/
- ODK Central, Apache 2.0: https://github.com/getodk/central
- docx, MIT: https://github.com/dolanmiu/docx
- PDFKit, MIT: https://github.com/foliojs/pdfkit
- pdf-lib, MIT: https://github.com/Hopding/pdf-lib
- PapaParse, MIT: https://github.com/mholt/PapaParse
- Grist Community, Apache 2.0: https://github.com/gristlabs/grist-core
- React-admin, MIT: https://github.com/marmelab/react-admin
- W3C PROV: https://www.w3.org/TR/prov-overview/

**Resultado da investigação:** shortlist e critérios de aceite; nenhuma instalação, modificação de repositório, commit, push ou deploy executado.
