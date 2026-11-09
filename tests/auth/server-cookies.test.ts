import {beforeEach,describe,it,expect,vi} from 'vitest';
import {userClient} from '../../src/lib/supabase/server';
type Write={name:string;value:string;options?:{maxAge?:number;httpOnly?:boolean;path?:string}};
const mocks=vi.hoisted(()=>({set:vi.fn(),getAll:vi.fn(()=>[]),adapter:null as null|{getAll:()=>unknown;setAll:(values:Write[])=>void}}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({cookies:async()=>({getAll:mocks.getAll,set:mocks.set})}));
vi.mock('../../src/lib/supabase/config.server',()=>({localConfig:()=>({url:'http://example.invalid',key:'fixture'})}));
vi.mock('@supabase/ssr',()=>({createServerClient:(_url:string,_key:string,options:{cookies:NonNullable<typeof mocks.adapter>})=>{mocks.adapter=options.cookies;return {};}}));
beforeEach(()=>{mocks.set.mockReset();mocks.getAll.mockClear();mocks.adapter=null;});
describe('cookies Supabase SSR',()=>{
 it('ignora somente a restrição de escrita de Server Components',async()=>{
  mocks.set.mockImplementation(()=>{throw new Error('Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options');});
  await userClient();expect(()=>mocks.adapter!.setAll([{name:'ap-auth',value:'fixture'}])).not.toThrow();
 });
 it('persiste cookies em Route Handlers com as proteções existentes',async()=>{
  await userClient();mocks.adapter!.getAll();mocks.adapter!.setAll([{name:'ap-auth',value:'fixture',options:{maxAge:10}}]);
  expect(mocks.getAll).toHaveBeenCalledOnce();expect(mocks.set).toHaveBeenCalledWith('ap-auth','fixture',{maxAge:10,httpOnly:true,secure:false,sameSite:'lax',path:'/'});
 });
 it('não silencia outros erros de escrita',async()=>{
  mocks.set.mockImplementation(()=>{throw new Error('Outra falha de armazenamento.');});await userClient();expect(()=>mocks.adapter!.setAll([{name:'ap-auth',value:'fixture'}])).toThrow('Outra falha de armazenamento.');
 });
});
