# Comandos da Etapa A

Leitura: pwd; rg --files; git status --short --untracked-files=all; git log --oneline -10; git remote -v; cat dos contratos/matriz/relatórios/evidências/migrações locais; node --version; npm --version; binários locais next/tsc/supabase --version; ls -l do socket Docker; df -h .; lsof somente nas portas locais próprias. PRD e modelo esperados ausentes foram registrados.

Docker somente leitura e somente A Praça: comando/resultado em docker.txt. Sem container próprio ativo para docker port.

Execução: python3 operations/evidence/etapa-a-20261103T234832Z/verify.py. Este chama npm test, npm run lint, npm run typecheck, npm run build e registra saídas/exit codes. O build recebe canários efêmeros em ambiente, sem gravar/imprimir valores; telemetria desabilitada. O código do verificador é a reprodução exata dos critérios de busca. Leitura de Git via ls-files, rev-list, ls-tree e cat-file; sem commit ou alterações de histórico.

Evidências criadas somente nesta pasta. git diff --name-only confirma ausência de modificação em arquivos versionados preexistentes.
