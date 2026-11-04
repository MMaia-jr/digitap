import {it,expect,vi} from 'vitest';
import {createActivityService} from '../../src/lib/activities/service.server';
import type {Sql,Transaction} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));vi.mock('../../src/lib/database.server',()=>({withTransaction:vi.fn()}));vi.mock('../../src/lib/supabase/server',()=>({userClient:vi.fn()}));
const id='10000000-0000-4000-8000-000000000001',org='20000000-0000-4000-8000-000000000001',user='30000000-0000-4000-8000-000000000001',key='40000000-0000-4000-8000-000000000001';
const content={titulo:'Versão fictícia nova',descricao:'Descrição fictícia para revisão.',inicio_previsto:'2030-06-01T12:00:00.000Z',orientacao_acesso:'Entrada fictícia gratuita.',referencia_oficial:null};
function setup(role='organizacao'){
 const row={id,...content,estado_editorial:'publicada',versao_submetida:1,numero_versao_publicada:1,versao_publicada:{titulo:'Versão anterior'},apoios_abertos:true};const events:unknown[][]=[];
 const query=vi.fn(async(text:string,values?:unknown[])=>{
 if(text.includes('from public.contas_acesso'))return {rows:[{id:user,auth_user_id:user,organizacao_id:org,papel:role,situacao:'ativa'}]};
 if(text.includes('from public.organizacoes'))return {rows:[{estado_validacao:'validada'}]};
 if(text.includes('from public.atividades'))return {rows:[{...row}]};
 if(text.includes('from public.eventos_editoriais'))return {rows:[]};
 if(text.includes('insert into public.eventos_editoriais')){events.push(values??[]);return {rows:[]};}
 if(text.includes('update public.atividades')){if(text.includes("'retirada'")){row.estado_editorial='retirada';row.apoios_abertos=false;}else{row.estado_editorial='rascunho';row.versao_submetida++;}return {rows:[{...row}]};}throw new Error('SQL inesperado');});
 const transaction=async(fn:(sql:Sql)=>Promise<unknown>)=>fn({query} as unknown as Sql);
 return {row,query,events,service:createActivityService({verifyUser:async()=>({id:user,email_confirmed_at:'2029-01-01'}),transaction:transaction as Transaction,now:()=>new Date('2030-01-01')})};
}
it('B08 RED: editar publicada inicia nova versão sem UPDATE no snapshot',async()=>{const s=setup();await expect(s.service.update(id,{...content,versao_esperada:1})).resolves.toMatchObject({estado_editorial:'rascunho',versao_submetida:2});expect(s.query.mock.calls.filter(([q])=>q.startsWith('update public.atividades')).every(([q])=>!q.includes('versao_publicada='))).toBe(true);expect(s.events.length).toBe(1);});
it('B09 RED: retirar é editorial, fecha apoio e audita na mesma transação',async()=>{const s=setup('editor');await expect(s.service.withdraw(id,{pedido_id:key,versao_esperada:1,motivo:'Retirada fictícia autorizada.'})).resolves.toMatchObject({estado_editorial:'retirada'});expect(s.row.apoios_abertos).toBe(false);expect(s.events.length).toBe(1);});
it.each(['organizacao','forjado'])('B09: papel %s não retira publicação',async role=>{await expect(setup(role).service.withdraw(id,{pedido_id:key,versao_esperada:1,motivo:'Motivo fictício válido.'})).rejects.toMatchObject({status:403});});
it('B08: proprietário vê opção de editar publicação, editor tem retirada mas não edição',async()=>{expect(await setup().service.get(id)).toMatchObject({pode_editar:true,pode_retirar:false});expect(await setup('editor').service.get(id)).toMatchObject({pode_editar:false,pode_retirar:true});});
it('B08: versão antiga bloqueia edição e não gera auditoria',async()=>{const s=setup();await expect(s.service.update(id,{...content,versao_esperada:2})).rejects.toMatchObject({status:409});expect(s.events).toHaveLength(0);});
