// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import PublicActivity from '../../src/app/atividade/[id]/page';
const {get}=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('../../src/lib/queries/public.server',()=>({publicActivities:{get:async()=>({id:'10000000-0000-4000-8000-000000000001',titulo:'Atividade fictícia',descricao:'Descrição aprovada.',organizacao:{nome_publico:'Organização fictícia'},inicio_previsto:'2030-01-01T12:00:00Z',estado_programacao:'programada',orientacao_acesso:'Entrada fictícia.',referencia_oficial:null})}}));
vi.mock('../../src/lib/queries/records.server',()=>({publicRecords:{get}}));
it('C05: detalhe público apresenta somente relato publicado com status de declaração',async()=>{
 get.mockResolvedValue({data_realizacao:'2026-11-01',descricao_factual:'Relato público fictício posterior.',origem_informacao:'Declaração fictícia.',estado_apuracao:'declarado',evidencias:[]});
 const html=renderToStaticMarkup(await PublicActivity({params:Promise.resolve({id:'10000000-0000-4000-8000-000000000001'})}));expect(html).toContain('Relato público fictício posterior.');expect(html).toContain('declarado');
});
it('C08: público apresenta divergência sem conclusão consensual e preserva relato',async()=>{
 get.mockResolvedValue({data_realizacao:'2026-11-01',descricao_factual:'Relato original fictício preservado.',origem_informacao:'Declaração fictícia.',estado_apuracao:'contestado',evidencias:[]});const html=renderToStaticMarkup(await PublicActivity({params:Promise.resolve({id:'10000000-0000-4000-8000-000000000001'})}));expect(html).toContain('Relato original fictício preservado.');expect(html).toContain('Há divergência registrada; não há conclusão consensual.');
});
