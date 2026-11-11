import {expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {writeFileSync} from 'node:fs';
import {parseSnapshot} from '../../../src/lib/activities/publication';
import PublicList from '../../../src/app/atividades/page';
import PublicDetail from '../../../src/app/atividade/[id]/page';
import {ActivityArtwork} from '../../../src/components/ActivityArtwork';
vi.mock('../../../src/lib/queries/records.server',()=>({publicRecords:{get:async()=>{throw new Error('Registro indisponível fictício');}}}));
const {list,get}=vi.hoisted(()=>({list:vi.fn(),get:vi.fn()}));
vi.mock('../../../src/lib/queries/public.server',()=>({publicActivities:{list,get}}));
const out='operations/evidence/investigacao-b11';
const id='10000000-0000-4000-8000-000000000001',org='20000000-0000-4000-8000-000000000001';
const name='<img src=x onerror="window.xss=1">';
const draft={titulo:'Título fictício',descricao:'Descrição fictícia segura.',inicio_previsto:'2030-01-01T12:00:00Z',orientacao_acesso:'Entrada fictícia.',referencia_oficial:null};
const broad='img,script,svg,iframe,[onerror],[onload]';
async function render(surface:string,publicName:string){
 const activity=parseSnapshot({tipo:'atividade-publica.v1',id,versao:1,...draft,organizacao:{id:org,nome_publico:publicName},estado_programacao:'programada',publicada_em:'2026-01-01T12:00:00Z'});
 list.mockResolvedValue([activity]);get.mockResolvedValue(activity);
 const element=surface==='list'?await PublicList():await PublicDetail({params:Promise.resolve({id})});
 const markup=renderToStaticMarkup(element);
 return {markup,doc:new DOMParser().parseFromString(markup,'text/html')};
}
it.each(['list','detail'])('investigação isolada de origem do SVG e escape: %s',async surface=>{
 const injected=await render(surface,name);
 const control=await render(surface,'Organização fictícia');
 const svgs=[...injected.doc.querySelectorAll('svg')];
 const controlSvgs=[...control.doc.querySelectorAll('svg')];
 const selector=surface==='list'?'li > p:first-of-type':'.detail-byline a, .organizer-panel strong';
 const names=[...injected.doc.querySelectorAll(selector)];
 const artworkDoc=new DOMParser().parseFromString(renderToStaticMarkup(createElement(ActivityArtwork,{title:draft.titulo,large:true})),'text/html');
 const firstMatch=injected.doc.querySelector(broad);
 const report={surface,payload:name,broad_selector:broad,first_match:firstMatch?.outerHTML??null,svg_count:svgs.length,control_svg_count:controlSvgs.length,svg_identical_to_benign_control:svgs.map(n=>n.outerHTML).join('')===controlSvgs.map(n=>n.outerHTML).join(''),first_svg_matches_activity_artwork:surface==='detail'?svgs[0]?.outerHTML===artworkDoc.querySelector('svg')?.outerHTML:null,svg_elements:svgs.map(n=>({class:n.getAttribute('class'),parent:n.parentElement?.className,markup:n.outerHTML})),dangerous_non_svg_elements:injected.doc.querySelectorAll('img,script,iframe,[onerror],[onload]').length,name_nodes:names.map(n=>({selector,text:n.textContent,inner_html:n.innerHTML,child_node_types:[...n.childNodes].map(c=>c.nodeType),dangerous_descendants:n.querySelectorAll(broad).length}))};
 writeFileSync(`${out}/${surface}.html`,injected.markup+'\n');
 writeFileSync(`${out}/${surface}.json`,JSON.stringify(report,null,2)+'\n');
 expect(names.length).toBe(surface==='list'?1:2);
 for(const node of names){expect(node.textContent).toBe(name);expect([...node.childNodes].every(n=>n.nodeType===3)).toBe(true);expect(node.querySelector(broad)).toBeNull();}
 expect(injected.doc.querySelector('img,script,iframe,[onerror],[onload]')).toBeNull();
 expect(report.svg_identical_to_benign_control).toBe(true);
 if(surface==='list')expect(firstMatch).toBeNull();
 else {expect(firstMatch?.getAttribute('class')).toBe('art-sprig');expect(report.first_svg_matches_activity_artwork).toBe(true);expect(svgs.length).toBeGreaterThan(0);}
});
