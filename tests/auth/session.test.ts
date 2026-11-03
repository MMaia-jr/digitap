import { describe,it,expect,vi } from 'vitest';
import { loadOrganizationAccess } from '../../src/lib/auth/organization-access.server';
vi.mock('server-only',()=>({}));
const user={id:'user-ficticio',email_confirmed_at:'2026-11-03'};
const account={auth_user_id:user.id,organizacao_id:'org-a',papel:'organizacao',situacao:'ativa'};
const organization={id:'org-a',nome_publico:'Organização Fictícia',estado_validacao:'pendente'};
const setup=()=>({currentUser:vi.fn().mockResolvedValue(user),account:vi.fn().mockResolvedValue(account),organization:vi.fn().mockResolvedValue(organization)});
describe('A05/A07/A08/A09: acesso à área de organização com portas simuladas',()=>{
 it('visitante é encaminhado ao login sem ler banco',async()=>{const g=setup();g.currentUser.mockResolvedValue(null as never);expect(await loadOrganizationAccess(g)).toEqual({kind:'login'});expect(g.account).not.toHaveBeenCalled();});
 it('usuário confirmado sem vínculo retoma onboarding',async()=>{const g=setup();g.account.mockResolvedValue(null as never);expect(await loadOrganizationAccess(g)).toEqual({kind:'onboarding'});});
 it('organização pendente recebe somente a própria projeção',async()=>{const g=setup();expect(await loadOrganizationAccess(g)).toEqual({kind:'ready',organization});expect(g.organization).toHaveBeenCalledWith('org-a');});
 it.each(['bloqueada','desativada'])('conta %s não lê organização',async situacao=>{const g=setup();g.account.mockResolvedValue({...account,situacao});expect(await loadOrganizationAccess(g)).toEqual({kind:'forbidden'});expect(g.organization).not.toHaveBeenCalled();});
 it('editor não se passa por organização',async()=>{const g=setup();g.account.mockResolvedValue({...account,papel:'editor'});expect(await loadOrganizationAccess(g)).toEqual({kind:'forbidden'});});
 it('email não confirmado não lê conta',async()=>{const g=setup();g.currentUser.mockResolvedValue({...user,email_confirmed_at:null} as never);expect(await loadOrganizationAccess(g)).toEqual({kind:'forbidden'});expect(g.account).not.toHaveBeenCalled();});
 it('conta de outra identidade é negada',async()=>{const g=setup();g.account.mockResolvedValue({...account,auth_user_id:'outro'});expect(await loadOrganizationAccess(g)).toEqual({kind:'forbidden'});});
 it('projeção retornada com ID de outro tenant é negada',async()=>{const g=setup();g.organization.mockResolvedValue({...organization,id:'outra'});expect(await loadOrganizationAccess(g)).toEqual({kind:'forbidden'});});
 it('suspensão institucional bloqueia acesso',async()=>{const g=setup();g.organization.mockResolvedValue({...organization,estado_validacao:'suspensa'});expect(await loadOrganizationAccess(g)).toEqual({kind:'forbidden'});});
 it('falha do banco é indisponibilidade, não onboarding nem sucesso',async()=>{const g=setup();g.account.mockRejectedValue(new Error('segredo'));expect(await loadOrganizationAccess(g)).toEqual({kind:'unavailable'});});
});
