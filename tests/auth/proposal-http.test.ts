import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const deps=vi.hoisted(()=>({currentUser:vi.fn(),account:vi.fn(),interpret:vi.fn(),client:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('../../src/lib/supabase/server',()=>({userClient:deps.client}));
vi.mock('../../src/lib/supabase/admin.server',()=>({adminClient:vi.fn()}));
vi.mock('../../src/lib/auth/gateway.server',()=>({createGateway:()=>({currentUser:deps.currentUser,account:deps.account})}));
vi.mock('../../src/lib/proposals/interpret.server',()=>({interpretProposal:deps.interpret}));
let post:typeof import('../../src/app/api/propostas/interpretar/route')['POST'];
const id='11111111-1111-4111-8111-111111111111',origin='http://127.0.0.1:3215';
const result={estado:'revisao_humana_pendente',verificacao:'nao_verificada',dados:{sujeitos:[],projetos:[],atividades:[],capacidades:[],relacoes:[],fontes:[],informacoes_nao_verificadas:[]}};
function request(body:unknown={texto:'Uma oficina comunitária.'},headers:Record<string,string|undefined>={},method='POST'){
 const values=new Headers({origin,host:'127.0.0.1:3215','content-type':'application/json'});
 for(const [name,value] of Object.entries(headers))if(value!==undefined)values.set(name,value);
 return new Request(origin+'/api/propostas/interpretar',{method,headers:values,body:method==='GET'?undefined:JSON.stringify(body)});
}
beforeEach(async()=>{
 vi.resetModules();vi.clearAllMocks();vi.stubEnv('NODE_ENV','test');vi.stubEnv('APP_ORIGIN',origin);vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Rede não autorizada no teste')));
 deps.currentUser.mockResolvedValue({id,email_confirmed_at:'2026-11-06'});deps.account.mockResolvedValue(null);deps.client.mockResolvedValue({});deps.interpret.mockResolvedValue(result);
 post=(await import('../../src/app/api/propostas/interpretar/route')).POST;
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('sessão confirmada sem perfil pode interpretar sem criar conta de aplicação',async()=>{
 const r=await post(request());expect(r.status).toBe(200);expect(await r.json()).toMatchObject({interpretacao:result});
 expect(deps.account).toHaveBeenCalledWith(id);expect(deps.interpret).toHaveBeenCalledExactlyOnceWith('Uma oficina comunitária.',undefined,expect.any(AbortSignal));expect(fetch).not.toHaveBeenCalled();expect(r.headers.get('cache-control')).toContain('no-store');
});
it.each([null,{id,email_confirmed_at:null},{email_confirmed_at:'2026-11-06'}])('sessão ausente, não confirmada ou incompleta não usa IA',async user=>{
 deps.currentUser.mockResolvedValue(user);const r=await post(request());expect(r.status).toBe(401);expect(deps.interpret).not.toHaveBeenCalled();
});
it.each([{auth_user_id:id,situacao:'bloqueada'},{auth_user_id:'outra-identidade',situacao:'ativa'}])('conta bloqueada ou identidade divergente não usa IA',async account=>{
 deps.account.mockResolvedValue(account);expect((await post(request())).status).toBe(403);expect(deps.interpret).not.toHaveBeenCalled();
});
it.each([{origin:'https://evil.invalid'},{origin:'null'},{origin:''},{host:'evil.invalid'},{'sec-fetch-site':'cross-site'},{origin:'https://evil.invalid','x-forwarded-host':'127.0.0.1:3215'}])('origem/host inválidos rejeitados antes de Auth e IA %#',async headers=>{
 const r=await post(request(undefined,headers));expect(r.status).toBe(403);expect(deps.client).not.toHaveBeenCalled();expect(deps.interpret).not.toHaveBeenCalled();expect(r.headers.get('cache-control')).toContain('no-store');
});
it.each([{},null,{texto:''},{texto:'   '},{texto:2},{texto:'x'.repeat(2001)},{texto:'Uma ideia',user_id:id},{texto:'Uma ideia',publicar:true}])('valida entrada estrita antes de Auth e IA %#',async body=>{
 expect((await post(request(body))).status).toBe(422);expect(deps.client).not.toHaveBeenCalled();expect(deps.interpret).not.toHaveBeenCalled();
});
it('corpo acima de 8KiB é rejeitado na fronteira compartilhada',async()=>{
 expect((await post(request({texto:'x'.repeat(9000)}))).status).toBe(413);expect(deps.interpret).not.toHaveBeenCalled();
});
it('limita três tentativas por identidade em dez minutos, inclusive falhas',async()=>{
 for(let i=0;i<3;i++)expect((await post(request())).status).toBe(200);
 expect((await post(request())).status).toBe(429);expect(deps.interpret).toHaveBeenCalledTimes(3);
});
it('impede duas interpretações simultâneas da mesma pessoa',async()=>{
 let finish!:(value:typeof result)=>void;deps.interpret.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const first=post(request());await vi.waitFor(()=>expect(deps.interpret).toHaveBeenCalledOnce());
 expect((await post(request())).status).toBe(429);finish(result);expect((await first).status).toBe(200);
});
it('janela expirada libera nova tentativa',async()=>{
 vi.useFakeTimers();try{for(let i=0;i<3;i++)await post(request());vi.advanceTimersByTime(600001);expect((await post(request())).status).toBe(200);}finally{vi.useRealTimers();}
});
it('limite agregado impede contorno por múltiplas identidades no mesmo processo',async()=>{
 for(let i=0;i<20;i++){deps.currentUser.mockResolvedValue({id:'fixture-'+i,email_confirmed_at:'2026-11-06'});expect((await post(request())).status).toBe(200);}
 deps.currentUser.mockResolvedValue({id:'fixture-extra',email_confirmed_at:'2026-11-06'});expect((await post(request())).status).toBe(429);expect(deps.interpret).toHaveBeenCalledTimes(20);
});
it.each(['CONFIGURATION','OUTPUT','UNAVAILABLE'])('falha IA %s tem resposta pública genérica e não vaza',async code=>{
 deps.interpret.mockRejectedValue(Object.assign(new Error('SENSITIVE_MARKER'),{code}));const log=vi.spyOn(console,'error');
 const r=await post(request());expect(r.status).toBe(503);expect(await r.json()).toEqual({message:'Interpretação indisponível. Tente novamente mais tarde.'});expect(log).not.toHaveBeenCalled();
});
it('cancelamento voluntário devolve 499 e libera a interpretação em andamento',async()=>{
 const controller=new AbortController();
 let reached!:()=>void;
 const started=new Promise<void>(resolve=>{ reached=resolve; });
 deps.interpret.mockImplementationOnce((_text,_context,signal:AbortSignal)=>new Promise((_resolve,reject)=>{
  signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
  reached();
 }));
 const pending=post(new Request(request(),{signal:controller.signal}));
 await started;
 controller.abort();
 const cancelled=await pending;
 expect(cancelled.status).toBe(499);
 expect(await cancelled.json()).toEqual({message:'Interpretação cancelada.'});
 expect((await post(request())).status).toBe(200);
});
it('falha de Auth ou consulta não vira ausência de conta',async()=>{
 deps.account.mockRejectedValue(new Error('SENSITIVE_MARKER'));expect((await post(request())).status).toBe(503);expect(deps.interpret).not.toHaveBeenCalled();
});
it('método e tipo de conteúdo são validados sem chegar à IA',async()=>{
 expect((await post(request(undefined,{},'GET'))).status).toBe(405);expect((await post(request(undefined,{'content-type':'text/plain'}))).status).toBe(415);expect(deps.interpret).not.toHaveBeenCalled();
});
it('falhas também consomem tentativas e liberam a reserva de concorrência',async()=>{
 deps.interpret.mockRejectedValue(new Error('SENSITIVE_MARKER'));
 for(let i=0;i<3;i++)expect((await post(request())).status).toBe(503);
 expect((await post(request())).status).toBe(429);expect(deps.interpret).toHaveBeenCalledTimes(3);
});
