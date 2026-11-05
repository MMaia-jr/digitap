import {publicRecords} from '../../../../../../lib/queries/records.server';
import {publicResponse} from '../../../../../../lib/queries/public.server';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return publicResponse(async()=>({registro:await publicRecords.get((await params).id)}));}
