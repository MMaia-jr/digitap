import 'server-only';
import {ActivityError} from '../activities/domain';
import {withTransaction,type Transaction,type Sql} from '../database.server';
import {parseSnapshot,uuid,publicActivityPresentation,type PublicActivity} from '../activities/publication';
import {publicationRecord,requireVersionAuthorization,snapshotHash} from '../activities/publication.server';
interface PublicRow {id:string;organizacao_id:string|null;sujeito_id?:string;sujeito_tipo?:string;numero_versao_publicada:number;versao_publicada:unknown;estado_programacao?:string}
export function createPublicQueries(deps:{transaction?:Transaction}={}){
 const transaction=deps.transaction??withTransaction;
 async function visible(sql:Sql,row:PublicRow):Promise<PublicActivity|null>{
  try{
   const snapshot=parseSnapshot(row.versao_publicada),event=await publicationRecord(sql,row.id,snapshot.versao);
   const ownerMatches=snapshot.tipo==='atividade-publica.v1'?snapshot.organizacao.id===row.organizacao_id:row.organizacao_id===null&&snapshot.sujeito.id===row.sujeito_id&&snapshot.sujeito.tipo===row.sujeito_tipo;
   if(snapshot.id!==row.id||!ownerMatches||snapshot.versao!==row.numero_versao_publicada||event.versao_esperada!==snapshot.versao||event.snapshot_sha256!==snapshotHash(snapshot))return null;
   await requireVersionAuthorization(sql,{id:row.id,versao_submetida:snapshot.versao},event.autorizacao_id);
   const state=row.estado_programacao??snapshot.estado_programacao;
   if(!['programada','adiada','cancelada','realizada'].includes(state))return null;
   return {...snapshot,estado_programacao:state};
  }catch(error){if(error instanceof ActivityError&&[400,409,422].includes(error.status))return null;throw error;}
 }
 async function read(id:string|null,publisherId?:string){
  try{return await transaction(async sql=>{
   const rows=(await sql.query<PublicRow>(`select a.id,a.organizacao_id,a.sujeito_id,s.tipo as sujeito_tipo,a.numero_versao_publicada,a.versao_publicada,a.estado_programacao from public.atividades a left join public.organizacoes o on o.id=a.organizacao_id left join public.sujeitos_publicadores s on s.id=a.sujeito_id where a.estado_editorial in ('publicada','rascunho','enviada','em_revisao','aprovada','devolvida','rejeitada') and a.versao_publicada is not null and ((o.estado_validacao='validada' and (a.sujeito_id is null or (s.tipo='organizacao' and s.organizacao_legada_id=a.organizacao_id))) or (a.organizacao_id is null and s.tipo in ('pessoa_fisica','coletivo_informal') and s.estado='ativo' and s.risco<>'alto' and a.politica_publicacao='i4')) and ($1::uuid is null or a.id=$1)${publisherId?" and (a.sujeito_id=$2 or exists(select 1 from public.projetos p join public.sujeitos_publicadores ps on ps.id=p.sujeito_id where p.id=a.projeto_id and p.sujeito_id=$2 and ps.estado in ('pendente','ativo') and a.projeto_aprovacao='aprovada' and a.projeto_versao_aprovada=a.numero_versao_publicada))":""} order by a.publicada_em desc${publisherId?"":" limit 100"}`,publisherId?[id,publisherId]:[id])).rows;
   const result:PublicActivity[]=[];for(const row of rows){const snapshot=await visible(sql,row);if(snapshot)result.push(snapshot);}return result;
  });}catch{throw new ActivityError(503,'Serviço indisponível. Tente novamente.');}
 }
 return {
  async presentation<E>(id:string,evidencias:readonly E[]):Promise<ReturnType<typeof publicActivityPresentation<E>>>{
   return transaction(async sql=>{
    const snapshot=await createPublicQueries({transaction:fn=>fn(sql)}).get(id);
    const event=await publicationRecord(sql,id,snapshot.versao);
    return publicActivityPresentation(snapshot,event.snapshot_sha256,evidencias);
   });
  },
  async byPublisher(id:string){if(!uuid(id))throw new ActivityError(404,'Perfil não encontrado.');return read(null,id);},
  async list(){return read(null);},async get(id:string){if(!uuid(id))throw new ActivityError(404,'Atividade não encontrada.');const result=await read(id);if(!result[0])throw new ActivityError(404,'Atividade não encontrada.');return result[0];}};
}
export const publicActivities=createPublicQueries();
export async function publicResponse(operation:()=>Promise<unknown>){
 try{return Response.json(await operation(),{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch(error){return Response.json({message:error instanceof ActivityError?error.message:'Serviço indisponível. Tente novamente.'},{status:error instanceof ActivityError?error.status:503,headers:{'Cache-Control':'no-store'}});}
}
