export class ActivityError extends Error {
  constructor(public readonly status:number,message:string,public readonly fields?:Record<string,string>){super(message);}
}
export interface DraftInput {titulo:string;descricao:string;inicio_previsto:string;orientacao_acesso:string;referencia_oficial:string|null}
export type PrivateState='rascunho'|'enviada'|'em_revisao'|'aprovada'|'devolvida'|'rejeitada'|'publicada'|'retirada';
export interface PrivateActivity extends DraftInput {id:string;estado_editorial:PrivateState;versao_submetida:number;estado_programacao?:string;motivo_editorial?:string;motivo_retirada?:string;numero_versao_publicada?:number|null}
export type ReviewAction='iniciar'|'aprovar'|'devolver'|'rejeitar';
export interface ReviewInput {pedido_id:string;acao:ReviewAction;versao_esperada:number;estado_esperado:'enviada'|'em_revisao';motivo:string|null;autorizacao_id:string|null}
const fields=['titulo','descricao','inicio_previsto','orientacao_acesso','referencia_oficial'];
export function objectInput(input:unknown,allowed:string[]):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))throw new ActivityError(400,'Pedido inválido.');
 return input as Record<string,unknown>;
}
function invalid(field:string,message:string):never{throw new ActivityError(422,'Confira os campos indicados.',{[field]:message});}
function text(input:unknown,field:string,min:number,max:number){
 if(typeof input!=='string')return invalid(field,'Preencha este campo.');
 const result=input.trim().normalize('NFC');const length=Array.from(result).length;
 if(length<min||length>max||/<\/?[a-z!]/i.test(result)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result))return invalid(field,`Use de ${min} a ${max} caracteres de texto, sem HTML.`);
 return result;
}
function start(value:unknown,now:Date){
 if(typeof value!=='string')return invalid('inicio_previsto','Informe data e horário com fuso.');
 const m=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/);
 if(!m)return invalid('inicio_previsto','Informe uma data válida com fuso explícito.');
 const [,year,month,day,hour,minute,second]=m;const y=Number(year),mo=Number(month),d=Number(day);
 const calendar=new Date(0);calendar.setUTCFullYear(y,mo-1,d);calendar.setUTCHours(0,0,0,0);
 if(y<2000||calendar.getUTCFullYear()!==y||calendar.getUTCMonth()!==mo-1||calendar.getUTCDate()!==d||Number(hour)>23||Number(minute)>59||Number(second??0)>59||Number(m[10]??0)>14||Number(m[11]??0)>59||(Number(m[10])===14&&Number(m[11])!==0))return invalid('inicio_previsto','Data ou horário inválido.');
 const instant=new Date(value);
 if(!Number.isFinite(instant.getTime())||instant.getTime()<=now.getTime())return invalid('inicio_previsto','Escolha uma data futura.');
 return instant.toISOString();
}
export function validateDraft(input:unknown,now=new Date()):DraftInput{
 const body=objectInput(input,fields);
 const titulo=text(body.titulo,'titulo',3,180),descricao=text(body.descricao,'descricao',10,5000),orientacao_acesso=text(body.orientacao_acesso,'orientacao_acesso',3,600);
 const inicio_previsto=start(body.inicio_previsto,now);let referencia_oficial:string|null=null;
 if(body.referencia_oficial!==undefined&&body.referencia_oficial!==null&&body.referencia_oficial!==''){
  if(typeof body.referencia_oficial!=='string'||body.referencia_oficial.length>2048||/[\u0000-\u0020]/.test(body.referencia_oficial.trim()))return invalid('referencia_oficial','Informe uma URL http/https válida, sem credenciais.');
  try{const url=new URL(body.referencia_oficial.trim());if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname)throw new Error();referencia_oficial=url.href;}catch{return invalid('referencia_oficial','Informe uma URL http/https válida, sem credenciais.');}
 }
 return {titulo,descricao,inicio_previsto,orientacao_acesso,referencia_oficial};
}
export function validateVersion(value:unknown):number{
 if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>2147483646)throw new ActivityError(422,'Informe a versão esperada válida.');return value;
}
export function validateReview(input:unknown):ReviewInput{
 const common=['acao','versao_esperada','estado_esperado','pedido_id'];
 const body=objectInput(input,[...common,'motivo','autorizacao_id']);
 if(!['iniciar','aprovar','devolver','rejeitar'].includes(String(body.acao))||!['enviada','em_revisao'].includes(String(body.estado_esperado)))throw new ActivityError(422,'Ação ou estado esperado inválido.');
 const acao=body.acao as ReviewAction;
 objectInput(body,[...common,...(acao==='aprovar'?['autorizacao_id']:acao==='devolver'||acao==='rejeitar'?['motivo']:[])]);
 const uuid=(value:unknown,field:string)=>{if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))return invalid(field,'Informe um UUID válido.');return value.toLowerCase();};
 return {pedido_id:uuid(body.pedido_id,'pedido_id'),acao,versao_esperada:validateVersion(body.versao_esperada),estado_esperado:body.estado_esperado as ReviewInput['estado_esperado'],motivo:acao==='devolver'||acao==='rejeitar'?text(body.motivo,'motivo',10,1500):null,autorizacao_id:acao==='aprovar'?uuid(body.autorizacao_id,'autorizacao_id'):null};
}
function localParts(date:Date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const p=Object.fromEntries(parts.map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function instantToLocalStart(value:string){return localParts(new Date(value));}
export function localStartToInstant(value:string,now=new Date()):string{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return invalid('inicio_previsto','Informe data e horário válidos.');
 const guess=new Date(value+'Z');if(!Number.isFinite(guess.getTime()))return invalid('inicio_previsto','Data inválida.');
 const offset=new Date(localParts(guess)+'Z').getTime()-guess.getTime();const result=new Date(guess.getTime()-offset);
 if(localParts(result)!==value)return invalid('inicio_previsto','Data ou horário inválido.');
 return start(result.toISOString(),now);
}

export function validateWithdrawal(input:unknown){
 const body=objectInput(input,['versao_esperada','pedido_id','motivo']);
 if(typeof body.pedido_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.pedido_id))throw new ActivityError(422,'Identificador de pedido inválido.');
 return {versao_esperada:validateVersion(body.versao_esperada),pedido_id:body.pedido_id.toLowerCase(),motivo:text(body.motivo,'motivo',10,1500)};
}

export function validateScheduling(input:unknown){
 const body=objectInput(input,['versao_esperada','pedido_id','motivo','estado_programacao','estado_esperado']);
 const common=validateWithdrawal({versao_esperada:body.versao_esperada,pedido_id:body.pedido_id,motivo:body.motivo});
 if(!['adiada','cancelada'].includes(String(body.estado_programacao))||!['programada','adiada'].includes(String(body.estado_esperado))||body.estado_programacao===body.estado_esperado)throw new ActivityError(422,'Transição de programação inválida.');
 return {...common,estado_programacao:String(body.estado_programacao),estado_esperado:String(body.estado_esperado)};
}

export function validateRecord(input:unknown,now=new Date()){
 const body=objectInput(input,['data_realizacao','descricao_factual','origem_informacao','versao_esperada','pedido_id']);
 const {versao_esperada,pedido_id}=validateWithdrawal({versao_esperada:body.versao_esperada,pedido_id:body.pedido_id,motivo:'Registro factual privado.'});
 const date=body.data_realizacao;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number(date.slice(0,4))<1)return invalid('data_realizacao','Informe uma data válida, não futura.');
 const instant=new Date(date+'T12:00:00Z');
 if(!Number.isFinite(instant.getTime())||instant.toISOString().slice(0,10)!==date||date>localParts(now).slice(0,10))return invalid('data_realizacao','Informe uma data válida, não futura.');
 return {pedido_id,versao_esperada,data_realizacao:date,descricao_factual:text(body.descricao_factual,'descricao_factual',10,5000),origem_informacao:text(body.origem_informacao,'origem_informacao',3,600)};
}

export function validateEvidence(input:unknown,now=new Date()){
 const body=objectInput(input,['pedido_id','tipo_fonte','url_publica','afirmacao_sustentada','consultada_em']);
 const {pedido_id}=validateWithdrawal({pedido_id:body.pedido_id,versao_esperada:1,motivo:'Referência delimitada.'});
 let url:URL;try{if(typeof body.url_publica!=='string'||body.url_publica.length>2048||/[\u0000-\u0020]/.test(body.url_publica))throw new Error();url=new URL(body.url_publica);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error();}catch{return invalid('url_publica','Informe referência pública http/https sem credenciais.');}
 const host=url.hostname.toLowerCase();
 if(!host.includes('.')||host.includes(':')||/^\d+(?:\.\d+){3}$/.test(host)||/(?:^|\.)(?:localhost|local|internal)$/.test(host))return invalid('url_publica','Use uma referência pública, sem endereço local ou IP literal.');
 let decoded=url.href;try{for(let i=0;i<2;i++)decoded=decodeURIComponent(decoded);}catch{return invalid('url_publica','Referência inválida.');}
 const sensitive=(value:string)=>/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value)||/(?:\d[ .()+-]*){10,}/.test(value);
 if(sensitive(decoded)||[...url.searchParams.keys()].some(key=>/email|e-mail|cpf|cnpj|telefone|phone|token|senha|password|auth|session|cookie|contato/i.test(key)))return invalid('url_publica','Não inclua contato, identificadores pessoais ou credenciais na referência.');
 if([body.tipo_fonte,body.afirmacao_sustentada].some(value=>typeof value==='string'&&sensitive(value)))return invalid('afirmacao_sustentada','Não inclua contatos ou identificadores pessoais na referência.');
 const consulted=body.consultada_em;
 if(typeof consulted!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(consulted)||!Number.isFinite(Date.parse(consulted))||Date.parse(consulted)>now.getTime())return invalid('consultada_em','Informe data de consulta válida, não futura, com fuso.');
 const day=consulted.slice(0,10),calendar=new Date(day+'T12:00:00Z');
 if(Number(day.slice(0,4))<1||!Number.isFinite(calendar.getTime())||calendar.toISOString().slice(0,10)!==day)return invalid('consultada_em','Informe uma data de calendário válida.');
 return {pedido_id,tipo_fonte:text(body.tipo_fonte,'tipo_fonte',3,120),url_publica:url.href,afirmacao_sustentada:text(body.afirmacao_sustentada,'afirmacao_sustentada',10,1500),consultada_em:new Date(consulted).toISOString()};
}
