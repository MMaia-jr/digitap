# Investigação B11 — falso positivo do seletor

Execução local, sem banco, navegador remoto ou acesso a produção. O código em `src/` e o teste original `tests/components/public-safety.test.tsx` foram preservados. Somente diagnóstico isolado e evidências foram adicionados neste diretório; nenhuma correção aplicada ou commit solicitado.

## Trecho original exato (linhas 19–27)

```tsx
it('B11: nome público legado com HTML é escapado na lista e detalhe',async()=>{
 const name='<img src=x onerror="window.xss=1">';
 const activity=parseSnapshot({tipo:'atividade-publica.v1',id,versao:1,...draft,organizacao:{id:org,nome_publico:name},estado_programacao:'programada',publicada_em:'2026-01-01T12:00:00Z'});
 list.mockResolvedValue([activity]);get.mockResolvedValue(activity);
 for(const element of [await PublicList(),await PublicDetail({params:Promise.resolve({id})})]){
  const doc=new DOMParser().parseFromString(renderToStaticMarkup(element),'text/html');
  expect(doc.querySelector('img,script,svg,iframe,[onerror],[onload]')).toBeNull();expect(doc.body.textContent).toContain(name);
 }
});
```

## Reprodução e origem

Comando: `npm test -- --config operations/evidence/investigacao-b11/vitest.config.mjs --reporter=json --outputFile=operations/evidence/investigacao-b11/results.json`.

Resultado: **2 PASS / 0 FAIL / 0 SKIP**. Renderização SSR real dos mesmos componentes (`PublicList`, `PublicDetail`) com as mesmas portas de consulta simuladas do teste original. O teste de diagnóstico não é incluído pela configuração normal de `npm test`.

| Observação | Lista | Detalhe |
| --- | --- | --- |
| Resultado do seletor original | `null` | `svg.art-sprig` |
| SVGs com nome malicioso | 0 | 6 |
| SVGs com nome comum | 0 | 6 |
| SVGs idênticos entre os dois cenários | Sim | Sim |
| `img,script,iframe,[onerror],[onload]` no documento | 0 | 0 |
| Regiões do nome verificadas | 1 | 2 |
| Tipo dos filhos nas regiões do nome | Somente texto (`nodeType=3`) | Somente texto (`nodeType=3`) |

Primeiro SVG encontrado: `<svg class="art-sprig" viewBox="0 0 120 160" fill="none">…</svg>`. Seu pai é `div.activity-art.art-tone-0.art-large`, com `aria-hidden="true"`. É um ramo decorativo definido literalmente em `src/components/ActivityArtwork.tsx:5`, usado no detalhe em `src/app/atividade/[id]/page.tsx:22`. O diagnóstico também comparou seu `outerHTML` com a renderização isolada de `ActivityArtwork`: correspondência exata.

Os outros cinco SVGs vêm de `CommunityIcon`: localização, seta do organizador, calendário, pessoas e folha do botão de participação. Nenhum SVG é derivado do nome público. A figura decorativa é a primeira correspondência em ordem de documento, portanto é a responsável imediata pela falha.

## Nome legado e escape

String exata: `<img src=x onerror="window.xss=1">`.

Na lista (`li > p:first-of-type`) e nos dois locais de nome do detalhe (`.detail-byline a` e `.organizer-panel strong`):

- `textContent` é exatamente a string acima;
- `innerHTML` após parse DOM é `&lt;img src=x onerror="window.xss=1"&gt;`;
- há somente nó de texto e nenhum descendente `img`, `svg`, `script`, `iframe` ou atributo de evento.

`onerror` faz parte do texto; não é um atributo do DOM. React insere `publisher.nome_publico` como expressão de texto, não por `dangerouslySetInnerHTML`. O cenário não produz HTML injetado. O seletor original passa na lista e falha no detalhe por alcançar a decoração da página inteira.

## Conclusão e proposta — não aplicada

**Falso positivo do seletor global, não XSS reproduzido por este payload.** Isso não equivale a uma auditoria de todas as entradas da aplicação.

Proposta para revisão humana: manter a mesma fixture e testar o nome em cada superfície, exigindo que os elementos existam e comparando o texto exato; aplicar o seletor de elementos perigosos somente a essas regiões.

```tsx
const selector = surface === 'list'
  ? 'li > p:first-of-type'
  : '.detail-byline a, .organizer-panel strong';
const names = [...doc.querySelectorAll(selector)];
expect(names).toHaveLength(surface === 'list' ? 1 : 2);
for (const node of names) {
  expect(node.textContent).toBe(name);
  expect(node.querySelector('img,script,svg,iframe,[onerror],[onload]')).toBeNull();
}
```

A distinção de superfície é apenas a proposta para reestruturar o loop do B11; não foi inserida no teste original. Contar os elementos evita que uma alteração de seletor produza aprovação por uma lista vazia. Não se propõe remover a proteção de escape nem banir ícones legítimos da página.

Arquivos: `list.html` e `detail.html` (DOM renderizado); `list.json` e `detail.json` (origem, controle e nós); `diagnostic.test.tsx` e `vitest.config.mjs` (reprodução isolada); `results.json` e `run.log` (execução).
