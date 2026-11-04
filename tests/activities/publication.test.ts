import {describe,it,expect,vi} from 'vitest';
import {createActivityService} from '../../src/lib/activities/service.server';
import {validatePublish,createSnapshot,parseSnapshot} from '../../src/lib/activities/publication';
import type {Transaction,Sql} from '../../src/lib/database.server';
import {createHash} from 'node:crypto';
vi.mock('server-only',()=>({}));vi.mock('../../src/lib/database.server',()=>({withTransaction:vi.fn()}));vi.mock('../../src/lib/supabase/server',()=>({userClient:vi.fn()}));
const id='10000000-0000-4000-8000-000000000001',org='20000000-0000-4000-8000-000000000001',uid='30000000-0000-4000-8000-000000000001',auth='40000000-0000-4000-8000-000000000001',event='50000000-0000-4000-8000-000000000001',key='60000000-0000-4000-8000-000000000001';
const now=new Date('2030-01-01T00:00:00Z');
const draft={titulo:'Atividade Fictícia',descricao:'Descrição aprovada fictícia.',inicio_previsto:'2030-04-12T18:30:00.000Z',orientacao_acesso:'Entrada fictícia gratuita.',referencia_oficial:null};
const command={versao_esperada:1,pedido_id:key};
function setup(options:{role?:string;anonymous?:boolean;blocked?:boolean;orgState?:string;state?:string;version?:number;authorized?:boolean;approved?:boolean;noHash?:boolean;changed?:boolean}={}){
 const actor={id:uid,auth_user_id:uid,organizacao_id:options.role==='organizacao'?org:null,papel:options.role??'editor',situacao:options.blocked?'bloqueada':'ativa'};
 const row={id,...draft,organizacao_id:org,estado_programacao:'programada',estado_editorial:options.state??'aprovada',versao_submetida:options.version??1,versao_publicada:null as unknown,numero_versao_publicada:null as number|null,publicada_em:null as string|null};let publications:Record<string,unknown>[]=[];
 if(options.changed)row.titulo='Conteúdo privado divergente';
 const query=vi.fn(async(text:string,values?:unknown[])=>{
  if(text.includes('from public.contas_acesso'))return {rows:[actor]};
  if(text.includes('from public.organizacoes'))return {rows:[{id:org,nome_publico:'Organização Fictícia',estado_validacao:options.orgState??'validada'}]};
  if(text.includes('from public.atividades'))return {rows:[{...row}]};
  if(text.includes('from public.autorizacoes_publicacao'))return {rows:options.authorized===false?[]:[{id:auth}]};
  if(text.includes('from public.eventos_editoriais')&&text.includes("'atividade_revisao_aprovada'"))return {rows:options.approved===false?[]:[{id:event,executada_por_conta_id:uid,justificativa_restrita:JSON.stringify({tipo:'revisao.v1',acao:'aprovar',versao_esperada:1,estado_esperado:'em_revisao',autorizacao_id:auth,...(options.noHash?{}:{conteudo_sha256:createHash('sha256').update(JSON.stringify({id,versao:1,...draft})).digest('hex')})})}]};
  if(text.includes('from public.eventos_editoriais'))return {rows:publications};
  if(text.includes('update public.atividades')){row.estado_editorial='publicada';row.versao_publicada=JSON.parse(String(values?.[1]));row.numero_versao_publicada=Number(values?.[2]);row.publicada_em=String(values?.[3]);return {rows:[{...row}]};}
  if(text.includes('insert into public.eventos_editoriais')){publications=[{id:key,executada_por_conta_id:uid,justificativa_restrita:values?.[2]}];return {rows:[]};}
  throw new Error('Consulta inesperada.');
 });
 const transaction=vi.fn(async(fn:(s:Sql)=>Promise<unknown>)=>fn({query} as unknown as Sql)) as unknown as Transaction;
 return {service:createActivityService({transaction,verifyUser:async()=>options.anonymous?null:{id:uid,email_confirmed_at:'2029-01-01'},now:()=>now}),query,transaction,row};
}
describe('B07 — publicação com ports simulados, não integração',()=>{
 it('visitante não abre transação privilegiada',async()=>{const s=setup({anonymous:true});await expect(s.service.publish(id,command)).rejects.toMatchObject({status:401});expect(s.transaction).not.toHaveBeenCalled();});
 it.each(['organizacao','papel_forjado'])('A07: papel %s não publica',async role=>{await expect(setup({role}).service.publish(id,command)).rejects.toMatchObject({status:403});});
 it('editor bloqueado não publica',async()=>{await expect(setup({blocked:true}).service.publish(id,command)).rejects.toMatchObject({status:403});});
 it.each(['pendente','suspensa'])('A07: organização %s bloqueia publicação',async orgState=>{await expect(setup({orgState}).service.publish(id,command)).rejects.toMatchObject({status:422});});
 it.each(['rascunho','enviada','em_revisao','devolvida','rejeitada'])('estado %s não publica',async state=>{await expect(setup({state}).service.publish(id,command)).rejects.toMatchObject({status:409});});
 it('versão divergente conflita',async()=>{await expect(setup({version:2}).service.publish(id,command)).rejects.toMatchObject({status:409});});
 it('estado aprovada sem evento compatível não é prova suficiente',async()=>{await expect(setup({approved:false}).service.publish(id,command)).rejects.toMatchObject({status:409});});
 it('autorização inválida bloqueia primeira publicação',async()=>{await expect(setup({authorized:false}).service.publish(id,command)).rejects.toMatchObject({status:422});});
 it.each([{noHash:true},{changed:true}])('não publica conteúdo sem vínculo exato com a aprovação',async options=>{await expect(setup(options).service.publish(id,command)).rejects.toMatchObject({status:409});});
 it.each(['editor','administrador'])('%s persiste snapshot/evento na mesma transação',async role=>{const s=setup({role});await expect(s.service.publish(id,command)).resolves.toMatchObject({estado_editorial:'publicada'});expect(s.transaction).toHaveBeenCalledTimes(1);expect(s.row.numero_versao_publicada).toBe(1);expect(s.query.mock.calls.some(([q])=>q.includes('insert into public.eventos_editoriais'))).toBe(true);});
 it('retry não duplica evento; outra chave não republica',async()=>{const s=setup();await s.service.publish(id,command);await expect(s.service.publish(id,command)).resolves.toMatchObject({repetida:true});await expect(s.service.publish(id,{...command,pedido_id:event})).rejects.toMatchObject({status:409});expect(s.query.mock.calls.filter(([q])=>q.includes('insert into public.eventos_editoriais')).length).toBe(1);});
});
describe('B07 — comandos e snapshot público',()=>{
 it('aceita comando mínimo',()=>expect(validatePublish(command)).toEqual(command));
 it.each(['papel','organizacao_id','autorizacao_id','versao_publicada','publicada_em'])('rejeita %s do cliente',field=>expect(()=>validatePublish({...command,[field]:'forjado'})).toThrow(expect.objectContaining({status:400})));
 it.each([{...command,versao_esperada:0},{...command,pedido_id:'invalido'}])('rejeita comando inválido',value=>expect(()=>validatePublish(value)).toThrow(expect.objectContaining({status:422})));
 it('snapshot permite somente conteúdo/atribuição públicos',()=>{
  const snapshot=createSnapshot({id,...draft,versao_submetida:1},{id:org,nome_publico:'Organização Fictícia'},'programada',now,now);
  const projected=parseSnapshot({...snapshot,motivo_editorial:'RESTRITO',comprovante_restrito:'RESTRITO',organizacao:{...snapshot.organizacao,email:'RESTRITO'}});
  expect(projected.titulo).toBe(draft.titulo);expect(JSON.stringify(projected)).not.toContain('RESTRITO');
 });
 it('leitura de snapshot passado não depende do início continuar futuro',()=>{const snap=createSnapshot({id,...draft,versao_submetida:1},{id:org,nome_publico:'Organização Fictícia'},'programada',now,now);expect(parseSnapshot({...snap,inicio_previsto:'2020-01-01T00:00:00Z'}).inicio_previsto).toContain('2020');});
});
