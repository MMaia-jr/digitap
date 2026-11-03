import { describe,it,expect,vi,beforeEach } from 'vitest';
const jar=vi.hoisted(()=>({getAll:vi.fn().mockReturnValue([]),set:vi.fn()}));
vi.mock('server-only',()=>({}));vi.mock('next/headers',()=>({cookies:async()=>jar}));
vi.mock('@supabase/ssr',()=>({createServerClient:vi.fn().mockReturnValue({})}));
import { createServerClient } from '@supabase/ssr';
import { userClient,clearAuthCookies } from '../../src/lib/supabase/server';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:56151');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_ficticia');});
describe('cookies SSR server-only simulados',()=>{
 it('preserva nomes dos chunks e força HttpOnly/SameSite',async()=>{
   await userClient();const options=vi.mocked(createServerClient).mock.calls[0][2];
   await options.cookies.setAll?.([{name:'ap-auth.0',value:'token-ficticio',options:{path:'/',httpOnly:false}}],{});
   expect(jar.set).toHaveBeenCalledWith('ap-auth.0','token-ficticio',expect.objectContaining({httpOnly:true,sameSite:'lax'}));
   expect(jar.set.mock.calls[0][2]).not.toHaveProperty('name');
 });
 it('logout apaga somente cookies próprios, incluindo chunks e verifier',async()=>{
   jar.getAll.mockReturnValue([{name:'ap-auth.0',value:'ficticio'},{name:'ap-auth-code-verifier',value:'ficticio'},{name:'outro-projeto',value:'preservar'}]);
   (await clearAuthCookies())();expect(jar.set).toHaveBeenCalledTimes(2);
   expect(jar.set).not.toHaveBeenCalledWith('outro-projeto',expect.anything(),expect.anything());
 });
});
