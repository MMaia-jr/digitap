import {it,expect,vi} from 'vitest';
import {createActivityService} from '../../src/lib/activities/service.server';
import type {Sql,Transaction} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
vi.mock('../../src/lib/database.server',()=>({withTransaction:vi.fn()}));
vi.mock('../../src/lib/supabase/server',()=>({userClient:vi.fn()}));
const id='10000000-0000-4000-8000-000000000001',actor='20000000-0000-4000-8000-000000000001',org='30000000-0000-4000-8000-000000000001',key='40000000-0000-4000-8000-000000000001';
function setup(options:{role?:string;missing?:boolean;version?:number;state?:string;retired?:boolean;visitor?:boolean}={}){
 const snapshot={titulo:'Conteúdo aprovado anterior'};
 const row={id,estado_editorial:options.retired?'retirada':'publicada',estado_programacao:options.state??'programada',versao_submetida:options.version??1,numero_versao_publicada:1,inicio_previsto:'2030-01-01T12:00:00Z',versao_publicada:snapshot};
 const events:unknown[][]=[];
 const query=vi.fn(async(text:string,values?:unknown[])=>{
  if(text.includes('from public.contas_acesso'))return {rows:[{id:actor,auth_user_id:actor,papel:options.role??'editor',situacao:'ativa',organizacao_id:null}]};
  if(text.includes('from public.atividades'))return {rows:options.missing?[]:[{...row,organizacao_id:org}]};
  if(text.includes('from public.eventos_editoriais'))return {rows:[]};
  if(text.startsWith('update public.atividades')){row.estado_programacao=String(values?.[1]);return {rows:[{...row}]};}
  if(text.includes('insert into public.eventos_editoriais')){events.push(values??[]);return {rows:[]};}
  throw new Error('SQL inesperado');
 });
 const transaction=(async(fn:(sql:Sql)=>Promise<unknown>)=>fn({query} as unknown as Sql)) as Transaction;
 const service=createActivityService({verifyUser:async()=>options.visitor?null:({id:actor,email_confirmed_at:'2026-01-01'}),transaction});
 return {service,row,query,events,snapshot};
}
it.each(['adiada','cancelada'])('B10: %s fecha apoios, preserva snapshot e registra autor/estados',async state=>{
 const s=setup();
 const result=await s.service.schedule(id,{estado_programacao:state,estado_esperado:'programada',versao_esperada:1,pedido_id:key,motivo:'Alteração fictícia confirmada.'});
 expect(result.estado_programacao).toBe(state);
 expect(s.row.versao_publicada).toEqual(s.snapshot);
 const updates=s.query.mock.calls.filter(([q])=>q.startsWith('update public.atividades'));
 expect(updates).toHaveLength(1);expect(updates[0][0]).toContain('apoios_abertos=false');expect(updates[0][0]).not.toContain('versao_publicada=');
 expect(s.events).toHaveLength(1);expect(s.events[0]).toContain(actor);expect(s.events[0]).toContain('programada');expect(s.events[0]).toContain(state);
});

const command={estado_programacao:'cancelada',estado_esperado:'programada',versao_esperada:1,pedido_id:key,motivo:'Alteração fictícia confirmada.'};
it.each([{visitor:true,status:401},{role:'organizacao',status:403},{role:'forjado',status:403},{missing:true,status:404},{version:2,status:409},{state:'cancelada',status:409},{retired:true,status:409}])('B10: negativa %j sem escrita',async options=>{
 const s=setup(options);await expect(s.service.schedule(id,command)).rejects.toMatchObject({status:options.status});expect(s.events).toHaveLength(0);expect(s.query.mock.calls.some(([q])=>q.startsWith('update'))).toBe(false);
});
it.each([{motivo:''},{estado_programacao:'realizada'},{estado_programacao:'programada'},{estado_esperado:'cancelada'},{versao_esperada:0},{pedido_id:'invalido'}])('B10: comando inválido %j antes da autorização',async patch=>{
 const s=setup();await expect(s.service.schedule(id,{...command,...patch})).rejects.toMatchObject({status:422});expect(s.query).not.toHaveBeenCalled();
});
it('B10: campos de titularidade/papel não são aceitos',async()=>{const s=setup();await expect(s.service.schedule(id,{...command,organizacao_id:org})).rejects.toMatchObject({status:400});expect(s.query).not.toHaveBeenCalled();});
