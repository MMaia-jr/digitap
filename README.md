# DigItap — A Praça

Infraestrutura cívica para atividades e trajetórias comunitárias de Itaperuna e região. O app está em produção em **https://www.digitap.com.br**, hospedado na **Vercel**, com banco, Auth e arquivos no **Supabase Cloud**. O envio de e-mails de acesso usa **Resend**. Deploy, domínio, banco migrado e e-mail funcional foram informados pelo proponente; isso não equivale a uma auditoria completa do ambiente.

## O que existe hoje

- Cadastro de pessoa física e de organização, confirmação por e-mail, login e recuperação de senha.
- Criação e edição de atividades, envio para curadoria e consulta pública das versões publicadas.
- Registro de realização, evidências e revisão editorial, com distinção entre declaração do responsável e comprovação independente.
- Perfil e portfólio público, com exportação em PDF pela impressão do navegador (“Salvar como PDF”). O PDF é uma cópia do momento da exportação, não um certificado.

O serviço está em **beta público na web**. O estado de **Enable Signup no Supabase Cloud ainda não foi confirmado nesta revisão**; não há evidência para classificá-lo como beta fechado. Se `disable_signup=false`, a classificação operacional deve ser **beta aberto para cadastro**, ainda que a publicação continue sujeita à curadoria. Página de cadastro visível não comprova que novas contas são aceitas. Não alteramos essa configuração.

Não há validação humana I5 concluída documentada: VH-01 (compreensão), VH-02 (uso acompanhado e consequência) e VH-03 (deliberação) continuam gates para ampliação e decisão de lançamento. Publicar o software não demonstra adoção ou utilidade comunitária. Não há parceria institucional confirmada.

## Rodar localmente

Requer Node `^22.22.2`, `^24.15.0` ou `>=26`, npm e, para os fluxos reais, um Supabase local isolado.

```sh
npm ci
cp .env.example .env.local
# Substitua os placeholders por credenciais exclusivamente locais.
npm run dev
```

A interface abre em http://127.0.0.1:3215. `.env.local` deve conter `APP_ORIGIN=http://127.0.0.1:3215`, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:56151`, chave pública, `SUPABASE_SECRET_KEY` e `SUPABASE_DB_URL` do banco local na porta 56152. Não copie chaves de produção e não versione segredos. Sem serviços e credenciais válidos, operações dependentes de Auth/banco podem retornar indisponibilidade.

**Limitação ainda presente no código:** `npm run local:start` está bloqueado por `scripts/start-local.mjs`, devido à verificação de isolamento das portas. Não é um comando funcional de inicialização automática. Para preparar a stack, use o procedimento de isolamento em [autenticação local](operations/autenticacao-local.md) e os registros posteriores em [progresso](operations/progresso.md). Comprove os bindings antes de usar; não aplique migrations no Cloud como parte do setup local. A interface pode ser iniciada separadamente pelo comando acima.

Em produção, configure `APP_ORIGIN=https://www.digitap.com.br`, URL HTTPS do projeto Supabase e as credenciais de servidor nos ambientes da Vercel. Variáveis `NEXT_PUBLIC_*` são públicas. A configuração local não deve ser reutilizada em produção.

## Verificar e contribuir

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Integração e E2E usam comandos próprios (`test:onboarding:db`, `test:e2e`) e exigem serviços locais isolados e fixtures autorizadas. Não execute esses testes contra produção.

A governança é provisória, sob responsabilidade operacional de **Marcos Antonio Maia Júnior**. Propostas de mudança devem descrever problema, escopo, impacto nos dados e validação; envie uma issue/PR no repositório ou escreva para **muralitaperuna@gmail.com**. Use dados fictícios nos testes. A revisão técnica não substitui a decisão humana sobre escopo, exposição de dados, infraestrutura ou lançamento. Não há CNPJ, estatuto aprovado ou assembleia constituída registrados nesta revisão.

A orientação de licenciamento é **AGPLv3 para código** e **CC BY-SA 4.0 para documentos do projeto**. Isso não licencia automaticamente conteúdos de usuários. A consolidação dos arquivos formais de licença e da titularidade das contribuições permanece pendente.

## Privacidade, termos e contestação

- [Política de privacidade](https://www.digitap.com.br/privacidade)
- [Termos de uso](https://www.digitap.com.br/termos)
- [Como contestar ou pedir correção](https://www.digitap.com.br/contestacao)
- [Governança provisória](https://www.digitap.com.br/governanca)

Contato: **muralitaperuna@gmail.com**. Compromisso operacional de resposta em até 30 dias, respeitando prazos legais menores. A infraestrutura envolve fornecedores nos EUA; região efetiva, instrumentos de transferência internacional e retenção precisam de registro antes da ampliação do beta.

## Decisões e histórico

O portfólio/PDF foi implementado antes do I5, divergindo da sequência prevista em [02 — Escopo e MVP](docs/02-escopo-e-mvp.md). Esta reconciliação registra a exceção para apresentar atividades e evidências existentes durante o beta, sem tratar a entrega como aprovação retroativa do I5. Condições: somente conteúdo autorizado/publicado, sem certificação independente, possibilidade de contestação e sem avançar novos módulos por esse precedente. Veja [checkpoint e pendências](operations/progresso.md).

Os documentos 00–07 e relatórios antigos continuam como histórico das decisões. Trechos que dizem “nenhum deploy” ou “somente local” não descrevem mais o estado operacional; a nota de reconciliação prevalece para esse estado, sem reescrever os gates humanos. Apoio, verificação de comparecimento, parceiros, prestação de contas financeira, capacidades, PoWth e painel de impacto ficam fora deste trabalho.

## Risco operacional: backup e restore ainda não comprovados

Na rodada local da Semana 1, dia 3, não foi possível confirmar se o plano do Supabase Cloud deste projeto oferece backup automático, nem frequência, retenção, último sucesso ou cobertura dos arquivos de Storage. Isso **não significa ausência de backups**, mas impede afirmar que há recuperação garantida. Restore e RPO/RTO ainda não foram ensaiados. Antes de ampliar o beta, o responsável deve registrar essas informações e comprovar uma restauração em destino isolado. [Evidências, bloqueios e roteiro de verificação](operations/evidence/semana-1-dia-3/REPORT.md).
