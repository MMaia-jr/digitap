// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {validateDraft} from '../../src/lib/activities/domain';
import {parseSnapshot} from '../../src/lib/activities/publication';
import PublicList from '../../src/app/atividades/page';
import PublicDetail from '../../src/app/atividade/[id]/page';
vi.mock('../../src/lib/queries/records.server',()=>({publicRecords:{get:async()=>{throw new Error('Registro indisponível fictício');}}}));
const {list,get}=vi.hoisted(()=>({list:vi.fn(),get:vi.fn()}));
vi.mock('../../src/lib/queries/public.server',()=>({publicActivities:{list,get}}));
const id='10000000-0000-4000-8000-000000000001',org='20000000-0000-4000-8000-000000000001';
const draft={titulo:'Título fictício',descricao:'Descrição fictícia segura.',inicio_previsto:'2030-01-01T12:00:00Z',orientacao_acesso:'Entrada fictícia.',referencia_oficial:null};
it.each(['<script>window.xss=1</script>','<img src=x onerror=alert(1)>','<svg/onload=alert(1)>','<iframe srcdoc="<script>alert(1)</script>">','<a href=javascript:alert(1)>teste</a>'])('B11: conteúdo malicioso é recusado no servidor e no snapshot: %s',attack=>{
 for(const field of ['titulo','descricao','orientacao_acesso']){
  expect(()=>validateDraft({...draft,[field]:attack},new Date('2026-01-01'))).toThrow();
  expect(()=>parseSnapshot({tipo:'atividade-publica.v1',id,versao:1,...draft,[field]:attack,organizacao:{id:org,nome_publico:'Organização fictícia'},estado_programacao:'programada',publicada_em:'2026-01-01T12:00:00Z'})).toThrow();
 }
});
it('B11: nome público legado com HTML é escapado na lista e detalhe',async()=>{
 const name='<img src=x onerror="window.xss=1">';
 const activity=parseSnapshot({tipo:'atividade-publica.v1',id,versao:1,...draft,organizacao:{id:org,nome_publico:name},estado_programacao:'programada',publicada_em:'2026-01-01T12:00:00Z'});
 list.mockResolvedValue([activity]);get.mockResolvedValue(activity);
 for(const [element,selector,count] of [
  [await PublicList(),'li > p:first-of-type',1],
  [await PublicDetail({params:Promise.resolve({id})}),'.detail-byline a, .organizer-panel strong',2],
 ] as const){
  const doc=new DOMParser().parseFromString(renderToStaticMarkup(element),'text/html');
  const names=Array.from(doc.querySelectorAll(selector));
  expect(names).toHaveLength(count);
  for(const node of names){
   expect(node.textContent).toBe(name);
   expect(node.querySelector('img,script,svg,iframe,[onerror],[onload]')).toBeNull();
  }
 }
});
it('B12: lista vazia apresenta estado vazio sem inventar atividade/link',async()=>{
 list.mockResolvedValue([]);const doc=new DOMParser().parseFromString(renderToStaticMarkup(await PublicList()),'text/html');
 expect(doc.body.textContent).toContain('Nenhuma atividade publicada disponível.');expect(doc.querySelector('li,a[href^="/atividade/"]')).toBeNull();
});
it('B12: indisponibilidade não é apresentada como vazio',async()=>{
 list.mockRejectedValue(new Error('Erro interno fictício'));const markup=renderToStaticMarkup(await PublicList());expect(markup).toContain('Consulta indisponível');expect(markup).not.toContain('Nenhuma atividade');expect(markup).not.toContain('Erro interno');
});
it('B10: listagem pública informa programação cancelada sem esconder o histórico',async()=>{
 list.mockResolvedValue([{id,titulo:'Título fictício aprovado',organizacao:{nome_publico:'Organização fictícia'},estado_programacao:'cancelada'}]);
 const markup=renderToStaticMarkup(await PublicList());expect(markup).toContain('cancelada');expect(markup).toContain('Título fictício aprovado');
});
