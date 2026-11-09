import 'server-only';
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
export async function publicPortfolio(id:string){const profile=await publicProfile(id);return {...profile,evidence:await portfolioEvidence(profile.activities)};}
export type Portfolio=Awaited<ReturnType<typeof publicPortfolio>>;
