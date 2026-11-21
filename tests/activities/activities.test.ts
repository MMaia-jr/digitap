import { describe,it,expect,vi } from 'vitest';
import type { Sql,Transaction } from '../../src/lib/database.server';
import { validateDraft,validateVersion,ActivityError,localStartToInstant } from '../../src/lib/activities/domain';
import { createActivityService } from '../../src/lib/activities/service.server';
vi.mock('server-only',()=>({}));
vi.mock('../../src/lib/database.server',()=>({withTransaction:vi.fn()}));
vi.mock('../../src/lib/supabase/server',()=>({userClient:vi.fn()}));
const now=new Date('2030-01-01T00:00:00Z');
const draft={titulo:'Atividade Fictícia',descricao:'Descrição factual de teste.',inicio_previsto:'2030-04-12T15:30:00-03:00',orientacao_acesso:'Entrada fictícia gratuita.',referencia_oficial:'https://exemplo.invalid/agenda'};
describe('B02/B03 — domínio puro',()=>{
 it('aceita dados válidos e conserva o instante com fuso explícito',()=>expect(validateDraft(draft,now).inicio_previsto).toBe('2030-04-12T18:30:00.000Z'));
 it.each(['titulo','descricao','inicio_previsto','orientacao_acesso'])('B02: %s ausente impede escrita/envio',field=>{
   const value:Record<string,unknown>={...draft};delete value[field];expect(()=>validateDraft(value,now)).toThrow(ActivityError);
 });
 it.each(['2030-02-30T10:00:00-03:00','2030-04-12T15:30','2020-01-01T10:00:00Z','2030-04-12T15:30:00+15:00','invalid'])('B03: rejeita data inválida/passada/sem fuso: %s',date=>expect(()=>validateDraft({...draft,inicio_previsto:date},now)).toThrow(ActivityError));
 it.each(['javascript:alert(1)','https://user:password@example.invalid','não é URL','https://exemplo.invalid/\nagenda'])('B03: rejeita URL imprópria: %s',url=>expect(()=>validateDraft({...draft,referencia_oficial:url},now)).toThrow(ActivityError));
 it.each(['<script>alert(1)</script>','<img src=x onerror=alert(1)>','<script sem fechamento','a'.repeat(5001)])('B03: rejeita HTML ou conteúdo excessivo',descricao=>expect(()=>validateDraft({...draft,descricao},now)).toThrow(ActivityError));
 it('aceita texto Unicode nos limites medidos como PostgreSQL e URL opcional',()=>expect(validateDraft({...draft,titulo:'á'.repeat(180),referencia_oficial:''},now).referencia_oficial).toBeNull());
 it.each(['organizacao_id','criada_por_conta_id','estado_editorial','versao_publicada','apoios_abertos','papel'])('B01: rejeita campo privilegiado %s',key=>expect(()=>validateDraft({...draft,[key]:'indevido'},now)).toThrow(ActivityError));
 it.each([0,-1,1.5,'1',null])('rejeita versão esperada inválida',value=>expect(()=>validateVersion(value)).toThrow(ActivityError));
 it('converte datetime-local explicitamente em America/Sao_Paulo',()=>expect(localStartToInstant('2030-04-12T15:30',now)).toBe('2030-04-12T18:30:00.000Z'));
 it('não normaliza silenciosamente dia impossível no datetime-local',()=>expect(()=>localStartToInstant('2030-02-30T10:00',now)).toThrow(ActivityError));
});

const uid='10000000-0000-4000-8000-000000000001',org='20000000-0000-4000-8000-000000000001',id='30000000-0000-4000-8000-000000000001';
const user={id:uid,email_confirmed_at:'2029-01-01T00:00:00Z'};
const account={id:'40000000-0000-4000-8000-000000000001',auth_user_id:uid,organizacao_id:org,papel:'organizacao',situacao:'ativa'};
function setup(options:{user?:typeof user|null;account?:Record<string,unknown>|null;other?:boolean;state?:string;version?:number;suspended?:boolean;date?:string;authority?:'titular'|'representante'|null;editLink?:{current:boolean;state:string;scopes:readonly string[]}}={}){
 const a=options.account===undefined?account:options.account;
 const row={id,...draft,inicio_previsto:options.date??draft.inicio_previsto,estado_editorial:options.state??'rascunho',versao_submetida:options.version??1};
 const query=vi.fn(async(text:string,values?:unknown[])=>{
  void values;
  if(text.includes('from public.pessoas_fisicas'))return {rows:[]};
  if(text.includes("select acao,justificativa_restrita from public.eventos_editoriais"))return {rows:[]};
  if(text.includes('from public.contas_acesso'))return {rows:a?[a]:[]};
  if(text.includes('from public.sujeitos_publicadores')&&text.includes('vinculos_publicadores')){
   const authority=options.authority===undefined?'titular':options.authority;
   const link=options.editLink;
   if(text.includes("'editar'=any(v.escopos)")&&link&&(!link.current||link.state!=='ativo'||!link.scopes.includes('editar')))return {rows:[]};
   return {rows:authority?[{id:'50000000-0000-4000-8000-000000000001',papel_vinculo:authority}]:[]};
  }
  if(text.includes('insert into public.autorizacoes_publicacao'))return {rows:[]};
  if(text.includes('from public.organizacoes'))return {rows:[{estado_validacao:options.suspended?'suspensa':'pendente'}]};
  if(text.includes('from public.atividades'))return {rows:options.other?[]:[row]};
  if(text.includes('insert into public.atividades'))return {rows:[row]};
  if(text.includes('update public.atividades'))return {rows:[{...row,estado_editorial:text.includes("'enviada'")?'enviada':'rascunho',versao_submetida:text.includes('versao_submetida + 1')?2:row.versao_submetida}]};
  if(text.includes('insert into public.eventos_editoriais'))return {rows:[]};
  throw new Error('Consulta inesperada no teste.');
 });
 const transaction=vi.fn(async(fn:(sql:Sql)=>Promise<unknown>)=>fn({query} as unknown as Sql)) as unknown as Transaction;
 const verifyUser=vi.fn(async()=>options.user===undefined?user:options.user);
 const service=createActivityService({verifyUser,transaction,now:()=>now});return {service,query,transaction,verifyUser};
}
describe('B01–B04 — serviço com ports simulados, sem alegação de SQL real',()=>{
 it('B01: visitante não abre transação privilegiada',async()=>{const s=setup({user:null});await expect(s.service.create(draft)).rejects.toMatchObject({status:401});expect(s.transaction).not.toHaveBeenCalled();});
 it('B01: conta sem confirmação não abre transação',async()=>{const s=setup({user:{...user,email_confirmed_at:''}});await expect(s.service.list()).rejects.toMatchObject({status:403});expect(s.transaction).not.toHaveBeenCalled();});
 it.each([null,{...account,situacao:'bloqueada'},{...account,papel:'inventado'}])('B01: vínculo/papel inválido falha fechado',async a=>{await expect(setup({account:a}).service.list()).rejects.toMatchObject({status:403});});
 it('B01: organização suspensa não cria rascunho',async()=>{await expect(setup({suspended:true}).service.create(draft)).rejects.toMatchObject({status:403});});
 it('B01: cria rascunho com tenant/autor derivados do banco',async()=>{const s=setup();await s.service.create(draft);const call=s.query.mock.calls.find(([q])=>q.includes('insert into public.atividades'));expect(call?.[1]).toContain(org);expect(call?.[1]).toContain(account.id);});
 it('B01: outro tenant recebe 404 e consulta é filtrada pelo vínculo próprio',async()=>{const s=setup({other:true});await expect(s.service.get(id)).rejects.toMatchObject({status:404});const call=s.query.mock.calls.find(([q])=>q.includes('from public.atividades'));expect(call?.[1]).toEqual([id,org]);});
 it.each(['editor','administrador'])('B01: %s explícito lê detalhe mas não cria ou envia',async papel=>{const s=setup({account:{...account,papel,organizacao_id:null}});await expect(s.service.get(id)).resolves.toMatchObject({id});await expect(s.service.create(draft)).rejects.toMatchObject({status:403});await expect(s.service.submit(id,{versao_esperada:1})).rejects.toMatchObject({status:403});});
 it('B01: edição usa versão esperada e incrementa revisão privada',async()=>{const s=setup();await expect(s.service.update(id,{...draft,versao_esperada:1})).resolves.toMatchObject({versao_submetida:2});});
 it('B01: conflito de versão impede sobrescrita',async()=>{await expect(setup({version:2}).service.update(id,{...draft,versao_esperada:1})).rejects.toMatchObject({status:409});});
 it('B04: enviada não pode ser editada',async()=>{await expect(setup({state:'enviada'}).service.update(id,{...draft,versao_esperada:1})).rejects.toMatchObject({status:409});});
 it('B04: envio registra estado e evento na mesma transação fornecida',async()=>{const s=setup();await expect(s.service.submit(id,{versao_esperada:1,autoriza_publicacao:true})).resolves.toMatchObject({estado_editorial:'enviada'});expect(s.transaction).toHaveBeenCalledTimes(1);expect(s.query.mock.calls.some(([q])=>q.includes('insert into public.eventos_editoriais'))).toBe(true);});
 it('B04: retry da versão enviada não cria outro evento',async()=>{const s=setup({state:'enviada'});await s.service.submit(id,{versao_esperada:1,autoriza_publicacao:true});expect(s.query.mock.calls.some(([q])=>q.includes('insert into public.eventos_editoriais'))).toBe(false);});
 it('B03/B04: revalida data persistida antes de enviar',async()=>{const s=setup({date:'2020-01-01T10:00:00Z'});await expect(s.service.submit(id,{versao_esperada:1,autoriza_publicacao:true})).rejects.toMatchObject({status:422});expect(s.query.mock.calls.some(([q])=>q.includes('update public.atividades'))).toBe(false);});
 it('B02: payload incompleto não cria rascunho',async()=>{await expect(setup().service.create({titulo:'Só título'})).rejects.toMatchObject({status:422});});
 it('B04: cliente não define a transição ou snapshot',async()=>{await expect(setup().service.submit(id,{versao_esperada:1,estado_editorial:'publicada'})).rejects.toMatchObject({status:400});});
 it('falha interna não expõe SQL/credenciais',async()=>{const s=createActivityService({verifyUser:async()=>user,transaction:async()=>{throw new Error('credencial privada');},now:()=>now});await expect(s.list()).rejects.toMatchObject({status:503,message:'Serviço indisponível. Tente novamente.'});});
});

describe('AUT-ORG-01 — autorização explícita no envio organizacional',()=>{
 const consent={versao_esperada:1,autoriza_publicacao:true};
 function authorizationWrites(s:ReturnType<typeof setup>){
  return s.query.mock.calls.filter(([sql])=>sql.includes('insert into public.autorizacoes_publicacao'));
 }
 it.each([undefined,false])('recusa envio organizacional sem autorização afirmativa (%s)',async authorization=>{
  const s=setup();
  await expect(s.service.submit(id,{versao_esperada:1,autoriza_publicacao:authorization})).rejects.toMatchObject({status:422});
  expect(authorizationWrites(s)).toHaveLength(0);
  expect(s.query.mock.calls.some(([sql])=>sql.includes('update public.atividades'))).toBe(false);
 });
 it.each(['titular','representante'] as const)('registra prova da versão e conteúdo com %s autorizado na mesma transação',async authority=>{
  const s=setup({authority});
  await expect(s.service.submit(id,consent)).resolves.toMatchObject({estado_editorial:'enviada'});
  expect(s.transaction).toHaveBeenCalledTimes(1);
  const [authorization]=authorizationWrites(s);
  expect(authorizationWrites(s)).toHaveLength(1);
  expect(authorization[1]).toContainEqual(['divulgacao','atividade:versao:1']);
  const proof=JSON.parse(String(authorization[1]?.at(-1)));
  expect(proof).toMatchObject({tipo:'consentimento-organizacao.v1',atividade_id:id,conta_id:account.id,organizacao_id:org,versao:1,conteudo_sha256:expect.stringMatching(/^[a-f0-9]{64}$/)});
  const permission=s.query.mock.calls.find(([sql])=>sql.includes('from public.sujeitos_publicadores'));
  expect(permission?.[1]).toEqual([org,account.id]);
  for(const fragment of ["'enviar'=any(v.escopos)","'publicar'=any(v.escopos)", "v.papel_vinculo in ('titular','representante')", "v.atual", "v.situacao='ativo'", "for share of s,v"]){
   expect(permission?.[0]).toContain(fragment);
  }
  expect(s.query.mock.calls.some(([sql])=>sql.includes('versao_publicada='))).toBe(false);
 });
 it('recusa uma conta da organização sem vínculo com os escopos exigidos',async()=>{
  const s=setup({authority:null});
  await expect(s.service.submit(id,consent)).rejects.toMatchObject({status:403});
  expect(authorizationWrites(s)).toHaveLength(0);
 });
 it('recusa autorização alheia e de versão obsoleta',async()=>{
  const other=setup({other:true}), stale=setup({version:2});
  await expect(other.service.submit(id,consent)).rejects.toMatchObject({status:404});
  await expect(stale.service.submit(id,consent)).rejects.toMatchObject({status:409});
  expect(authorizationWrites(other)).toHaveLength(0);
  expect(authorizationWrites(stale)).toHaveLength(0);
 });
 it('retry de versão enviada não recria autorização nem a torna vigente',async()=>{
  const s=setup({state:'enviada'});
  await expect(s.service.submit(id,consent)).resolves.toMatchObject({estado_editorial:'enviada'});
  expect(authorizationWrites(s)).toHaveLength(0);
  expect(s.query.mock.calls.some(([sql])=>sql.includes('update public.autorizacoes_publicacao'))).toBe(false);
 });
 it('nova versão só recebe o escopo da própria versão',async()=>{
  const s=setup({version:2});
  await s.service.submit(id,{...consent,versao_esperada:2});
  expect(authorizationWrites(s)[0]?.[1]).toContainEqual(['divulgacao','atividade:versao:2']);
 });
});

describe('FIX-AUT-ORG-01 — editar depende de vínculo vigente',()=>{
 const edit={...draft,titulo:'Título sintético alterado',versao_esperada:1};
 const link={current:true,state:'ativo',scopes:['editar']};
 it.each([
  ['sem editar',{...link,scopes:['enviar','publicar']}],
  ['suspenso',{...link,state:'suspenso'}],
  ['revogado',{...link,state:'revogado'}],
  ['substituído',{...link,current:false}],
 ] as const)('representante %s recebe 403 e nenhuma escrita',async(_label,editLink)=>{
  const s=setup({authority:'representante',editLink});
  await expect(s.service.update(id,edit)).rejects.toMatchObject({status:403});
  expect(s.query.mock.calls.some(([sql])=>sql.includes('update public.atividades'))).toBe(false);
  await expect(s.service.get(id)).resolves.toMatchObject({titulo:draft.titulo,versao_submetida:1});
 });
 it.each(['titular','representante'] as const)('%s ativo com editar preserva a edição transacional',async authority=>{
  const s=setup({authority,editLink:link});
  await expect(s.service.update(id,edit)).resolves.toMatchObject({versao_submetida:2});
  expect(s.transaction).toHaveBeenCalledTimes(1);
  const statements=s.query.mock.calls.map(([sql])=>sql);
  const guard=statements.findIndex(sql=>sql.includes("'editar'=any(v.escopos)"));
  const write=statements.findIndex(sql=>sql.includes('update public.atividades'));
  expect(guard).toBeGreaterThanOrEqual(0);
  expect(guard).toBeLessThan(write);
  expect(s.query.mock.calls[guard][1]).toEqual([org,account.id,id]);
  for(const predicate of ["a.sujeito_id=s.id","v.atual","v.situacao='ativo'","v.papel_vinculo in ('titular','representante')","for share of s,v"]){
   expect(statements[guard]).toContain(predicate);
  }
 });
 it('mantém 404 entre organizações e 409 para versão obsoleta do ator autorizado',async()=>{
  await expect(setup({other:true}).service.update(id,edit)).rejects.toMatchObject({status:404});
  await expect(setup({version:2,editLink:link}).service.update(id,edit)).rejects.toMatchObject({status:409});
 });
 it('representante sem editar mantém envio delegado com consentimento explícito',async()=>{
  const s=setup({authority:'representante',editLink:{...link,scopes:['enviar','publicar']}});
  await expect(s.service.submit(id,{versao_esperada:1})).rejects.toMatchObject({status:422});
  await expect(s.service.submit(id,{versao_esperada:1,autoriza_publicacao:true})).resolves.toMatchObject({estado_editorial:'enviada'});
 });
});
