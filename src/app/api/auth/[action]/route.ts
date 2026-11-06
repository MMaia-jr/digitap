import { mutation } from '../../../../lib/auth/runtime.server';
import type { AuthAction } from '../../../../lib/auth/flow.server';
import { privateHeaders } from '../../../../lib/auth/http.server';
const actions:Record<string,AuthAction>={cadastro:'signup','cadastro-pf':'signup_pf',login:'signin',sair:'signout',recuperar:'recover',confirmar:'confirm',redefinir:'reset'};
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
  const name=(await params).action;
  const action=Object.hasOwn(actions,name)?actions[name]:undefined;
  if(!action)return Response.json({message:'Página não encontrada.'},{status:404,headers:privateHeaders});
  return mutation(action,request);
}
