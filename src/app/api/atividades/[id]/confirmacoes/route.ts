import {participationService,participationResponse,participationMutation} from '../../../../../lib/participation/runtime.server';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 return participationResponse(async()=>{const {id}=await params;return (await participationService()).state(id);});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return participationMutation(request,(await params).id);}
