import {publicActivities,publicResponse} from '../../../../lib/queries/public.server';
export const runtime='nodejs';
export async function GET(){return publicResponse(async()=>({atividades:await publicActivities.list()}));}
