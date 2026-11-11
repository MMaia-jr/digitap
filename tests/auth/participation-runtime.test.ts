import {afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({getUser:vi.fn(),rpc:vi.fn(),from:vi.fn(),getActivity:vi.fn(),maybeSingle:vi.fn()}));
vi.mock('../../src/lib/supabase/server',()=>({userClient:async()=>({auth:{getUser:mocks.getUser},from:mocks.from})}));
vi.mock('../../src/lib/supabase/admin.server',()=>({adminClient:()=>({rpc:mocks.rpc})}));
vi.mock('../../src/lib/queries/public.server',()=>({publicActivities:{get:mocks.getActivity}}));
import {participationMutation,participationService,participationResponse} from '../../src/lib/participation/runtime.server';
afterEach(()=>{vi.resetAllMocks();vi.unstubAllEnvs();});
const id='10000000-0000-4000-8000-000000000001';
function setup(){
 vi.stubEnv('NODE_ENV','development');vi.stubEnv('APP_ORIGIN','http://127.0.0.1:3215');
 mocks.getUser.mockResolvedValue({data:{user:{id:'verified-user',email_confirmed_at:'2026-01-01'}},error:null});
 mocks.getActivity.mockResolvedValue({id});
 mocks.rpc.mockResolvedValue({data:{tipo:'apoio',acompanhantes:1,mostrar_nome:false},error:null});
 const eq=vi.fn().mockReturnValue({maybeSingle:mocks.maybeSingle});
 const select=vi.fn().mockReturnValue({eq});mocks.from.mockReturnValue({select});mocks.maybeSingle.mockResolvedValue({data:null,error:null});
}
function request(body:unknown,origin='http://127.0.0.1:3215'){return new Request('http://127.0.0.1:3215/api/atividades/'+id+'/confirmacoes',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
describe('fronteira HTTP e adapter de participação',()=>{
 it('CSRF não chega ao Auth nem à RPC',async()=>{setup();const response=await participationMutation(request({tipo:'apoio'},'https://evil.invalid'),id);expect(response.status).toBe(403);expect(mocks.getUser).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();});
 it('visitante não chama cliente privilegiado',async()=>{setup();mocks.getUser.mockResolvedValue({data:{user:null},error:{status:400}});const response=await participationMutation(request({tipo:'intencao'}),id);expect(response.status).toBe(401);expect(mocks.rpc).not.toHaveBeenCalled();});
 it('RPC recebe identidade verificada e nunca sujeito do formulário',async()=>{setup();const response=await participationMutation(request({tipo:'apoio'}),id);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');expect(mocks.rpc).toHaveBeenCalledWith('registrar_confirmacao',{p_auth_user_id:'verified-user',p_atividade_id:id,p_tipo:'apoio',p_whatsapp:null,p_acompanhantes:1,p_mostrar_nome:false});});
 it('payload com sujeito forjado não chama RPC',async()=>{setup();const response=await participationMutation(request({tipo:'apoio',sujeito_id:'outro'}),id);expect(response.status).toBe(422);expect(mocks.rpc).not.toHaveBeenCalled();});
 it('resposta de conflito não expõe detalhe do banco',async()=>{setup();mocks.rpc.mockResolvedValue({data:null,error:{code:'23505',message:'telefone privado'}});const response=await participationMutation(request({tipo:'apoio'}),id);expect(response.status).toBe(409);expect(JSON.stringify(await response.json())).not.toContain('telefone');});
 it('leitura individual usa o cliente do usuário e deixa o RLS filtrar o dono',async()=>{setup();mocks.rpc.mockResolvedValue({data:{apoios:1,intencoes:2,nomes_publicos:[],aberta:true},error:null});const service=await participationService();await service.state(id);expect(mocks.from).toHaveBeenCalledWith('confirmacoes');});
 it('falha ao consultar atividade pública bloqueia escrita antes da RPC',async()=>{setup();mocks.getActivity.mockRejectedValue(new Error('snapshot inválido'));const response=await participationMutation(request({tipo:'apoio'}),id);expect(response.status).toBe(503);expect(mocks.rpc).not.toHaveBeenCalled();});
 it('contadores privados usam RPC de proprietário, sem consulta a linhas individuais',async()=>{setup();mocks.rpc.mockResolvedValue({data:{apoios:1,intencoes:2},error:null});const service=await participationService();const response=await participationResponse(()=>service.organizerCounts(id));expect(await response.json()).toEqual({apoios:1,intencoes:2});expect(mocks.rpc).toHaveBeenCalledWith('contadores_confirmacoes_organizador',{p_auth_user_id:'verified-user',p_atividade_id:id});expect(mocks.from).not.toHaveBeenCalled();});
});
