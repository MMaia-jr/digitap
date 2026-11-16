import { FlowError } from '../../../lib/auth/flow.server';
import { handleMutation, privateHeaders } from '../../../lib/auth/http.server';
import { appOrigin, mutationOrigins } from '../../../lib/supabase/config.server';
import { E4Error, e4Service } from '../../../lib/capabilities/service.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
const record=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
function translate(error:unknown):never{if(error instanceof E4Error)throw new FlowError(error.status,error.message);throw error;}
function keys(input:Record<string,unknown>,allowed:string[]){if(Object.keys(input).some(key=>!allowed.includes(key)))throw new FlowError(400,'Pedido inválido.');}

export async function GET(request:Request){
  try{
    const url=new URL(request.url),action=url.searchParams.get('action')??'discover';
    const origins=mutationOrigins(appOrigin()),host=request.headers.get('host'),origin=request.headers.get('origin');
    if(request.headers.get('sec-fetch-site')==='cross-site'||(origin!==null&&(!origins.includes(origin)||host!==new URL(origin).host))||(host!==null&&!origins.some(value=>new URL(value).host===host)))return json({message:'Origem não permitida.'},403);
    if(action==='discover')return json({matches:await e4Service.discover()});
    if(action==='subjects')return json({subjects:await e4Service.subjects()});
    if(action==='capabilities')return json({capabilities:await e4Service.listCapabilities(url.searchParams.get('subject_id')??'')});
    if(action==='needs')return json(await e4Service.listProjectNeeds(url.searchParams.get('project_id')??''));
    if(action==='interests')return json({interests:await e4Service.myInterests(url.searchParams.get('subject_id')??'')});
    if(action==='project-interests')return json({interests:await e4Service.projectInterests(url.searchParams.get('project_id')??'')});
    if(action==='activity-needs-public')return json({needs:await e4Service.discoverActivityNeeds()});
    if(action==='activity-needs')return json(await e4Service.listActivityNeeds(url.searchParams.get('activity_id')??''));
    if(action==='activity-interests')return json({interests:await e4Service.activityNeedInterests(url.searchParams.get('activity_id')??'')});
    throw new FlowError(400,'Pedido inválido.');
  }catch(error){if(error instanceof FlowError)return json({message:error.message},error.status);if(error instanceof E4Error)return json({message:error.message},error.status);return json({message:'Serviço indisponível. Tente novamente.'},503);}
}

export async function POST(request:Request){
  try{return await handleMutation(request,appOrigin(),async value=>{
    if(!record(value)||typeof value.action!=='string')throw new FlowError(400,'Pedido inválido.');
    try{
      switch(value.action){
        case 'create-capability': keys(value,['action','subjectId','description','category','conditions']); return {message:'Capacidade privada registrada.',capability:await e4Service.createCapability({subjectId:value.subjectId as string,description:value.description as string,category:value.category as string,conditions:value.conditions as string|undefined})};
        case 'update-capability': keys(value,['action','id','expectedVersion','description','category','conditions','visibility']); return {message:'Capacidade atualizada.',capability:await e4Service.updateCapability({id:value.id as string,expectedVersion:value.expectedVersion as number,description:value.description as string,category:value.category as string,conditions:value.conditions as string|undefined,visibility:value.visibility as 'privada'|'publica'})};
        case 'archive-capability': keys(value,['action','id','expectedVersion']); return {message:'Capacidade arquivada.',...await e4Service.archiveCapability({id:value.id as string,expectedVersion:value.expectedVersion as number})};
        case 'create-need': keys(value,['action','projectId','description','categories','conditions']); return {message:'Necessidade privada registrada.',need:await e4Service.createNeed({projectId:value.projectId as string,description:value.description as string,categories:value.categories,conditions:value.conditions as string|undefined})};
        case 'update-need': keys(value,['action','id','expectedVersion','description','categories','conditions','visibility','state']); return {message:'Necessidade atualizada.',need:await e4Service.updateNeed({id:value.id as string,expectedVersion:value.expectedVersion as number,description:value.description as string,categories:value.categories,conditions:value.conditions as string|undefined,visibility:value.visibility as 'privada'|'visivel',state:value.state as 'aberta'|'encerrada'|undefined})};
        case 'close-need': keys(value,['action','id','expectedVersion']); return {message:'Necessidade encerrada.',...await e4Service.closeNeed({id:value.id as string,expectedVersion:value.expectedVersion as number})};
        case 'create-activity-need': keys(value,['action','activityId','description','categories','conditions']); return {message:'Solicitação privada registrada.',need:await e4Service.createActivityNeed({activityId:value.activityId as string,description:value.description as string,categories:value.categories,conditions:value.conditions as string|undefined})};
        case 'update-activity-need': keys(value,['action','id','expectedVersion','description','categories','conditions','visibility','state']); return {message:'Solicitação atualizada.',need:await e4Service.updateActivityNeed({id:value.id as string,expectedVersion:value.expectedVersion as number,description:value.description as string,categories:value.categories,conditions:value.conditions as string|undefined,visibility:value.visibility as 'privada'|'visivel',state:value.state as 'aberta'|'encerrada'|undefined})};
        case 'close-activity-need': keys(value,['action','id','expectedVersion']); return {message:'Solicitação encerrada.',...await e4Service.closeActivityNeed({id:value.id as string,expectedVersion:value.expectedVersion as number})};
        case 'manifest-interest': keys(value,['action','needId','subjectId','requestId']); return {message:'Manifestação registrada.',interest:await e4Service.manifestInterest({needId:value.needId as string,subjectId:value.subjectId as string,requestId:value.requestId as string})};
        case 'withdraw-interest': keys(value,['action','id','subjectId','expectedVersion']); return {message:'Manifestação retirada.',interest:await e4Service.withdrawInterest({id:value.id as string,subjectId:value.subjectId as string,expectedVersion:value.expectedVersion as number})};
        default: throw new FlowError(400,'Pedido inválido.');
      }
    }catch(error){translate(error);}
  },16000);}catch{return json({message:'Serviço indisponível. Tente novamente.'},503);}
}
