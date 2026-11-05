import {it,expect,vi} from 'vitest';
import {createPublicQueries} from '../../src/lib/queries/public.server';
import {createSnapshot} from '../../src/lib/activities/publication';
import {snapshotHash} from '../../src/lib/activities/publication.server';
import type {Sql,Transaction} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));vi.mock('../../src/lib/database.server',()=>({withTransaction:vi.fn()}));
const id='10000000-0000-4000-8000-000000000001',org='20000000-0000-4000-8000-000000000001',auth='30000000-0000-4000-8000-000000000001';
const now=new Date('2030-01-01T00:00:00Z');
const snap=createSnapshot({id,titulo:'Título autorizado',descricao:'Descrição aprovada e autorizada.',inicio_previsto:'2030-04-12T18:30:00Z',orientacao_acesso:'Acesso aprovado.',referencia_oficial:null,versao_submetida:1},{id:org,nome_publico:'Organização Autorizada'},'programada',now,now);
function setup(options:{authorized?:boolean;visible?:boolean;broken?:boolean;missingEvent?:boolean}={}){
 const query=vi.fn(async(text:string)=>{
  if(options.broken)throw new Error('Credencial SQL privada');
  if(text.includes('from public.atividades'))return {rows:options.visible===false?[]:[{id,organizacao_id:org,numero_versao_publicada:1,versao_publicada:{...snap,motivo:'SEGREDO'},titulo:'RASCUNHO RESTRITO'}]};
  if(text.includes('from public.eventos_editoriais'))return {rows:options.missingEvent?[]:[{executada_por_conta_id:org,justificativa_restrita:JSON.stringify({tipo:'publicacao.v1',pedido_id:org,versao_esperada:1,autorizacao_id:auth,aprovacao_evento_id:org,snapshot_sha256:snapshotHash(snap)})}]};
  if(text.includes('from public.autorizacoes_publicacao'))return {rows:options.authorized===false?[]:[{id:auth}]};
  throw new Error('Consulta inesperada.');
 });
 const transaction=vi.fn(async(fn:(s:Sql)=>Promise<unknown>)=>fn({query} as unknown as Sql)) as unknown as Transaction;
 return {query,transaction,publicQueries:createPublicQueries({transaction})};
}
it('consulta pública serve somente snapshot, nunca campos privados ou extras',async()=>{const s=setup();const data=await s.publicQueries.get(id);expect(data.titulo).toBe('Título autorizado');expect(JSON.stringify(data)).not.toMatch(/RASCUNHO|SEGREDO/);expect(s.query.mock.calls[0][0]).not.toContain('a.titulo');});
it('listagem pública não usa cookies/identidade e mantém o mesmo snapshot',async()=>{const result=await setup().publicQueries.list();expect(result.length).toBe(1);expect(result[0].organizacao.nome_publico).toBe('Organização Autorizada');});
it.each([{visible:false},{authorized:false},{missingEvent:true}])('objeto inelegível fica oculto',async options=>{const s=setup(options);await expect(s.publicQueries.get(id)).rejects.toMatchObject({status:404});expect(await s.publicQueries.list()).toEqual([]);});
it('erro de banco é indisponibilidade, não lista vazia falsa',async()=>{await expect(setup({broken:true}).publicQueries.list()).rejects.toMatchObject({status:503,message:'Serviço indisponível. Tente novamente.'});});
it('ID malformado não abre transação',async()=>{const s=setup();await expect(s.publicQueries.get('invalido')).rejects.toMatchObject({status:404});expect(s.transaction).not.toHaveBeenCalled();});
it.each(['adiada','cancelada'])('B10: estado atual %s é público sem alterar snapshot aprovado',async state=>{
 const base=setup();
 const transaction=(async(fn:(s:Sql)=>Promise<unknown>)=>fn({query:async(text:string)=>{
  if(text.includes('from public.atividades'))return {rows:[{id,organizacao_id:org,numero_versao_publicada:1,versao_publicada:snap,estado_programacao:state}]};
  return base.query(text);
 }} as unknown as Sql)) as Transaction;
 const data=await createPublicQueries({transaction}).get(id);
 expect(data.estado_programacao).toBe(state);expect(snap.estado_programacao).toBe('programada');expect(data.titulo).toBe(snap.titulo);
});
