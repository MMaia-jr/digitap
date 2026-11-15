// Test-process transport only. Never imported by application source.
import {appendFileSync} from 'node:fs';
const root=process.cwd();
if(root!=='/Users/alexandrechagasleaocryptoboy/projects/a-praca-v1-5'||process.env.DIGITAP_E1_GATEWAY_MOCK!=='1'||process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1'||process.env.AI_GATEWAY_API_KEY!=='e1-synthetic-only'||process.env.NODE_ENV==='production'||!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(process.env.A_PRACA_EVIDENCE_DIR??''))throw new Error('Mock E1 fora do ambiente local autorizado.');
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(url.href==='https://ai-gateway.vercel.sh/v1/chat/completions'){
  const request=new Request(input,init);
  if(request.method!=='POST'||request.headers.get('authorization')!=='Bearer e1-synthetic-only')throw new Error('Contrato do mock externo inválido.');
  const body=JSON.parse(await request.text());
  if(body.model!=='moonshotai/kimi-k2.5'||JSON.stringify(body.providerOptions?.gateway?.only)!=='["bedrock"]'||body.providerOptions?.gateway?.zeroDataRetention!==true||body.response_format?.json_schema?.strict!==true)throw new Error('Política Gateway inesperada no teste.');
  const text=body.messages?.find(m=>m.role==='user')?.content;
  if(typeof text!=='string')throw new Error('Proposta ausente no mock.');
  const mode=text.includes('E1-FALHA')?'failure':text.includes('E1-LENTO')?'slow':'ok';
  appendFileSync(process.env.A_PRACA_EVIDENCE_DIR+'/gateway-mock.jsonl',JSON.stringify({mock:true,provider:'bedrock',model:body.model,mode})+'\n');
  if(mode==='slow')await new Promise(resolve=>setTimeout(resolve,1500));
  if(mode==='failure')return new Response('SENSITIVE_PROVIDER_MARKER',{status:503});
  const marker=text.includes('IDEIA-UM')?'IDEIA-UM':'IDEIA-DOIS';
  const dados={
   sujeitos:[{descricao:'Pessoa fictícia',tipo:'pessoa_fisica',trecho:'Pessoa fictícia'}],
   projetos:[{descricao:'Projeto comunitário',trecho:'projeto comunitário'}],
   atividades:[{descricao:'Oficina '+marker,trecho:'uma oficina'}],
   capacidades:[{descricao:'Ensinar',trecho:'Pode ensinar'}],
   relacoes:[{origem:'Pessoa fictícia',destino:'Projeto comunitário',tipo:'colaboração proposta',trecho:'Relação proposta: colaboração'}],
   fontes:[{descricao:'Relato declarado',trecho:'Fonte: relato'}],
   informacoes_nao_verificadas:[{descricao:'Data não informada',trecho:'Data pendente'}],
  };
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(dados)}}]});
 }
 if(url.hostname==='127.0.0.1'&&['3215','56151','56154'].includes(url.port)&&!url.username&&!url.password)return originalFetch(input,init);
 // Fail closed: even an unexpected direct provider or Cloud call cannot leave.
 throw new Error('HTTP externo bloqueado pelo transporte de teste E1.');
};
