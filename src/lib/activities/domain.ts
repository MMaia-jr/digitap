export class ActivityError extends Error {
  constructor(public readonly status:number,message:string,public readonly fields?:Record<string,string>){super(message);}
}
export interface DraftInput {titulo:string;descricao:string;inicio_previsto:string;orientacao_acesso:string;referencia_oficial:string|null}
export interface PrivateActivity extends DraftInput {id:string;estado_editorial:'rascunho'|'enviada';versao_submetida:number}
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
