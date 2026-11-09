import 'server-only';
import {withTransaction} from '../database.server';
import type {Project} from './projects.server';
import type {PublicActivity} from '../activities/publication';
import {ActivityError} from '../activities/domain';
import {realizationDetails} from '../activities/realization';
import {publicProfile} from './profiles.server';
import {publicRecords} from './records.server';
export interface PortfolioEvidence {
 activity:PublicActivity;
 record:Awaited<ReturnType<typeof publicRecords.get>>;
 details:ReturnType<typeof realizationDetails>;
}
/** Reuses public snapshot, authorization and revocation checks; never reads private drafts. */
export async function portfolioEvidence(activities:PublicActivity[]){
 const items:PortfolioEvidence[]=[];let unavailable=false,index=0;
 // Keep existing per-record checks, without opening one connection per activity at once.
 await Promise.all(Array.from({length:Math.min(4,activities.length)},async()=>{
  while(index<activities.length){const activity=activities[index++];
   try{const record=await publicRecords.get(activity.id);items.push({activity,record,details:realizationDetails(record.origem_informacao)});}
   catch(error){if(!(error instanceof ActivityError&&error.status===404))unavailable=true;}
  }
 }));
 items.sort((a,b)=>b.record.publicada_em.localeCompare(a.record.publicada_em));
 const counted=items.filter(item=>item.details&&item.record.estado_apuracao!=='contestado');
 return {items,unavailable,participations:counted.length?counted.reduce((sum,item)=>sum+item.details!.participantes,0):null};
}
export async function publicPortfolio(id:string){const profile=await publicProfile(id);const [evidence,grouping]=await Promise.all([portfolioEvidence(profile.activities),withTransaction(async sql=>{
 const ids=profile.activities.map(a=>a.id);
 const links=(await sql.query<{id:string;projeto_id:string|null}>('select a.id,a.projeto_id from public.atividades a where (a.sujeito_id=$1 or exists(select 1 from public.projetos p where p.id=a.projeto_id and p.sujeito_id=$1)) and a.id=any($2::uuid[])',[profile.subject.id,ids])).rows;
 const projectByActivity=new Map(links.map(link=>[link.id,link.projeto_id]));
 const projectIds=links.flatMap(a=>a.projeto_id?[a.projeto_id]:[]);
 // Visitors see only projects containing activities that passed public snapshot checks.
 const projects=(await sql.query<Project>(`select id,sujeito_id,titulo,descricao,ano from public.projetos where sujeito_id=$1 and ($3::boolean or id=any($2::uuid[])) order by ano desc,criado_em desc`,[profile.subject.id,projectIds,profile.canEdit])).rows;
 return {projects:projects.map(project=>({...project,activities:profile.activities.filter(a=>projectByActivity.get(a.id)===project.id)})),ungrouped:profile.activities.filter(a=>!projectByActivity.get(a.id))};
})]);return {...profile,evidence,...grouping};}
export type Portfolio=Awaited<ReturnType<typeof publicPortfolio>>;
