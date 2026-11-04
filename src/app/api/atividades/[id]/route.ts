import { activities,activityMutation,activityResponse } from '../../../../lib/activities/service.server';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){const {id}=await params;return activityResponse(async()=>({atividade:await activities.get(id)}));}
export async function PATCH(request:Request,{params}:Context){return activityMutation(request,'update',(await params).id);}
