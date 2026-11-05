import {activityMutation} from '../../../../../../lib/activities/service.server';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return activityMutation(request,'addEvidence',(await params).id);}
