import 'server-only';
import { FlowError, type FlowResult } from './flow.server';
export const privateHeaders = { 'Cache-Control':'private, no-store, max-age=0', 'Pragma':'no-cache', 'Referrer-Policy':'no-referrer' };
export async function handleMutation(request: Request, origin: string, execute: (input: unknown) => Promise<FlowResult>): Promise<Response> {
  const json=(value: unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
  try {
    if(request.method!=='POST') return json({message:'Método não permitido.'},405);
    if((request.headers.get('host')!==null&&request.headers.get('host')!==new URL(origin).host)||request.headers.get('origin')!==origin || request.headers.get('sec-fetch-site')==='cross-site') throw new FlowError(403,'Origem não permitida.');
    if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') throw new FlowError(415,'Envie JSON.');
    const reader=request.body?.getReader();
    if(!reader) throw new FlowError(400,'Pedido inválido.');
    let size=0;let body='';const decoder=new TextDecoder();
    for(;;){
      const chunk=await reader.read();if(chunk.done) break;
      size+=chunk.value.byteLength;
      if(size>8192){await reader.cancel();throw new FlowError(413,'Pedido muito grande.');}
      body+=decoder.decode(chunk.value,{stream:true});
    }
    body+=decoder.decode();let input:unknown;
    try{input=JSON.parse(body);}catch{throw new FlowError(400,'Pedido inválido.');}
    return json(await execute(input));
  } catch(error) {
    if(error instanceof FlowError) return json({message:error.message,...(error.fields?{fields:error.fields}:{})},error.status);
    return json({message:'Serviço indisponível. Tente novamente.'},503);
  }
}
