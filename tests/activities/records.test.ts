import {it,expect,vi} from 'vitest';
import type {Sql,Transaction} from '../../src/lib/database.server';
import {validateEvidence} from '../../src/lib/activities/domain';
import {createActivityService} from '../../src/lib/activities/service.server';
vi.mock('server-only',()=>({}));vi.mock('../../src/lib/database.server',()=>({withTransaction:vi.fn()}));vi.mock('../../src/lib/supabase/server',()=>({userClient:vi.fn()}));
const id='10000000-0000-4000-8000-000000000001';
const command={pedido_id:'20000000-0000-4000-8000-000000000001',versao_esperada:1,data_realizacao:'2026-11-05',descricao_factual:'Relato fictício do encontro.',origem_informacao:'Declaração da organização fictícia.'};
it('C01 RED: registro futuro é recusado antes da persistência',async()=>{
 const service=createActivityService({now:()=>new Date('2026-11-04T18:00:00Z')});const createRecord=Reflect.get(service,'createRecord');expect(createRecord).toBeTypeOf('function');await expect(createRecord(id,command)).rejects.toMatchObject({status:422});
});
it.each(['2026-02-30','2026-13-01','texto','2026-11-05'])('C01: data inválida/futura %s não abre transação',async date=>{
 const transaction=vi.fn();const service=createActivityService({transaction,now:()=>new Date('2026-11-04T18:00:00Z')});await expect(service.createRecord(id,{...command,data_realizacao:date})).rejects.toMatchObject({status:422});expect(transaction).not.toHaveBeenCalled();
});
it('C01: hoje em UTC ainda futuro em São Paulo não é aceito',async()=>{
 const transaction=vi.fn();await expect(createActivityService({transaction,now:()=>new Date('2026-11-05T01:00:00Z')}).createRecord(id,command)).rejects.toMatchObject({status:422});expect(transaction).not.toHaveBeenCalled();
});
it.each([{estado_apuracao:'corroborado'},{estado_editorial:'publicada'},{versao_publicada:{}},{organizacao_id:id}])('C02: declaração não aceita estado/snapshot/titularidade %j',async extra=>{
 const transaction=vi.fn();await expect(createActivityService({transaction,now:()=>new Date('2026-11-06T18:00:00Z')}).createRecord(id,{...command,...extra})).rejects.toMatchObject({status:400});expect(transaction).not.toHaveBeenCalled();
});
it('C03 RED: referência parcial não corrobora toda a declaração',async()=>{
 const query=vi.fn(async(text:string,values?:unknown[])=>{
  if(text.includes('from public.contas_acesso'))return {rows:[{id,auth_user_id:id,organizacao_id:id,papel:'organizacao',situacao:'ativa'}]};
  if(text.includes('from public.organizacoes'))return {rows:[{estado_validacao:'validada'}]};
  if(text.includes('from public.atividades'))return {rows:[{id,versao_submetida:1,inicio_previsto:'2026-11-01T12:00:00Z',estado_editorial:'publicada'}]};
  if(text.includes('from public.registros_realizacao'))return {rows:[{id,estado_editorial:'rascunho',estado_apuracao:'declarado'}]};
  if(text.includes('from public.eventos_editoriais'))return {rows:[]};
  if(text.includes('insert into public.evidencias'))return {rows:[{id,afirmacao_sustentada:values?.[3],aprovada_publicacao:false}]};
  if(text.includes('insert into public.eventos_editoriais'))return {rows:[]};
  throw new Error('SQL inesperado');
 });
 const transaction=(async(fn:(s:Sql)=>Promise<unknown>)=>fn({query} as unknown as Sql)) as Transaction;
 const service=createActivityService({transaction,verifyUser:async()=>({id,email_confirmed_at:'2026-01-01'}),now:()=>new Date('2026-11-04T18:00:00Z')});
 const add=Reflect.get(service,'addEvidence');expect(add).toBeTypeOf('function');
 const result=await add(id,{pedido_id:command.pedido_id,tipo_fonte:'Relato público',url_publica:'https://example.invalid/relato',afirmacao_sustentada:'A referência sustenta somente a abertura.',consultada_em:'2026-11-04T17:00:00Z'});
 expect(result).toMatchObject({afirmacao_sustentada:'A referência sustenta somente a abertura.',aprovada_publicacao:false});expect(query.mock.calls.some(([q])=>q.startsWith('update public.registros_realizacao'))).toBe(false);
});
it.each(['http://127.0.0.1/privado','http://192.168.0.1/arquivo','https://example.invalid/relato?email=fixture%40example.invalid','https://example.invalid/relato?token=ficticio','https://example.invalid/contato/12345678901'])('C04 RED: referência imprópria/sensível é recusada: %s',url=>{
 // Import estático abaixo exercita a validação antes de qualquer persistência/consulta externa.
 expect(()=>validateEvidence({pedido_id:command.pedido_id,tipo_fonte:'Relato público',url_publica:url,afirmacao_sustentada:'Sustenta somente parte do relato fictício.',consultada_em:'2026-11-04T17:00:00Z'},new Date('2026-11-04T18:00:00Z'))).toThrow();
});
it('C01: ano zero não é data persistível no PostgreSQL',async()=>{
 await expect(createActivityService({now:()=>new Date('2026-11-04T18:00:00Z')}).createRecord(id,{...command,data_realizacao:'0000-01-01'})).rejects.toMatchObject({status:422});
});
it('C04: data de consulta inexistente não é normalizada silenciosamente',()=>{
 expect(()=>validateEvidence({pedido_id:command.pedido_id,tipo_fonte:'Fonte fictícia',url_publica:'https://example.invalid/relato',afirmacao_sustentada:'A fonte sustenta somente a abertura.',consultada_em:'2026-02-30T12:00:00Z'},new Date('2026-11-04T18:00:00Z'))).toThrow();
});
