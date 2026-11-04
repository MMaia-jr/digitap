# Nota sobre observação descritiva da regressão Auth

O texto descritivo de A07 em `auth-observations.json` foi herdado do incremento 2C e menciona ausência de rota/404. Esse texto estava desatualizado; a asserção efetivamente executada neste recorte foi 403 em POST real `/api/admin/atividades/[id]/publicar` com payload válido. A trilha HTTP registra 403 e o teste passou. A descrição foi corrigida no código do teste, sem alterar o resultado bruto salvo nem repetir a suíte apenas por texto.

O aceite atual de A07 se baseia também nos dois testes A07/B07 em `publication.spec.mjs`, com atividades aprovadas existentes, organização proprietária/alheia, visitante, payload forjado e editor tentando publicar para organização pendente. `publication-observations.json` e os casos reais de integração corroboram essas negativas. O controle positivo de publicação por editor/admin foi executado em outros casos B07. A prova antiga de 404 não é usada como aceite atual.
