# Checkpoint local do incremento 2 — proposta para aprovação

Data: 04/11/2026. **Nenhum commit, stage, push ou implementação B01–B04 realizado.**

## Conjunto exato

A lista autoritativa é [checkpoint-incremento-2-files.txt](checkpoint-incremento-2-files.txt): um caminho relativo por linha, sem globs nem diretórios implícitos. Inclui somente arquivos novos/modificados desde dedc9c6 e a documentação deste fechamento. O diretório de trabalho permanece com alterações anteriores preservadas; não foi reinicializado.

Proposta de commit único:

```text
fix(auth): concluir autenticação e validação local do incremento 2
```

Corpo proposto:

```text
Corrige limpeza de sessão parcial, retomada idempotente do vínculo e envio antes da hidratação.
Adiciona regressões e validação real com Chromium, mantendo papéis no servidor e RLS fechado.
Registra 129 testes de unidade/componentes e 9 cenários E2E aprovados, com evidências e ressalvas de A07/A08.
```

Somente após aprovação, os comandos previstos são:

```sh
git --literal-pathspecs add --pathspec-from-file=operations/checkpoint-incremento-2-files.txt
git diff --cached --check
git diff --cached --stat
git commit -m "fix(auth): concluir autenticação e validação local do incremento 2"
```

Não usar git add . nem incluir arquivos extras surgidos depois desta revisão. Conferir o diff staged e o manifesto novamente antes do commit. Sem Co-Authored-By ou push. A proposta técnica do incremento 3 é documento de planejamento, não autorização de código.

## Revisão de conteúdo

- Revisadas alterações de autenticação, formulários, testes, configuração Supabase de templates, Playwright/lockfile, documentos e evidências. Nenhuma alteração nova em código funcional foi feita nesta preparação.
- Comparação segura dos valores conhecidos dos segredos locais obtidos em memória via CLI status, mais busca de chaves literais/JWT e credenciais em URL: nenhum vazamento identificado no conjunto proposto. Valores nunca foram impressos nem gravados no relatório. Isso não promete detectar todo segredo desconhecido.
- Nenhum e-mail fora dos domínios reservados de fixtures encontrado, nenhum arquivo binário ou arquivo acima de 1 MiB no conjunto revisado. UUIDs de fixtures e nomes fictícios nas evidências não representam organizações/pessoas reais.
- node_modules, .next, .npm-cache, .playwright-browsers, .playwright-results, .env* e supabase/.temp ficam fora do conjunto pelo .gitignore (exceção pública .env.example). Nenhum perfil de navegador, trace, vídeo, screenshot ou storageState foi incluído. Sem arquivos ignorados forçados para stage.
- Duas evidências brutas incluem endereços das interfaces do Mac: operations/evidence/isolamento-20261104T121252Z/network.json e network-before-loopback-filter.json. Foram preservadas sem edição/exclusão e agora são ignoradas pelo Git. Incluído network-summary.json sanitizado, com 3 positivos, 42 negativos sem aceitação e ressalvas da prova anterior.
- Paths absolutos do diretório autorizado e identificadores técnicos locais ainda aparecem em documentação/evidências para reprodução; nenhum contato pessoal real ou credencial foi detectado. Não foi feita promessa de anonimização integral do computador.
- As duas migrações já versionadas não estão alteradas e não entram neste diff. Nenhuma migração adicional foi criada/aplicada.
- Corrigida afirmação desatualizada em specs/contratos-api.md que dizia que onboarding não havia sido aplicado; a evidência local posterior já demonstrava a aplicação.
- Resultados anteriores preservados: 129 unitários/componentes PASS, 9 E2E PASS, lint/typecheck/build aprovados; 89 integração e 17 Auth/API da etapa anterior. Não foram executadas novamente essas suítes nesta preparação de documentos.

## Ressalvas normativas

A07: PASS somente no recorte atual de rotas ausentes; **nova prova obrigatória quando a publicação existir**, verificando negação real de autorização.

A08: PASS com **manipulação temporal controlada** apenas nas fixtures reais, incluindo not_after/recovery_sent_at e refresh forçado; não houve espera natural de expiração.

## Próximo recorte, ainda não autorizado

[Proposta técnica B01–B04](proposta-incremento-3-b01-b04.md): testes existentes, contratos, validações, 21 arquivos previstos, transação SQL sem nova migração e ordem RED/GREEN/REFACTOR. Não foram criados arquivos de implementação do incremento 3. Sob a barreira atual, scripts que apagam suas fixtures também exigirão autorização específica antes da execução; nenhum DELETE foi executado nesta preparação.

Aguardar autorização para este checkpoint e, separadamente, aprovação para iniciar B01–B04. Não iniciar processos ou alterar Docker para este fechamento.
