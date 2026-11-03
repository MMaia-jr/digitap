import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const origin='http://127.0.0.1:3215';
const checks=[];
async function check(name,path,options,status,inspect=()=>{}){
 const response=await fetch(origin+path,{redirect:'manual',...options});const body=await response.text();
 assert.equal(response.status,status,name);await inspect(response,body);checks.push({name,status:'PASS',http:response.status});
}
const post=(body,extra={})=>({method:'POST',headers:{origin,'content-type':'application/json',...extra},body:typeof body==='string'?body:JSON.stringify(body)});
for(const [path,heading] of [['/cadastro','Crie seu acesso'],['/login','Entre na sua conta'],['/recuperar-acesso','Recupere seu acesso']]){
 await check('HTML '+path,path,{},200,(_,body)=>{assert(body.includes(heading));assert(body.includes('method="post"'));});
}
await check('GET de confirmação não consome OTP','/auth/confirm?token_hash='+ 'a'.repeat(64)+'&type=signup',{},200,(r,body)=>{assert(body.includes('Confirme seu e-mail'));assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert(r.headers.get('cache-control')?.includes('no-store'));assert(!r.headers.get('set-cookie'));});
await check('Link de recuperação renderiza formulário específico','/auth/confirm?token_hash='+ 'b'.repeat(64)+'&type=recovery',{},200,(_,body)=>assert(body.includes('Escolha uma nova senha')));
await check('Validação antes do SDK','/api/auth/cadastro',post({email:'inválido',password:'curta'}),422,(r,body)=>{assert(body.includes('email'));assert(r.headers.get('cache-control')?.includes('no-store'));});
await check('Origem externa negada','/api/auth/login',post({}, {origin:'https://externo.invalid'}),403);
await check('JSON malformado negado','/api/auth/login',post('{'),400);
await check('Corpo excessivo negado','/api/auth/cadastro',post('a'.repeat(9000)),413);
await check('Elevação de papel negada antes do SDK','/api/organizacoes',post({nome_publico:'Fictícia',papel:'administrador'}),400);
await check('Método GET de organização negado','/api/organizacoes',{},405);
await check('Rota editorial não implementada é inacessível','/admin',{},404);
await check('Auth não configurado retorna indisponibilidade sem sucesso falso','/api/auth/cadastro',post({email:'ficticio@example.invalid',password:'SenhaFicticia123!'}),503,(_,body)=>{assert(!body.includes('SenhaFicticia'));assert(!body.includes('sb_secret'));});
await check('Dashboard sem serviço não expõe organização','/dashboard',{},200,(_,body)=>{assert(body.includes('Serviço indisponível'));assert(!body.includes('Organização Fictícia'));});
await writeFile('operations/evidence/incremento-2/http-smoke.json',JSON.stringify({note:'HTTP real contra Next.js local, Supabase parado, sem autenticação real.',checks},null,2)+'\n');
console.log(`${checks.length} verificações HTTP passaram; integração com Supabase não executada.`);
