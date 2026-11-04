import {it,expect,vi,describe} from 'vitest';
import {validateReview,ActivityError} from '../../src/lib/activities/domain';
import {createActivityService} from '../../src/lib/activities/service.server';
import type {Transaction,Sql} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
vi.mock('../../src/lib/database.server',()=>({withTransaction:vi.fn()}));
vi.mock('../../src/lib/supabase/server',()=>({userClient:vi.fn()}));
const uid='10000000-0000-4000-8000-000000000001',id='20000000-0000-4000-8000-000000000001',auth='30000000-0000-4000-8000-000000000001',key='40000000-0000-4000-8000-000000000001';
const user={id:uid,email_confirmed_at:'2026-01-01'};
const actor={id:'50000000-0000-4000-8000-000000000001',auth_user_id:uid,papel:'editor',situacao:'ativa',organizacao_id:null};
const start={acao:'iniciar',versao_esperada:1,estado_esperado:'enviada',pedido_id:key};
const approve={...start,acao:'aprovar',estado_esperado:'em_revisao',autorizacao_id:auth};
const reject={...start,acao:'rejeitar',motivo:'Motivo exclusivamente fictício.'};
function setup(options:{role?:string;blocked?:boolean;anonymous?:boolean;state?:string;version?:number;auth?:boolean;events?:Record<string,unknown>[];other?:boolean}={}){
 let events=options.events??[];
 const account={...actor,papel:options.role??actor.papel,situacao:options.blocked?'bloqueada':'ativa',organizacao_id:options.role==='organizacao'?auth:null};
 const activity={id,titulo:'Atividade fictícia',descricao:'Descrição fictícia de revisão.',inicio_previsto:'2030-04-12T18:30:00Z',orientacao_acesso:'Entrada fictícia.',referencia_oficial:null,estado_editorial:options.state??'enviada',versao_submetida:options.version??1};
 const query=vi.fn(async(text:string,values?:unknown[])=>{
  if(text.includes('from public.contas_acesso'))return {rows:[account]};
  if(text.includes('from public.organizacoes'))return {rows:[{estado_validacao:'pendente'}]};
  if(text.includes('from public.atividades'))return {rows:options.other?[]:[{...activity}]};
  if(text.includes('from public.autorizacoes_publicacao'))return {rows:options.auth===false?[]:[{id:auth}]};
  if(text.includes('from public.eventos_editoriais'))return {rows:events};
  if(text.includes('update public.atividades')){activity.estado_editorial=String(values?.[1]);return {rows:[{...activity}]};}
  if(text.includes('insert into public.eventos_editoriais')){events=[...events,{executada_por_conta_id:actor.id,justificativa_restrita:values?.[5]}];return {rows:[]};}
  throw new Error('Consulta inesperada no teste.');
 });
 const transaction=vi.fn(async(fn:(sql:Sql)=>Promise<unknown>)=>fn({query} as unknown as Sql)) as unknown as Transaction;
 const service=createActivityService({verifyUser:async()=>options.anonymous?null:user,transaction});return {service,query,transaction};
}
describe('B05/B06 — validação pura',()=>{
 it.each([start,approve,reject,{...reject,acao:'devolver'}])('aceita comando editorial válido',value=>{expect(validateReview(value).pedido_id).toBe(key);});
 it.each([{...start,papel:'editor'},{...approve,versao_publicada:{}},{...reject,executada_por_conta_id:uid}])('rejeita campos privilegiados',value=>expect(()=>validateReview(value)).toThrow(expect.objectContaining({status:400})));
 it.each(['','curto','<script>motivo</script>','a'.repeat(1501)])('B06: motivo ausente/inválido impede decisão',motivo=>expect(()=>validateReview({...reject,motivo})).toThrow(expect.objectContaining({status:422})));
 it.each([{...approve,autorizacao_id:undefined},{...start,pedido_id:'inválido'},{...start,estado_esperado:'aprovada'},{...start,versao_esperada:0},{...start,acao:'publicar'}])('rejeita comando inválido',value=>expect(()=>validateReview(value)).toThrow(ActivityError));
});
describe('B05/B06 — serviço com ports simulados',()=>{
 it('visitante não abre transação',async()=>{const s=setup({anonymous:true});await expect(s.service.review(id,start)).rejects.toMatchObject({status:401});expect(s.transaction).not.toHaveBeenCalled();});
 it.each(['organizacao','papel_forjado'])('papel %s não revisa',async role=>{await expect(setup({role}).service.review(id,start)).rejects.toMatchObject({status:403});});
 it('editor bloqueado não revisa',async()=>{await expect(setup({blocked:true}).service.review(id,start)).rejects.toMatchObject({status:403});});
 it.each(['editor','administrador'])('%s inicia revisão e audita',async role=>{const s=setup({role});await expect(s.service.review(id,start)).resolves.toMatchObject({estado_editorial:'em_revisao'});expect(s.transaction).toHaveBeenCalledTimes(1);expect(s.query.mock.calls.some(([q])=>q.includes('insert into public.eventos_editoriais'))).toBe(true);});
 it('aprovação exige início de revisão anterior',async()=>{await expect(setup().service.review(id,approve)).rejects.toMatchObject({status:409});});
 it('autorização ausente/incompatível nega aprovação',async()=>{const s=setup({state:'em_revisao',auth:false});await expect(s.service.review(id,approve)).rejects.toMatchObject({status:422});expect(s.query.mock.calls.some(([q])=>q.includes('update public.atividades'))).toBe(false);});
 it('autorização vincula a atividade e a versão revisada',async()=>{const s=setup({state:'em_revisao'});await expect(s.service.review(id,approve)).resolves.toMatchObject({estado_editorial:'aprovada'});const call=s.query.mock.calls.find(([q])=>q.includes('from public.autorizacoes_publicacao'));expect(call?.[1]).toEqual([auth,id,'atividade:versao:1']);});
 it.each(['devolver','rejeitar'])('B06: %s com motivo fica privado',async acao=>{const s=setup();await expect(s.service.review(id,{...reject,acao})).resolves.toMatchObject({estado_editorial:acao==='devolver'?'devolvida':'rejeitada'});expect(s.query.mock.calls.some(([q])=>q.includes('versao_publicada='))).toBe(false);});
 it('versão desatualizada conflita sem transição',async()=>{await expect(setup({version:2}).service.review(id,start)).rejects.toMatchObject({status:409});});
 it('mesmo pedido é idempotente, mas reuso com payload diferente conflita',async()=>{const s=setup();await s.service.review(id,start);await expect(s.service.review(id,start)).resolves.toMatchObject({repetida:true});await expect(s.service.review(id,{...reject,pedido_id:key})).rejects.toMatchObject({status:409});expect(s.query.mock.calls.filter(([q])=>q.includes('insert into public.eventos_editoriais')).length).toBe(1);});
 it('terceiro não consulta motivo e dono recebe apenas motivo, sem metadata',async()=>{
  const meta=JSON.stringify({tipo:'revisao.v1',...validateReview(reject)});
  const s=setup({role:'organizacao',state:'rejeitada',events:[{justificativa_restrita:meta}]});
  const data=await s.service.get(id);expect(data.motivo_editorial).toBe(reject.motivo);expect(JSON.stringify(data)).not.toContain(key);
  const other=setup({role:'organizacao',other:true});await expect(other.service.get(id)).rejects.toMatchObject({status:404});expect(other.query.mock.calls.some(([q])=>q.includes('from public.eventos_editoriais'))).toBe(false);
 });
 it('fila exige editor, não apenas dono autenticado',async()=>{await expect(setup({role:'organizacao'}).service.reviewQueue()).rejects.toMatchObject({status:403});});
 it('editor conserva acesso à fila após decisão, sem oferecer nova decisão no estado final',async()=>{await expect(setup({state:'aprovada'}).service.get(id)).resolves.toMatchObject({acesso_editorial:true,pode_revisar:false});});
 it('retry de aprovação revalida autorização revogada mesmo se já houve sucesso',async()=>{
  const metadata=JSON.stringify({tipo:'revisao.v1',...validateReview(approve)});
  const s=setup({state:'aprovada',auth:false,events:[{executada_por_conta_id:actor.id,justificativa_restrita:metadata}]});
  await expect(s.service.review(id,approve)).rejects.toMatchObject({status:422});
 });
 it('aprovação registra impressão digital do conteúdo revisado',async()=>{const s=setup({state:'em_revisao'});await s.service.review(id,approve);const call=s.query.mock.calls.find(([q])=>q.includes('insert into public.eventos_editoriais'));expect(JSON.parse(String(call?.[1]?.[5])).conteudo_sha256).toMatch(/^[0-9a-f]{64}$/);});
});
