import {publicActivities,publicResponse} from '../../../../../lib/queries/public.server';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return publicResponse(async()=>({atividade:await publicActivities.get(id)}));}
