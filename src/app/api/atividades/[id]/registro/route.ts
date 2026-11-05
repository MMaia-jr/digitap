import {activities,activityMutation,activityResponse} from '../../../../../lib/activities/service.server';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return activityMutation(request,'createRecord',(await params).id);}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return activityResponse(async()=>({registro:await activities.getRecord((await params).id)}));}
