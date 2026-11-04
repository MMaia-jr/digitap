import { activities,activityMutation,activityResponse } from '../../../lib/activities/service.server';
export const runtime='nodejs';
export async function GET(){return activityResponse(async()=>({atividades:await activities.list()}));}
export async function POST(request:Request){return activityMutation(request,'create');}
