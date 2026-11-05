import {it,expect,vi} from 'vitest';
import type {Sql} from '../../src/lib/database.server';
import * as publication from '../../src/lib/activities/publication.server';
vi.mock('server-only',()=>({}));
const record='10000000-0000-4000-8000-000000000001',authorization='20000000-0000-4000-8000-000000000001';
it('C05 RED: autorização de anúncio não autoriza registro posterior',async()=>{
 const query=vi.fn(async(text:string,values?:unknown[])=>({rows:text.includes("objeto_tipo='registro'")&&text.includes("'registro_realizacao'=any")&&values?.[1]===record?[]:[{id:authorization}]}));
 const authorize=Reflect.get(publication,'requireRecordAuthorization');expect(authorize).toBeTypeOf('function');
 await expect(authorize({query} as unknown as Sql,record,authorization)).rejects.toMatchObject({status:422});
});
it('C05: autorização específica vigente de registro exige escopo e versão próprios',async()=>{
 const query=vi.fn(async(text:string,values?:unknown[])=>({rows:text.includes("objeto_tipo='registro'")&&text.includes("'registro_realizacao'=any")&&text.includes("'registro:versao:1'=any")&&text.includes('revogada_em is null')&&text.includes('for share')&&values?.[1]===record?[{id:authorization}]:[]}));
 const authorize=Reflect.get(publication,'requireRecordAuthorization');expect(authorize).toBeTypeOf('function');await expect(authorize({query} as unknown as Sql,record,authorization)).resolves.toBeUndefined();
});
